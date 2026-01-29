import { config } from '../../config/index.js';
import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import {
  RecvImageMessage,
  RecvMessage,
} from '../../onebot/message/recv.entity.js';
import {
  SendForwardMessage,
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import { openai } from '../../service/openai.js'; // 使用已导出的 openai 实例
import {
  extractAfterCaseInsensitive,
  networkImageToBase64DataURL,
} from '../../utils/index.js';

export async function init() {
  logger.info('[feature] Init gemini feature');
  onebot.registerCommand(
    'gemini',
    'aichat',
    '与 Google Gemini AI 进行对话',
    'aichat 你好',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      logger.info(
        '[feature.gemini][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      const question = extractAfterCaseInsensitive(
        message.rawMessage,
        'gemini'
      ).trim();

      // 构建 OpenAI 消息格式
      const content: Array<any> = [{ type: 'text', text: question }];

      for (const msg of message.message) {
        if (msg instanceof RecvImageMessage && msg.url) {
          content.push({
            type: 'image_url',
            image_url: {
              url: await networkImageToBase64DataURL(msg.url, true),
            },
          });
        }
      }

      try {
        const response = await openai.chat.completions.create({
          model: config.openai.model,
          messages: [
            { role: 'system', content: '请使用中文回答' },
            { role: 'user', content: content },
          ],
          ...(config.openai.maxToken > 0
            ? { max_tokens: config.openai.maxToken }
            : {}),
        } as any);

        const usage = response.usage;
        let usageInfo = '';
        if (usage) {
          usageInfo = `Token Usage: Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`;
          logger.info('[Gemini] %s', usageInfo);
        }

        const choice = response.choices[0].message;
        const thoughts = (choice as any).reasoning_content || '';
        const answers = choice.content || '';

        if (thoughts) {
          logger.info('[feature.gemini] Thoughts: %s', thoughts);
        }
        if (answers) {
          logger.info('[feature.gemini] Answers: %s', answers);
        }

        await new SendMessage({
          message: new SendForwardMessage([
            {
              type: 'node',
              data: {
                userId: onebot.qq,
                nickname: onebot.nickname,
                content: [new SendTextMessage(`Model: ${config.openai.model}`)],
              },
            },
            {
              type: 'node',
              data: {
                userId: onebot.qq,
                nickname: onebot.nickname,
                content: [new SendTextMessage(usageInfo)],
              },
            },
            {
              type: 'node',
              data: {
                userId: onebot.qq,
                nickname: onebot.nickname,
                content: [new SendTextMessage('Answers:')],
              },
            },
            {
              type: 'node',
              data: {
                userId: onebot.qq,
                nickname: onebot.nickname,
                content: [
                  new SendTextMessage(answers.trim() || '<no answers>'),
                ],
              },
            },
            {
              type: 'node',
              data: {
                userId: onebot.qq,
                nickname: onebot.nickname,
                content: [new SendTextMessage('Thoughts:')],
              },
            },
            {
              type: 'node',
              data: {
                userId: onebot.qq,
                nickname: onebot.nickname,
                content: [
                  new SendTextMessage(thoughts.trim() || '<no thoughts>'),
                ],
              },
            },
          ]),
        }).send({ recvMessage: message });
      } catch (error) {
        logger.error('[feature.gemini] Error:', error);
        await new SendMessage({
          message: new SendTextMessage('AI 好像开小差了，请稍后再试喵~'),
        }).send({ recvMessage: message });
      }
    }
  );
}
