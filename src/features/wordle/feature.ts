import React from 'react';
import fs from 'fs/promises';
import * as path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../config/logger.js';
import { onebot } from '../../onebot/index.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';
import {
  SendMessage,
  SendTextMessage,
  SendImageMessage,
} from '../../onebot/message/send.entity.js';
import {
  getGameState,
  setGameState,
  deleteGameState,
} from '../../service/db.js';
import { ReactRenderer } from '../../service/render/react.js';
import {
  WordleCard,
  WordleRow,
  LetterStatus,
} from '../../components/wordle/WordleCard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cacheDir = path.resolve(__dirname, '../../../cache');
// fs.mkdir is async in fs/promises
try {
  await fs.mkdir(cacheDir, { recursive: true });
} catch (err) {
  logger.error(
    '[feature.wordle] Failed to create cache directory %s: %s',
    cacheDir,
    err
  );
  throw err;
}

const WORDS_FILE = path.resolve(__dirname, '../../../assets/wordle/words.json');
const MAX_ATTEMPTS = 6;
const GAME_TYPE = 'wordle';

let wordsCache: string[] = [];

interface WordEntry {
  name: string;
  trans: string[];
}

/**
 * 加载单词列表
 */
async function loadWords(): Promise<string[]> {
  if (wordsCache.length > 0) return wordsCache;
  try {
    const data = await fs.readFile(WORDS_FILE, 'utf-8');
    const json: WordEntry[] = JSON.parse(data);
    const wordsSet = new Set<string>();

    json.forEach((item) => {
      const names = item.name.split('/');
      names.forEach((name: string) => {
        const cleanName = name.trim().toLowerCase();
        if (/^[a-z]+$/.test(cleanName)) {
          wordsSet.add(cleanName);
        }
      });
    });

    wordsCache = Array.from(wordsSet);
    return wordsCache;
  } catch (error) {
    logger.error('[feature.wordle] Failed to load words:', error);
    return [];
  }
}

/**
 * 获取随机单词
 */
async function getRandomWord(length: number): Promise<string> {
  const words = await loadWords();
  const availableWords = words.filter((w) => w.length === length);

  if (availableWords.length === 0) {
    throw new Error(`No words of length ${length} available for Wordle`);
  }
  return availableWords[Math.floor(Math.random() * availableWords.length)];
}

/**
 * 校验单词并返回状态
 */
export function checkGuess(guess: string, target: string): LetterStatus[] {
  const length = target.length;
  const result: LetterStatus[] = Array(length).fill('absent');
  const targetChars = target.split('');
  const guessChars = guess.split('');

  // First pass: find correct letters
  for (let i = 0; i < length; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = 'correct';
      targetChars[i] = ''; // Mark as used
      guessChars[i] = '';
    }
  }

  // Second pass: find present letters
  for (let i = 0; i < length; i++) {
    if (guessChars[i] !== '' && targetChars.includes(guessChars[i])) {
      result[i] = 'present';
      targetChars[targetChars.indexOf(guessChars[i])] = ''; // Mark as used
    }
  }

  return result;
}

/**
 * 渲染游戏状态图片
 */
async function renderGameImage(
  rows: WordleRow[],
  wordLength: number,
  targetWord?: string,
  message?: string
): Promise<Buffer> {
  return await ReactRenderer.renderToImage(
    React.createElement(WordleCard, { rows, targetWord, message, wordLength })
  );
}

/**
 * 开始新游戏
 */
async function startNewGame(message: RecvMessage) {
  const groupId = message.groupId;
  if (!groupId) return;

  // 解析消息中的数字作为单词长度
  const content = message.content.trim();
  const match = content.match(/^wordle\s*(\d+)?$/i);
  let wordLength = 5;

  if (match && match[1]) {
    const len = parseInt(match[1]);
    if (len >= 2 && len <= 13) {
      // 限制合理长度
      wordLength = len;
    }
  }

  let target: string;
  try {
    target = await getRandomWord(wordLength);
  } catch (error) {
    logger.error('[feature.wordle] Failed to start game:', error);
    await new SendMessage({
      message: [
        new SendTextMessage(`无法开始游戏：找不到长度为 ${wordLength} 的单词`),
      ],
    }).reply(message);
    return;
  }

  // answer
  logger.debug('[feature.wordle] Answer: %s', target);

  const gameState = {
    target,
    guesses: [] as string[],
    statuses: [] as LetterStatus[][],
  };

  await setGameState(groupId, GAME_TYPE, gameState);

  const initialRows: WordleRow[] = Array.from({ length: MAX_ATTEMPTS }, () => ({
    letters: [],
    statuses: [],
  }));

  const imageBuffer = await renderGameImage(
    initialRows,
    wordLength,
    undefined,
    `请输入 ${wordLength} 位字母单词进行猜测`
  );
  const tempPath = path.join(cacheDir, `wordle_${groupId}_${Date.now()}.png`);
  await fs.writeFile(tempPath, imageBuffer);

  try {
    const fileUrl = await onebot.uploadFileStream(tempPath);
    await new SendMessage({
      message: [new SendImageMessage(fileUrl)],
    }).reply(message);
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch {
      // ignore
    }
  }
}

/**
 * 处理用户猜测
 */
async function handleGuess(message: RecvMessage) {
  const groupId = message.groupId;
  if (!groupId) return;

  const state = await getGameState(groupId, GAME_TYPE);
  if (!state) return;

  const gameState = state.answer_data;
  const targetLength = gameState.target.length;
  const guess = message.content.trim().toLowerCase();

  // 验证输入是否为指定长度的字母
  const regex = new RegExp(`^[a-z]{${targetLength}}$`);
  if (!regex.test(guess)) {
    return; // 忽略长度不符或含非字母的输入
  }

  // 检查单词是否存在于列表
  const words = await loadWords();

  if (words.length === 0) {
    logger.error(
      '[feature.wordle] Word list unavailable while handling guess.'
    );
    await new SendMessage({
      message: [new SendTextMessage('词库加载失败，请稍后重试')],
    }).reply(message);
    return;
  }

  if (!words.includes(guess)) {
    await new SendMessage({
      message: [new SendTextMessage(`单词 "${guess}" 不在词库中`)],
    }).reply(message);
    return;
  }

  const status = checkGuess(guess, gameState.target);
  gameState.guesses.push(guess);
  gameState.statuses.push(status);

  const isWin = guess === gameState.target;
  const isGameOver = isWin || gameState.guesses.length >= MAX_ATTEMPTS;

  const rows: WordleRow[] = Array.from({ length: MAX_ATTEMPTS }, (_, i) => ({
    letters: gameState.guesses[i] ? gameState.guesses[i].split('') : [],
    statuses: gameState.statuses[i] || [],
  }));

  let endMessage = '';
  if (isWin) endMessage = '恭喜！你猜对了！';
  else if (isGameOver) endMessage = '游戏结束，下次努力！';

  const imageBuffer = await renderGameImage(
    rows,
    targetLength,
    isGameOver ? gameState.target : undefined,
    endMessage
  );

  const tempPath = path.join(cacheDir, `wordle_${groupId}_${Date.now()}.png`);
  await fs.writeFile(tempPath, imageBuffer);

  try {
    const fileUrl = await onebot.uploadFileStream(tempPath);
    await new SendMessage({
      message: [new SendImageMessage(fileUrl)],
    }).reply(message);

    if (isGameOver) {
      await deleteGameState(groupId, GAME_TYPE);
    } else {
      await setGameState(groupId, GAME_TYPE, gameState);
    }
  } finally {
    try {
      await fs.unlink(tempPath);
    } catch {
      // ignore
    }
  }
}

export async function init() {
  // Startup cleanup: Delete any stale wordle_*.png files in cacheDir
  try {
    const files = await fs.readdir(cacheDir);
    for (const file of files) {
      if (file.startsWith('wordle_') && file.endsWith('.png')) {
        await fs.unlink(path.join(cacheDir, file)).catch(() => {});
      }
    }
  } catch (error) {
    logger.warn('[feature.wordle] Failed to cleanup cache:', error);
  }

  onebot.registerCommand(
    GAME_TYPE,
    'wordle',
    '开始 Wordle 游戏',
    'wordle',
    async (data) => {
      const message = RecvMessage.fromMap(data);
      const existing = await getGameState(message.groupId!, GAME_TYPE);
      if (existing) {
        await new SendMessage({
          message: [new SendTextMessage('当前已有正在进行的 Wordle 游戏')],
        }).reply(message);
        return;
      }
      await startNewGame(message);
    }
  );

  onebot.registerCommand(
    GAME_TYPE,
    /.*/,
    'Wordle 游戏猜测',
    undefined,
    async (data) => {
      const message = RecvMessage.fromMap(data);
      await handleGuess(message);
    }
  );
}
