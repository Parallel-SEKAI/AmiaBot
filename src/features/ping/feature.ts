import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';

/**
 * 初始化 Ping 功能模块
 * 注册 'ping' 指令，用于基础的连接与响应测试
 */
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
