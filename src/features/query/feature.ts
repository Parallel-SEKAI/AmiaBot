import { init as initGroup } from './group.js';
import { init as initUser } from './user.js';

/**
 * 初始化查询功能模块
 * 整合并启动群组与用户的综合查询子模块
 */
export async function init() {
  await Promise.all([initGroup(), initUser()]);
}
