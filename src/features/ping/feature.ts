import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';

export async function init() {
  onebot.registerCommand('ping', 'ping', '測試指令', 'ping', async (data) => {
    const message = RecvMessage.fromMap(data);
    logger.info(
      '[feature.ping][Group: %d][User: %d] %s',
      message.groupId,
      message.userId,
      message.rawMessage
    );

    void new SendMessage({
      message: [new SendTextMessage('pong')],
    }).reply(message);
  });
}
