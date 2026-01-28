import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Container } from '../ui/Container.js';
import { Play, ThumbsUp, Database, Star, MessageSquare, Share2, Users, Clock, Layers } from 'lucide-react';

interface VideoCardProps {
  coverUrl: string;
  title: string;
  av: number;
  bv: string;
  upperFaceUrl: string;
  upperName: string;
  play: number;
  thumbUp: number;
  coin: number;
  collect: number;
  danmaku: number;
  reply: number;
  share: number;
  intro: string;
  totalPages: number;
  pages: {
    page: number;
    title: string;
    durationStr: string;
  }[];
  hasMorePages: boolean;
  remainingPages: number;
  totalEpisodes?: number;
  seasons?: {
    title: string;
    episodes: {
      title: string;
      durationStr: string;
    }[];
    hasMoreEpisodes: boolean;
    remainingEpisodes: number;
  }[];
  hasMoreSeasons: boolean;
  remainingSeasons: number;
}

export const VideoCard: React.FC<VideoCardProps> = (props) => {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="relative w-full aspect-video rounded-lg overflow-hidden border-2 border-outline-variant shadow-md">
          <img src={props.coverUrl} alt={props.title} className="w-full h-full object-cover" />
          <div className="absolute top-2 left-2 px-2 py-1 bg-black/60 text-white text-[10px] font-bold rounded">
            AV{props.av} / {props.bv}
          </div>
        </div>

        <h1 className="text-xl font-bold text-on-surface leading-tight">
          {props.title}
        </h1>

        <div className="flex items-center gap-3 p-3 bg-secondary-container text-on-secondary-container rounded-md">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-on-secondary-container shadow-sm">
            <img src={props.upperFaceUrl} alt={props.upperName} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1 font-bold">{props.upperName}</div>
          <div className="text-xs opacity-70 flex items-center gap-1">
            <Users size={14} /> UP主
          </div>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <StatBox icon={<Play size={14} />} value={formatCount(props.play)} label="播放" />
          <StatBox icon={<ThumbsUp size={14} />} value={formatCount(props.thumbUp)} label="点赞" />
          <StatBox icon={<Database size={14} />} value={formatCount(props.coin)} label="硬币" />
          <StatBox icon={<Star size={14} />} value={formatCount(props.collect)} label="收藏" />
          <StatBox icon={<MessageSquare size={14} />} value={formatCount(props.danmaku)} label="弹幕" />
          <StatBox icon={<MessageSquare size={14} />} value={formatCount(props.reply)} label="评论" />
          <StatBox icon={<Share2 size={14} />} value={formatCount(props.share)} label="分享" />
          <StatBox icon={<Layers size={14} />} value={props.totalPages} label="分P" />
        </div>

        {props.intro && (
          <Container label="简介" variant="outline" className="text-xs text-on-surface-variant max-h-24 overflow-hidden relative bg-surface-container-low">
            {props.intro}
            <div className="absolute bottom-0 left-0 right-0 h-6 bg-gradient-to-t from-surface-container-low to-transparent" />
          </Container>
        )}

        {props.pages.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase opacity-60 flex items-center gap-1">
              <Clock size={12} /> 视频列表
            </div>
            <div className="bg-surface-container rounded-md overflow-hidden border border-outline-variant">
              {props.pages.map((p, idx) => (
                <div key={idx} className="flex justify-between items-center p-2 text-xs border-b border-outline-variant last:border-b-0">
                  <span className="truncate flex-1 pr-4">P{p.page}. {p.title}</span>
                  <span className="font-mono opacity-70">{p.durationStr}</span>
                </div>
              ))}
              {props.hasMorePages && (
                <div className="p-2 text-center text-[10px] bg-secondary-container text-on-secondary-container font-bold">
                  还有 {props.remainingPages} 个分P未展示...
                </div>
              )}
            </div>
          </div>
        )}

        {props.seasons && props.seasons.length > 0 && (
          <div className="space-y-2">
            <div className="text-[10px] font-bold uppercase opacity-60 flex items-center gap-1">
               合集内容
            </div>
            {props.seasons.map((s, idx) => (
              <div key={idx} className="bg-tertiary-container text-on-tertiary-container rounded-md p-2 space-y-1">
                <div className="font-bold text-xs border-b border-on-tertiary-container/20 pb-1 mb-1">{s.title}</div>
                {s.episodes.map((e, eIdx) => (
                  <div key={eIdx} className="flex justify-between items-center text-[10px]">
                    <span className="truncate flex-1 pr-2">• {e.title}</span>
                    <span className="opacity-70">{e.durationStr}</span>
                  </div>
                ))}
                {s.hasMoreEpisodes && (
                  <div className="text-[9px] opacity-70 pt-1">还有 {s.remainingEpisodes} 个视频...</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
};

const formatCount = (count: number) => {
  if (count >= 10000) return (count / 10000).toFixed(1) + '万';
  return count.toString();
};

const StatBox = ({ icon, value, label }: { icon: React.ReactNode, value: string | number, label: string }) => (
  <div className="flex flex-col items-center p-2 bg-surface-container-high rounded border border-outline-variant">
    <div className="text-primary mb-1">{icon}</div>
    <div className="text-sm font-bold">{value}</div>
    <div className="text-[9px] opacity-60">{label}</div>
  </div>
);
