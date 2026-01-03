import logger from '../../config/logger';
import { onebot } from '../../main';
import { RecvMessage } from '../../onebot/message/recv.entity';
import { SendMessage, SendTextMessage } from '../../onebot/message/send.entity';
import { checkFeatureEnabled } from '../../service/db';

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
