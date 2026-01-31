/* eslint-disable @typescript-eslint/no-explicit-any */
import { promises as fs } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import {
  SendMessage,
  SendRecordMessage,
} from '../../onebot/message/send.entity.js';
import { RecvMessage } from '../../onebot/message/recv.entity.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export async function getCharacterAlias(alias: string): Promise<Array<string>> {
  const character_alias = await fs.readFile(
    join(__dirname, '../../../assets/pjsk/character_alias.json'),
    'utf8'
  );
  // 为alias_map添加类型断言，指定为字符ID到别名数组的映射
  const alias_map = JSON.parse(character_alias) as Record<string, string[]>;

  // 转换输入别名为小写，以便不区分大小写匹配
  const lowerAlias = alias.toLowerCase();

  // 遍历所有角色别名映射
  for (const aliases of Object.values(alias_map)) {
    // 检查当前角色的别名数组中是否包含输入的别名（不区分大小写）
    if (aliases.some((a: string) => a.toLowerCase() === lowerAlias)) {
      // 如果找到匹配的别名，返回该角色的所有别名
      return aliases;
    }
  }

  // 如果没有找到匹配的别名，返回空数组
  return [];
}

interface CharacterScenarioResponse {
  TalkData: Array<{ Body: string }>;
}

export async function getCharactersSelfIntroduction(
  scenarioId: string
): Promise<string> {
  try {
    const response = await fetch(
      `https://storage.sekai.best/sekai-cn-assets/scenario/profile/${scenarioId}.asset`
    );

    if (!response.ok) {
      return '';
    }

    const data = (await response.json()) as CharacterScenarioResponse;

    if (!data || !Array.isArray(data.TalkData)) {
      return '';
    }

    return data.TalkData.map((item) => item.Body).join('\n');
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(
        `Failed to fetch character introduction: ${error.message}`
      );
    }
    throw error;
  }
}

interface NeteaseSearchResponse {
  result: {
    songs: Array<Record<string, any>>;
  };
}

export async function searchMusic(
  query: string
): Promise<Array<Record<string, any>>> {
  const response = await fetch(
    `https://music.163.com/api/cloudsearch/pc?s=${query}&type=1`
  );
  const data = (await response.json()) as NeteaseSearchResponse;
  return data.result.songs;
}

interface NeteaseMusicUrlResponse {
  data: Array<{ url: string }>;
}

export async function sendMusic(
  message: RecvMessage,
  songId: number
): Promise<string> {
  const data = await new Promise<NeteaseMusicUrlResponse>((resolve, reject) => {
    const options = {
      hostname: 'wyapi-1.toubiec.cn',
      path: '/api/music/url',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(
      options,
      (res: import('http').IncomingMessage) => {
        let responseData = '';

        res.on('data', (chunk: Buffer) => {
          responseData += chunk;
        });

        res.on('end', () => {
          try {
            resolve(JSON.parse(responseData));
          } catch (error: unknown) {
            reject(error);
          }
        });
      }
    );

    req.on('error', (error: Error) => {
      reject(error);
    });

    req.write(JSON.stringify({ id: songId, level: 'standard' }));
    req.end();
  });

  if (
    !data ||
    !data.data ||
    !Array.isArray(data.data) ||
    data.data.length === 0
  ) {
    throw new Error('Failed to get music url: data is invalid or empty');
  }

  const url = data.data[0].url;
  void new SendMessage({ message: new SendRecordMessage(url) }).send({
    recvMessage: message,
  });
  return 'OK';
}
