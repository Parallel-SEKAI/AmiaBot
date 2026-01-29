import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendImageMessage,
  SendMessage,
  SendRecordMessage,
  SendTextMessage,
} from '../../onebot/message/send.entity.js';
import { safeUnlink } from '../../utils/index.js';

import ffmpeg from 'fluent-ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import http from 'http';
import https from 'https';
import {
  getGameState,
  setGameState,
  deleteGameState,
} from '../../service/db.js';

const difficulty = {
  ez: 12, // 简单难度，12秒
  no: 10, // 普通难度，10秒
  hd: 8, // 困难难度，8秒
  ex: 6, // 专家难度，6秒
  ma: 4, // 大师难度，4秒
  apd: 2, // 噩梦难度，2秒
};

const timeout = 60.0; // 60秒超时
const targetSimilarity = 0.75; // 相似度阈值

interface MusicInfo {
  imageUrl: string;
  musicId: number;
  title: string;
  answers: string[];
  assetbundleName: string;
  vocal: Record<string, any>;
  music: Record<string, any>;
}

/**
 * 计算 Levenshtein 相似度（0~1），1 表示完全相同，0 表示无任何相同字符
 */
function levenshtein_similarity(s1: string, s2: string): number {
  if (!s1 && !s2) {
    return 1.0; // 两个都为空字符串
  }
  if (!s1 || !s2) {
    return 0.0; // 其中一个为空
  }

  // 确保 s1 是较长的字符串
  if (s1.length < s2.length) {
    return levenshtein_similarity(s2, s1);
  }

  // 初始化上一行
  const prevRow = Array.from({ length: s2.length + 1 }, (_, i) => i);

  for (let i = 1; i <= s1.length; i++) {
    const currRow = [i];
    for (let j = 1; j <= s2.length; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      currRow[j] = Math.min(
        prevRow[j] + 1, // 删除
        currRow[j - 1] + 1, // 插入
        prevRow[j - 1] + cost // 替换
      );
    }
    prevRow.splice(0, prevRow.length, ...currRow);
  }

  // 编辑距离
  const editDistance = prevRow[prevRow.length - 1];

  // 归一化到 [0, 1]
  const maxLen = Math.max(s1.length, s2.length);
  const similarity = 1.0 - editDistance / maxLen;

  return similarity;
}

/**
 * 下载文件到指定路径
 */
async function downloadFile(url: string, filePath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const fileStream = fs.createWriteStream(filePath);

    client
      .get(url, (response: any) => {
        if (response.statusCode !== 200) {
          reject(new Error(`下载失败，状态码: ${response.statusCode}`));
          return;
        }

        response.pipe(fileStream);

        fileStream.on('finish', () => {
          fileStream.close();
          resolve();
        });

        fileStream.on('error', async (error: any) => {
          fileStream.close();
          await safeUnlink(filePath); // 删除不完整的文件
          reject(new Error(`写入文件失败: ${error.message}`));
        });
      })
      .on('error', async (error: any) => {
        await safeUnlink(filePath); // 删除不完整的文件
        reject(new Error(`请求失败: ${error.message}`));
      });
  });
}

/**
 * 从音乐URL获取音乐信息
 */
async function getMusicInfoById(musicId: number): Promise<MusicInfo> {
  // 1. 获取音乐数据
  const musicVocalsUrl =
    'https://sekai-world.github.io/sekai-master-db-diff/musicVocals.json';
  const musicVocals = (await fetch(musicVocalsUrl).then((res) =>
    res.json()
  )) as Array<any>;

  // 2. 获取音乐详情
  const musicsUrl =
    'https://sekai-world.github.io/sekai-master-db-diff/musics.json';
  const musics = (await fetch(musicsUrl).then((res) =>
    res.json()
  )) as Array<any>;

  // 3. 找到对应的音乐
  const music = musics.find((m: any) => m.id === musicId);
  if (!music) {
    throw new Error(`未找到音乐ID: ${musicId}`);
  }

  // 4. 找到对应的 vocal
  const vocal = musicVocals.find((v: any) => v.musicId === musicId);
  if (!vocal) {
    throw new Error(`未找到音乐ID: ${musicId} 的 vocal 数据`);
  }

  // 5. 获取音乐别名
  const aliasesUrl = `https://public-api.haruki.seiunx.com/alias/v1/music/${music.id}`;
  const aliasesRes = await fetch(aliasesUrl);
  const aliasesData =
    aliasesRes.status === 200 ? await aliasesRes.json() : { aliases: [] };

  // 6. 构建音乐信息
  return {
    imageUrl: `https://storage.sekai.best/sekai-jp-assets/music/jacket/${music.assetbundleName}/${music.assetbundleName}.png`,
    musicId: music.id,
    title: music.title,
    answers: [music.title, ...(aliasesData as any).aliases],
    assetbundleName: vocal.assetbundleName,
    vocal: vocal,
    music: music,
  };
}

/**
 * 从音频随机选取指定时长的片段进行裁剪后返回
 */
async function cutMusic(musicUrl: string, duration: number): Promise<Buffer> {
  const tempDir = os.tmpdir();
  const musicFileName = path.basename(musicUrl);
  const tempFilePath = path.join(tempDir, musicFileName);
  const croppedFilePath = path.join(tempDir, `cropped_${musicFileName}`);

  try {
    // 1. 下载音乐文件
    await downloadFile(musicUrl, tempFilePath);

    // 2. 获取音频时长并裁剪
    return await new Promise<Buffer>((resolve, reject) => {
      ffmpeg.ffprobe(tempFilePath, (err: any, metadata: any) => {
        if (err) {
          return reject(new Error(`获取音频时长失败: ${err.message}`));
        }

        const audioDuration = metadata.format.duration;

        // 3. 检查音频长度是否足够
        if (audioDuration <= duration) {
          void (async () => {
            try {
              const buffer = await fs.promises.readFile(tempFilePath);
              resolve(buffer);
            } catch (e) {
              reject(e);
            }
          })();
          return;
        }

        // 4. 随机生成裁剪起始点
        const maxStartTime = audioDuration - duration;
        const startTime = Math.random() * maxStartTime;

        // 5. 使用ffmpeg裁剪音频
        ffmpeg(tempFilePath)
          .setStartTime(startTime)
          .setDuration(duration)
          .output(croppedFilePath)
          .on('end', () => {
            void (async () => {
              try {
                const buffer = await fs.promises.readFile(croppedFilePath);
                resolve(buffer);
              } catch (e) {
                reject(e);
              }
            })();
          })
          .on('error', (error: any) => {
            reject(new Error(`裁剪音频失败: ${error.message}`));
          })
          .run();
      });
    });
  } catch (error: any) {
    throw new Error(`处理音频失败: ${error.message}`);
  } finally {
    // 6. 清理临时文件
    await safeUnlink(tempFilePath);
    await safeUnlink(croppedFilePath);
  }
}

/**
 * 获取随机音乐信息
 */
async function getRandomMusic(): Promise<MusicInfo> {
  // 1. 获取音乐数据
  const musicVocalsUrl =
    'https://sekai-world.github.io/sekai-master-db-diff/musicVocals.json';
  const musicVocals = (await fetch(musicVocalsUrl).then((res) =>
    res.json()
  )) as Array<any>;

  // 2. 获取音乐详情
  const musicsUrl =
    'https://sekai-world.github.io/sekai-master-db-diff/musics.json';
  const musics = (await fetch(musicsUrl).then((res) =>
    res.json()
  )) as Array<any>;

  // 3. 随机选择一首音乐
  const randomVocal =
    musicVocals[Math.floor(Math.random() * musicVocals.length)];
  const music = musics.find((m: any) => m.id === randomVocal.musicId);

  if (!music) {
    throw new Error(`未找到音乐ID: ${randomVocal.musicId}`);
  }

  // 4. 获取音乐别名
  const aliasesUrl = `https://public-api.haruki.seiunx.com/alias/v1/music/${music.id}`;
  const aliasesRes = await fetch(aliasesUrl);
  const aliasesData =
    aliasesRes.status === 200 ? await aliasesRes.json() : { aliases: [] };

  // 5. 构建音乐信息
  return {
    imageUrl: `https://storage.sekai.best/sekai-jp-assets/music/jacket/${music.assetbundleName}/${music.assetbundleName}.png`,
    musicId: music.id,
    title: music.title,
    answers: [music.title, ...(aliasesData as any).aliases],
    assetbundleName: randomVocal.assetbundleName,
    vocal: randomVocal,
    music: music,
  };
}

/**
 * 发送答案
 */
async function sendAnswer(
  message: RecvMessage,
  musicInfo: MusicInfo,
  isTimeout: boolean = false
): Promise<void> {
  let answerMessage = `答案: ${musicInfo.title}`;

  // 如果是时间到了，加上前缀
  if (isTimeout) {
    answerMessage = `时间到了\n${answerMessage}`;
  } else {
    answerMessage = `恭喜你猜对了！\n${answerMessage}`;
  }

  // 发送消息
  const sendMessage = new SendMessage({
    message: [
      new SendTextMessage(answerMessage),
      new SendImageMessage(musicInfo.imageUrl),
    ],
  });

  if (!isTimeout) {
    await sendMessage.reply(message);
  } else {
    await sendMessage.send({
      recvMessage: message,
    });
  }
}

/**
 * 检查用户答案
 */
async function checkAnswer(message: RecvMessage): Promise<void> {
  const groupId = message.groupId;
  if (groupId === null) {
    return;
  }

  const gameState = await getGameState(groupId, 'guess-song');
  if (!gameState) {
    return;
  }

  const answer = gameState.answer_data;
  const userInput = message.content.toLowerCase();

  // 计算相似度
  let maxSimilarity = 0;
  for (const ans of answer.answers) {
    const similarity = levenshtein_similarity(userInput, ans.toLowerCase());
    maxSimilarity = Math.max(maxSimilarity, similarity);
  }

  if (maxSimilarity >= targetSimilarity) {
    // 获取完整音乐信息
    const musicInfo = await getMusicInfoById(answer.musicId);

    // 发送正确答案
    await sendAnswer(message, musicInfo, false);

    // 删除记录
    await deleteGameState(groupId, 'guess-song');
  }
}

/**
 * 猜歌主函数
 */
async function guessSong(data: Record<string, any>) {
  const message = RecvMessage.fromMap(data);
  logger.info(
    '[feature.guess-song][Group: %d][User: %d] %s',
    message.groupId,
    message.userId,
    message.rawMessage
  );

  // 检查当前群是否已有未结束的游戏
  const groupId = message.groupId;
  if (groupId === null) {
    return;
  }

  const existingGame = await getGameState(groupId, 'guess-song');
  if (existingGame) {
    // 已有未结束的游戏，发送提示
    await new SendMessage({
      message: new SendTextMessage('当前有未结束的猜歌曲'),
    }).send({
      recvMessage: message,
    });
    return;
  }

  // 解析难度
  let duration = difficulty.hd; // 默认困难难度
  for (const key in difficulty) {
    if (message.content.toLowerCase().includes(key)) {
      duration = difficulty[key as keyof typeof difficulty];
      break;
    }
  }

  try {
    // 获取随机音乐信息
    const musicInfo = await getRandomMusic();

    logger.info(
      '[feature.guess-song][Group: %d][User: %d] Answer: %s',
      message.groupId,
      message.userId,
      musicInfo.title
    );

    // 构建音乐URL
    const musicUrl = `https://storage.sekai.best/sekai-jp-assets/music/long/${musicInfo.assetbundleName}/${musicInfo.assetbundleName}.mp3`;

    // 发送下载提示
    const downloadMessage = await new SendMessage({
      message: new SendTextMessage('正在下载并处理音乐，请稍候...'),
    }).send({
      recvMessage: message,
    });

    // 裁剪音乐片段
    const musicBuffer = await cutMusic(musicUrl, duration);

    // 删除下载提示
    await downloadMessage.delete();

    // 将音频写入临时文件并流式上传
    const tempDir = os.tmpdir();
    const tempAudioPath = path.join(tempDir, `guess_song_${Date.now()}.mp3`);
    await fs.promises.writeFile(tempAudioPath, musicBuffer);

    let uploadedAudioPath: string;
    try {
      uploadedAudioPath = await onebot.uploadFileStream(tempAudioPath);
    } finally {
      await safeUnlink(tempAudioPath);
    }

    // 发送音乐片段给用户
    await new SendMessage({
      message: [new SendTextMessage(`接下来你有${timeout}秒猜中这首歌曲`)],
    }).send({
      recvMessage: message,
    });
    await new SendMessage({
      message: [new SendRecordMessage(uploadedAudioPath)],
    }).send({
      recvMessage: message,
    });

    // 记录答案
    const answer = {
      musicId: musicInfo.musicId,
      title: musicInfo.title,
      answers: musicInfo.answers,
      assetbundleName: musicInfo.assetbundleName,
    };
    await setGameState(groupId, 'guess-song', answer);

    // 定时timeout后检查记录，如果还在且状态一致就发送答案并删除记录
    setTimeout(() => {
      void (async () => {
        const gameState = await getGameState(groupId, 'guess-song');
        if (
          gameState &&
          gameState.answer_data.musicId === answer.musicId &&
          gameState.answer_data.title === answer.title
        ) {
          await sendAnswer(message, musicInfo, true);
          await deleteGameState(groupId, 'guess-song');
        }
      })();
    }, timeout * 1000);
  } catch (error: any) {
    logger.error('[feature.guess-song] Failed to process music:', error);
    await new SendMessage({
      message: new SendTextMessage('处理音乐失败，请稍后再试'),
    }).send({
      recvMessage: message,
    });
  }
}

/**
 * 初始化猜歌功能
 */
export async function init() {
  logger.info('[feature] Init guess-song feature');
  onebot.registerCommand(
    'guess-song',
    '听歌识曲',
    '开始一轮 PJSK 听歌识曲游戏',
    '听歌识曲 [难度:ez/no/hd/ex/ma/apd]',
    async (data) => {
      await guessSong(data);
    }
  );
  onebot.on('message.group', async (data) => {
    const message = RecvMessage.fromMap(data);
    await checkAnswer(message);
  });
}
