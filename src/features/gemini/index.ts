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
import { gemini } from '../../service/gemini';
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
        '[gemini][Group: %d][User: %d] %s',
        message.groupId,
        message.userId,
        message.rawMessage
      );
      const question = extractAfterCaseInsensitive(
        message.rawMessage,
        'gemini'
      ).trim();
      let contents: Array<Record<string, any>> = [];
      for (const msg of message.message) {
        if (msg instanceof RecvImageMessage && msg.url) {
          contents.push({
            inlineData: {
              mimeType: 'image/jpeg',
              data: await networkImageToBase64DataURL(msg.url, true),
            },
          });
        }
      }
      contents.push({ text: question });
      const response = await gemini.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
          thinkingConfig: {
            thinkingBudget: 24576,
            includeThoughts: true,
          },
          tools: [
            { urlContext: {} },
            { codeExecution: {} },
            {
              googleSearch: {},
            },
          ],
          systemInstruction: '请使用中文回答',
        },
      });
      const usage = response.usageMetadata;
      let usageInfo = '';
      if (usage) {
        usageInfo = `Token Usage: Prompt: ${usage.promptTokenCount || 0}, Candidates: ${usage.candidatesTokenCount || 0}, Thoughts: ${usage.thoughtsTokenCount || 0}, ToolUse: ${usage.toolUsePromptTokenCount || 0}, Total: ${usage.totalTokenCount || 0}`;
        logger.info('[Gemini] %s', usageInfo);
      }
      let thoughts = '';
      let answers = '';
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (!part.text) {
            continue;
          } else if (part.thought) {
            thoughts += part.text;
          } else {
            answers += part.text;
          }
        }
      }
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
    }
  });
}
