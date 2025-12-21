import { NeteaseApi } from './api';
import { join, extname } from 'path';
import { mkdirSync, existsSync } from 'fs';
import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import logger from '../../config/logger';

// 实现downloadFile函数
async function downloadFile(url: string, filePath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(
      `Failed to download file: ${response.status} ${response.statusText}`
    );
  }
  const buffer = await response.arrayBuffer().then((b) => Buffer.from(b));
  await fs.writeFile(filePath, buffer);
}

export class Song {
  public id: number;
  public name: string = '';
  public artists: string[] = [];
  public album: string = '';
  public cover: string = '';

  constructor(
    songId: number,
    private api: NeteaseApi
  ) {
    this.id = songId;
  }

  /**
   * 获取歌曲详情
   */
  async getDetail(): Promise<void> {
    const data = await this.api.getSongDetail(this.id);
    if (data.id) {
      this.id = data.id;
      this.name = data.name;
      this.artists = data.artist;
      this.album = data.album;
      this.cover = data.cover;
    }
  }

  /**
   * 下载歌曲
   * @returns 包含文件路径和后缀名的对象，失败时返回null
   */
  async downloadSong(): Promise<{ path: string; suffix: string } | null> {
    try {
      // 获取歌曲URL
      const songUrl = await this.api.getSongUrl(this.id);
      logger.info(`[netease] 获取到歌曲URL: ${songUrl}`);
      if (!songUrl) {
        return null;
      }

      // 确保下载目录存在
      const downloadDir = join(
        process.cwd(),
        'data',
        'plugins',
        'amia_netease',
        'downloads'
      );
      if (!existsSync(downloadDir)) {
        mkdirSync(downloadDir, { recursive: true });
      }

      // 生成文件名和路径
      const suffix = extname(new URL(songUrl).pathname) || '.mp3';
      const filename = `${this.name}-${this.id}${suffix}`;
      const filePath = join(downloadDir, filename);

      // 下载文件
      await downloadFile(songUrl, filePath);

      return { path: filePath, suffix };
    } catch (error) {
      logger.error(`[netease] 下载歌曲失败:`, error);
      return null;
    }
  }

  async getSongUrl(): Promise<string | null> {
    return await this.api.getSongUrl(this.id);
  }
}
