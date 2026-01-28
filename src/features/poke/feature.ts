import { onebot } from '../../onebot/index.js';
import { checkFeatureEnabled } from '../../service/db.js';
import logger from '../../config/logger.js';
import { functions } from './functions.js';

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
