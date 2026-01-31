/* eslint-disable @typescript-eslint/no-explicit-any */
import { config } from '../../config/index.js';
import fetch from 'node-fetch';
import { createCipheriv, createHash } from 'crypto';
import logger from '../../config/logger.js';

// 辅助函数：将数据转换为十六进制字符串
function HexDigest(data: Buffer): string {
  return data.toString('hex');
}

// 辅助函数：计算文本的MD5哈希值
function HashDigest(text: string): Buffer {
  return createHash('md5').update(text, 'utf-8').digest();
}

// 辅助函数：计算文本的MD5哈希值并返回十六进制表示
function HashHexDigest(text: string): string {
  return HashDigest(text).toString('hex');
}

// 辅助函数：PKCS7填充
function pkcs7Pad(data: Buffer, blockSize: number): Buffer {
  const padLength = blockSize - (data.length % blockSize);
  const pad = Buffer.alloc(padLength, padLength);
  return Buffer.concat([data, pad]);
}

export interface NeteasePlaylist {
  name: string;
  cover: string;
  creator: string;
  songs: number[];
}

export interface NeteaseSongDetail {
  id: number;
  name: string;
  artist: string[];
  album: string;
  duration: number;
  cover: string;
}

export interface NeteaseLyric {
  lyric: string;
  translate: string;
  romac: string;
  lyricWords: string;
}

export interface NeteaseErrorResponse {
  error: string;
  details?: string;
  response_text?: string;
}

export interface NeteaseSearchResult {
  id: number;
  name: string;
  ar: Array<{ id: number; name: string }>;
  al: { id: number; name: string; picUrl: string };
  dt: number; // duration
  [key: string]: any;
}

export interface NeteaseSearchResponse {
  result?: {
    songs?: NeteaseSearchResult[];
    songCount?: number;
  };
  code: number;
}

export class NeteaseApi {
  private cookies: Record<string, string> = {};
  private cache: boolean;

  constructor() {
    this.cache = true;
    // 解析cookies字符串为对象
    const cookiesStr = config.netease.cookies;
    if (cookiesStr) {
      this.cookies = cookiesStr
        .split(';')
        .map((item) => item.trim())
        .filter((item) => item)
        .reduce(
          (acc, item) => {
            const [key, value] = item.split('=', 2);
            acc[key.trim()] = value.trim();
            return acc;
          },
          {} as Record<string, string>
        );
    }
  }

  /**
   * 获取播放列表
   * @param playlist_id 播放列表ID
   * @returns 播放列表信息
   */
  async getPlaylist(
    playlist_id: number
  ): Promise<NeteasePlaylist | NeteaseErrorResponse> {
    const url = 'https://music.163.com/api/v6/playlist/detail';
    const data = new URLSearchParams({ id: playlist_id.toString() });

    const headers = {
      'User-Agent': 'Mozilla/5.0',
      Referer: 'https://music.163.com/',
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: Object.entries(this.cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    };

    let text: string = '';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: data,
      });

      text = await response.text();
      const result = JSON.parse(text);
      const playlist = result.playlist || {};

      return {
        name: playlist.name || '',
        cover: playlist.coverImgUrl || '',
        creator: playlist.creator?.nickname || '',
        songs: (playlist.trackIds || []).map((i: { id: number }) => i.id || 0),
      };
    } catch (e: unknown) {
      if (e instanceof SyntaxError) {
        return {
          error: '解析播放列表JSON失败',
          details: e.message,
          response_text: text,
        };
      } else {
        return {
          error: '获取播放列表失败',
          details: (e as Error).message,
        };
      }
    }
  }

  /**
   * 获取歌曲详情
   * @param song_id 歌曲ID
   * @returns 歌曲详情
   */
  async getSongDetail(
    song_id: number
  ): Promise<NeteaseSongDetail | NeteaseErrorResponse> {
    const url = 'https://interface3.music.163.com/api/v3/song/detail';
    const requestData = new URLSearchParams({
      c: JSON.stringify([{ id: song_id, v: 0 }]),
    });

    let text: string = '';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: Object.entries(this.cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join('; '),
        },
        body: requestData,
      });

      text = await response.text();
      const response_data = JSON.parse(text);
      const songData = response_data.songs?.[0] || {};

      return {
        id: songData.id || 0,
        name: songData.name || '',
        artist: (songData.ar || []).map((i: { name: string }) => i.name || ''),
        album: songData.al?.name || '',
        duration: songData.dt || 0,
        cover: songData.al?.picUrl || '',
      };
    } catch (e: unknown) {
      if (e instanceof SyntaxError) {
        return {
          error: '解析歌曲详情JSON失败',
          details: e.message,
          response_text: text,
        };
      } else {
        return {
          error: '获取歌曲详情失败',
          details: (e as Error).message,
        };
      }
    }
  }

  /**
   * 获取歌曲URL
   * @param song_id 歌曲ID
   * @returns 歌曲URL
   */
  async getSongUrl(song_id: number): Promise<string | null> {
    try {
      const data = await this.url_v1(song_id, 'hires');
      logger.info('[service.netease] Got song URL data: %j', data);
      return data.data?.[0]?.url || null;
    } catch (e: unknown) {
      logger.error('[service.netease] Failed to get song URL:', e);
      return null;
    }
  }

  /**
   * 获取歌曲URL和MD5
   * @param song_id 歌曲ID
   * @returns 包含URL和MD5的对象
   */
  async getSongUrlWithMd5(
    song_id: number
  ): Promise<{ url: string; md5: string } | null> {
    try {
      const data = await this.url_v1(song_id, 'hires');
      return {
        url: data.data?.[0]?.url || '',
        md5: data.data?.[0]?.md5 || '',
      };
    } catch (e: unknown) {
      logger.error('[service.netease] Failed to get song URL and MD5:', e);
      return null;
    }
  }

  /**
   * 获取歌词
   * @param song_id 歌曲ID
   * @returns 歌词数据
   */
  async getLyric(
    song_id: number
  ): Promise<NeteaseLyric | NeteaseErrorResponse> {
    const url = 'https://interface3.music.163.com/api/song/lyric';
    const requestData = new URLSearchParams({
      id: song_id.toString(),
      cp: 'false',
      tv: '0',
      lv: '0',
      rv: '0',
      kv: '0',
      yv: '0',
      ytv: '0',
      yrv: '0',
    });

    let text: string = '';
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Cookie: Object.entries(this.cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join('; '),
        },
        body: requestData,
      });

      text = await response.text();
      const lyricData = JSON.parse(text);

      return {
        lyric: lyricData.lrc?.lyric || '',
        translate: lyricData.tlyric?.lyric || '',
        romac: lyricData.romalrc?.lyric || '',
        lyricWords: lyricData.yrc?.lyric || '',
      };
    } catch (e: unknown) {
      if (e instanceof SyntaxError) {
        return {
          error: '解析歌词JSON失败',
          details: e.message,
          response_text: text,
        };
      } else {
        return {
          error: '获取歌词失败',
          details: (e as Error).message,
        };
      }
    }
  }

  /**
   * 搜索歌曲
   * @param keywords 搜索关键词
   * @returns 搜索结果
   */
  async search(
    keywords: string
  ): Promise<NeteaseSearchResponse | NeteaseErrorResponse> {
    const url = 'https://music.163.com/api/cloudsearch/pc';
    const params = new URLSearchParams({
      s: keywords,
      type: '1',
      limit: '10',
    });

    let text: string = '';
    try {
      const response = await fetch(`${url}?${params.toString()}`, {
        method: 'POST',
        headers: {
          Cookie: Object.entries(this.cookies)
            .map(([k, v]) => `${k}=${v}`)
            .join('; '),
        },
      });

      text = await response.text();
      return JSON.parse(text);
    } catch (e: unknown) {
      if (e instanceof SyntaxError) {
        return {
          error: '解析搜索结果JSON失败',
          details: e.message,
          response_text: text,
        };
      } else {
        return {
          error: '搜索失败',
          details: (e as Error).message,
        };
      }
    }
  }

  /**
   * 异步获取歌曲URL（内部方法）
   * @param id 歌曲ID
   * @param level 音质级别
   * @returns 歌曲URL数据
   */
  private async url_v1(id: number, level: string): Promise<any> {
    const url =
      'https://interface3.music.163.com/eapi/song/enhance/player/url/v1';
    const AES_KEY = Buffer.from('e82ckenh8dichen8');

    const eapiConfig = {
      os: 'pc',
      appver: '',
      osver: '',
      deviceId: 'pyncm!',
      requestId: Math.floor(Math.random() * 10000000 + 20000000).toString(),
    };

    const payload: Record<string, any> = {
      ids: [id],
      level: level,
      encodeType: 'flac',
      header: JSON.stringify(eapiConfig),
    };

    if (level === 'sky') {
      payload.immerseType = 'c51';
    }

    // 获取URL路径部分，而不是整个URL
    const urlPath = new URL(url).pathname;
    const url2 = urlPath.replace('/eapi/', '/api/');
    const digest = HashHexDigest(
      `nobody${url2}use${JSON.stringify(payload)}md5forencrypt`
    );
    const paramsStr = `${url2}-36cd479b6b5-${JSON.stringify(payload)}-36cd479b6b5-${digest}`;

    // PKCS7填充
    const paddedData = pkcs7Pad(Buffer.from(paramsStr), AES_KEY.length);

    // AES-ECB加密
    const cipher = createCipheriv('aes-128-ecb', AES_KEY, null);
    cipher.setAutoPadding(false);
    const enc = Buffer.concat([cipher.update(paddedData), cipher.final()]);
    const params = HexDigest(enc);

    let responseText: string = '';
    try {
      const response = await this.post(url, params);
      responseText = response;
      return JSON.parse(responseText);
    } catch (e: unknown) {
      if (e instanceof SyntaxError) {
        return {
          error: '解析歌曲URL JSON失败',
          details: e.message,
          response_text: responseText,
        };
      } else {
        return {
          error: '获取歌曲URL数据失败',
          details: (e as Error).message,
        };
      }
    }
  }

  /**
   * 异步发送post请求（内部方法）
   * @param url 请求URL
   * @param params 请求参数
   * @returns 响应文本
   */
  private async post(url: string, params: string): Promise<string> {
    // 基础cookies，与Python版本保持一致
    const baseCookies = {
      os: 'pc',
      appver: '',
      osver: '',
      deviceId: 'pyncm!',
    };

    // 合并基础cookies和实例cookies
    const cookies = { ...baseCookies, ...this.cookies };

    const headers = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Safari/537.36 Chrome/91.0.4472.164 NeteaseMusicDesktop/2.10.2.200154',
      Referer: '',
      Cookie: Object.entries(cookies)
        .map(([k, v]) => `${k}=${v}`)
        .join('; '),
    };

    const response = await fetch(url, {
      method: 'POST',
      headers,
      body: new URLSearchParams({ params }),
    });

    return await response.text();
  }
}
