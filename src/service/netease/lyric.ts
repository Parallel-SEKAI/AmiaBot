import { NeteaseApi } from './api.js';

export class Lyric {
  public original_lyric: string = '';
  public original_translate: string = '';

  constructor(
    private songId: number,
    private api: NeteaseApi
  ) {}

  /**
   * 获取歌词
   */
  async getLyric(): Promise<void> {
    const data = await this.api.getLyric(this.songId);
    if (data.lyric) {
      this.original_lyric = data.lyric;
    }
    if (data.translate) {
      this.original_translate = data.translate;
    }
  }
}
