import { onebot } from '../../main';
import { SendMessage, SendTextMessage } from '../../onebot/message/send.entity';
import { checkFeatureEnabled } from '../../service/db';
import logger from '../../config/logger';

export async function init() {
  logger.info('[feature] Init poke feature');
  onebot.on('notice.poke', async (data) => {
    if (data.target_id == onebot.qq) {
      if (await checkFeatureEnabled(data.group_id, 'poke')) {
        logger.info(
          '[feature.poke][Group: %d][User: %d]',
          data.group_id,
          data.user_id
        );
        new SendMessage({ message: new SendTextMessage('POKE') }).send({
          groupId: data.group_id,
        });
      }
    }
  });
}
