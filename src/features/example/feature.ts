import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import { checkFeatureEnabled } from '../../service/db.js';

export async function init() {
  logger.info('[feature] Init example feature');
  onebot.registerCommand('example', async (data) => {
    if (await checkFeatureEnabled(data.group_id, 'example')) {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.example][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
    }
  });
}
