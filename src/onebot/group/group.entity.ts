import { onebot } from '../../main';
import { User } from '../user/user.entity';
import { RecvMessage } from '../message/recv.entity';

export class Group {
  public id: number;

  public name: string | null = null;
  public ownerId: number | null = null;
  public memberCount: number | null = null;
  public maxMemberCount: number | null = null;
  public description: string | null = null;
  public createTime: Date | null = null;
  public level: number | null = null;
  public activeMemberCount: number | null = null;

  private members: User[] = [];

  /**
   * Generates the URL for the group's avatar.
   */
  public get avatarUrl(): string {
    return `https://p.qlogo.cn/gh/${this.id}/${this.id}/0`;
  }

  constructor(id: number) {
    this.id = id;
  }

  /**
   * Initializes the group's properties by fetching its detailed information.
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

  public async getHistory(): Promise<RecvMessage[]> {
    const history = await onebot.action('get_group_message_history', {
      group_id: this.id,
      message_seq: 0,
      count: 100,
    });
    return history.data.messages.map((e: any) => RecvMessage.fromMap(e));
  }
}
