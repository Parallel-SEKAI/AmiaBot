import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const jokePatterns = ['joke', '笑话', '讲个笑话'];

// 从文件中读取笑话
const jokes = fs
  .readFileSync(path.join(__dirname, '../../../assets/joke/jokes.txt'), 'utf-8')
  .split('\n')
  .filter((joke) => joke.trim() !== '');

/**
 * 初始化笑话功能模块
 * 注册多个触发短语，随机发送笑话
 */
export async function init() {
  logger.info('[feature] Init joke feature');

  // 注册多个触发短语
  for (const pattern of jokePatterns) {
    onebot.registerCommand(
      'joke',
      pattern,
      '随机发送笑话',
      'joke',
      async (data, _match) => {
        const message = RecvMessage.fromMap(data);
        logger.info(
          '[feature.joke][Group: %d][User: %d] %s',
          message.groupId,
          message.userId,
          message.rawMessage
        );

        // 随机选择一个笑话
        const randomJoke = jokes[Math.floor(Math.random() * jokes.length)];

        // 发送笑话
        void new SendMessage({
          message: new SendTextMessage(randomJoke),
        }).reply(message);
      }
    );
  }
}
