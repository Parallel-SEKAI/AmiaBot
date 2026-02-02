import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import { User } from '../../onebot/user/user.entity.js';
import {
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';

/**
 * 初始化点赞功能
 * 注册 '赞我'、'点赞'、'like' 指令
 */
export async function init() {
  onebot.registerCommand(
    'like',
    /^(赞我|点赞|like)$/,
    '给用户点赞',
    '赞我',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.like][Group: %d][User: %d] Requesting like',
        message.groupId,
        message.userId
      );

      try {
        const user = new User(message.userId);
        // Default sends 50 likes (or whatever the default in User.sendLike is, which is 50)
        await user.sendLike();

        void new SendMessage({
          message: [new SendTextMessage('赞了！')],
        }).reply(message);
      } catch (e) {
        logger.error('[feature.like] Failed to send like: %s', e);
        void new SendMessage({
          message: [
            new SendTextMessage('点赞失败，可能今天已经赞过了或者发生了错误。'),
          ],
        }).reply(message);
      }
    }
  );
}
