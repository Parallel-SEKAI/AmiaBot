import React from 'react';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendTextMessage,
  SendImageMessage,
  SendRecordMessage,
  SendForwardMessage,
  SendFileMessage,
  ForwardMessageNode,
} from '../../onebot/message/send.entity.js';
import { NeteaseApi, Song, Lyric } from '../../service/netease/index.js';
import { ReactRenderer } from '../../service/render/react.js';
import { SearchCard } from '../../components/netease/SearchCard.js';
import { parseCommandLineArgs } from '../../utils/index.js';
import { readFileSync, promises as fs, mkdirSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { openai } from '../../service/openai.js';
import { config } from '../../config/index.js';
import logger from '../../config/logger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// 实现downloadFile函数
async function downloadFile(url: string, filePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download file: ${response.status} ${response.statusText}`
    );
  }
  const buffer = await response.buffer();
  await fs.writeFile(filePath, buffer);
}

// 初始化网易云API
const api: NeteaseApi = new NeteaseApi();

// 搜索历史存储
const searchHistory: Map<string, { songs: Song[]; timestamp: number }> =
  new Map();

// 定时清理过期搜索历史 (每 30 分钟运行一次)
setInterval(() => {
  const now = Date.now();
  const expirationTime = 2 * 60 * 60 * 1000; // 2 小时
  for (const [id, data] of searchHistory.entries()) {
    if (now - data.timestamp > expirationTime) {
      searchHistory.delete(id);
    }
  }
}, 1800000);

// 辅助函数：获取有效的groupId
function getValidGroupId(groupId: number | null): number | string | undefined {
  return groupId ?? undefined;
}

// 辅助函数：将消息ID转换为字符串
function messageIdToString(messageId: number | string): string {
  return typeof messageId === 'string' ? messageId : messageId.toString();
}

// 获取prompt内容
const promptPath = join(__dirname, '../../../assets/netease/emoji_lyric.md');
const prompt = readFileSync(promptPath, 'utf-8');

/**
 * 生成表情歌词
 * @param message 接收到的消息对象
 */
export async function emojilyric(message: RecvMessage): Promise<void> {
  try {
    const [args, kwargs] = parseCommandLineArgs(message.content);
    let songId: number;

    // 获取歌曲ID，支持两种方式: 通过参数指定ID或通过关键词搜索
    if ('id' in kwargs) {
      songId = parseInt(kwargs['id']);
    } else {
      // 从消息文本中提取搜索关键词
      const parts = message.content.split(' ', 2);
      if (parts.length < 2) {
        await message.reply(
          new SendMessage({
            message: new SendTextMessage('请提供歌曲名称或ID喵~'),
            groupId: getValidGroupId(message.groupId),
          })
        );
        return;
      }

      const keywords = parts[1];

      // 搜索歌曲
      const searchData = await api.search(keywords);
      const result = searchData.result?.songs || [];
      if (result.length === 0) {
        await message.reply(
          new SendMessage({
            message: new SendTextMessage('未找到歌曲喵~'),
            groupId: getValidGroupId(message.groupId),
          })
        );
        return;
      }

      songId = result[0].id;
    }

    // 获取歌曲详情
    const song = new Song(songId, api);
    await song.getDetail();

    // 发送开始处理的消息
    const startMessage = await message.reply(
      new SendMessage({
        message: new SendTextMessage(
          `你说的是${song.artists.join('/')}的${song.name}吗，让我看看歌词喵~`
        ),
        groupId: getValidGroupId(message.groupId),
      })
    );

    // 获取歌词
    const lyric = new Lyric(songId, api);
    await lyric.getLyric();

    if (!lyric.original_lyric) {
      await message.reply(
        new SendMessage({
          message: new SendTextMessage(
            '未找到歌词喵，要不换个搜索词或者使用id喵~'
          ),
          groupId: getValidGroupId(message.groupId),
        })
      );
      return;
    }

    // 将歌词填充到prompt模板中
    const filledPrompt = prompt.replace('{{lyric}}', lyric.original_lyric);

    // 调用OpenAI API生成emoji歌词，添加重试机制
    let emojiLyric = '';
    const maxRetries = 3;
    let retryCount = 0;
    let success = false;

    while (retryCount < maxRetries && !success) {
      retryCount++;
      try {
        logger.info(
          '[feature.netease.emojilyric] Starting attempt %d to generate emoji lyric',
          retryCount
        );

        // 调用OpenAI API生成emoji歌词，限制超时时间
        const response = await openai.chat.completions.create({
          model: config.openai.model,
          messages: [{ role: 'user', content: filledPrompt }],
          ...(config.openai.maxToken > 0
            ? { max_tokens: config.openai.maxToken }
            : {}),
        });

        // 处理OpenAI API响应
        emojiLyric = response.choices[0]?.message?.content || '';

        // 记录Token使用情况
        const usage = response.usage;
        if (usage) {
          const usageInfo = `Token Usage: Prompt: ${usage.prompt_tokens || 0}, Completion: ${usage.completion_tokens || 0}, Total: ${usage.total_tokens || 0}`;
          logger.info('[feature.netease.emojilyric] %s', usageInfo);
        }

        success = true;
        logger.info(
          '[feature.netease.emojilyric] Successfully generated emoji lyric on attempt %d',
          retryCount
        );
      } catch (error) {
        logger.error(
          '[feature.netease.emojilyric] Attempt %d failed to generate emoji lyric:',
          retryCount,
          error
        );
        if (retryCount < maxRetries) {
          logger.info(
            '[feature.netease.emojilyric] Retrying in %d seconds...',
            retryCount
          );
          await new Promise((resolve) =>
            setTimeout(resolve, retryCount * 1000)
          ); // 指数退避重试
        } else {
          logger.error(
            '[feature.netease.emojilyric] All attempts failed to generate emoji lyric'
          );
        }
      }
    }

    // 如果没有生成结果，返回原始歌词
    if (!emojiLyric.trim()) {
      emojiLyric = lyric.original_lyric;
      logger.info(
        '[feature.netease.emojilyric] Generation failed, returning original lyric'
      );
    }

    // 发送结果
    await message.send(
      new SendMessage({
        message: new SendForwardMessage([
          {
            type: 'node',
            data: {
              userId: message.selfId,
              nickname: 'Amia',
              content: [new SendTextMessage(emojiLyric)],
            },
          },
        ]),
        groupId: getValidGroupId(message.groupId),
      })
    );

    // 删除开始处理的消息
    await startMessage.delete();
  } catch (error) {
    logger.error(
      '[feature.netease.emojilyric] Failed to generate emoji lyric:',
      error
    );
    await message.reply(
      new SendMessage({
        message: new SendTextMessage(`处理表情歌词时发生错误: ${error}喵~`),
        groupId: getValidGroupId(message.groupId),
      })
    );
  }
}

/**
 * 搜索歌曲
 * @param message 接收到的消息对象
 */
export async function search(message: RecvMessage): Promise<void> {
  try {
    // 从消息文本中提取搜索关键词
    const parts = message.content.split(' ', 2);
    if (parts.length < 2) {
      await message.reply(
        new SendMessage({
          message: new SendTextMessage('请提供歌曲名称喵~'),
          groupId: getValidGroupId(message.groupId),
        })
      );
      return;
    }

    const keywords = parts[1];

    // 搜索歌曲
    const searchData = await api.search(keywords);
    const result = searchData.result?.songs || [];
    if (result.length === 0) {
      await message.reply(
        new SendMessage({
          message: new SendTextMessage('未找到歌曲喵~'),
          groupId: getValidGroupId(message.groupId),
        })
      );
      return;
    }

    // 创建歌曲对象列表
    const songs = result
      .slice(0, 10)
      .map((song: any) => new Song(song.id, api));

    // 并发获取所有歌曲的详情
    await Promise.all(songs.map((song: Song) => song.getDetail()));

    // 过滤掉获取详情失败的歌曲
    const validSongs = songs.filter((song: Song) => song.name);

    // 使用 React SSR 渲染搜索结果卡片
    const props = {
      query: keywords,
      songs: validSongs.map((song: Song) => ({
        id: song.id,
        name: song.name,
        artists: song.artists,
        coverUrl: song.cover,
      })),
    };

    const imageBuffer = await ReactRenderer.renderToImage(
      React.createElement(SearchCard, props)
    );

    // 发送搜索结果
    const msg = await message.reply(
      new SendMessage({
        message: new SendImageMessage(imageBuffer),
        groupId: getValidGroupId(message.groupId),
      })
    );

    // 保存搜索历史，并记录时间戳
    const searchDataItem = { songs: validSongs, timestamp: Date.now() };
    searchHistory.set(messageIdToString(msg.messageId), searchDataItem);
  } catch (error) {
    logger.error('[feature.netease.search] Failed to search songs:', error);
    await message.reply(
      new SendMessage({
        message: new SendTextMessage(`搜索歌曲失败: ${error}喵~`),
        groupId: getValidGroupId(message.groupId),
      })
    );
  }
}

/**
 * 播放歌曲
 * @param message 接收到的消息对象
 */
export async function play(message: RecvMessage): Promise<void> {
  try {
    // 从搜索历史中获取歌曲
    const song = await getSongFromSearch(message);
    if (!song) {
      return;
    }

    // 确保歌曲详情已加载
    if (!song.name) {
      await song.getDetail();
    }

    // 下载歌曲
    const url = await song.getSongUrl();
    if (!url) {
      await message.reply(
        new SendMessage({
          message: new SendTextMessage(
            '下载失败，是不是付费歌曲呢，请稍后重试喵~'
          ),
          groupId: getValidGroupId(message.groupId),
        })
      );
      return;
    }

    // 发送歌曲
    await message.send(
      new SendMessage({
        message: new SendRecordMessage(url),
        groupId: getValidGroupId(message.groupId),
      })
    );
  } catch (error) {
    logger.error('[feature.netease.play] Failed to play song:', error);
    await message.reply(
      new SendMessage({
        message: new SendTextMessage(`播放歌曲时发生错误: ${error}喵~`),
        groupId: getValidGroupId(message.groupId),
      })
    );
  }
}

/**
 * 下载歌曲
 * @param message 接收到的消息对象
 */
export async function download(message: RecvMessage): Promise<void> {
  try {
    // 从搜索历史中获取歌曲
    const song = await getSongFromSearch(message);
    if (!song) {
      return;
    }

    // 确保歌曲详情已加载
    if (!song.name) {
      await song.getDetail();
    }

    // 下载歌曲
    const url = await song.getSongUrl();
    if (!url) {
      await message.reply(
        new SendMessage({
          message: new SendTextMessage(
            '下载失败，是不是付费歌曲呢，请稍后重试喵~'
          ),
          groupId: getValidGroupId(message.groupId),
        })
      );
      return;
    }

    // 发送歌曲URL
    await message.reply(
      new SendMessage({
        message: new SendRecordMessage(url),
        groupId: getValidGroupId(message.groupId),
      })
    );
  } catch (error) {
    logger.error('[feature.netease.download] Failed to download song:', error);
    await message.reply(
      new SendMessage({
        message: new SendTextMessage(`下载歌曲时发生错误: ${error}喵~`),
        groupId: getValidGroupId(message.groupId),
      })
    );
  }
}

/**
 * 从搜索历史中获取指定索引的歌曲
 * @param message 接收到的消息对象
 * @returns 歌曲对象或null
 */
async function getSongFromSearch(message: RecvMessage): Promise<Song | null> {
  // 检查消息是否引用了其他消息
  const replyMessage = message.message.find((msg) => msg.type === 'reply');
  if (!replyMessage) {
    await message.reply(
      new SendMessage({
        message: new SendTextMessage(
          '请先搜索歌曲，然后引用搜索结果的聊天记录喵~'
        ),
        groupId: getValidGroupId(message.groupId),
      })
    );
    return null;
  }

  // 获取被引用消息的搜索结果
  const msgId = replyMessage.data.id;
  const searchResult = searchHistory.get(msgId);
  if (!searchResult) {
    await message.reply(
      new SendMessage({
        message: new SendTextMessage('搜索历史不存在或已损坏喵~'),
        groupId: getValidGroupId(message.groupId),
      })
    );
    return null;
  }

  const songs = searchResult.songs;

  // 解析命令参数，获取歌曲索引
  const [args, kwargs] = parseCommandLineArgs(message.content);
  let index = -1;

  if ('idx' in kwargs) {
    // 通过idx参数获取索引
    index = parseInt(kwargs['idx']) - 1;
  } else {
    // 通过位置参数获取索引
    if (args.length < 2) {
      await message.reply(
        new SendMessage({
          message: new SendTextMessage('请输入正确的索引喵~'),
          groupId: getValidGroupId(message.groupId),
        })
      );
      return null;
    }
    index = parseInt(args[1]) - 1;
  }

  // 检查索引是否在有效范围内
  if (index < 0 || index >= songs.length) {
    await message.reply(
      new SendMessage({
        message: new SendTextMessage(
          `索引 ${index + 1} 超出范围，请输入正确的索引喵~`
        ),
        groupId: getValidGroupId(message.groupId),
      })
    );
    return null;
  }

  return songs[index];
}
