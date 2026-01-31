import pool from './db.js';
import { onebot } from '../onebot/index.js';

export interface UserRelationship {
  userId: number;
  nickname: string;
  favorability: number;
  tags: string[];
}

/**
 * 社交系统服务类
 * 负责管理用户间的好感度、关系标签、每日匹配（娶群友）以及礼物互动逻辑
 */
export class SocialService {
  /**
   * 强制 A < B 排序以保证唯一性
   */
  private static sortUsers(idA: number, idB: number): [number, number] {
    return idA < idB ? [idA, idB] : [idB, idA];
  }

  /**
   * 获取或创建两个用户之间的关系记录
   */
  private static async getOrCreateRelationship(
    groupId: number,
    id1: number,
    id2: number
  ) {
    const [idA, idB] = this.sortUsers(id1, id2);
    const query = `
      INSERT INTO user_relationships (user_id_a, user_id_b, group_id, favorability)
      VALUES ($1, $2, $3, 0)
      ON CONFLICT (user_id_a, user_id_b, group_id)
      DO UPDATE SET updated_at = NOW()
      RETURNING *
    `;
    const res = await pool.query(query, [idA, idB, groupId]);
    return res.rows[0];
  }

  /**
   * 获取今日匹配的对象 (娶群友的对象)
   */
  public static async getTodayPartner(groupId: number, userId: number) {
    const query = `
      SELECT * FROM user_daily_interactions
      WHERE group_id = $1 AND record_date = CURRENT_DATE
      AND interaction_type = 'MARRY'
      AND (user_id = $2 OR target_id = $2)
    `;
    const res = await pool.query(query, [groupId, userId]);
    if (res.rows.length === 0) return null;
    const record = res.rows[0];
    return record.user_id === userId
      ? Number(record.target_id)
      : Number(record.user_id);
  }

  /**
   * 增加好感度
   */
  private static async addFavorability(
    groupId: number,
    id1: number,
    id2: number,
    amount: number
  ) {
    const [idA, idB] = this.sortUsers(id1, id2);
    const updateQuery = `
      INSERT INTO user_relationships (user_id_a, user_id_b, group_id, favorability)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (user_id_a, user_id_b, group_id)
      DO UPDATE SET favorability = LEAST(5000, GREATEST(-1000, user_relationships.favorability + $4)), updated_at = NOW()
      RETURNING favorability
    `;
    const res = await pool.query(updateQuery, [idA, idB, groupId, amount]);
    return res.rows[0].favorability;
  }

  /**
   * 执行“娶群友”逻辑
   * 包含幂等性检查、权重随机抽取以及好感度变动逻辑
   * @param groupId 群组 QQ 号
   * @param userId 发起指令的用户 QQ 号
   * @returns 匹配结果，包含目标 ID、是否新匹配以及好感度变动信息
   */
  public static async marry(groupId: number, userId: number) {
    // 1. 检查今日是否已匹配 (幂等性)
    const checkQuery = `
      SELECT interaction.*, rel.favorability
      FROM user_daily_interactions interaction
      LEFT JOIN user_relationships rel ON (
        (rel.user_id_a = interaction.user_id AND rel.user_id_b = interaction.target_id) OR
        (rel.user_id_a = interaction.target_id AND rel.user_id_b = interaction.user_id)
      ) AND rel.group_id = interaction.group_id
      WHERE interaction.group_id = $1 AND interaction.record_date = CURRENT_DATE
      AND interaction.interaction_type = 'MARRY'
      AND (interaction.user_id = $2 OR interaction.target_id = $2)
    `;
    const checkRes = await pool.query(checkQuery, [groupId, userId]);
    if (checkRes.rows.length > 0) {
      const record = checkRes.rows[0];
      const targetId =
        Number(record.user_id) === userId
          ? Number(record.target_id)
          : Number(record.user_id);
      return { targetId, isNew: false, favorability: record.favorability || 0 };
    }

    // 2. 获取群成员
    const membersRes = await onebot.action('get_group_member_list', {
      group_id: groupId,
    });
    let members = (membersRes.data as Array<{ user_id: number }>)
      .map((m) => m.user_id)
      .filter((id: number) => id !== userId && id !== onebot.qq);

    if (members.length === 0) return null;

    // 性能优化：针对大型群聊进行采样
    if (members.length > 500) {
      members = members.sort(() => Math.random() - 0.5).slice(0, 500);
    }

    // 3. 排除今日已匹配的用户
    const excludeQuery = `
      SELECT user_id, target_id FROM user_daily_interactions
      WHERE group_id = $1 AND record_date = CURRENT_DATE AND interaction_type = 'MARRY'
    `;
    const excludeRes = await pool.query(excludeQuery, [groupId]);
    const matchedUsers = new Set<number>();
    excludeRes.rows.forEach((r) => {
      matchedUsers.add(Number(r.user_id));
      matchedUsers.add(Number(r.target_id));
    });

    const poolMembers = members.filter((id: number) => !matchedUsers.has(id));
    if (poolMembers.length === 0) return null;

    // 4. 权重计算：获取当前用户与这些人的关系
    const relQuery = `
      SELECT user_id_a, user_id_b, favorability FROM user_relationships
      WHERE group_id = $1 AND (user_id_a = $2 OR user_id_b = $2)
    `;
    const relRes = await pool.query(relQuery, [groupId, userId]);
    const favorMap = new Map<number, number>();
    relRes.rows.forEach((r) => {
      const other =
        Number(r.user_id_a) === userId
          ? Number(r.user_id_b)
          : Number(r.user_id_a);
      favorMap.set(other, r.favorability);
    });

    // 计算总权重
    let totalWeight = 0;
    const items = poolMembers.map((id: number) => {
      const favor = favorMap.get(id) || 0;
      const weight = favor > 100 ? 1.2 : 1.0;
      totalWeight += weight;
      return { id, weight };
    });

    // 随机抽取
    let random = Math.random() * totalWeight;
    let targetId = items[items.length - 1].id;
    for (const item of items) {
      if (random < item.weight) {
        targetId = item.id;
        break;
      }
      random -= item.weight;
    }

    // 5. 记录互动并增加好感
    await pool.query(
      `INSERT INTO user_daily_interactions (group_id, user_id, interaction_type, target_id) VALUES ($1, $2, 'MARRY', $3)`,
      [groupId, userId, targetId]
    );
    const bonus = Math.floor(Math.random() * 5) + 1;
    const favorability = await this.addFavorability(
      groupId,
      userId,
      targetId,
      bonus
    );

    return { targetId, isNew: true, bonus, favorability };
  }

  /**
   * 送礼物逻辑
   */
  public static async gift(groupId: number, userId: number, targetId: number) {
    // 1. 冷却检查 (每小时3次)
    const limitQuery = `
      SELECT COUNT(*) FROM user_daily_interactions
      WHERE group_id = $1 AND user_id = $2
      AND interaction_type = 'GIFT_LIMIT'
      AND created_at > NOW() - INTERVAL '1 hour'
    `;
    const limitRes = await pool.query(limitQuery, [groupId, userId]);
    if (parseInt(limitRes.rows[0].count) >= 3) {
      return { success: false, reason: 'COOLDOWN' };
    }

    // 2. 随机增量
    let bonus = Math.floor(Math.random() * 15) + 1;
    let isSurprise = false;
    if (Math.random() < 0.1) {
      bonus = Math.floor(Math.random() * 31) + 20; // 20-50
      isSurprise = true;
    }

    // 3. 执行更新
    await pool.query(
      `INSERT INTO user_daily_interactions (group_id, user_id, interaction_type, target_id) VALUES ($1, $2, 'GIFT_LIMIT', $3)`,
      [groupId, userId, targetId]
    );
    const newFavor = await this.addFavorability(
      groupId,
      userId,
      targetId,
      bonus
    );

    return { success: true, bonus, isSurprise, newFavor };
  }

  /**
   * 闹离婚逻辑
   */
  public static async divorce(groupId: number, userId: number) {
    // 1. 查找今日婚姻
    const findQuery = `
      SELECT * FROM user_daily_interactions
      WHERE group_id = $1 AND record_date = CURRENT_DATE
      AND interaction_type = 'MARRY'
      AND (user_id = $2 OR target_id = $2)
    `;
    const findRes = await pool.query(findQuery, [groupId, userId]);
    if (findRes.rows.length === 0) return null;

    const record = findRes.rows[0];
    const targetId =
      Number(record.user_id) === userId
        ? Number(record.target_id)
        : Number(record.user_id);

    // 2. 删除记录并扣减好感
    await pool.query(`DELETE FROM user_daily_interactions WHERE id = $1`, [
      record.id,
    ]);

    const relQuery = `
      SELECT favorability FROM user_relationships
      WHERE group_id = $1 AND user_id_a = $2 AND user_id_b = $3
    `;
    const [idA, idB] = this.sortUsers(userId, targetId);
    const relRes = await pool.query(relQuery, [groupId, idA, idB]);

    let penalty = 50;
    if (relRes.rows.length > 0) {
      const currentFavor = relRes.rows[0].favorability;
      penalty = Math.max(50, Math.floor(currentFavor * 0.2));
    }

    const newFavor = await this.addFavorability(
      groupId,
      userId,
      targetId,
      -penalty
    );
    return { targetId, penalty, newFavor };
  }

  /**
   * 获取排行榜 (仅返回原始数据)
   */
  public static async getLeaderboard(groupId: number, userId: number) {
    const query = `
      SELECT * FROM user_relationships
      WHERE group_id = $1 AND (user_id_a = $2 OR user_id_b = $2)
      ORDER BY favorability DESC
      LIMIT 10
    `;
    const res = await pool.query(query, [groupId, userId]);

    return res.rows.map((r) => {
      const otherId =
        Number(r.user_id_a) === userId
          ? Number(r.user_id_b)
          : Number(r.user_id_a);
      return {
        userId: otherId,
        favorability: r.favorability,
        tags: r.tags || [],
        updatedAt: r.updated_at,
      };
    });
  }
}
