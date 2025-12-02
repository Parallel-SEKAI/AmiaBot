export interface AvBvParams {
  av?: number;
  bv?: string;
}

export interface VideoStat {
  coin: number;
  collect: number;
  danmaku: number;
  play: number;
  play_switch: number;
  reply: number;
  share: number;
  thumb_down: number;
  thumb_up: number;
  view_text_1: string;
  vt: number;
}

export interface VideoEpisode {
  title: string;
  bvid: string;
  arc: {
    duration: number;
    stat: VideoStat;
  };
}

export interface VideoSection {
  title: string;
  episodes: VideoEpisode[];
}

export interface VideoPage {
  page: number;
  title: string;
  duration: number;
}

export interface VideoUpper {
  mid: number;
  name: string;
  face: string;
}

export interface VideoInfo {
  av: number;
  bv: string;
  title: string;
  cover: string;
  upper: VideoUpper;
  cnt_info: VideoStat;
  pages: VideoPage[];
  intro: string;
  ugc_season?: {
    sections: VideoSection[];
  };
  // 合集统计数据
  total_episodes?: number;
  total_duration?: number;
  total_view?: number;
  total_like?: number;
  total_fav?: number;
  total_coin?: number;
  total_danmaku?: number;
  total_reply?: number;
  total_share?: number;
}
