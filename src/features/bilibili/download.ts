import fetch from 'node-fetch';
import { createHash } from 'crypto';
import { spawn } from 'child_process';
import * as fs from 'fs/promises';
import { createWriteStream } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import logger from '../../config/logger.js';
import { config } from '../../config/index.js';
import { safeUnlink } from '../../utils/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// From python script
const mixinKeyEncTab = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35, 27, 43, 5, 49,
  33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13, 37, 48, 7, 16, 24, 55, 40, 61,
  26, 17, 0, 1, 60, 51, 30, 4, 22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36,
  20, 34, 44, 52,
];

const getMixinKey = (orig: string) =>
  mixinKeyEncTab
    .map((i) => orig[i])
    .join('')
    .slice(0, 32);

async function getWbiKeys(): Promise<{ imgKey: string; subKey: string }> {
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/58.0.3029.110 Safari/537.3',
    Referer: 'https://www.bilibili.com/',
    Cookie: config.bilibili.cookies || '',
  };
  const response = await fetch('https://api.bilibili.com/x/web-interface/nav', {
    headers,
  });
  if (!response.ok) {
    throw new Error(`Failed to get WBI keys: ${response.statusText}`);
  }
  const json: any = await response.json();
  const imgUrl: string = json.data.wbi_img.img_url;
  const subUrl: string = json.data.wbi_img.sub_url;
  const imgKey = imgUrl.split('/').pop()!.split('.')[0];
  const subKey = subUrl.split('/').pop()!.split('.')[0];
  return { imgKey, subKey };
}

function encWbi(
  params: Record<string, any>,
  imgKey: string,
  subKey: string
): Record<string, any> {
  const mixinKey = getMixinKey(imgKey + subKey);
  const currTime = Math.round(Date.now() / 1000);
  const updatedParams: Record<string, any> = { ...params, wts: currTime };

  const sortedParams = Object.keys(updatedParams)
    .sort()
    .reduce(
      (obj, key) => {
        obj[key] = updatedParams[key];
        return obj;
      },
      {} as Record<string, any>
    );

  const query = Object.entries(sortedParams)
    .map(([key, value]) => {
      const filteredValue = String(value).replace(/[!'()*]/g, '');
      return `${encodeURIComponent(key)}=${encodeURIComponent(filteredValue)}`;
    })
    .join('&');

  const wbiSign = createHash('md5')
    .update(query + mixinKey)
    .digest('hex');

  return { ...updatedParams, w_rid: wbiSign };
}

async function downloadFile(
  url: string,
  filename: string,
  referer: string
): Promise<boolean> {
  try {
    const headers = {
      Connection: 'keep-alive',
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0',
      Accept:
        'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7',
      'Accept-Encoding': 'identity',
      'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8,en-GB;q=0.7,en-US;q=0.6',
      Referer: referer,
      Cookie: config.bilibili.cookies || '',
    };

    const response = await fetch(url, { headers });
    const body = response.body;
    if (!response.ok || !body) {
      logger.error(
        '[feature.bilibili.download] Failed to download %s: %s',
        filename,
        response.statusText
      );
      return false;
    }

    const fileStream = createWriteStream(filename);
    await new Promise((resolve, reject) => {
      body.pipe(fileStream);
      body.on('error', reject);
      fileStream.on('finish', resolve);
    });

    logger.info(
      '[feature.bilibili.download] %s downloaded successfully.',
      filename
    );
    return true;
  } catch (error) {
    logger.error(
      '[feature.bilibili.download] Failed to download %s:',
      filename,
      error
    );
    return false;
  }
}

async function downloadWithRetry(
  url1: string,
  url2: string,
  filename: string,
  referer: string
): Promise<boolean> {
  if (await downloadFile(url1, filename, referer)) {
    return true;
  }
  if (url2 && (await downloadFile(url2, filename, referer))) {
    return true;
  }
  logger.error(
    '[feature.bilibili.download] Failed to download %s from all sources.',
    filename
  );
  return false;
}

export async function downloadBilibiliVideo(
  bv: string
): Promise<string | null> {
  const cacheDir = path.resolve(__dirname, '../../../cache');
  await fs.mkdir(cacheDir, { recursive: true });

  const finalVideoPath = path.join(cacheDir, `${bv}.mp4`);
  try {
    await fs.access(finalVideoPath);
    logger.info(
      '[feature.bilibili.download] Video %s already exists in cache.',
      bv
    );
    return finalVideoPath;
  } catch (e) {
    // File doesn't exist, proceed with download
  }

  const cookie = config.bilibili.cookies || '';
  const headers = {
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/135.0.0.0 Safari/537.36 Edg/135.0.0.0',
    Cookie: cookie,
  };

  const tempVideoPath = path.join(cacheDir, `${bv}_video.mp4`);
  const tempAudioPath = path.join(cacheDir, `${bv}_audio.m4a`);

  try {
    // 1. Get CID
    const cidApi = `https://api.bilibili.com/x/player/pagelist?bvid=${bv}`;
    const cidResponse = await fetch(cidApi, { headers });
    const cidData: any = await cidResponse.json();
    const cid = cidData.data[0].cid;

    // 2. Get WBI keys
    const { imgKey, subKey } = await getWbiKeys();

    // 3. Get signed URL
    const params = {
      bvid: bv,
      cid: cid,
      qn: '80', // 1080p
      fnver: '0',
      fnval: '4048',
      fourk: '1',
    };
    const signedParams = encWbi(params, imgKey, subKey);
    const playUrlApi = new URL('https://api.bilibili.com/x/player/wbi/playurl');
    playUrlApi.search = new URLSearchParams(signedParams as any).toString();

    const playUrlResponse = await fetch(playUrlApi.toString(), {
      headers: { ...headers, Referer: `https://www.bilibili.com/video/${bv}/` },
    });
    const playUrlData: any = await playUrlResponse.json();

    const videoUrl = playUrlData.data.dash.video[0].base_url;
    const videoUrl2 = playUrlData.data.dash.video[0].backup_url?.[0];
    const audioUrl = playUrlData.data.dash.audio[0].base_url;
    const audioUrl2 = playUrlData.data.dash.audio[0].backup_url?.[0];

    // 4. Download video and audio
    const referer = `https://www.bilibili.com/video/${bv}/`;

    const videoDownloaded = await downloadWithRetry(
      videoUrl,
      videoUrl2,
      tempVideoPath,
      referer
    );
    const audioDownloaded = await downloadWithRetry(
      audioUrl,
      audioUrl2,
      tempAudioPath,
      referer
    );

    if (!videoDownloaded || !audioDownloaded) {
      throw new Error('Video or audio download failed.');
    }

    // 5. Merge with ffmpeg
    logger.info(
      '[feature.bilibili.download] Merging video and audio with ffmpeg...'
    );
    await new Promise<void>((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', [
        '-y',
        '-i',
        tempVideoPath,
        '-i',
        tempAudioPath,
        '-c',
        'copy',
        finalVideoPath,
      ]);

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          resolve();
        } else {
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });

      ffmpeg.on('error', (err) => {
        reject(err);
      });
    });
    logger.info(
      '[feature.bilibili.download] Video %s merged successfully.',
      bv
    );

    return finalVideoPath;
  } catch (error) {
    logger.error(
      '[feature.bilibili.download] Failed to download Bilibili video %s:',
      bv,
      error
    );
    return null;
  } finally {
    // 6. Cleanup
    await safeUnlink(tempVideoPath);
    await safeUnlink(tempAudioPath);
  }
}
