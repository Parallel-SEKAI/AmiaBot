import logger from '../../config/logger';
import { onebot } from '../../main';
import {
  RecvImageMessage,
  RecvMessage,
} from '../../onebot/message/recv.entity';
import {
  SendForwardMessage,
  SendMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity';
import { checkFeatureEnabled } from '../../service/db';
import { openai } from '../../service/openai'; // 使用已导出的 openai 实例
import {
  extractAfterCaseInsensitive,
  networkImageToBase64DataURL,
} from '../../utils';

export async function init() {
  logger.info('[feature] Init gemini feature');
  onebot.on('message.command.gemini', async (data) => {
    if (await checkFeatureEnabled(data.group_id, 'gemini')) {
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
      let content: Array<any> = [{ type: 'text', text: question }];
      
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
          model: 'gemini-2.0-flash', // 确保您的端点支持此模型名称
          messages: [
            { role: 'system', content: '请使用中文回答' },
            { role: 'user', content: content },
          ],
          // 注意：OpenAI SDK 不直接支持 thinkingConfig 等原生 Gemini 参数
          // 如果是通过特定中转使用，可能需要通过 extra_body 传入
          extra_body: {
            thinking_config: {
              include_thoughts: true,
            }
          }
        } as any);

        const usage = response.usage;
        let usageInfo = '';
        if (usage) {
          usageInfo = `Token Usage: Prompt: ${usage.prompt_tokens}, Completion: ${usage.completion_tokens}, Total: ${usage.total_tokens}`;
          logger.info('[Gemini] %s', usageInfo);
        }

        const choice = response.choices[0].message;
        let thoughts = (choice as any).reasoning_content || ''; 
        let answers = choice.content || '';

        if (thoughts) {
          logger.info(`[Gemini] Thoughts: ${thoughts}`);
        }
        if (answers) {
          logger.info(`[Gemini] Answers: ${answers}`);
        }

        await new SendMessage({
          message: new SendForwardMessage([
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
                content: [new SendTextMessage(answers.trim() || '<no answers>')],
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
        logger.error('[Gemini] Error: %o', error);
      }
    }
  });
}
