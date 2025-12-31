import { Pool, PoolConfig } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from '../config/index';

// 数据库连接配置
const dbConfig: PoolConfig = {
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
  // 连接超时设置
  connectionTimeoutMillis: 5000,
  // 客户端超时设置
  idleTimeoutMillis: 30000,
  // 最大连接数
  max: 10,
};

// 创建连接池
let pool = new Pool(dbConfig);

// 自动重连配置
const RECONNECT_INTERVAL = 5000; // 重连间隔（毫秒）
const MAX_RECONNECT_ATTEMPTS = 5; // 最大重连尝试次数
let reconnectAttempts = 0;

// 监听连接池错误事件
pool.on('error', (err) => {
  console.error('数据库连接错误:', err.message);

  // 如果重连尝试次数未达上限，则进行重连
  if (reconnectAttempts < MAX_RECONNECT_ATTEMPTS) {
    reconnectAttempts++;
    console.log(
      `尝试重新连接数据库... (${reconnectAttempts}/${MAX_RECONNECT_ATTEMPTS})`
    );

    // 关闭当前连接池
    pool.end().catch((endErr) => {
      console.error('关闭连接池失败:', endErr.message);
    });

    // 延迟后重新创建连接池
    setTimeout(() => {
      pool = new Pool(dbConfig);

      // 重新监听错误事件
      pool.on('error', (err) => {
        console.error('数据库重连错误:', err.message);
      });

      console.log('数据库连接池已重新创建');
    }, RECONNECT_INTERVAL);
  } else {
    console.error(
      `数据库重连失败，已达最大尝试次数 (${MAX_RECONNECT_ATTEMPTS})`
    );
  }
});

// 监听连接池获取连接事件
pool.on('connect', () => {
  console.log('数据库连接成功');
  // 重置重连尝试次数
  reconnectAttempts = 0;
});

export default pool;

export async function initDb() {
  const initSqlPath = path.resolve(__dirname, '../../db/init.sql');
  const initSql = await fs.readFile(initSqlPath, 'utf8');
  await pool.query(initSql);
}

export async function checkFeatureEnabled(groupId: number, feature: string) {
  const query = `
    SELECT is_enabled 
    FROM group_features 
    WHERE group_id = $1 AND feature_name = $2
  `;
  const result = await pool.query(query, [groupId, feature]);
  return result.rows[0]?.is_enabled || config.featuresDefaultEnabled;
}

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
}
