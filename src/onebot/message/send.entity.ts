import assert from 'assert';
import { onebot } from '../../main';
import { RecvMessage } from './recv.entity';

const messageHistory: Record<number, Array<{ messageId: string }>> = {};

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

    // The message_history logic from the Python code could be implemented here if needed.
    // For example:
    // if (recvMessage) {
    //     message_history.setdefault(recvMessage.messageId, []).append(
    //         data.data.message_id
    //     );
    // }
    if (args.recvMessage) {
      (messageHistory[args.recvMessage.messageId] ||= []).push({
        messageId: data!.data.messageId,
      });
    }

    return new RecvMessage(Number(data!.data.messageId));
  }

  public async reply(recvMessage: RecvMessage): Promise<RecvMessage> {
    if (this.messages[0] instanceof SendForwardMessage) {
      return await this.send({ recvMessage });
    }
    const newMessages = [
      new SendReplyMessage(Number(recvMessage.messageId)),
      ...this.messages,
    ];
    if (recvMessage.isGroup) {
      const data = await onebot.action('send_group_msg', {
        group_id: recvMessage.groupId,
        message: newMessages.map((m) => m.toMap()),
      });
      if (recvMessage.messageId) {
        (messageHistory[Number(recvMessage.messageId)] ||= []).push({
          messageId: data.data.message_id,
        });
      }
      return new RecvMessage(Number(data.data.message_id));
    } else if (recvMessage.isPrivate) {
      const data = await onebot.action('send_private_msg', {
        user_id: recvMessage.userId,
        message: newMessages.map((m) => m.toMap()),
      });
      if (recvMessage.messageId) {
        (messageHistory[Number(recvMessage.messageId)] ||= []).push({
          messageId: data.data.message_iddata.data.message_id,
        });
      }
      return new RecvMessage(Number(data.data.message_id));
    } else {
      throw new Error('Could not determine message type (private or group).');
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
    super('text', { text });
  }
}

export class SendImageMessage extends SendBaseMessage {
  /**
   * 发送图片消息
   * @param file 图片文件路径，可以是本地路径 (e.g., /path/to/image.jpg), file URL (e.g., file:///path/to/image.jpg), 或网络 URL (e.g., http://...)
   */
  constructor(file: string) {
    let filePath = file;
    // 在TypeScript/JavaScript环境中，通常不需要像Python那样手动处理路径为file://协议，
    // OneBot实现通常能接受绝对路径或URL。这里我们直接传递。
    // 如果需要确保是URL格式，可以添加一个转换逻辑。
    super('image', { file: filePath });
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
   * @param file 语音文件路径，可以是本地路径或网络URL
   */
  constructor(file: string) {
    super('record', { file });
  }
}

export class SendVideoMessage extends SendBaseMessage {
  /**
   * 发送视频消息
   * @param file 视频文件路径，可以是本地路径或网络URL
   */
  constructor(file: string) {
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
