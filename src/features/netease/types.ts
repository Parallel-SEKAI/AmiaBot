/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * 搜索历史项
 */
export interface SearchHistoryItem {
  /** 歌曲列表 */
  songs: any[];
  /** 时间戳 */
  timestamp: number;
}

/**
 * 歌曲详情
 */
export interface SongDetail {
  /** 歌曲ID */
  id: number;
  /** 歌曲名称 */
  name: string;
  /** 歌手列表 */
  artists: string[];
  /** 专辑名称 */
  album: string;
  /** 封面URL */
  cover: string;
}

/**
 * 歌词数据
 */
export interface LyricData {
  /** 原始歌词 */
  original_lyric: string;
  /** 翻译歌词 */
  original_translate: string;
}
