import logger from '../../config/logger';
import { onebot } from '../../main';
import {
  RecvMessage,
  RecvImageMessage,
} from '../../onebot/message/recv.entity';
import { SendMessage, SendTextMessage } from '../../onebot/message/send.entity';
import { readFileSync } from 'fs';
import { join } from 'path';
import { openai } from '../../service/openai';
import { config } from '../../config';
import { renderTemplate, networkImageToBase64DataURL } from '../../utils';
import { Group } from '../../onebot/group/group.entity';
import { User } from '../../onebot/user/user.entity';
import { z } from 'zod';
import {
  addChatHistory,
  getLatestChatHistory,
  getUserInfo,
  updateUserInfo,
} from './db';
import { FeatureModule } from '../feature-manager';
import { checkFeatureEnabled } from '../../service/db';

const prompt = readFileSync(
  join(process.cwd(), 'assets/chat/prompt.md'),
  'utf8'
);

const ChatResponseSchema = z.object({
  dialogue: z.string().describe('机器人的回复内容'),
  favor: z.number().min(-5).max(5).describe('对用户的好感度变化，范围-5到+5'),
  memory: z.string().describe('对用户的记忆'),
});

export async function init() {
  logger.info('[feature] Init chat feature');

  // 全局记录所有群聊消息，以便为 AI 提供完整的上下文背景
  onebot.on('message.group', async (data) => {
    try {
      // 检查该群是否开启了 chat 功能
      const enabled = await checkFeatureEnabled(data.group_id, 'chat');
      if (!enabled) return;

      const message = RecvMessage.fromMap(data);
      // 存储消息到数据库，确保 nickname 不为 null
      await addChatHistory(
        message.groupId || 0,
        message.userId || 0,
        message.nickname || '未知用户',
        message.rawMessage || ''
      );
    } catch (error) {
      logger.error('[feature.chat] 全局消息记录失败:', error);
    }
  });

  onebot.registerCommand(
    'amia',
    async (data) => {
      await chat(data);
    },
    'chat'
  );
}

async function chat(data: Record<string, any>) {
  const message = RecvMessage.fromMap(data);
  const groupId = message.groupId || 0;
  const userId = message.userId || 0;

  logger.info(
    '[feature.chat][Group: %d][User: %d] %s',
    groupId,
    userId,
    message.rawMessage
  );

  try {
    // 1. 读取用户信息
    const userInfo = await getUserInfo(userId);
    logger.info(
      '[feature.chat][User: %d] favor: %d, memory: %s',
      userId,
      userInfo?.favor || 0,
      userInfo?.memory || 'none'
    );

    const user = new User(userId, groupId);
    const group = groupId ? new Group(groupId) : null;

    // 2. 并行获取Onebot历史记录和数据库历史记录
    const tasks: Promise<any>[] = [user.init()];
    if (group) {
      tasks.push(group.init());
      tasks.push(group.getHistory({ count: 20 }));
      tasks.push(getLatestChatHistory(groupId, 50));
    } else {
      // 私聊处理
      tasks.push(Promise.resolve());
      tasks.push(Promise.resolve([]));
      tasks.push(Promise.resolve([]));
    }

    const [, , onebotHistory, dbHistory] = await Promise.all(tasks);

    // 3. 格式化Onebot历史记录
    const formattedOnebotHistory = onebotHistory
      .map((msg: any) => msg.toString())
      .join('\n');

    // 4. 格式化数据库历史记录
    const formattedDbHistory = dbHistory
      .map((history: any) => {
        return `(${history.user_nick}/${history.user_id})[${history.time.toLocaleString()}]${history.message}`;
      })
      .join('\n');

    // 构建内容数组，包含文本和图片
    let content: Array<any> = [{ type: 'text', text: message.toString() }];

    // 处理消息中的图片
    for (const msg of message.message) {
      if (msg instanceof RecvImageMessage && msg.url) {
        try {
          const base64Image = await networkImageToBase64DataURL(msg.url, true);
          content.push({
            type: 'image_url',
            image_url: {
              url: `data:image/jpeg;base64,${base64Image}`,
            },
          });
        } catch (error) {
          logger.error('[feature.chat] Failed to process image:', error);
          content.push({
            type: 'text',
            text: '[Unable to process image]',
          });
        }
      }
    }

    let system = renderTemplate(prompt, {
      group: group?.name || '私聊',
      group_history: formattedOnebotHistory,
      history: formattedDbHistory,
      group_info: group
        ? `
群名称: ${group.name}
群主ID: ${group.ownerId}
成员数量: ${group.memberCount}
最大成员数量: ${group.maxMemberCount}
群描述: ${group.description}
创建时间: ${group.createTime}
群等级: ${group.level}
活跃成员数量: ${group.activeMemberCount}
      `.trim()
        : '私聊环境',
      time: new Date().toLocaleString(),
      user: `
昵称: ${user.nickname || '未知'}
备注: ${user.remark || '无'}
性别: ${user.sex || '未知'}
年龄: ${user.age || '未知'}
QQ等级: ${user.qqLevel || '未知'}
生日: ${user.birthday ? user.birthday.toLocaleDateString() : '未知'}
个性签名: ${user.longNick || '无'}
国家: ${user.country || '未知'}
省份: ${user.province || '未知'}
城市: ${user.city || '未知'}
邮箱: ${user.email || '未知'}
注册年份: ${user.regYear || '未知'}
是否VIP: ${user.isVip}
是否年费VIP: ${user.isYearsVip}
VIP等级: ${user.vipLevel}
群名片: ${user.card || '无'}
群等级: ${user.groupLevel || '未知'}
加入时间: ${user.joinTime ? user.joinTime.toLocaleString() : '未知'}
最后发言时间: ${user.lastSentTime ? user.lastSentTime.toLocaleString() : '未知'}
是否机器人: ${user.isRobot}
群角色: ${user.role || '未知'}
群头衔: ${user.title || '无'}
好感度: ${userInfo?.favor || 0}
记忆: ${userInfo?.memory || ''}
      `.trim(),
      favor: userInfo?.favor || 0,
      memory: userInfo?.memory || '',
    });

    // 调用OpenAI API
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: content },
      ],
      response_format: { type: 'json_object' },
      ...(config.openai.maxToken > 0
        ? { max_tokens: config.openai.maxToken }
        : {}),
    });

    const usage = response.usage;
    if (usage) {
      const usageInfo = `Token Usage: Prompt: ${usage.prompt_tokens || 0}, Completion: ${usage.completion_tokens || 0}, Total: ${usage.total_tokens || 0}`;
      logger.info('[OpenAI] %s', usageInfo);
    }

    const responseText = response.choices[0]?.message?.content || '';

    if (responseText) {
      try {
        // 解析JSON响应
        const cleanedResponse = responseText
          .trim()
          .replace(/^```json\s*\n|\n```$/g, '');
        const parsedResponse = JSON.parse(cleanedResponse);

        // 使用Zod schema验证响应
        const validatedResponse = ChatResponseSchema.parse(parsedResponse);

        // 5. 存储用户的聊天记录 (私聊消息在全局监听中未覆盖，需在此处记录)
        if (!message.groupId) {
          await addChatHistory(
            0,
            userId,
            message.nickname || '未知用户',
            message.rawMessage || ''
          ).catch(() => {});
        }

        // 6. 发送验证后的响应内容
        await new SendMessage({
          message: new SendTextMessage(validatedResponse.dialogue),
        }).send({
          recvMessage: message,
        });

        // 7. 存储机器人的回复
        await addChatHistory(
          groupId,
          0,
          'Amia',
          validatedResponse.dialogue
        ).catch((err) =>
          logger.error('[feature.chat] Failed to record robot response:', err)
        );

        // 8. 更新用户的好感度和记忆
        await updateUserInfo(
          userId,
          validatedResponse.favor,
          validatedResponse.memory
        );

        logger.info(
          '[feature.chat] Favor change: %d, memory: %s',
          validatedResponse.favor,
          validatedResponse.memory
        );
      } catch (error) {
        logger.error('[feature.chat] Failed to process AI response:', error);
        // 如果解析失败，回退到直接发送原始文本
        new SendMessage({ message: new SendTextMessage(responseText) }).send({
          recvMessage: message,
        });
      }
    }
  } catch (error) {
    logger.error('[feature.chat] Failed to process chat message:', error);
    new SendMessage({
      message: new SendTextMessage('抱歉，我现在有点忙，稍后再和你聊吧。'),
    }).send({
      recvMessage: message,
    });
  }
}
