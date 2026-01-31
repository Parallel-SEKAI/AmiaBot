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
    if ('lyric' in data) {
      this.original_lyric = data.lyric;
    }
    if ('translate' in data) {
      this.original_translate = data.translate;
    }
  }
}
