import logger from '../../config/logger';
import { onebot } from '../../main';
import { RecvMessage } from '../../onebot/message/recv.entity';
import {
  SendMessage,
  SendTextMessage,
  SendImageMessage,
} from '../../onebot/message/send.entity';
import { gemini } from '../../service/gemini';
import { generatePage } from '../../service/enana';
import { COLORS } from '../../const';
import {
  WidgetComponent,
  ContainerComponent,
  ColumnComponent,
  TextComponent,
} from '../../types/enana';
import { hexToRgba, renderTemplate } from '../../utils/index';
import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { Group } from '../../onebot/group/group.entity';

// 参数配置常量
// 冷却时间（毫秒）
const COOLDOWN_TIME = 60000;
// 最大消息数量
const MAX_MESSAGE_COUNT = 1000;
// 最近天数
const RECENT_DAYS = 3;
// 聊天记录组合的字符串最大长度
const MAX_MESSAGE_TEXT_LENGTH = 9000;

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
let lastUsedTime = 0;

// 获取prompt模板
function getPromptTemplate(): string {
  const promptPath = join(
    __dirname,
    '../../../assets/message-statistics/prompt.md'
  );
  if (!existsSync(promptPath)) {
    throw new Error(`Prompt file not found: ${promptPath}`);
  }
  return readFileSync(promptPath, 'utf-8');
}

// 构建Enana组件树，生成统计报告
async function buildStatisticsReport(
  groupName: string,
  startTime: string,
  endTime: string,
  messageCount: number,
  memberCount: number,
  textCount: number,
  analysisTime: number,
  tokenUsage: string,
  analysisResult: AnalysisResult
): Promise<string> {
  // 构建UI组件树
  const widget: WidgetComponent = {
    type: 'Column',
    children: [
      // 标题
      {
        type: 'Text',
        text: 'QQ群消息统计分析报告',
        font_size: 24,
        color: hexToRgba(COLORS.primary),
        margin: {
          top: 0,
          right: 0,
          bottom: 20,
          left: 0,
        },
      } as TextComponent,
      // 基本信息摘要
      {
        type: 'Container',
        color: hexToRgba(COLORS.primaryContainer),
        padding: {
          top: 15,
          right: 15,
          bottom: 15,
          left: 15,
        },
        margin: {
          top: 0,
          right: 0,
          bottom: 25,
          left: 0,
        },
        border_radius: 12,
        child: {
          type: 'Column',
          children: [
            buildSummaryItem('群名称', groupName),
            buildSummaryItem('统计时段', `${startTime} - ${endTime}`),
            buildSummaryItem('消息总数', messageCount.toString()),
            buildSummaryItem('参与成员', memberCount.toString()),
            buildSummaryItem('总文字数', textCount.toString()),
            buildSummaryItem('分析耗时', `${analysisTime.toFixed(2)}秒`),
            buildSummaryItem('消耗Token', tokenUsage),
          ],
        } as ColumnComponent,
      } as ContainerComponent,
      // 热门话题
      buildSection('热门话题', buildTopicsSection(analysisResult.hot_topics)),
      // 群友称号
      buildSection(
        '群友称号',
        buildTitlesSection(analysisResult.group_members_titles)
      ),
      // 群圣经
      buildSection('群圣经', buildBibleSection(analysisResult.group_bible)),
    ],
  } as ColumnComponent;

  // 生成图片
  return await generatePage(widget);
}

// 构建摘要项
function buildSummaryItem(label: string, value: string): WidgetComponent {
  return {
    type: 'Container',
    padding: {
      top: 8,
      right: 0,
      bottom: 8,
      left: 0,
    },
    child: {
      type: 'Container',
      child: {
        type: 'Column',
        children: [
          {
            type: 'Row',
            children: [
              {
                type: 'Text',
                text: `${label}:`,
                font_size: 14,
                color: hexToRgba(COLORS.onPrimaryContainer),
                width: 100,
                margin: {
                  top: 0,
                  right: 10,
                  bottom: 0,
                  left: 0,
                },
              } as TextComponent,
              {
                type: 'Text',
                text: value,
                font_size: 14,
                color: hexToRgba(COLORS.onPrimaryContainer),
                width: 'auto',
              } as TextComponent,
            ],
          },
        ],
      } as ColumnComponent,
    } as ContainerComponent,
  } as ContainerComponent;
}

// 构建章节
function buildSection(
  title: string,
  content: WidgetComponent
): WidgetComponent {
  return {
    type: 'Container',
    margin: {
      top: 0,
      right: 0,
      bottom: 30,
      left: 0,
    },
    child: {
      type: 'Column',
      children: [
        {
          type: 'Text',
          text: title,
          font_size: 18,
          color: hexToRgba(COLORS.secondary),
          margin: {
            top: 0,
            right: 0,
            bottom: 15,
            left: 0,
          },
        } as TextComponent,
        content,
      ],
    } as ColumnComponent,
  } as ContainerComponent;
}

// 构建热门话题章节
function buildTopicsSection(topics: Topic[]): WidgetComponent {
  return {
    type: 'Container',
    child: {
      type: 'Column',
      children: topics.map(
        (topic) =>
          ({
            type: 'Container',
            color: hexToRgba(COLORS.surface),
            padding: 15,
            margin: {
              top: 0,
              right: 0,
              bottom: 15,
              left: 0,
            },
            border_radius: 8,
            child: {
              type: 'Column',
              children: [
                {
                  type: 'Row',
                  children: [
                    {
                      type: 'Container',
                      width: 24,
                      height: 24,
                      color: hexToRgba(COLORS.primary),
                      border_radius: 12,
                      child: {
                        type: 'Text',
                        text: `#${topic.topic_id}`,
                        font_size: 12,
                        color: hexToRgba(COLORS.onPrimary),
                      } as TextComponent,
                    } as ContainerComponent,
                    {
                      type: 'Container',
                      width: 10,
                    } as ContainerComponent,
                    {
                      type: 'Text',
                      text: topic.topic_name,
                      font_size: 16,
                      color: hexToRgba(COLORS.onSurface),
                    } as TextComponent,
                  ],
                },
                {
                  type: 'Container',
                  height: 10,
                } as ContainerComponent,
                {
                  type: 'Text',
                  text: `参与人数: ${topic.participants.length}`,
                  font_size: 14,
                  color: hexToRgba(COLORS.onSurfaceVariant),
                  margin: {
                    top: 0,
                    right: 0,
                    bottom: 8,
                    left: 0,
                  },
                } as TextComponent,
                {
                  type: 'Text',
                  text: topic.content,
                  font_size: 14,
                  color: hexToRgba(COLORS.onSurfaceVariant),
                } as TextComponent,
              ],
            } as ColumnComponent,
          }) as ContainerComponent
      ),
    } as ColumnComponent,
  } as ContainerComponent;
}

// 构建群友称号章节
function buildTitlesSection(titles: MemberTitle[]): WidgetComponent {
  return {
    type: 'Container',
    child: {
      type: 'Column',
      children: titles.map(
        (title) =>
          ({
            type: 'Container',
            color: hexToRgba(COLORS.surface),
            padding: 15,
            margin: {
              top: 0,
              right: 0,
              bottom: 15,
              left: 0,
            },
            border_radius: 8,
            child: {
              type: 'Column',
              children: [
                {
                  type: 'Row',
                  children: [
                    {
                      type: 'Text',
                      text: `QQ${title.qq_number}`,
                      font_size: 14,
                      color: hexToRgba(COLORS.onSurface),
                    } as TextComponent,
                    {
                      type: 'Container',
                      width: 10,
                    } as ContainerComponent,
                    {
                      type: 'Container',
                      padding: {
                        top: 4,
                        right: 12,
                        bottom: 4,
                        left: 12,
                      },
                      color: hexToRgba(COLORS.secondaryContainer),
                      border_radius: 16,
                      child: {
                        type: 'Text',
                        text: title.title,
                        font_size: 12,
                        color: hexToRgba(COLORS.onSecondaryContainer),
                      } as TextComponent,
                    } as ContainerComponent,
                  ],
                },
                {
                  type: 'Container',
                  height: 8,
                } as ContainerComponent,
                {
                  type: 'Text',
                  text: title.feature,
                  font_size: 14,
                  color: hexToRgba(COLORS.onSurfaceVariant),
                } as TextComponent,
              ],
            } as ColumnComponent,
          }) as ContainerComponent
      ),
    } as ColumnComponent,
  } as ContainerComponent;
}

// 构建群圣经章节
function buildBibleSection(bibles: Bible[]): WidgetComponent {
  return {
    type: 'Container',
    child: {
      type: 'Column',
      children: bibles.map(
        (bible) =>
          ({
            type: 'Container',
            color: hexToRgba(COLORS.surface),
            padding: 15,
            margin: {
              top: 0,
              right: 0,
              bottom: 15,
              left: 0,
            },
            border_radius: 8,
            child: {
              type: 'Column',
              children: [
                {
                  type: 'Container',
                  padding: 10,
                  color: hexToRgba(COLORS.primaryContainer),
                  border_radius: 6,
                  child: {
                    type: 'Text',
                    text: bible.sentence,
                    font_size: 14,
                    color: hexToRgba(COLORS.onSurface),
                  } as TextComponent,
                } as ContainerComponent,
                {
                  type: 'Container',
                  height: 10,
                } as ContainerComponent,
                {
                  type: 'Column',
                  children: [
                    {
                      type: 'Text',
                      text: `QQ${bible.interpreter}`,
                      font_size: 14,
                      color: hexToRgba(COLORS.onSurfaceVariant),
                    } as TextComponent,
                    {
                      type: 'Text',
                      text: bible.explanation,
                      font_size: 14,
                      color: hexToRgba(COLORS.onSurfaceVariant),
                    } as TextComponent,
                  ],
                },
              ],
            } as ColumnComponent,
          }) as ContainerComponent
      ),
    } as ColumnComponent,
  } as ContainerComponent;
}

export async function init() {
  logger.info('[feature] Init message-statistics feature');
  // onebot.on('message.command.消息统计', async (data) => {
  //   if (await checkFeatureEnabled(data.group_id, 'message-statistics')) {
  //     const message = RecvMessage.fromMap(data);
  //     logger.info(
  //       '[feature.message-statistics][Group: %d][User: %d] %s',
  //       message.groupId,
  //       message.userId,
  //       message.rawMessage
  //     );

  //     // 处理消息统计逻辑
  //     await handleMessageStatistics(message);
  //   }
  // });
  onebot.on('message.group', async (data) => {
    const message = RecvMessage.fromMap(data);
    if (message.content.toLowerCase().startsWith('消息统计')) {
      await handleMessageStatistics(message);
    }
  });
}

// 处理消息统计逻辑
async function handleMessageStatistics(message: RecvMessage) {
  logger.info(
    '[feature.message-statistics][Group: %d][User: %d] %s',
    message.groupId,
    message.userId,
    message.rawMessage
  );
  try {
    // 检查请求频率
    const now = Date.now();
    if (now - lastUsedTime < COOLDOWN_TIME) {
      const waitTime = Math.ceil((COOLDOWN_TIME - (now - lastUsedTime)) / 1000);
      const waitMessage = await message.reply(
        new SendMessage({
          message: new SendTextMessage(`因为请求频率限制，请等待${waitTime}秒`),
          groupId: message.groupId || undefined,
        })
      );
      await new Promise((resolve) =>
        setTimeout(resolve, COOLDOWN_TIME - (now - lastUsedTime))
      );
      await waitMessage.delete();
    }
    lastUsedTime = now;

    // 获取群信息
    if (!message.groupId) {
      throw new Error('Group ID not found in message');
    }
    const group = new Group(message.groupId);
    await group.init();

    // 使用锁控制同一群聊的并发请求
    const lock = groupLocks.get(message.groupId);
    if (lock) {
      await lock;
    }

    // 获取消息历史
    const history = await group.getHistory({ count: MAX_MESSAGE_COUNT });
    if (!history || history.length === 0) {
      throw new Error(`No messages found for group: ${message.groupId}`);
    }

    // 过滤最近RECENT_DAYS天的消息
    const recentDaysAgo = new Date();
    recentDaysAgo.setDate(recentDaysAgo.getDate() - RECENT_DAYS);
    recentDaysAgo.setHours(0, 0, 0, 0);

    const filteredHistory = history.filter((msg: RecvMessage) => {
      const msgTime = new Date(msg.time);
      return msgTime >= recentDaysAgo;
    });

    if (filteredHistory.length === 0) {
      throw new Error(
        `No messages found in the last ${RECENT_DAYS} days for group: ${message.groupId}`
      );
    }

    // 格式化消息数据，确保不超过最大长度（优先保留新消息）
    let formattedMessages = '';
    // 从新到旧排序
    const sortedMessages = filteredHistory.sort(
      (a: RecvMessage, b: RecvMessage) => {
        const timeA = new Date(a.time).getTime();
        const timeB = new Date(b.time).getTime();
        return timeB - timeA;
      }
    );

    for (const msg of sortedMessages) {
      const msgStr = msg.toString() + '\n';
      // 检查添加当前消息后是否超过最大长度
      if (formattedMessages.length + msgStr.length > MAX_MESSAGE_TEXT_LENGTH) {
        break;
      }
      // 新消息添加到前面，确保优先保留新消息
      formattedMessages = formattedMessages + msgStr;
    }

    formattedMessages = formattedMessages.replace(imagePattern, '[CQ:image]');

    // 获取群成员信息
    const memberSet = new Set<number>();
    filteredHistory.forEach((msg: RecvMessage) => {
      if (msg.userId) {
        memberSet.add(msg.userId);
      }
    });
    const memberCount = memberSet.size;

    // 统计总文字数
    const textCount = filteredHistory.reduce(
      (count: number, msg: RecvMessage) => count + msg.rawMessage.length,
      0
    );

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
          `已获取到${filteredHistory.length}条消息\n${startTime} - ${endTime}\n正在分析喵~`
        ),
        groupId: message.groupId,
      })
    );

    // 调用Gemini分析消息
    const prompt = getPromptTemplate();

    // 构建群信息，格式与chat功能一致
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

    // 使用renderTemplate函数替代直接的字符串替换
    const filledPrompt = renderTemplate(prompt, {
      group: groupInfo,
      messages: formattedMessages,
    });

    // 将输入prompt输出到文件，用于调试
    // const promptFilePath = join(__dirname, '../../../prompt.input.md');
    // const fs = require('fs');
    // fs.writeFileSync(promptFilePath, filledPrompt, 'utf-8');
    // logger.info(
    //   `[feature.message-statistics] Prompt saved to ${promptFilePath}`
    // );

    // 生成统计报告图片
    // 调用Gemini API
    const aiStartTime = Date.now();
    // 使用gemini正确的API调用方式
    const response = await gemini.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: filledPrompt,
    });
    const aiEndTime = Date.now();
    const analysisTime = (aiEndTime - aiStartTime) / 1000;

    // 解析Gemini返回的结果
    let analysisResult: AnalysisResult;
    try {
      // 提取JSON部分
      let responseText = '';
      if (response.candidates && response.candidates[0]?.content?.parts) {
        for (const part of response.candidates[0].content.parts) {
          if (part.text) {
            responseText += part.text;
          }
        }
      }
      const jsonStartIndex = responseText.indexOf('{');
      const jsonEndIndex = responseText.lastIndexOf('}') + 1;
      if (jsonStartIndex === -1 || jsonEndIndex === 0) {
        throw new Error('Invalid JSON format in Gemini response');
      }
      const jsonText = responseText.slice(jsonStartIndex, jsonEndIndex);
      analysisResult = JSON.parse(jsonText);
    } catch (error) {
      logger.error(
        '[feature.message-statistics] Failed to parse Gemini response:',
        error
      );
      throw new Error('Failed to parse analysis result');
    }

    const tokenUsage = `${filledPrompt.length}/${response.usageMetadata?.totalTokenCount || 0}`;
    const imageDataUrl = await buildStatisticsReport(
      group.name || '未知群',
      startTime,
      endTime,
      filteredHistory.length,
      memberCount,
      textCount,
      analysisTime,
      tokenUsage,
      analysisResult
    );

    // 发送统计报告图片
    await message.reply(
      new SendMessage({
        message: new SendImageMessage(imageDataUrl),
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
  }
}
