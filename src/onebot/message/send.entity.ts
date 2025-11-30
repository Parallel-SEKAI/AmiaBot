import assert from "assert";
import { OneBotClient } from "../onebot.client";
import { RecvMessage } from "./recv.entity";

const messageHistory: Record<number, Array<{ message_id: string }>> = {};

export class SendMessage {
  public bot: OneBotClient;
  public messages: SendBaseMessage[];
  public userId: number | string | null;
  public groupId: number | string | null;

  constructor(bot: OneBotClient, messages: SendBaseMessage[] | SendBaseMessage, userId: number | string | null = null, groupId: number | string | null = null) {
    this.bot = bot;
    this.messages = Array.isArray(messages) ? messages : [messages];
    this.userId = userId;
    this.groupId = groupId;
  }

  public async send(
    recv_message: RecvMessage | null = null,
    user_id: string | null = null,
    group_id: string | null = null
  ): Promise<RecvMessage> {
    assert(
      this.userId || this.groupId || recv_message || user_id || group_id,
      "user_id, group_id, or recv_message is required"
    );

    const is_private =
      this.userId || user_id || (recv_message && recv_message.is_private);
    const is_group =
      this.groupId || group_id || (recv_message && recv_message.is_group);

    let data: Record<string, any> = {};

    if (this.messages[0] instanceof SendForwardMessage) {
      const id = is_private
        ? this.userId || user_id || recv_message?.user_id
        : this.groupId || group_id || recv_message?.group_id;
      data = await this.bot.action("send_forward_msg", {
        [is_private ? "user_id" : "group_id"]: id,
        ...this.messages[0].data,
      });
    } else if (is_private) {
      data = await this.bot.action("send_private_msg", {
        user_id: this.userId || user_id || recv_message?.user_id,
        message: this.messages.map((m) => m.toMap()),
      });
    } else if (is_group) {
      data = await this.bot.action("send_group_msg", {
        group_id: this.groupId || group_id || recv_message?.group_id,
        message: this.messages.map((m) => m.toMap()),
      });
    } else {
      throw new Error("Could not determine message type (private or group).");
    }

    // The message_history logic from the Python code could be implemented here if needed.
    // For example:
    // if (recv_message) {
    //     message_history.setdefault(recv_message.message_id, []).append(
    //         data.data.message_id
    //     );
    // }
    if (recv_message) {
      (messageHistory[recv_message.message_id] ||= []).push(
        { message_id: data!.data.message_id }
      );
    }

    return new RecvMessage(this.bot, Number(data!.data.message_id));
  }

  public async reply(recv_message: RecvMessage): Promise<RecvMessage> {
    if (this.messages[0] instanceof SendForwardMessage) {
      return await this.send(recv_message);
    }
    const newMessages = [
      new SendReplyMessage(Number(recv_message.message_id)),
      ...this.messages,
    ];
    if (recv_message.is_group) {
      const data = await this.bot.action("send_group_msg", {
        group_id: recv_message.group_id,
        message: newMessages.map((m) => m.toMap()),
      });
      if (recv_message.message_id) {
        (messageHistory[Number(recv_message.message_id)] ||= []).push({
          message_id: data.data.message_id,
        });
      }
      return new RecvMessage(this.bot, Number(data.data.message_id));
    } else if (recv_message.is_private) {
      const data = await this.bot.action("send_private_msg", {
        user_id: recv_message.user_id,
        message: newMessages.map((m) => m.toMap()),
      });
      if (recv_message.message_id) {
        (messageHistory[Number(recv_message.message_id)] ||= []).push({
          message_id: data.data.message_id,
        });
      }
      return new RecvMessage(this.bot, Number(data.data.message_id));
    } else {
      throw new Error("Could not determine message type (private or group).");
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

interface ForwardMessageNode {
  type: 'node';
  data: {
    user_id: string | number;
    nickname: string;
    content: SendBaseMessage[];
  }
}

export class SendForwardMessage extends SendBaseMessage {
  /**
   * 发送合并转发消息
   * @param messages 消息节点数组
   */
  constructor(messages: ForwardMessageNode[]) {
    // 将 content 中的 SendBaseMessage 对象转换为普通对象
    const formattedMessages = messages.map(node => ({
      ...node,
      data: {
        ...node.data,
        content: node.data.content.map(msg => ({ type: msg.type, data: msg.data }))
      }
    }));
    super('forward', { messages: formattedMessages });
  }
}
