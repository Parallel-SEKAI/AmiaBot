import { Pool } from 'pg';
import * as fs from 'fs/promises';
import * as path from 'path';
import { config } from '../config/index';

const pool = new Pool({
  host: config.db.host,
  port: config.db.port,
  database: config.db.name,
  user: config.db.user,
  password: config.db.password,
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
  return result.rows[0]?.is_enabled || false;
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
