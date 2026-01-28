import assert from 'assert';
import { onebot } from '..';
import { RecvMessage } from './recv.entity';
import logger from '../../config/logger';
import { stateService } from '../../service/state';

interface SendMessageArgs {
  message: SendBaseMessage[] | SendBaseMessage;
  userId?: number | string;
  groupId?: number | string;
}
interface SendMessageSendArgs {
  recvMessage?: RecvMessage;
  userId?: number | string;
  groupId?: number | string;
}

export class SendMessage {
  public messages: SendBaseMessage[];
  public userId: number | string | null;
  public groupId: number | string | null;

  constructor(args: SendMessageArgs) {
    this.messages = Array.isArray(args.message) ? args.message : [args.message];
    this.userId = args.userId || null;
    this.groupId = args.groupId || null;
  }

  public async send(args: SendMessageSendArgs = {}): Promise<RecvMessage> {
    assert(
      this.userId ||
        this.groupId ||
        args.recvMessage ||
        args.userId ||
        args.groupId,
      'userId, groupId, or recvMessage is required'
    );

    // 检查原消息是否已被撤回
    if (
      args.recvMessage &&
      stateService.isRecalled(args.recvMessage.messageId)
    ) {
      logger.info(
        '[onebot.send] Message not sent because original message %d was recalled',
        args.recvMessage.messageId
      );
      // 返回一个临时消息对象，避免后续处理出错
      return new RecvMessage(Math.floor(Math.random() * 1000000));
    }

    await this.processMessages(this.messages);

    const is_private =
      this.userId ||
      args.userId ||
      (args.recvMessage && args.recvMessage.isPrivate);
    const is_group =
      this.groupId ||
      args.groupId ||
      (args.recvMessage && args.recvMessage.isGroup);

    let data: Record<string, any> = {};

    if (this.messages[0] instanceof SendForwardMessage) {
      const id = is_private
        ? this.userId || args.userId || args.recvMessage?.userId
        : this.groupId || args.groupId || args.recvMessage?.groupId;
      data = await onebot.action('send_forward_msg', {
        [is_private ? 'user_id' : 'group_id']: id,
        ...this.messages[0].data,
      });
    } else if (is_private) {
      data = await onebot.action('send_private_msg', {
        user_id: this.userId || args.userId || args.recvMessage?.userId,
        message: this.messages.map((m) => m.toMap()),
      });
    } else if (is_group) {
      data = await onebot.action('send_group_msg', {
        group_id: this.groupId || args.groupId || args.recvMessage?.groupId,
        message: this.messages.map((m) => m.toMap()),
      });
    } else {
      throw new Error('Could not determine message type (private or group).');
    }

    if (args.recvMessage && data.data && data.data.message_id) {
      stateService.addMessageRelation(
        args.recvMessage.messageId,
        data.data.message_id
      );
    }

    if (!data.data || !data.data.message_id) {
      throw new Error(
        `Failed to get message_id from OneBot response: ${JSON.stringify(data)}`
      );
    }

    const message = new RecvMessage(Number(data.data.message_id));
    await this.initMessageWithLogging(message);
    return message;
  }

  public async reply(recvMessage: RecvMessage): Promise<RecvMessage> {
    // 检查原消息是否已被撤回
    if (stateService.isRecalled(recvMessage.messageId)) {
      logger.info(
        '[onebot.reply] Message not replied because original message %d was recalled',
        recvMessage.messageId
      );
      throw new Error(`Original message ${recvMessage.messageId} was recalled`);
    }

    await this.processMessages(this.messages);

    if (this.messages[0] instanceof SendForwardMessage) {
      return await this.send({ recvMessage });
    }
    const newMessages = [
      new SendReplyMessage(Number(recvMessage.messageId)),
      ...this.messages,
    ];

    let data: Record<string, any> = {};

    if (recvMessage.isGroup) {
      data = await onebot.action('send_group_msg', {
        group_id: recvMessage.groupId,
        message: newMessages.map((m) => m.toMap()),
      });
    } else if (recvMessage.isPrivate) {
      data = await onebot.action('send_private_msg', {
        user_id: recvMessage.userId,
        message: newMessages.map((m) => m.toMap()),
      });
    } else {
      throw new Error('Could not determine message type (private or group).');
    }

    if (recvMessage && data.data && data.data.message_id) {
      stateService.addMessageRelation(
        recvMessage.messageId,
        data.data.message_id
      );
    }

    if (!data.data || !data.data.message_id) {
      throw new Error(
        `Failed to get message_id from OneBot response: ${JSON.stringify(data)}`
      );
    }

    const message = new RecvMessage(Number(data.data.message_id));
    await this.initMessageWithLogging(message);
    return message;
  }

  private async initMessageWithLogging(message: RecvMessage): Promise<void> {
    try {
      await message.init();
      logger.info(
        '[onebot.send][Group: %d] %s',
        message.groupId,
        message.rawMessage
      );
    } catch (e) {
      logger.warn(
        '[onebot.send] Failed to init message %d: %s',
        message.messageId,
        e
      );
    }
  }

  private async processMessages(messages: any[]) {
    for (const msg of messages) {
      if (msg.type === 'forward' && msg.data?.messages) {
        for (const node of msg.data.messages) {
          if (node.data?.content) {
            await this.processMessages(node.data.content);
          }
        }
      } else if (msg.data && Buffer.isBuffer(msg.data.file)) {
        const extMap: Record<string, string> = {
          image: 'png',
          record: 'mp3',
          video: 'mp4',
          file: 'dat',
        };
        const ext = extMap[msg.type] || 'dat';
        msg.data.file = await onebot.uploadBufferStream(
          msg.data.file,
          `upload_${Date.now()}.${ext}`
        );
      }
    }
  }
}

export class SendBaseMessage {
  public type: string;
  public data: Record<string, any>;

  constructor(type: string, data: Record<string, any> = {}) {
    this.type = type;
    this.data = data;
  }

  public toMap(): Record<string, any> {
    return {
      type: this.type,
      data: this.data,
    };
  }
}

export class SendTextMessage extends SendBaseMessage {
  constructor(text: string) {
    super('text', { text: text.trim() });
  }
}

export class SendImageMessage extends SendBaseMessage {
  /**
   * 发送图片消息
   * @param file 图片文件路径，可以是本地路径 (e.g., /path/to/image.jpg), file URL (e.g., file:///path/to/image.jpg), 网络 URL (e.g., http://...), 或 Buffer 对象
   */
  constructor(file: string | Buffer) {
    super('image', { file });
  }
}

export class SendFaceMessage extends SendBaseMessage {
  /**
   * 发送系统表情
   * @param id 表情ID
   */
  constructor(id: number) {
    super('face', { id });
  }
}

export class SendRecordMessage extends SendBaseMessage {
  /**
   * 发送语音消息
   * @param file 语音文件路径，可以是本地路径、网络URL或 Buffer 对象
   */
  constructor(file: string | Buffer) {
    super('record', { file });
  }
}

export class SendVideoMessage extends SendBaseMessage {
  /**
   * 发送视频消息
   * @param file 视频文件路径，可以是本地路径、网络URL或 Buffer 对象
   */
  constructor(file: string | Buffer) {
    super('video', { file });
  }
}

export class SendAtMessage extends SendBaseMessage {
  /**
   * 发送艾特消息
   * @param qq 用户ID，'all' 表示全体成员
   * @param name 可选，艾特显示的名称
   */
  constructor(qq: string | number, name?: string) {
    const data: Record<string, any> = { qq };
    if (name) {
      data['name'] = name;
    }
    super('at', data);
  }
}

export class SendReplyMessage extends SendBaseMessage {
  /**
   * 发送回复消息
   * @param id 要回复的消息ID
   */
  constructor(id: number) {
    super('reply', { id });
  }
}

export class SendMusicMessage extends SendBaseMessage {
  /**
   * 发送音乐卡片消息
   * @param type 音乐平台类型，如 "163"、"qq"
   * @param id 音乐ID
   */
  constructor(type: string, id: string) {
    super('music', { type, id });
  }
}

export class SendDiceMessage extends SendBaseMessage {
  /**
   * 发送骰子表情
   * @param result 骰子点数（1-6），可选
   */
  constructor(result?: number) {
    const data: Record<string, any> = {};
    if (result !== undefined) {
      data['result'] = result;
    }
    super('dice', data);
  }
}

export class SendRpsMessage extends SendBaseMessage {
  /**
   * 发送猜拳表情
   * @param result 结果（1-石头, 2-剪刀, 3-布），可选
   */
  constructor(result?: number) {
    const data: Record<string, any> = {};
    if (result !== undefined) {
      data['result'] = result;
    }
    super('rps', data);
  }
}

export class SendFileMessage extends SendBaseMessage {
  /**
   * 发送文件消息
   * @param file 文件路径，可以是本地路径、网络URL
   * @param name 可选，显示的文件名
   */
  constructor(file: string, name?: string) {
    const data: Record<string, any> = { file };
    if (name) {
      data['name'] = name;
    }
    super('file', data);
  }
}

export interface ForwardMessageNode {
  type: 'node';
  data: {
    userId: string | number;
    nickname: string;
    content: SendBaseMessage[];
  };
}

export class SendForwardMessage extends SendBaseMessage {
  /**
   * 发送合并转发消息
   * @param messages 消息节点数组
   */
  constructor(messages: ForwardMessageNode[]) {
    // 将 content 中的 SendBaseMessage 对象转换为普通对象
    const formattedMessages = messages.map((node) => ({
      ...node,
      data: {
        ...node.data,
        content: node.data.content.map((msg) => ({
          type: msg.type,
          data: msg.data,
        })),
      },
    }));
    super('forward', { messages: formattedMessages });
  }
}
