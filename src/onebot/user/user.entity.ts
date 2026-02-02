import { onebot } from '../index.js';

/**
 * 用户实体类
 * 封装了用户的基础信息（昵称、性别、等级等）以及在特定群聊中的成员属性
 */
export class User {
  public id: number;
  public groupId: number | null = null; // 所在群ID

  public nickname: string | null = null; // 昵称
  public remark: string | null = null; // 备注
  public sex: 'male' | 'female' | 'unknown' | null = null; // 性别
  public age: number | null = null; // 年龄
  public qqLevel: number | null = null; // QQ等级
  public birthday: Date | null = null; // 生日日期对象
  public longNick: string | null = null; // 个性签名
  public country: string | null = null; // 国家
  public province: string | null = null; // 省份
  public city: string | null = null; // 城市
  public email: string | null = null; // 邮箱
  public regYear: number | null = null; // 注册年份
  public isVip: boolean | null = null; // 是否VIP
  public isYearsVip: boolean | null = null; // 是否年费VIP
  public vipLevel: number | null = null; // VIP等级

  public card: string | null = null; // 群名片
  public groupLevel: string | null = null; // 群等级
  public joinTime: Date | null = null; // 加入时间日期对象
  public lastSentTime: Date | null = null; // 最后发送消息时间日期对象
  public isRobot: boolean | null = null; // 是否机器人
  public role: 'owner' | 'admin' | 'member' | null = null; // 群角色
  public title: string | null = null; // 群头衔

  /**
   * 获取用户显示名称
   * 优先显示群名片，其次是昵称，最后是 QQ 号
   */
  public get fullName(): string {
    return this.card || this.nickname || this.id.toString();
  }

  /**
   * 获取用户高清头像 URL
   */
  public get avatarUrl(): string {
    return `https://q1.qlogo.cn/g?b=qq&nk=${this.id}&s=0`;
  }

  constructor(id: number, groupId: number | null = null) {
    this.id = id;
    this.groupId = groupId;
  }

  /**
   * 初始化用户信息
   * 自动获取陌生人详细信息，若提供了 groupId 则额外获取该用户在群内的成员信息
   */
  public async init() {
    const info = await onebot.action('get_stranger_info', {
      user_id: this.id,
    });
    const data = info.data;

    this.nickname = data.nick;
    this.remark = data.remark;
    this.sex = data.sex;
    this.age = data.age;
    this.qqLevel = data.qqLevel;
    this.birthday = new Date(
      data.birthday_year,
      data.birthday_month - 1,
      data.birthday_day
    );
    this.longNick = data.longNick;
    this.country = data.country;
    this.province = data.province;
    this.city = data.city;
    this.email = data.eMail;
    this.regYear = new Date(data.regTime * 1000).getFullYear();
    this.isVip = data.is_vip;
    this.isYearsVip = data.is_years_vip;
    this.vipLevel = data.vip_level;

    if (this.groupId) {
      const groupMemberInfo = await onebot.action('get_group_member_info', {
        group_id: this.groupId!,
        user_id: this.id,
      });
      const groupMemberData = groupMemberInfo.data;

      this.card = groupMemberData.card;
      this.groupLevel = groupMemberData.level;
      this.joinTime = new Date(groupMemberData.join_time * 1000);
      this.lastSentTime = new Date(groupMemberData.last_sent_time * 1000);
      this.isRobot = groupMemberData.is_robot;
      this.role = groupMemberData.role;
      this.title = groupMemberData.title;
    }
  }

  public async sendLike(times: number = 50) {
    const MAX_PER_REQUEST = 5;

    if (times <= MAX_PER_REQUEST) {
      return await onebot.action('send_like', { user_id: this.id, times });
    }

    const tasks = [];
    let remaining = times;

    while (remaining > 0) {
      const batch = Math.min(remaining, MAX_PER_REQUEST);
      tasks.push(
        onebot.action('send_like', { user_id: this.id, times: batch })
      );
      remaining -= batch;
    }

    return await Promise.all(tasks);
  }
}
