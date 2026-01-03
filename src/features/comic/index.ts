import { onebot } from '../../main';
import {
  SendMessage,
  SendImageMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity';
import { checkFeatureEnabled } from '../../service/db';
import { RecvMessage } from '../../onebot/message/recv.entity';
import logger from '../../config/logger';
import { getRandomComic } from './api';

export async function init() {
  logger.info('[feature] Init comic feature');
  onebot.on('message.command.comic', async (data) => {
    if (await checkFeatureEnabled(data.group_id, 'comic')) {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.comic][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      try {
        // 获取随机漫画图片URL
        const randomImageUrl = await getRandomComic();

        // 发送图片消息
        new SendMessage({
          message: new SendImageMessage(randomImageUrl),
        }).reply(message);
      } catch (error) {
        logger.error('[feature.comic] Error in comic feature:', error);
        // 发送错误提示
        new SendMessage({
          message: new SendTextMessage('获取漫画失败，请稍后重试'),
        }).reply(message);
      }
    }
  });
}
