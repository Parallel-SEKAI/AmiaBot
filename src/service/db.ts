import pkg from 'pg';
const { Pool, types } = pkg;
import type { PoolConfig } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import logger from '../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const TIMESTAMP_OID = 1114;

types.setTypeParser(TIMESTAMP_OID, (value: string) => new Date(`${value}Z`));

// 数据库连接配置
const dbConfig: PoolConfig = {
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  options: '-c timezone=UTC',
  // 连接超时设置
  connectionTimeoutMillis: 5000,
  // 客户端超时设置
  idleTimeoutMillis: 30000,
  // 最大连接数
  max: 10,
};

// 创建连接池
let pool = new Pool(dbConfig);

// 功能开关缓存: key = `${groupId}:${featureName}`, value = boolean
const featureEnabledCache = new Map<string, boolean>();

// 自动重连配置
const RECONNECT_INTERVAL = 5000; // 重连间隔（毫秒）
const MAX_RECONNECT_ATTEMPTS = 5; // 最大重连尝试次数
let reconnectAttempts = 0;

// 监听连接池错误事件
pool.on('error', (err) => {
  logger.error('[db] Database connection error:', err);

  // 如果重连尝试次数未达上限，则进行重连
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    logger.info(
      '[db] Attempting to reconnect to database... (%d/%d)',
      reconnectAttempts,
      MAX_RECONNECT_ATTEMPTS
    );

    // 关闭当前连接池
    pool.end().catch((endErr) => {
      logger.error('[db] Failed to close connection pool:', endErr);
    });

    // 延迟后重新创建连接池
    setTimeout(() => {
      pool = new Pool(dbConfig);

      // 重新监听错误事件
      pool.on('error', (err) => {
        logger.error('[db] Database reconnection error:', err);
      });

      logger.info('[db] Database connection pool re-created');
    }, RECONNECT_INTERVAL);
  } else {
    logger.error(
      '[db] Database reconnection failed, max attempts reached (%d)',
      MAX_RECONNECT_ATTEMPTS
    );
  }
});

// 监听连接池获取连接事件
pool.on('connect', () => {
  logger.info('[db] Database connected successfully');
  // 重置重连尝试次数
  reconnectAttempts = 0;
});

export default pool;

/**
 * 初始化数据库
 * 读取并执行 db/init.sql 脚本以建立基础表结构
 */
export async function initDb() {
  const initSqlPath = path.resolve(__dirname, '../../db/init.sql');
  const initSql = await fs.readFile(initSqlPath, 'utf8');
  await pool.query(initSql);
}

/**
 * 检查特定功能在指定群组中是否开启
 * @param groupId 群组 QQ 号
 * @param feature 功能模块名称
 * @returns 是否开启（若无记录则遵循默认配置）
 */
export async function checkFeatureEnabled(groupId: number, feature: string) {
  const cacheKey = `${groupId}:${feature}`;
  if (featureEnabledCache.has(cacheKey)) {
    return featureEnabledCache.get(cacheKey)!;
  }

  const query = `
    SELECT is_enabled
    FROM group_features
    WHERE group_id = $1 AND feature_name = $2
  `;
  const result = await pool.query(query, [groupId, feature]);
  const isEnabled =
    result.rows.length > 0
      ? result.rows[0].is_enabled
      : config.featuresDefaultEnabled;

  featureEnabledCache.set(cacheKey, isEnabled);
  return isEnabled;
}

/**
 * 设置群组中功能模块的开关状态
 * @param groupId 群组 QQ 号
 * @param feature 功能模块名称
 * @param enabled 目标状态
 */
export async function setFeatureEnabled(
  groupId: number,
  feature: string,
  enabled: boolean
) {
  const query = `
    INSERT INTO group_features (group_id, feature_name, is_enabled)
    VALUES ($1, $2, $3)
    ON CONFLICT (group_id, feature_name)
    DO UPDATE SET is_enabled = EXCLUDED.is_enabled
  `;
  await pool.query(query, [groupId, feature, enabled]);

  // 更新缓存
  const cacheKey = `${groupId}:${feature}`;
  featureEnabledCache.set(cacheKey, enabled);
}

export async function getGameState(groupId: number, gameType: string) {
  const query = `
    SELECT answer_data, start_time
    FROM amia_game_state
    WHERE group_id = $1 AND game_type = $2
  `;
  const result = await pool.query(query, [groupId, gameType]);
  return result.rows[0];
}

export async function setGameState(
  groupId: number,
  gameType: string,
  answerData: unknown
) {
  const query = `
    INSERT INTO amia_game_state (group_id, game_type, answer_data)
    VALUES ($1, $2, $3)
    ON CONFLICT (group_id, game_type)
    DO UPDATE SET answer_data = EXCLUDED.answer_data, start_time = CURRENT_TIMESTAMP
  `;
  await pool.query(query, [groupId, gameType, JSON.stringify(answerData)]);
}

export async function deleteGameState(groupId: number, gameType: string) {
  const query = `
    DELETE FROM amia_game_state
    WHERE group_id = $1 AND game_type = $2
  `;
  await pool.query(query, [groupId, gameType]);
}
