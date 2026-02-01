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

const WORDS_FILE = path.resolve(__dirname, '../../../assets/wordle/words.txt');
const MAX_ATTEMPTS = 6;
const GAME_TYPE = 'wordle';

let wordsCache: string[] = [];

/**
 * 加载单词列表
 */
async function loadWords(): Promise<string[]> {
  if (wordsCache.length > 0) return wordsCache;
  try {
    const data = await fs.readFile(WORDS_FILE, 'utf-8');
    wordsCache = data
      .split('\n')
      .map((w) => w.trim().toLowerCase())
      .filter((w) => w.length === 5);
    return wordsCache;
  } catch (error) {
    logger.error('[feature.wordle] Failed to load words:', error);
    return [];
  }
}

/**
 * 获取随机单词
 */
async function getRandomWord(): Promise<string> {
  const words = await loadWords();
  if (words.length === 0) {
    throw new Error('No words available for Wordle');
  }
  return words[Math.floor(Math.random() * words.length)];
}

/**
 * 校验单词并返回状态
 */
export function checkGuess(guess: string, target: string): LetterStatus[] {
  const result: LetterStatus[] = Array(5).fill('absent');
  const targetChars = target.split('');
  const guessChars = guess.split('');

  // First pass: find correct letters
  for (let i = 0; i < 5; i++) {
    if (guessChars[i] === targetChars[i]) {
      result[i] = 'correct';
      targetChars[i] = ''; // Mark as used
      guessChars[i] = '';
    }
  }

  // Second pass: find present letters
  for (let i = 0; i < 5; i++) {
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
  targetWord?: string,
  message?: string
): Promise<Buffer> {
  return await ReactRenderer.renderToImage(
    React.createElement(WordleCard, { rows, targetWord, message })
  );
}

/**
 * 开始新游戏
 */
async function startNewGame(message: RecvMessage) {
  const groupId = message.groupId;
  if (!groupId) return;

  let target: string;
  try {
    target = await getRandomWord();
  } catch (error) {
    logger.error('[feature.wordle] Failed to start game:', error);
    await new SendMessage({
      message: [new SendTextMessage('无法开始游戏：词库加载失败')],
    }).reply(message);
    return;
  }

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
    undefined,
    '请输入 5 位字母单词进行猜测'
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
  const guess = message.content.trim().toLowerCase();

  // 验证输入是否为 5 位字母
  if (!/^[a-z]{5}$/.test(guess)) {
    return; // 忽略非 5 位字母输入
  }

  // 检查单词是否存在于列表
  const words = await loadWords();
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

  onebot.on('message.group', async (data) => {
    const message = RecvMessage.fromMap(data);
    await handleGuess(message);
  });
}
