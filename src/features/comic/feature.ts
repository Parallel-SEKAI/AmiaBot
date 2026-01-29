import { onebot } from '../../onebot/index.js';
import {
  SendMessage,
  SendImageMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import logger from '../../config/logger.js';
import { getRandomComic } from './api.js';

/**
 * 初始化漫画查询功能模块
 * 注册 '查漫画' 指令，获取并回复随机漫画图片
 */
export async function init() {
  logger.info('[feature] Init comic feature');
  onebot.registerCommand(
    'comic',
    '查漫画',
    '通过图片查询漫画来源',
    '查漫画 [图片]',
    async (data) => {
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
        void new SendMessage({
          message: new SendImageMessage(randomImageUrl),
        }).reply(message);
      } catch (error) {
        logger.error('[feature.comic] Error in comic feature:', error);
        // 发送错误提示
        void new SendMessage({
          message: new SendTextMessage('获取漫画失败，请稍后重试'),
        }).reply(message);
      }
    }
  );
}
