import { onebot } from '../../onebot/index.js';
import { checkFeatureEnabled } from '../../service/db.js';
import logger from '../../config/logger.js';
import {
  SendAtMessage,
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';

interface GroupIncreaseEvent {
  time: number;
  self_id: number;
  post_type: 'notice';
  group_id: number;
  user_id: number;
  notice_type: 'group_increase';
  operator_id: number;
  sub_type: 'invite' | 'approve';
}

const welcomeMessages = [
  '欢迎来到本群～ 新朋友要不要先做个自我介绍呢？♪',
  '呀吼～ 欢迎新人！我是Amia，请多指教啦～',
  '欢迎加入！这里有很多有趣的人哦，希望能和你好好相处呢♪',
  '哎呀，有新面孔呢！欢迎欢迎～ 要不要一起聊聊有趣的事情？',
  '哼哼，欢迎来到这里～ 如果有什么不懂的，虽然我不一定全都知道，但也可以问问看哦♪',
  '欢迎～ 既然来了就别拘束，轻松一点就好啦！',
  '又是新的一天，又有新的伙伴加入了呢～ 欢迎你！',
  '欢迎光临～ 这里可是很热闹的哦，做好准备了吗？嘻嘻♪',
];

/**
 * Initialize the welcome feature
 * Listens for group_increase events and sends a welcome message
 */
export async function init() {
  logger.info('[feature] Init welcome feature');
  onebot.on('notice.group_increase', async (data: GroupIncreaseEvent) => {
    // Prevent bot from welcoming itself
    if (data.user_id === data.self_id) return;

    // Check if feature is enabled in the group
    if (await checkFeatureEnabled(data.group_id, 'welcome')) {
      logger.info(
        '[feature.welcome][Group: %d][User: %d] Welcome new member',
        data.group_id,
        data.user_id
      );

      // Send welcome message with mention
      try {
        const randomMessage =
          welcomeMessages[Math.floor(Math.random() * welcomeMessages.length)];
        await new SendMessage({
          groupId: data.group_id,
          message: [
            new SendAtMessage(data.user_id),
            new SendTextMessage(' ' + randomMessage),
          ],
        }).send();
      } catch (error) {
        logger.error(
          '[feature.welcome] Failed to send welcome message to group %d: %s',
          data.group_id,
          error
        );
      }
    }
  });
}
