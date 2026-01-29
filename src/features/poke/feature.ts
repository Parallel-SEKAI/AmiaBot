import { onebot } from '../../onebot/index.js';
import { checkFeatureEnabled } from '../../service/db.js';
import logger from '../../config/logger.js';
import { functions } from './functions.js';

/**
 * 初始化戳一戳互动功能模块
 * 监听群内“戳一戳”通知，当机器人被戳时触发随机趣味响应逻辑
 */
export async function init() {
  logger.info('[feature] Init poke feature');
  onebot.on('notice.poke', async (data) => {
    if (data.target_id == onebot.qq) {
      if (await checkFeatureEnabled(data.group_id, 'poke')) {
        const func = functions[Math.floor(Math.random() * functions.length)];
        logger.info(
          '[feature.poke.%s][Group: %d][User: %d]',
          func.name,
          data.group_id,
          data.user_id
        );
        await func(data.group_id, data.user_id);
      }
    }
  });
}
