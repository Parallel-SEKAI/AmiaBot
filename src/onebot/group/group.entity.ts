import { onebot } from '../index.js';
import { User } from '../user/user.entity.js';
import { RecvMessage } from '../message/recv.entity.js';

/**
 * 群聊实体类
 * 封装了群聊的基础信息、成员管理以及消息历史获取功能
 */
export class Group {
  /**
   * 群聊ID
   */
  public id: number;

  /**
   * 群聊名称
   */
  public name: string | null = null;

  /**
   * 群主ID
   */
  public ownerId: number | null = null;

  /**
   * 群成员数量
   */
  public memberCount: number | null = null;

  /**
   * 群最大成员数量
   */
  public maxMemberCount: number | null = null;

  /**
   * 群描述
   */
  public description: string | null = null;

  /**
   * 群创建时间
   */
  public createTime: Date | null = null;

  /**
   * 群等级
   */
  public level: number | null = null;

  /**
   * 群活跃成员数量
   */
  public activeMemberCount: number | null = null;

  /**
   * 置顶的群规，比如入群须知
   */
  public rules: string | null = null;

  /**
   * “暗号”——加群问题！
   */
  public joinQuestion: string | null = null;

  /**
   * 是不是被群主开启了全员禁言
   */
  public isMutedAll: boolean = false;

  /**
   * 我自己是不是被禁言了
   */
  public isMutedMe: boolean = false;

  private members: User[] = [];

  /**
   * 获取群头像 URL
   */
  public get avatarUrl(): string {
    return `https://p.qlogo.cn/gh/${this.id}/${this.id}/0`;
  }

  constructor(id: number) {
    this.id = id;
  }

  /**
   * 初始化群信息
   * 通过 API 获取群组详细资料并填充当前对象
   */
  public async init() {
    const info = await onebot.action('get_group_detail_info', {
      group_id: this.id,
    });
    const data = info.data;

    this.name = data.group_name;
    this.ownerId = data.ownerUin;
    this.memberCount = data.memberNum;
    this.maxMemberCount = data.maxMemberNum;
    this.description = data.groupMemo;
    this.createTime = new Date(data.groupCreateTime * 1000);
    this.level = data.groupGrade;
    this.activeMemberCount = data.activeMemberNum;
    this.rules = data.fingerMemo;
    this.joinQuestion = data.groupQuestion;
    this.isMutedAll = data.shutUpAllTimestamp > 0; // 时间戳大于0，说明正处于全员禁言中
    this.isMutedMe = data.shutUpMeTimestamp > 0; // 时间戳大于0，说明自己被禁言了
  }

  /**
   * Retrieves the list of members in the group.
   * The result is cached after the first call.
   * @param noCache Whether to force a refresh from the API.
   * @returns A promise that resolves to an array of User instances.
   */
  public async getMembers(noCache = false): Promise<User[]> {
    if (this.members.length > 0 && !noCache) {
      return this.members;
    }

    const memberListInfo = await onebot.action('get_group_member_list', {
      group_id: this.id,
    });

    const members = memberListInfo.data.map((memberData: any) => {
      const user = new User(memberData.user_id, this.id);
      // Pre-populate with data we already have from the list
      user.nickname = memberData.nickname;
      user.card = memberData.card;
      user.sex = memberData.sex;
      user.age = memberData.age;
      user.joinTime = new Date(memberData.join_time * 1000);
      user.lastSentTime = new Date(memberData.last_sent_time * 1000);
      user.role = memberData.role;
      user.title = memberData.title;
      user.groupLevel = memberData.level;
      return user;
    });

    this.members = members;
    return this.members;
  }

  /**
   * Retrieves the owner of the group as a User instance.
   * @returns A promise that resolves to a User instance, or null if not found.
   */
  public async getOwner(): Promise<User | null> {
    if (!this.ownerId) {
      await this.init(); // Ensure ownerId is fetched
    }
    if (!this.ownerId) {
      return null;
    }
    const members = await this.getMembers();
    return members.find((m) => m.id === this.ownerId) || null;
  }

  public async getHistory(args?: getHistoryArgs): Promise<RecvMessage[]> {
    const history = await onebot.action('get_group_msg_history', {
      group_id: this.id,
      message_seq: args?.message_seq || 0,
      count: args?.count || 100,
    });
    return history.data.messages.map((e: any) => RecvMessage.fromMap(e));
  }
}

interface getHistoryArgs {
  message_seq?: number;
  count?: number;
}
