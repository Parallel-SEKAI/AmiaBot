import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';

export async function init() {
  onebot.registerCommand(
    undefined,
    'example',
    '示例指令',
    'example',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.example][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
    }
  );
}
