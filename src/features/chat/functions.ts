import { readFileSync } from 'fs';
import { join } from 'path';
import https from 'https';
import {
  SendMessage,
  SendRecordMessage,
} from '../../onebot/message/send.entity';
import { RecvMessage } from '../../onebot/message/recv.entity';

export async function getCharacterAlias(alias: string): Promise<Array<string>> {
  const character_alias = readFileSync(
    join(process.cwd(), 'assets/pjsk/character_alias.json'),
    'utf8'
  );
  // 为alias_map添加类型断言，指定为字符ID到别名数组的映射
  const alias_map = JSON.parse(character_alias) as Record<string, string[]>;

  // 转换输入别名为小写，以便不区分大小写匹配
  const lowerAlias = alias.toLowerCase();

  // 遍历所有角色别名映射
  for (const [_, aliases] of Object.entries(alias_map)) {
    // 检查当前角色的别名数组中是否包含输入的别名（不区分大小写）
    if (aliases.some((a: string) => a.toLowerCase() === lowerAlias)) {
      // 如果找到匹配的别名，返回该角色的所有别名
      return aliases;
    }
  }

  // 如果没有找到匹配的别名，返回空数组
  return [];
}

export async function getCharactersSelfIntroduction(
  scenarioId: string
): Promise<string> {
  const response = await fetch(
    `https://storage.sekai.best/sekai-cn-assets/scenario/profile/${scenarioId}.asset`
  );
  const data = ((await response.json()) as Record<string, any>)
    .TalkData as Array<Record<string, any>>;
  return data.map((item: Record<string, any>) => item.Body).join('\n');
}

export async function searchMusic(
  query: string
): Promise<Array<Record<string, any>>> {
  const response = await fetch(
    `https://music.163.com/api/cloudsearch/pc?s=${query}&type=1`
  );
  const data = (
    ((await response.json()) as Record<string, any>).result as Record<
      string,
      any
    >
  ).songs as Array<Record<string, any>>;
  return data;
}

export async function sendMusic(
  message: RecvMessage,
  songId: number
): Promise<string> {
  const data = await new Promise((resolve, reject) => {
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
          } catch (error: any) {
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

  const url = (data as Record<string, any>).data[0].url;
  void new SendMessage({ message: new SendRecordMessage(url) }).send({
    recvMessage: message,
  });
  return 'OK';
}
