import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Trophy } from 'lucide-react';

interface LeaderboardItem {
  userId: number;
  nickname: string;
  favorability: number;
  tags: string[];
}

interface SocialLeaderboardProps {
  userNick: string;
  userAvatar: string;
  items: LeaderboardItem[];
}

const getFavorLevel = (favor: number) => {
  if (favor < 0)
    return { label: '【恶交】', color: 'bg-error-container text-error' };
  if (favor < 100)
    return {
      label: '【萍水相逢】',
      color: 'bg-secondary-container text-secondary',
    };
  if (favor < 500)
    return {
      label: '【志同道合】',
      color: 'bg-primary-container text-primary',
    };
  if (favor < 1000)
    return {
      label: '【情投意合】',
      color: 'bg-tertiary-container text-tertiary',
    };
  return {
    label: '【生死与共】',
    color: 'bg-yellow-400 text-on-tertiary-container',
  };
};

export const SocialLeaderboard: React.FC<SocialLeaderboardProps> = (props) => {
  return (
    <AppShell>
      <div className="space-y-6">
        <header className="flex items-center gap-4 border-b-2 border-outline-variant pb-4">
          <div className="w-12 h-12 rounded-full border-2 border-primary p-0.5">
            <img
              src={props.userAvatar}
              alt={props.userNick}
              className="w-full h-full rounded-full object-cover"
            />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">社交关系圈</h1>
            <p className="text-sm opacity-60 font-medium">
              查看 {props.userNick} 的好友排行
            </p>
          </div>
          <div className="ml-auto text-primary">
            <Trophy size={32} />
          </div>
        </header>

        <div className="space-y-3">
          {props.items.length === 0 ? (
            <div className="text-center py-10 opacity-50 italic">
              这里空空如也，快去和群友互动吧！
            </div>
          ) : (
            props.items.map((item, index) => (
              <ListItem key={item.userId} item={item} rank={index + 1} />
            ))
          )}
        </div>
      </div>
    </AppShell>
  );
};

const ListItem = ({ item, rank }: { item: LeaderboardItem; rank: number }) => {
  const level = getFavorLevel(item.favorability);
  const avatarUrl = `https://q.qlogo.cn/headimg_dl?dst_uin=${item.userId}&spec=640`;

  return (
    <div className="flex items-center gap-4 p-3 bg-surface-container rounded-lg border border-outline-variant hover:border-primary transition-colors">
      <div
        className={`w-8 h-8 flex items-center justify-center font-black rounded-full text-sm ${rank <= 3 ? 'bg-primary text-on-primary' : 'bg-surface-container-highest opacity-50'}`}
      >
        {rank}
      </div>

      <div className="w-12 h-12 rounded-full overflow-hidden border border-outline-variant">
        <img
          src={avatarUrl}
          alt={item.nickname}
          className="w-full h-full object-cover"
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold truncate">{item.nickname}</span>
          {item.tags.map((tag) => (
            <span
              key={tag}
              className="px-1.5 py-0.5 bg-secondary text-[10px] text-on-secondary rounded uppercase font-black tracking-tighter"
            >
              {tag}
            </span>
          ))}
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span
            className={`px-2 py-0.5 rounded text-[10px] font-bold ${level.color}`}
          >
            {level.label}
          </span>
        </div>
      </div>

      <div className="text-right">
        <div className="text-[10px] font-black opacity-40 uppercase">
          FAVORABILITY
        </div>
        <div className="text-xl font-black text-primary leading-none">
          {item.favorability}
        </div>
      </div>
    </div>
  );
};
