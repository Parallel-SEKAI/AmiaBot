import { onebot } from '../../onebot/index.js';
import {
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import logger from '../../config/logger.js';
import { getRandomComic } from './api.js';
import { createComicMessages } from './message.js';

/**
 * 初始化漫画查询功能模块
 * 注册 '查漫画' 指令，获取并回复随机漫画图片
 */
export async function init() {
  logger.info('[feature] Init comic feature');
  onebot.registerCommand(
    '查漫画',
    'comic',
    '随机 Project Sekai 漫画图片',
    'comic',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.comic][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      try {
        const comic = await getRandomComic();

        void new SendMessage({
          message: createComicMessages(comic),
        }).reply(message);
      } catch (error) {
        logger.error('[feature.comic] Error in comic feature:', error);
        void new SendMessage({
          message: new SendTextMessage('获取漫画失败，请稍后重试'),
        }).reply(message);
      }
    }
  );
}
