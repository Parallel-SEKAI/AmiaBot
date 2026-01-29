import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import { SleepService, TimeStatus } from '../../service/sleep.js';

const WAKE_KEYWORDS =
  /^(早|早安|早上好|早啊|good\s*morning|ohayou|ohayo|おはよう|早安安)$/i;
const SLEEP_KEYWORDS =
  /^(晚安|晚安安|睡了|睡觉了|good\s*night|oyasumi|おやすみ|去睡了)$/i;

const WAKE_MOCKS = [
  '都几点了还起床，太阳都晒屁股了！',
  '晚上不睡，白天不起，作息混乱！',
  '起床了不起床了，就知道躺着！',
];

const SLEEP_MOCKS = [
  '才几点就睡觉，夜猫子变懒猫了？',
  '太阳还老高你就睡了，作息颠倒！',
  '晚上不睡，白天不起，节奏混乱！',
];

function getRandomMock(type: 'WAKE' | 'SLEEP'): string {
  const mocks = type === 'WAKE' ? WAKE_MOCKS : SLEEP_MOCKS;
  return mocks[Math.floor(Math.random() * mocks.length)];
}

export async function init() {
  logger.info('[feature] Init sleep-tracker feature');

  onebot.on('message', async (data: Record<string, any>) => {
    if (data.user_id === onebot.qq) return;

    const message = RecvMessage.fromMap(data);
    const content = message.content?.trim();
    if (!content || !message.groupId) return;

    // Handle Wake
    if (WAKE_KEYWORDS.test(content)) {
      try {
        const result = await SleepService.recordWakeTime(
          message.userId,
          message.groupId
        );

        if (result.status === 'UNREASONABLE') {
          await message.reply(
            new SendMessage({
              message: new SendTextMessage(getRandomMock('WAKE')),
            })
          );
          return;
        }

        let replyText = `早上好！你是在本群第 ${result.rank} 个起床的，在所有群第 ${result.globalRank} 个起床的。`;
        if (result.sleepDuration !== undefined) {
          replyText += `\n昨晚睡了 ${result.sleepDuration} 小时。`;
        }

        await message.reply(
          new SendMessage({
            message: new SendTextMessage(replyText),
          })
        );
      } catch (err) {
        logger.error('[feature.sleep-tracker] Error recording wake time:', err);
      }
      return;
    }

    // Handle Sleep
    if (SLEEP_KEYWORDS.test(content)) {
      try {
        const result = await SleepService.recordSleepTime(
          message.userId,
          message.groupId
        );

        if (result.status === 'UNREASONABLE') {
          await message.reply(
            new SendMessage({
              message: new SendTextMessage(getRandomMock('SLEEP')),
            })
          );
          return;
        }

        let replyText = `晚安！你是在本群第 ${result.rank} 个睡觉的，在所有群第 ${result.globalRank} 个睡觉的。`;
        if (result.wakeDuration !== undefined) {
          replyText += `\n今天清醒了 ${result.wakeDuration} 小时。`;
        }

        await message.reply(
          new SendMessage({
            message: new SendTextMessage(replyText),
          })
        );
      } catch (err) {
        logger.error(
          '[feature.sleep-tracker] Error recording sleep time:',
          err
        );
      }
      return;
    }
  });
}
