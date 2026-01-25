import { onebot } from '..';
import { SendMessage } from './send.entity';

export class RecvBaseMessage {
  public type: string;
  public data: Record<string, any>;

  constructor(type: string, data: Record<string, any>) {
    this.type = type;
    this.data = data;
  }

  public static fromMap(data: {
    type: string;
    data: Record<string, any>;
  }): RecvBaseMessage {
    const type = data.type;
    switch (type) {
      case 'text':
        return RecvTextMessage.fromMap(data);
      case 'image':
        return RecvImageMessage.fromMap(data);
      case 'at':
        return RecvAtMessage.fromMap(data);
      case 'reply':
        return RecvReplyMessage.fromMap(data);
      case 'face':
        return RecvFaceMessage.fromMap(data);
      case 'record':
        return RecvRecordMessage.fromMap(data);
      case 'video':
        return RecvVideoMessage.fromMap(data);
      case 'rps':
        return RecvRpsMessage.fromMap(data);
      case 'dice':
        return RecvDiceMessage.fromMap(data);
      case 'share':
        return RecvShareMessage.fromMap(data);
      case 'music':
        return RecvMusicMessage.fromMap(data);
      case 'poke':
        return RecvPokeMessage.fromMap(data);
      case 'json':
        return RecvJsonMessage.fromMap(data);
      case 'markdown':
        return RecvMarkdownMessage.fromMap(data);
      case 'contact':
        return RecvContactMessage.fromMap(data);
      case 'mface':
        return RecvMfaceMessage.fromMap(data);
      case 'file':
        return RecvFileMessage.fromMap(data);
      case 'node':
        return RecvNodeMessage.fromMap(data);
      case 'forward':
        return RecvForwardMessage.fromMap(data);
      case 'location':
        return RecvLocationMessage.fromMap(data);
      case 'miniapp':
        return RecvMiniappMessage.fromMap(data);
      case 'xml':
        return RecvXmlMessage.fromMap(data);
      default:
        return new RecvBaseMessage(type, data.data ?? {});
    }
  }
}

export class RecvTextMessage extends RecvBaseMessage {
  public readonly text: string;
  constructor(data: Record<string, any>) {
    super('text', data);
    this.text = data.text ?? '';
  }
  public static fromMap(data: { data: Record<string, any> }): RecvTextMessage {
    return new RecvTextMessage(data.data);
  }
}

export class RecvImageMessage extends RecvBaseMessage {
  public readonly url?: string;
  public readonly file?: string;
  constructor(data: Record<string, any>) {
    super('image', data);
    this.url = data.url;
    this.file = data.file;
  }
  public static fromMap(data: { data: Record<string, any> }): RecvImageMessage {
    return new RecvImageMessage(data.data);
  }
}

export class RecvAtMessage extends RecvBaseMessage {
  public readonly qq: string;
  public readonly name?: string;
  constructor(data: Record<string, any>) {
    super('at', data);
    this.qq = String(data.qq);
    this.name = data.name;
  }
  public static fromMap(data: { data: Record<string, any> }): RecvAtMessage {
    return new RecvAtMessage(data.data);
  }
}

export class RecvReplyMessage extends RecvBaseMessage {
  public readonly id: string;
  constructor(data: Record<string, any>) {
    super('reply', data);
    this.id = String(data.id);
  }
  public static fromMap(data: { data: Record<string, any> }): RecvReplyMessage {
    return new RecvReplyMessage(data.data);
  }
}

export class RecvFaceMessage extends RecvBaseMessage {
  public readonly id: string;
  constructor(data: Record<string, any>) {
    super('face', data);
    this.id = String(data.id);
  }
  public static fromMap(data: { data: Record<string, any> }): RecvFaceMessage {
    return new RecvFaceMessage(data.data);
  }
}

export class RecvRecordMessage extends RecvBaseMessage {
  public readonly file: string;
  public readonly url?: string;
  constructor(data: Record<string, any>) {
    super('record', data);
    this.file = data.file;
    this.url = data.url;
  }
  public static fromMap(data: {
    data: Record<string, any>;
  }): RecvRecordMessage {
    return new RecvRecordMessage(data.data);
  }
}

export class RecvVideoMessage extends RecvBaseMessage {
  public readonly file: string;
  public readonly url?: string;
  constructor(data: Record<string, any>) {
    super('video', data);
    this.file = data.file;
    this.url = data.url;
  }
  public static fromMap(data: { data: Record<string, any> }): RecvVideoMessage {
    return new RecvVideoMessage(data.data);
  }
}

export class RecvRpsMessage extends RecvBaseMessage {
  public readonly result?: number;
  constructor(data: Record<string, any>) {
    super('rps', data);
    this.result = data.result;
  }
  public static fromMap(data: { data: Record<string, any> }): RecvRpsMessage {
    return new RecvRpsMessage(data.data);
  }
}

export class RecvDiceMessage extends RecvBaseMessage {
  public readonly result?: number;
  constructor(data: Record<string, any>) {
    super('dice', data);
    this.result = data.result;
  }
  public static fromMap(data: { data: Record<string, any> }): RecvDiceMessage {
    return new RecvDiceMessage(data.data);
  }
}

export class RecvShareMessage extends RecvBaseMessage {
  public readonly url: string;
  public readonly title: string;
  public readonly content?: string;
  public readonly image?: string;
  constructor(data: Record<string, any>) {
    super('share', data);
    this.url = data.url;
    this.title = data.title;
    this.content = data.content;
    this.image = data.image;
  }
  public static fromMap(data: { data: Record<string, any> }): RecvShareMessage {
    return new RecvShareMessage(data.data);
  }
}

export class RecvMusicMessage extends RecvBaseMessage {
  public readonly id?: string;
  public readonly url?: string;
  public readonly title?: string;
  public readonly content?: string;
  constructor(data: Record<string, any>) {
    super('music', data);
    this.id = data.id;
    this.url = data.url;
    this.title = data.title;
    this.content = data.content;
  }
  public static fromMap(data: { data: Record<string, any> }): RecvMusicMessage {
    return new RecvMusicMessage(data.data);
  }
}

export class RecvPokeMessage extends RecvBaseMessage {
  public readonly pokeType?: string;
  public readonly pokeId?: string;
  constructor(data: Record<string, any>) {
    super('poke', data);
    this.pokeType = data.type;
    this.pokeId = data.id;
  }
  public static fromMap(data: { data: Record<string, any> }): RecvPokeMessage {
    return new RecvPokeMessage(data.data);
  }
}

export class RecvJsonMessage extends RecvBaseMessage {
  public readonly content?: string;
  constructor(data: Record<string, any>) {
    super('json', data);
    this.content = data.data;
  }
  public static fromMap(data: { data: Record<string, any> }): RecvJsonMessage {
    return new RecvJsonMessage(data.data);
  }
}

export class RecvMarkdownMessage extends RecvBaseMessage {
  public readonly content: string;
  constructor(data: Record<string, any>) {
    super('markdown', data);
    this.content = data.content;
  }
  public static fromMap(data: {
    data: Record<string, any>;
  }): RecvMarkdownMessage {
    return new RecvMarkdownMessage(data.data);
  }
}

export class RecvContactMessage extends RecvBaseMessage {
  public readonly contactType: string;
  public readonly contactId: string;
  constructor(data: Record<string, any>) {
    super('contact', data);
    this.contactType = data.type;
    this.contactId = data.id;
  }
  public static fromMap(data: {
    data: Record<string, any>;
  }): RecvContactMessage {
    return new RecvContactMessage(data.data);
  }
}

export class RecvMfaceMessage extends RecvBaseMessage {
  public readonly emojiPackageId?: number;
  public readonly emojiId?: string;
  public readonly key?: string;
  public readonly summary?: string;
  constructor(data: Record<string, any>) {
    super('mface', data);
    this.emojiPackageId = data.emoji_package_id;
    this.emojiId = data.emoji_id;
    this.key = data.key;
    this.summary = data.summary;
  }
  public static fromMap(data: { data: Record<string, any> }): RecvMfaceMessage {
    return new RecvMfaceMessage(data.data);
  }
}

export class RecvFileMessage extends RecvBaseMessage {
  public readonly file: string;
  public readonly name?: string;
  public readonly url?: string;
  constructor(data: Record<string, any>) {
    super('file', data);
    this.file = data.file;
    this.name = data.name;
    this.url = data.url;
  }
  public static fromMap(data: { data: Record<string, any> }): RecvFileMessage {
    return new RecvFileMessage(data.data);
  }
}

export class RecvNodeMessage extends RecvBaseMessage {
  public readonly id?: string;
  public readonly userId?: string;
  public readonly nickname?: string;
  public readonly content: RecvBaseMessage[] | string;
  constructor(data: Record<string, any>) {
    super('node', data);
    this.id = data.id;
    this.userId = data.user_id ? String(data.user_id) : undefined;
    this.nickname = data.nickname;
    if (Array.isArray(data.content)) {
      this.content = data.content.map((item: any) =>
        RecvBaseMessage.fromMap(item)
      );
    } else {
      this.content = data.content;
    }
  }
  public static fromMap(data: { data: Record<string, any> }): RecvNodeMessage {
    return new RecvNodeMessage(data.data);
  }
}

export class RecvForwardMessage extends RecvBaseMessage {
  public readonly id: string;
  constructor(data: Record<string, any>) {
    super('forward', data);
    this.id = data.id;
  }
  public static fromMap(data: {
    data: Record<string, any>;
  }): RecvForwardMessage {
    return new RecvForwardMessage(data.data);
  }
}

export class RecvLocationMessage extends RecvBaseMessage {
  public readonly latitude?: number;
  public readonly longitude?: number;
  public readonly title?: string;
  public readonly content?: string;
  constructor(data: Record<string, any>) {
    super('location', data);
    this.latitude = data.latitude ? parseFloat(data.latitude) : undefined;
    this.longitude = data.longitude ? parseFloat(data.longitude) : undefined;
    this.title = data.title;
    this.content = data.content;
  }
  public static fromMap(data: {
    data: Record<string, any>;
  }): RecvLocationMessage {
    return new RecvLocationMessage(data.data);
  }
}

export class RecvMiniappMessage extends RecvBaseMessage {
  public readonly content?: string;
  constructor(data: Record<string, any>) {
    super('miniapp', data);
    this.content = data.data;
  }
  public static fromMap(data: {
    data: Record<string, any>;
  }): RecvMiniappMessage {
    return new RecvMiniappMessage(data.data);
  }
}

export class RecvXmlMessage extends RecvBaseMessage {
  public readonly content?: string;
  constructor(data: Record<string, any>) {
    super('xml', data);
    this.content = data.data;
  }
  public static fromMap(data: { data: Record<string, any> }): RecvXmlMessage {
    return new RecvXmlMessage(data.data);
  }
}

export class RecvMessage {
  private static _instances = new Map<
    number,
    { instance: RecvMessage; timestamp: number }
  >();
  private static _cleanupStarted = false;
  private _initialized = false;

  public messageId: number;
  public selfId: number = 0;
  public userId: number = 0;
  public time: Date = new Date(0);
  public messageSeq: number = 0;
  public realId: number = 0;
  public messageType: 'private' | 'group' | '' = '';
  public sender: any = null;
  public nickname: string | null = null;
  public rawMessage: string = '';
  public message: RecvBaseMessage[] = [];
  public groupId: number | null = null;
  public groupName: string | null = null;
  public raw: Record<string, any> = {};

  constructor(messageId: number) {
    this.messageId = messageId;
    RecvMessage.ensureCleanupTask();
  }

  private static ensureCleanupTask() {
    if (this._cleanupStarted) return;
    this._cleanupStarted = true;
    setInterval(() => {
      const expirationTime = 3600000; // 1 hour
      const now = Date.now();
      for (const [id, item] of this._instances.entries()) {
        if (now - item.timestamp > expirationTime) {
          this._instances.delete(id);
        }
      }
    }, 600000); // 10 minutes
  }

  public async init() {
    const data = await onebot.action('get_msg', { message_id: this.messageId });
    if (data.status !== 'ok') {
      throw new Error(`get_msg failed: ${data.status}`);
    }
    const msgData = data.data;
    this.selfId = msgData.self_id ?? 0;
    this.userId = msgData.user_id ?? 0;
    this.time = new Date((msgData.time ?? 0) * 1000);
    this.messageSeq = msgData.message_seq ?? 0;
    this.realId = msgData.real_id ?? 0;
    this.messageType = msgData.message_type ?? '';
    this.sender = msgData.sender ?? null;
    this.nickname = msgData.sender?.nickname ?? null;
    this.rawMessage = msgData.raw_message ?? '';
    this.groupId = msgData.group_id ?? null;
    this.groupName = msgData.group_name ?? null;

    let rawMsg = msgData.message;
    if (typeof rawMsg === 'string') {
      rawMsg = [{ type: 'text', data: { text: rawMsg } }];
    } else if (!Array.isArray(rawMsg)) {
      rawMsg = [];
    }

    this.message = rawMsg.map((item: any) => RecvBaseMessage.fromMap(item));
    this._initialized = true;
  }

  public static fromMap(data: Record<string, any>): RecvMessage {
    const messageId = data.message_id ?? 0;
    const now = Date.now();

    let entry = RecvMessage._instances.get(messageId);
    if (!entry) {
      const instance = new RecvMessage(messageId);
      entry = { instance, timestamp: now };
      RecvMessage._instances.set(messageId, entry);
    } else {
      entry.timestamp = now;
    }

    const msg = entry.instance;
    if (msg._initialized) return msg;

    msg.raw = data;
    msg.selfId = data.self_id ?? 0;
    msg.userId = data.user_id ?? 0;
    msg.time = new Date((data.time ?? 0) * 1000);
    msg.messageSeq = data.message_seq ?? 0;
    msg.realId = data.real_id ?? 0;
    msg.messageType = data.message_type ?? '';
    msg.sender = data.sender ?? null;
    msg.nickname = data.sender?.nickname ?? null;
    msg.rawMessage = data.raw_message ?? '';
    msg.groupId = data.group_id ?? null;
    msg.groupName = data.group_name ?? null;

    let rawMsg = data.message;
    if (typeof rawMsg === 'string') {
      rawMsg = [{ type: 'text', data: { text: rawMsg } }];
    } else if (!Array.isArray(rawMsg)) {
      rawMsg = [];
    }

    msg.message = rawMsg.map((item: any) => RecvBaseMessage.fromMap(item));
    msg._initialized = true;

    return msg;
  }

  public get isGroup(): boolean {
    return this.messageType === 'group';
  }
  public get isPrivate(): boolean {
    return this.messageType === 'private';
  }

  public get content(): string {
    return this.message
      .filter((msg) => msg.type === 'text')
      .map((msg) => (msg as RecvTextMessage).text || '')
      .join('')
      .trim();
  }

  public async delete(): Promise<any> {
    return onebot.action('delete_msg', { message_id: this.messageId });
  }

  public async send(sendMessage: SendMessage): Promise<RecvMessage> {
    return sendMessage.send({ recvMessage: this });
  }

  public async reply(sendMessage: SendMessage): Promise<RecvMessage> {
    return sendMessage.reply(this);
  }

  public toString(): string {
    return `(${this.nickname}/${this.userId})[${this.time.toLocaleString()}]${JSON.stringify(this.rawMessage)}`;
  }
}
