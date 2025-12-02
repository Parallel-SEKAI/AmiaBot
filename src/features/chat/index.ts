import logger from '../../config/logger';
import { onebot } from '../../main';
import { RecvMessage } from '../../onebot/message/recv.entity';
import { SendMessage, SendTextMessage } from '../../onebot/message/send.entity';
import { checkFeatureEnabled } from '../../service/db';
import { readFileSync } from 'fs';
import { gemini } from '../../service/gemini';
import { config } from '../../config';
import { renderTemplate } from '../../utils';
import {
  FunctionCallingConfigMode,
  FunctionDeclaration,
  Tool,
  Type,
} from '@google/genai';
import { getCharacterAlias, searchMusic, sendMusic } from './functions';
import { Group } from '../../onebot/group/group.entity';
import { User } from '../../onebot/user/user.entity';

const prompt = readFileSync('assets/chat/prompt.txt', 'utf8');

const functions: FunctionDeclaration[] = [
  {
    name: 'send_text',
    description: '发送文本消息',
    parameters: {
      type: Type.OBJECT,
      properties: {
        text: {
          type: Type.STRING,
          description: '要发送的文本',
        },
      },
      required: ['text'],
    },
  },
  {
    name: 'get_character_alias',
    description: '输入角色的原名(别名),返回该角色的所有别名',
    parameters: {
      type: Type.OBJECT,
      properties: {
        alias: {
          type: Type.STRING,
          description: '角色的别名',
        },
      },
      required: ['alias'],
    },
  },
  {
    name: 'search_music',
    description: '搜索音乐',
    parameters: {
      type: Type.OBJECT,
      properties: {
        query: {
          type: Type.STRING,
          description: '搜索查询',
        },
      },
      required: ['query'],
    },
  },
  {
    name: 'send_music',
    description: '发送音乐',
    parameters: {
      type: Type.OBJECT,
      properties: {
        songId: {
          type: Type.NUMBER,
          description: '音乐ID',
        },
      },
      required: ['songId'],
    },
  },
  {
    name: 'finish',
    description: '请记住,当你认为轮到用户时,调用此函数',
  },
];

export async function init() {
  logger.info('[feature] Init chat feature');
  onebot.on('message.command.amia', chat);
  onebot.on('message.group', async (data) => {
    const message = RecvMessage.fromMap(data);
    if (message.content.toLowerCase().startsWith('amia')) {
      await chat(data);
    }
  });
}

async function chat(data: Record<string, any>) {
  if (await checkFeatureEnabled(data.group_id, 'chat')) {
    const message = RecvMessage.fromMap(data);
    logger.info(
      '[feature.chat][Group: %d][User: %d] %s',
      message.groupId,
      message.userId,
      message.rawMessage
    );
    const group = new Group(message.groupId!);
    const user = new User(message.userId, message.groupId!);
    const [, , group_history] = await Promise.all([
      group.init(),
      user.init(),
      group.getHistory(),
    ]);
    let system = renderTemplate(prompt, {
      group: group.name,
      group_history: group_history.map((e) => e.toString()).join('\n'),
      group_info: `
        群名称: ${group.name}
        群主ID: ${group.ownerId}
        成员数量: ${group.memberCount}
        最大成员数量: ${group.maxMemberCount}
        群描述: ${group.description}
        创建时间: ${group.createTime}
        群等级: ${group.level}
        活跃成员数量: ${group.activeMemberCount}
      `,
      time: new Date().toLocaleString(),
      user: `
      昵称: ${user.nickname}
      备注: ${user.remark}
      性别: ${user.sex}
      年龄: ${user.age}
      QQ等级: ${user.qqLevel}
      生日: ${user.birthday ? user.birthday.toLocaleDateString() : '未知'}
      个性签名: ${user.longNick}
      国家: ${user.country}
      省份: ${user.province}
      城市: ${user.city}
      邮箱: ${user.email}
      注册年份: ${user.regYear}
      是否VIP: ${user.isVip}
      是否年费VIP: ${user.isYearsVip}
      VIP等级: ${user.vipLevel}
      群名片: ${user.card}
      群等级: ${user.groupLevel}
      加入时间: ${user.joinTime ? user.joinTime.toLocaleString() : '未知'}
      最后发言时间: ${user.lastSentTime ? user.lastSentTime.toLocaleString() : '未知'}
      是否机器人: ${user.isRobot}
      群角色: ${user.role}
      群头衔: ${user.title}
      `,
    });
    const chat = gemini.chats.create({
      model: config.gemini.model,
      config: {
        tools: [
          {
            functionDeclarations: functions,
          },
        ],
        toolConfig: {
          functionCallingConfig: {
            mode: FunctionCallingConfigMode.ANY,
          },
        },
        thinkingConfig: {
          thinkingBudget: 24576,
          includeThoughts: true,
        },
        systemInstruction: system,
      },
    });
    let response = await chat.sendMessage({
      message: message.toString(),
    });
    let functionName = null;
    let functionResult = null;
    let lastSendMessage = '';
    for (let i = 0; i < 5; i++) {
      if (functionResult) {
        const maxRetry = 3;
        for (let retry = 0; retry < maxRetry; retry++) {
          try {
            response = await chat.sendMessage({
              message: [
                {
                  functionResponse: {
                    name: functionName || '',
                    response: { result: functionResult },
                  },
                },
              ],
            });
            functionName = null;
            functionResult = null;
            break;
          } catch (err) {
            logger.error('[chat] sendMessage failed, retrying: %s', err);
            await new Promise((resolve) => setTimeout(resolve, retry * 2000));
            if (retry === maxRetry - 1) throw err;
          }
        }
      }
      const usage = response.usageMetadata;
      let usageInfo = '';
      if (usage) {
        usageInfo = `Token Usage: Prompt: ${usage.promptTokenCount || 0}, Candidates: ${usage.candidatesTokenCount || 0}, Thoughts: ${usage.thoughtsTokenCount || 0}, ToolUse: ${usage.toolUsePromptTokenCount || 0}, Total: ${usage.totalTokenCount || 0}`;
        logger.info('[Gemini] %s', usageInfo);
      }
      let thoughts = '';
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (!part.text) {
            continue;
          } else if (part.thought) {
            thoughts += part.text;
          }
        }
      }
      if (thoughts) {
        logger.info(`[Gemini] Thoughts: ${thoughts}`);
      }
      if (response.functionCalls && response.functionCalls.length > 0) {
        const functionCall = response.functionCalls[0];
        logger.info(`[Gemini] Function to call: ${functionCall.name}`);
        logger.info(`[Gemini] Arguments: ${JSON.stringify(functionCall.args)}`);
        functionName = functionCall.name;
        switch (functionName) {
          case 'send_text':
            const text = functionCall.args?.text as string;
            if (text !== lastSendMessage) {
              lastSendMessage = text;
              new SendMessage({ message: new SendTextMessage(text) }).send({
                recvMessage: message,
              });
            } else {
              return;
            }
            functionResult = 'ok';
            break;
          case 'get_character_alias':
            const alias = functionCall.args?.alias as string;
            const aliases = await getCharacterAlias(alias);
            functionResult = aliases;
            break;
          case 'search_music':
            const query = functionCall.args?.query as string;
            functionResult = await searchMusic(query);
            break;
          case 'send_music':
            const songId = functionCall.args?.songId as number;
            functionResult = await sendMusic(message, songId);
            break;
          case 'finish':
            return;
          default:
            return;
        }
      } else {
        break;
      }
    }
  }
}
