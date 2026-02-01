import React from 'react';
import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendTextMessage,
  SendImageMessage,
} from '../../onebot/message/send.entity.js';
import { openai } from '../../service/openai.js';
import { renderTemplate } from '../../utils/index.js';
import { existsSync, promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { Group } from '../../onebot/group/group.entity.js';
import { config } from '../../config/index.js';
import { ReactRenderer } from '../../service/render/react.js';
import { StatsCard } from '../../components/message-statistics/StatsCard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const imagePattern = /\[CQ:image.+\]/g;

// 定义分析结果类型
interface Topic {
  topic_id: number;
  topic_name: string;
  participants: number[];
  content: string;
}

interface MemberTitle {
  qq_number: number;
  title: string;
  feature: string;
}

interface Bible {
  sentence: string;
  interpreter: number;
  explanation: string;
}

interface AnalysisResult {
  hot_topics: Topic[];
  group_members_titles: MemberTitle[];
  group_bible: Bible[];
}

// 定义锁对象，用于控制同一群聊的并发请求
const groupLocks: Map<number, Promise<void>> = new Map();

// 定义最后使用时间，用于控制请求频率
const groupLastUsedTime = new Map<number, number>();

// 获取prompt模板
async function getPromptTemplate(): Promise<string> {
  const promptPath = join(
    __dirname,
    '../../../assets/message-statistics/prompt.md'
  );
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  return await fs.readFile(promptPath, 'utf-8');
}

// 构建渲染数据并生成图片
async function generateStatisticsImage(
  groupName: string,
  startTime: string,
  endTime: string,
  messageCount: number,
  memberCount: number,
  analysisTime: number,
  tokenUsage: string,
  analysisResult: AnalysisResult,
  group: Group
): Promise<Buffer> {
  // 获取群成员信息，用于转换QQ号为真实昵称
  const members = await group.getMembers();
  const memberMap = new Map<number, string>();
  members.forEach((member) => {
    memberMap.set(member.id, member.fullName);
  });

  const props = {
    groupName,
    startTime,
    endTime,
    messageCount,
    memberCount,
    analysisTime: analysisTime.toFixed(2),
    tokenUsage,
    hot_topics: analysisResult.hot_topics ?? [],
    group_members_titles: (analysisResult.group_members_titles ?? []).map(
      (t) => ({
        ...t,
        name: memberMap.get(t.qq_number) || `QQ${t.qq_number}`,
      })
    ),
    group_bible: (analysisResult.group_bible ?? []).map((b) => ({
      ...b,
      name: memberMap.get(b.interpreter) || `QQ${b.interpreter}`,
    })),
  };

  return await ReactRenderer.renderToImage(
    React.createElement(StatsCard, props)
  );
}

/**
 * 初始化消息统计功能模块
 * 注册 '消息统计' 指令，获取群聊历史记录并利用 AI 分析热门话题、成员称号及金句
 */
export async function init() {
  logger.info('[feature] Init message-statistics feature');
  onebot.registerCommand(
    'message-statistics',
    '消息统计',
    '统计群组或个人的消息数据',
    '群统计',
    async (data, _match) => {
      const message = RecvMessage.fromMap(data);
      await handleMessageStatistics(message);
    }
  );
}

// 处理消息统计逻辑
async function handleMessageStatistics(message: RecvMessage) {
  logger.info(
    '[feature.message-statistics][Group: %d][User: %d] %s',
    message.groupId,
    message.userId,
    message.rawMessage
  );

  let releaseLock: (() => void) | undefined;
  let lockPromise: Promise<void> | undefined;

  try {
    // 获取群信息
    if (!message.groupId) {
      throw new Error('Group ID not found in message');
    }

    // 检查请求频率
    const now = Date.now();
    const lastUsedTime = groupLastUsedTime.get(message.groupId) || 0;
    if (now - lastUsedTime < config.messageStatistics.cooldownTime) {
      const waitTime = Math.ceil(
        (config.messageStatistics.cooldownTime - (now - lastUsedTime)) / 1000
      );
      await message.reply(
        new SendMessage({
          message: new SendTextMessage(`因为请求频率限制，请等待${waitTime}秒`),
          groupId: message.groupId,
        })
      );
      return;
    }

    // 使用锁控制同一群聊的并发请求
    // Implement a simple queue mechanism
    const currentLock = groupLocks.get(message.groupId) || Promise.resolve();

    // Create a new lock for this request
    lockPromise = new Promise<void>((resolve) => {
      releaseLock = resolve;
    });

    // Update the map to point to our new lock, so next request waits for us
    groupLocks.set(message.groupId, lockPromise);

    // Wait for the previous request to finish
    await currentLock;

    // Update timestamp *after* acquiring lock
    groupLastUsedTime.set(message.groupId, Date.now());

    const group = new Group(message.groupId);
    await group.init();

    // 获取消息历史
    const history = await group.getHistory({
      count: config.messageStatistics.maxMessageCount,
    });
    if (!history || history.length === 0) {
      throw new Error(`No messages found for group: ${message.groupId}`);
    }

    // 过滤最近RECENT_DAYS天的消息
    const recentDaysAgo = new Date();
    // Use Asia/Shanghai timezone offset (+8) to align with business logic if needed,
    // but here we just need a consistent "days ago" cutoff.
    // Setting to 00:00:00 of N days ago in local server time is acceptable if consistent.
    // However, ensuring we don't depend on server timezone for "day start" (which is 00:00)
    // improves consistency.
    recentDaysAgo.setDate(
      recentDaysAgo.getDate() - config.messageStatistics.recentDays
    );
    recentDaysAgo.setHours(0, 0, 0, 0);

    const filteredHistory = history.filter((msg: RecvMessage) => {
      const msgTime = new Date(msg.time);
      return msgTime >= recentDaysAgo;
    });

    if (filteredHistory.length === 0) {
      throw new Error(
        `No messages found in the last ${config.messageStatistics.recentDays} days for group: ${message.groupId}`
      );
    }

    // 格式化消息数据，确保不超过最大长度（优先保留新消息）
    // 从新到旧排序
    const sortedMessages = filteredHistory.sort(
      (a: RecvMessage, b: RecvMessage) => {
        const timeA = new Date(a.time).getTime();
        const timeB = new Date(b.time).getTime();
        return timeB - timeA;
      }
    );

    const selectedMessages: string[] = [];
    let currentLength = 0;

    for (const msg of sortedMessages) {
      const msgStr = msg.toString() + '\n';
      if (
        currentLength + msgStr.length >
        config.messageStatistics.maxMessageTextLength
      ) {
        break;
      }
      selectedMessages.push(msgStr);
      currentLength += msgStr.length;
    }

    // 反转数组以恢复按时间正序（从旧到新）排列
    let formattedMessages = selectedMessages.reverse().join('');

    formattedMessages = formattedMessages.replace(imagePattern, '[CQ:image]');

    // 获取群成员信息
    const memberSet = new Set<number>();
    filteredHistory.forEach((msg: RecvMessage) => {
      if (msg.userId) {
        memberSet.add(msg.userId);
      }
    });
    const memberCount = memberSet.size;

    // 获取开始和结束时间
    const startTime = new Date(filteredHistory[0].time)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');
    const endTime = new Date(filteredHistory[filteredHistory.length - 1].time)
      .toISOString()
      .slice(0, 19)
      .replace('T', ' ');

    // 发送正在分析的消息
    const startMessage = await message.reply(
      new SendMessage({
        message: new SendTextMessage(
          `已获取到${filteredHistory.length}条消息
${startTime} - ${endTime}
正在分析喵~`
        ),
        groupId: message.groupId,
      })
    );

    // 调用OpenAI分析消息
    const prompt = await getPromptTemplate();

    // 构建群信息
    const groupInfo = `
群名称: ${group.name}
群主ID: ${group.ownerId}
成员数量: ${group.memberCount}
最大成员数量: ${group.maxMemberCount}
群描述: ${group.description}
创建时间: ${group.createTime}
群等级: ${group.level}
活跃成员数量: ${group.activeMemberCount}
    `.trim();

    const filledPrompt = renderTemplate(prompt, {
      group: groupInfo,
      messages: formattedMessages,
    });

    // 调用OpenAI API
    const aiStartTime = Date.now();
    const response = await openai.chat.completions.create({
      model: config.openai.model,
      messages: [
        {
          role: 'system',
          content: '请严格按照JSON格式返回，不要在JSON前后添加任何其他内容',
        },
        { role: 'user', content: filledPrompt },
      ],
      response_format: { type: 'json_object' },
      ...(config.openai.maxToken > 0
        ? { max_tokens: config.openai.maxToken }
        : {}),
    });
    const aiEndTime = Date.now();
    const analysisTime = (aiEndTime - aiStartTime) / 1000;

    // 解析OpenAI返回的结果
    let analysisResult: AnalysisResult;
    try {
      const responseText = response.choices[0]?.message?.content || '';
      const jsonStartIndex = responseText.indexOf('{');
      const jsonEndIndex = responseText.lastIndexOf('}') + 1;
      if (jsonStartIndex === -1 || jsonEndIndex === 0) {
        throw new Error('Invalid JSON format in OpenAI response');
      }
      const jsonText = responseText.slice(jsonStartIndex, jsonEndIndex);
      analysisResult = JSON.parse(jsonText);
    } catch (error) {
      logger.error(
        '[feature.message-statistics] Failed to parse OpenAI response. Raw response: %s. Error: %s',
        response.choices[0]?.message?.content,
        error
      );
      throw new Error('Failed to parse analysis result');
    }

    const tokenUsage = `${response.usage?.prompt_tokens || 0}/${response.usage?.completion_tokens || 0}`;
    const reportImage = await generateStatisticsImage(
      group.name || '未知群',
      startTime,
      endTime,
      filteredHistory.length,
      memberCount,
      analysisTime,
      tokenUsage,
      analysisResult,
      group
    );

    // 发送统计报告图片
    await message.reply(
      new SendMessage({
        message: new SendImageMessage(reportImage),
        groupId: message.groupId || undefined,
      })
    );

    // 删除临时消息
    await startMessage.delete();
  } catch (error) {
    logger.error('[feature.message-statistics] Error:', error);
    await message.reply(
      new SendMessage({
        message: new SendTextMessage('消息统计失败，请稍后重试'),
        groupId: message.groupId || undefined,
      })
    );
  } finally {
    if (releaseLock) {
      releaseLock();
    }

    // Cleanup the map if we are the last one
    // Note: This is slightly risky in a high concurrency map, but safe enough here
    // because if groupLocks.get(id) === lockPromise, it means no one came after us.
    if (message.groupId && groupLocks.get(message.groupId) === lockPromise) {
      groupLocks.delete(message.groupId);
    }
  }
}
