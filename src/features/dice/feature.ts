import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';

const pattern = /^r(\d*)d(\d*)/i;

export function parseDiceCommand(
  message: string
): { count: number; sides: number } | null {
  const match = message.match(pattern);
  if (match) {
    const count = parseInt(match[1]) || 1;
    const sides = parseInt(match[2]) || 100;
    return { count, sides };
  }
  return null;
}

export async function init() {
  logger.info('[feature] Init dice feature');
  onebot.registerCommand(
    pattern,
    async (data, match) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.dice][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );

      const m = match as RegExpExecArray;
      const count = parseInt(m[1]) || 1;
      const sides = parseInt(m[2]) || 100;

      const results: number[] = [];
      for (let i = 0; i < count; i++) {
        results.push(Math.floor(Math.random() * sides) + 1);
      }
      void new SendMessage({
        message: new SendTextMessage(`You rolled: ${results.join(', ')}`),
      }).reply(message);
    },
    'dice'
  );
}
