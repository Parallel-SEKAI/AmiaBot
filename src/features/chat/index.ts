import logger from '../../config/logger';
import { onebot } from '../../main';
import { RecvMessage } from '../../onebot/message/recv.entity';
import { SendMessage, SendTextMessage } from '../../onebot/message/send.entity';
import { checkFeatureEnabled } from '../../service/db';
import { readFileSync, writeFileSync } from 'fs';
import { openai } from '../../service/openai';
import { config } from '../../config';
import { renderTemplate } from '../../utils';
import { Group } from '../../onebot/group/group.entity';
import { User } from '../../onebot/user/user.entity';
import { z } from 'zod';
import {
  addChatHistory,
  getLatestChatHistory,
  getUserInfo,
  updateUserInfo,
} from './db';

const prompt = readFileSync('assets/chat/prompt.md', 'utf8');

const ChatResponseSchema = z.object({
  dialogue: z.string().describe('机器人的回复内容'),
  favor: z.number().min(-5).max(5).describe('对用户的好感度变化，范围-5到+5'),
  memory: z.string().describe('对用户的记忆'),
});

export async function init() {
  logger.info('[feature] Init chat feature');
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

    try {
      // 1. 读取用户信息
      const userInfo = await getUserInfo(message.userId!);
      logger.info(
        '[feature.chat][User: %d] 好感度: %d, 记忆: %s',
        message.userId,
        userInfo?.favor || 0,
        userInfo?.memory || '无'
      );

      const group = new Group(message.groupId!);
      const user = new User(message.userId, message.groupId!);

      // 2. 并行获取Onebot历史记录和数据库历史记录
      const [, , onebotHistory, dbHistory] = await Promise.all([
        group.init(),
        user.init(),
        group.getHistory({ count: 20 }), // Onebot获取的历史记录
        getLatestChatHistory(message.groupId!, 50), // 数据库获取的历史记录
      ]);

      // 3. 格式化Onebot历史记录
      const formattedOnebotHistory = onebotHistory
        .map((msg) => msg.toString())
        .join('\n');

      // 4. 格式化数据库历史记录
      const formattedDbHistory = dbHistory
        .map((history) => {
          return `(${history.user_nick}/${history.user_id})[${history.time.toLocaleString()}]${history.message}`;
        })
        .join('\n');

      let system = renderTemplate(prompt, {
        group: group.name,
        group_history: formattedOnebotHistory, // Onebot获取的历史记录
        history: formattedDbHistory, // 数据库获取的历史记录
        group_info: `
群名称: ${group.name}
群主ID: ${group.ownerId}
成员数量: ${group.memberCount}
最大成员数量: ${group.maxMemberCount}
群描述: ${group.description}
创建时间: ${group.createTime}
群等级: ${group.level}
活跃成员数量: ${group.activeMemberCount}
      `.trim(),
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
好感度: ${userInfo?.favor || 0}
记忆: ${userInfo?.memory || ''}
      `.trim(),
        message: message.toString(),
        favor: userInfo?.favor || 0,
        memory: userInfo?.memory || '',
      });

      // writeFileSync('prompt.input.md', system, 'utf8');

      // 调用OpenAI API
      const response = await openai.chat.completions.create({
        model: config.openai.model,
        messages: [{ role: 'user', content: system }],
        response_format: { type: 'json_object' },
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

          // 5. 存储用户的聊天记录
          await addChatHistory(
            message.groupId!,
            message.userId!,
            message.nickname!,
            message.rawMessage
          );

          // 6. 发送验证后的响应内容
          new SendMessage({
            message: new SendTextMessage(validatedResponse.dialogue),
          }).send({
            recvMessage: message,
          });

          // 7. 存储机器人的回复
          await addChatHistory(
            message.groupId!,
            0, // 机器人ID，使用0表示
            'Amia', // 机器人昵称
            validatedResponse.dialogue
          );

          // 8. 更新用户的好感度和记忆
          await updateUserInfo(
            message.userId!,
            validatedResponse.favor,
            validatedResponse.memory
          );

          logger.info(
            `[feature.chat] 好感度变化: ${validatedResponse.favor}, 记忆: ${validatedResponse.memory}`
          );
        } catch (error) {
          logger.error('[feature.chat] 解析JSON响应失败:', error);
          // 如果解析失败，回退到直接发送原始文本
          new SendMessage({ message: new SendTextMessage(responseText) }).send({
            recvMessage: message,
          });
        }
      }
    } catch (error) {
      logger.error('[feature.chat] 处理聊天消息失败:', error);
      // 发送错误提示
      new SendMessage({
        message: new SendTextMessage('抱歉，我现在有点忙，稍后再和你聊吧。'),
      }).send({
        recvMessage: message,
      });
    }
  }
}
