import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';

// Regex to match "选择 <option1> 还是 <option2> [还是 <option3> ...]"
// Matches "选择" followed by content, then at least one "还是" separator
const pattern = /^选择\s*(.+?)\s*还是\s*(.+)$/;

export async function init() {
  logger.info('[feature] Init choice feature');
  onebot.registerCommand(
    'choice',
    pattern,
    '多选一',
    '选择<选项1>还是<选项2>[还是<选项3>...]',
    async (data, match) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.choice][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );

      const m = match as RegExpExecArray;
      const firstOption = m[1].trim();
      const remainingText = m[2];

      // Split the remaining text by "还是", trim whitespace, and filter empty strings
      const otherOptions = remainingText
        .split(/\s*还是\s*/)
        .map((s) => s.trim())
        .filter((s) => s.length > 0);

      const choices = [firstOption, ...otherOptions];

      if (choices.length < 2) {
        // Should not happen due to regex, but safety check
        return;
      }

      const selected = choices[Math.floor(Math.random() * choices.length)];

      void new SendMessage({
        message: new SendTextMessage(`当然是${selected}啦`),
      }).reply(message);
    }
  );
}
