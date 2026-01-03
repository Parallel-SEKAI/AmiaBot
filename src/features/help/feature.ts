import { config } from '../../config';
import logger from '../../config/logger';
import { onebot } from '../../main';
import { RecvMessage } from '../../onebot/message/recv.entity';
import { SendMessage, SendTextMessage } from '../../onebot/message/send.entity';

export async function init() {
  logger.info('[feature] Init help feature');
  onebot.registerCommand('help', async (data) => {
    const message = RecvMessage.fromMap(data);
    logger.info(
      '[feature.help][Group: %d][User: %d] %s',
      message.groupId,
      message.userId,
      message.rawMessage
    );
    new SendMessage({
      message: new SendTextMessage(config.helpText.replace(/\\n/g, '\n')),
    }).reply(message);
  });
}
