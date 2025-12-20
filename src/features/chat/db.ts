import pool from '../../service/db';

/**
 * 聊天历史记录类型定义
 */
export interface ChatHistory {
  id: number;
  group_id: number;
  user_id: number;
  user_nick: string;
  time: Date;
  message: string;
}

/**
 * 用户信息类型定义
 */
export interface ChatUser {
  user_id: number;
  favor: number;
  memory: string | null;
}

/**
 * 插入聊天记录
 * @param groupId 群ID
 * @param userId 用户ID
 * @param userNick 用户昵称
 * @param message 消息内容
 * @returns Promise<void>
 */
export async function addChatHistory(
  groupId: number,
  userId: number,
  userNick: string,
  message: string
): Promise<void> {
  const query = `
    INSERT INTO amia_chat_history (group_id, user_id, user_nick, message)
    VALUES ($1, $2, $3, $4)
  `;
  await pool.query(query, [groupId, userId, userNick, message]);
}

/**
 * 获取指定群的聊天记录
 * @param groupId 群ID
 * @param limit 返回记录数量，默认20
 * @param offset 偏移量，默认0
 * @param orderByTime 排序方向，'asc'表示按时间正序（旧消息在前），'desc'表示按时间倒序（新消息在前），默认'desc'
 * @returns Promise<ChatHistory[]>
 */
export async function getChatHistory(
  groupId: number,
  limit: number = 20,
  offset: number = 0,
  orderByTime: 'asc' | 'desc' = 'desc'
): Promise<ChatHistory[]> {
  const query = `
    SELECT id, group_id, user_id, user_nick, time, message
    FROM amia_chat_history
    WHERE group_id = $1
    ORDER BY time ${orderByTime.toUpperCase()}
    LIMIT $2 OFFSET $3
  `;
  const result = await pool.query(query, [groupId, limit, offset]);
  return result.rows as ChatHistory[];
}

/**
 * 获取指定群的最新几条聊天记录
 * @param groupId 群ID
 * @param limit 返回记录数量，默认20
 * @returns Promise<ChatHistory[]>
 */
export async function getLatestChatHistory(
  groupId: number,
  limit: number = 20
): Promise<ChatHistory[]> {
  return getChatHistory(groupId, limit, 0, 'desc');
}

/**
 * 获取指定群的最早几条聊天记录
 * @param groupId 群ID
 * @param limit 返回记录数量，默认20
 * @returns Promise<ChatHistory[]>
 */
export async function getOldestChatHistory(
  groupId: number,
  limit: number = 20
): Promise<ChatHistory[]> {
  return getChatHistory(groupId, limit, 0, 'asc');
}

/**
 * 获取用户好感度和记忆
 * @param userId 用户ID
 * @returns Promise<ChatUser | null>
 */
export async function getUserInfo(userId: number): Promise<ChatUser | null> {
  const query = `
    SELECT user_id, favor, memory
    FROM amia_chat_user
    WHERE user_id = $1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows[0] as ChatUser | null;
}

/**
 * 更新用户好感度和记忆（如果用户不存在则创建）
 * @param userId 用户ID
 * @param favor 好感度变化值
 * @param memory 新的记忆内容
 * @returns Promise<void>
 */
export async function updateUserInfo(
  userId: number,
  favor: number,
  memory: string
): Promise<void> {
  const query = `
    INSERT INTO amia_chat_user (user_id, favor, memory)
    VALUES ($1, $2, $3)
    ON CONFLICT (user_id)
    DO UPDATE SET
      favor = amia_chat_user.favor + EXCLUDED.favor,
      memory = EXCLUDED.memory
  `;
  await pool.query(query, [userId, favor, memory]);
}
