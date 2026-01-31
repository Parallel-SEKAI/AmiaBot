import pool from '../../service/db.js';

/**
 * 回应功能数据类型定义
 */
export interface ReplyFace {
  id: number;
  user_id: number;
  face_id: string;
  created_at: Date;
}

// 内存缓存，存储用户的回应表情ID列表
const replyFaceCache = new Map<
  number,
  { faceIds: string[]; timestamp: number }
>();
const CACHE_TTL = 5 * 60 * 1000; // 5分钟缓存

/**
 * 清除用户的缓存
 * @param userId 用户ID
 */
function clearUserCache(userId: number): void {
  replyFaceCache.delete(userId);
}

/**
 * 添加回应表情
 * @param userId 用户ID
 * @param faceId 表情ID
 * @returns Promise<void>
 */
export async function addReplyFace(
  userId: number,
  faceId: string
): Promise<void> {
  const query = `
    INSERT INTO user_reply_faces (user_id, face_id)
    VALUES ($1, $2)
    ON CONFLICT DO NOTHING
  `;
  await pool.query(query, [userId, faceId]);

  // 清除缓存
  clearUserCache(userId);
}

/**
 * 删除特定回应表情
 * @param userId 用户ID
 * @param faceId 表情ID
 * @returns Promise<void>
 */
export async function removeReplyFace(
  userId: number,
  faceId: string
): Promise<void> {
  const query = `
    DELETE FROM user_reply_faces
    WHERE user_id = $1 AND face_id = $2
  `;
  await pool.query(query, [userId, faceId]);

  // 清除缓存
  clearUserCache(userId);
}

/**
 * 删除用户的所有回应表情
 * @param userId 用户ID
 * @returns Promise<void>
 */
export async function clearUserReplyFaces(userId: number): Promise<void> {
  const query = `
    DELETE FROM user_reply_faces
    WHERE user_id = $1
  `;
  await pool.query(query, [userId]);

  // 清除缓存
  clearUserCache(userId);
}

/**
 * 获取用户的所有回应表情
 * @param userId 用户ID
 * @returns Promise<ReplyFace[]>
 */
export async function getUserReplyFaces(userId: number): Promise<ReplyFace[]> {
  const query = `
    SELECT id, user_id, face_id, created_at
    FROM user_reply_faces
    WHERE user_id = $1
    ORDER BY created_at
  `;
  const result = await pool.query(query, [userId]);
  return result.rows as ReplyFace[];
}

/**
 * 检查用户是否有任何回应表情设置
 * @param userId 用户ID
 * @returns Promise<boolean>
 */
export async function hasReplyFaces(userId: number): Promise<boolean> {
  const query = `
    SELECT 1 FROM user_reply_faces
    WHERE user_id = $1
    LIMIT 1
  `;
  const result = await pool.query(query, [userId]);
  return result.rows.length > 0;
}

/**
 * 获取用户的所有回应表情ID列表（带缓存）
 * @param userId 用户ID
 * @returns Promise<string[]>
 */
export async function getUserReplyFaceIds(userId: number): Promise<string[]> {
  const cached = replyFaceCache.get(userId);
  const now = Date.now();

  // 检查缓存是否有效
  if (cached && now - cached.timestamp < CACHE_TTL) {
    return cached.faceIds;
  }

  // 查询数据库
  const query = `
    SELECT face_id
    FROM user_reply_faces
    WHERE user_id = $1
  `;
  const result = await pool.query(query, [userId]);
  const faceIds = result.rows.map((row) => row.face_id);

  // 缓存结果
  replyFaceCache.set(userId, { faceIds, timestamp: now });

  return faceIds;
}
