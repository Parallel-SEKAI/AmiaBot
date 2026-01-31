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

export interface VideoEpisodeStat {
  view: number;
  like: number;
  fav: number;
  coin: number;
  danmaku: number;
  reply: number;
  share: number;
}

export interface VideoEpisode {
  season_id: number;
  section_id: number;
  id: number;
  aid: number | string;
  cid: number;
  title: string;
  attribute?: number;
  arc?: {
    duration: number;
    stat: VideoEpisodeStat;
  };
}

export interface VideoSection {
  title: string;
  season_id: number;
  id: number;
  type: number;
  episodes?: VideoEpisode[];
}

export interface UgcSeasonStat {
  season_id: number;
  view: number;
  danmaku: number;
  reply: number;
  fav: number;
  coin: number;
  share: number;
  now_rank: number;
  his_rank: number;
  like: number;
}

export interface UgcSeason {
  id: number;
  title: string;
  cover: string;
  mid: number;
  intro: string;
  sign_state: number;
  attribute: number;
  sections: VideoSection[];
  stat: UgcSeasonStat;
  ep_count: number;
  season_type: number;
  is_pay_season: boolean;
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
  ugc_season?: UgcSeason;
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
