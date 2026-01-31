import assert from 'assert';
import {
  AvBvParams,
  VideoInfo,
  VideoSection,
  VideoEpisode,
  UgcSeason,
  VideoEpisodeStat,
} from './typing.js';

const data = 'FcwAPNKTMug3GV5Lj7EJnHpWsx4tb8haYeviqBz6rkCy12mUSDQX9RdoZf';
const BASE = 58n;
const MAX_AID = 1n << 51n;
const XOR_CODE = 23442827791579n;
const MASK_CODE = 2251799813685247n;

function av2bv(aid: number): `BV1${string}` {
  const bytes = ['B', 'V', '1', '0', '0', '0', '0', '0', '0', '0', '0', '0'];
  let bvIndex = bytes.length - 1;
  let tmp = (MAX_AID | BigInt(aid)) ^ XOR_CODE;
  while (tmp > 0) {
    bytes[bvIndex] = data[Number(tmp % BigInt(BASE))];
    tmp = tmp / BASE;
    bvIndex -= 1;
  }
  [bytes[3], bytes[9]] = [bytes[9], bytes[3]];
  [bytes[4], bytes[7]] = [bytes[7], bytes[4]];
  return bytes.join('') as `BV1${string}`;
}

function bv2av(bvid: string): number {
  const bvidArr = Array.from<string>(bvid);
  [bvidArr[3], bvidArr[9]] = [bvidArr[9], bvidArr[3]];
  [bvidArr[4], bvidArr[7]] = [bvidArr[7], bvidArr[4]];
  bvidArr.splice(0, 3);
  const tmp = bvidArr.reduce(
    (pre, bvidChar) => pre * BASE + BigInt(data.indexOf(bvidChar)),
    0n
  );
  return Number((tmp & MASK_CODE) ^ XOR_CODE);
}

interface BilibiliEpisode {
  season_id: number;
  section_id: number;
  id: number;
  aid: number | string;
  cid: number;
  title: string;
  attribute?: number;
  arc?: {
    duration: number;
    stat: {
      view: number;
      like: number;
      fav: number;
      coin: number;
      danmaku: number;
      reply: number;
      share: number;
    };
  };
}

interface BilibiliSection {
  title: string;
  season_id: number;
  id: number;
  type: number;
  episodes?: Array<BilibiliEpisode>;
}

interface BilibiliUgcSeason {
  id: number;
  title: string;
  cover: string;
  mid: number;
  intro: string;
  sign_state: number;
  attribute: number;
  sections: Array<BilibiliSection>;
  stat: {
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
  };
  ep_count: number;
  season_type: number;
  is_pay_season: boolean;
}

interface BilibiliViewResponse {
  data?: {
    ugc_season?: BilibiliUgcSeason;
  };
}

interface BilibiliResourceInfo {
  av?: number;
  bv?: string;
  title?: string;
  cover?: string;
  upper?: {
    mid: number;
    name: string;
    face: string;
  };
  cnt_info?: {
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
  };
  pages?: Array<{
    page: number;
    title: string;
    duration: number;
  }>;
  intro?: string;
  ugc_season?: BilibiliUgcSeason;
}

interface BilibiliResourceResponse {
  data?: Array<BilibiliResourceInfo>;
}

export async function getBilibiliVideoInfo(
  params: AvBvParams
): Promise<VideoInfo> {
  assert(params.av || params.bv, 'av or bv is required');

  const av = params.av;
  const bv = params.bv;

  // 调用第一个API获取视频基本信息和合集信息
  const viewUrl = new URL('https://api.bilibili.com/x/web-interface/wbi/view');
  if (av) {
    viewUrl.searchParams.set('aid', av.toString());
  } else {
    viewUrl.searchParams.set('bvid', bv!);
  }

  const viewResponse = await fetch(viewUrl.toString(), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    },
  });

  if (!viewResponse.ok) {
    throw new Error(`Failed to fetch view info: ${viewResponse.statusText}`);
  }

  const viewData = (await viewResponse.json()) as BilibiliViewResponse;

  // 调用第二个API获取资源详情
  const resourceUrl = new URL(
    'https://api.bilibili.com/medialist/gateway/base/resource/infos'
  );
  resourceUrl.searchParams.set('resources', `${av || bv2av(bv!)}:2`);

  const resourceResponse = await fetch(resourceUrl.toString(), {
    headers: {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36',
    },
  });

  if (!resourceResponse.ok) {
    throw new Error(
      `Failed to fetch resource info: ${resourceResponse.statusText}`
    );
  }

  const resourceData =
    (await resourceResponse.json()) as BilibiliResourceResponse;

  // 处理数据，转换为VideoInfo类型
  const info1 = viewData.data || {};
  const resourceInfo = resourceData.data?.[0];

  if (!resourceInfo) {
    throw new Error(
      'Failed to get video info from resource API: data is missing or empty'
    );
  }

  // 计算合集统计数据
  let total_episodes = 0;
  let total_duration = 0;
  let total_view = 0;
  let total_like = 0;
  let total_fav = 0;
  let total_coin = 0;
  let total_danmaku = 0;
  let total_reply = 0;
  let total_share = 0;

  // 处理合集信息
  const ugc_season = info1.ugc_season;
  if (ugc_season?.sections) {
    for (const section of ugc_season.sections) {
      for (const episode of section.episodes || []) {
        total_episodes++;
        const arc = episode.arc;
        if (!arc) continue;
        const stat = arc.stat;
        total_duration += arc.duration || 0;
        total_view += stat.view || 0;
        total_like += stat.like || 0;
        total_fav += stat.fav || 0;
        total_coin += stat.coin || 0;
        total_danmaku += stat.danmaku || 0;
        total_reply += stat.reply || 0;
        total_share += stat.share || 0;
      }
    }
  }

  let mappedUgcSeason: UgcSeason | undefined;
  const rawUgcSeason = resourceInfo.ugc_season || ugc_season;

  if (rawUgcSeason) {
    mappedUgcSeason = {
      id: rawUgcSeason.id,
      title: rawUgcSeason.title,
      cover: rawUgcSeason.cover,
      mid: rawUgcSeason.mid,
      intro: rawUgcSeason.intro,
      sign_state: rawUgcSeason.sign_state,
      attribute: rawUgcSeason.attribute,
      sections: rawUgcSeason.sections.map((section) => ({
        title: section.title,
        season_id: section.season_id,
        id: section.id,
        type: section.type,
        episodes: section.episodes?.map((episode) => {
          const arc = episode.arc;
          const stat = arc?.stat;

          const videoEpisodeStat: VideoEpisodeStat = {
            view: stat?.view || 0,
            like: stat?.like || 0,
            fav: stat?.fav || 0,
            coin: stat?.coin || 0,
            danmaku: stat?.danmaku || 0,
            reply: stat?.reply || 0,
            share: stat?.share || 0,
          };

          const videoEpisode: VideoEpisode = {
            season_id: episode.season_id,
            section_id: episode.section_id,
            id: episode.id,
            aid: episode.aid,
            cid: episode.cid,
            title: episode.title,
            attribute: episode.attribute,
            arc: {
              duration: arc?.duration || 0,
              stat: videoEpisodeStat,
            },
          };
          return videoEpisode;
        }),
      })),
      stat: rawUgcSeason.stat,
      ep_count: rawUgcSeason.ep_count,
      season_type: rawUgcSeason.season_type,
      is_pay_season: rawUgcSeason.is_pay_season,
    };
  }

  // 构建VideoInfo对象
  const videoInfo: VideoInfo = {
    av: resourceInfo.av || av || bv2av(bv!),
    bv: resourceInfo.bv || bv || av2bv(av!),
    title: resourceInfo.title || '',
    cover: resourceInfo.cover || '',
    upper: resourceInfo.upper || { mid: 0, name: '', face: '' },
    cnt_info: resourceInfo.cnt_info || {
      coin: 0,
      collect: 0,
      danmaku: 0,
      play: 0,
      play_switch: 0,
      reply: 0,
      share: 0,
      thumb_down: 0,
      thumb_up: 0,
      view_text_1: '',
      vt: 0,
    },
    pages: Array.isArray(resourceInfo.pages) ? resourceInfo.pages : [],
    intro: resourceInfo.intro || '',
    ugc_season: mappedUgcSeason,
    total_episodes,
    total_duration,
    total_view,
    total_like,
    total_fav,
    total_coin,
    total_danmaku,
    total_reply,
    total_share,
  };

  return videoInfo;
}
