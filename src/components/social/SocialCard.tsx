import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Container } from '../ui/Container.js';
import { Heart, HeartCrack, Gift, Star } from 'lucide-react';

export type InteractionType = 'MARRY' | 'GIFT' | 'DIVORCE';

interface SocialCardProps {
  type: InteractionType;
  userNick: string;
  userAvatar: string;
  targetNick: string;
  targetAvatar: string;
  favorability: number;
  changeAmount?: number;
  message?: string;
  isSurprise?: boolean;
}

const getFavorLevel = (favor: number) => {
  if (favor < 0)
    return {
      label: '【恶交】',
      color: 'text-error',
      bg: 'bg-error-container',
      border: 'border-error',
    };
  if (favor < 100)
    return {
      label: '【萍水相逢】',
      color: 'text-secondary',
      bg: 'bg-secondary-container',
      border: 'border-outline-variant',
    };
  if (favor < 500)
    return {
      label: '【志同道合】',
      color: 'text-primary',
      bg: 'bg-primary-container',
      border: 'border-primary',
    };
  if (favor < 1000)
    return {
      label: '【情投意合】',
      color: 'text-tertiary',
      bg: 'bg-tertiary-container',
      border: 'border-tertiary',
    };
  return {
    label: '【生死与共】',
    color: 'text-on-tertiary-container',
    bg: 'bg-yellow-400',
    border: 'border-yellow-600',
  };
};

export const SocialCard: React.FC<SocialCardProps> = (props) => {
  const level = getFavorLevel(props.favorability);
  const Icon =
    props.type === 'MARRY' ? Heart : props.type === 'GIFT' ? Gift : HeartCrack;
  const iconColor =
    props.type === 'MARRY'
      ? 'text-pink-500'
      : props.type === 'GIFT'
        ? 'text-orange-500'
        : 'text-gray-500';

  return (
    <AppShell>
      <div className="flex flex-col items-center py-6 relative overflow-hidden">
        {/* Background Decor */}
        <div className="absolute top-0 right-0 p-4 opacity-5">
          <Icon size={120} />
        </div>

        <div className="flex items-center justify-center gap-8 mb-8 relative z-10">
          <AvatarWithRing
            url={props.userAvatar}
            name={props.userNick}
            ringColor={level.border}
          />
          <div className="flex flex-col items-center">
            <div className={`${iconColor} animate-bounce`}>
              <Icon
                size={48}
                fill={props.type === 'MARRY' ? 'currentColor' : 'none'}
              />
            </div>
            {props.changeAmount !== undefined && (
              <div
                className={`text-xl font-bold ${props.changeAmount > 0 ? 'text-green-500' : 'text-red-500'}`}
              >
                {props.changeAmount > 0
                  ? `+${props.changeAmount}`
                  : props.changeAmount}
              </div>
            )}
          </div>
          <AvatarWithRing
            url={props.targetAvatar}
            name={props.targetNick}
            ringColor={level.border}
          />
        </div>

        <div className="text-center space-y-2 mb-6">
          <div className="text-2xl font-bold">
            {props.userNick} <span className="opacity-50 mx-2">&</span>{' '}
            {props.targetNick}
          </div>
          {props.message && (
            <div className="text-lg opacity-80">{props.message}</div>
          )}
          {props.isSurprise && (
            <div className="inline-flex items-center gap-2 px-4 py-1 bg-yellow-100 text-yellow-800 rounded-full border border-yellow-300 animate-pulse">
              <Star size={16} fill="currentColor" />
              <span className="text-sm font-bold uppercase tracking-wider">
                诚意满满！
              </span>
            </div>
          )}
        </div>

        <Container variant="secondary" label="关系状态">
          <div className="flex items-center justify-between p-2">
            <div className="flex items-center gap-3">
              <div
                className={`px-3 py-1 rounded-full text-xs font-bold ${level.bg} ${level.color}`}
              >
                {level.label}
              </div>
              <div className="text-sm font-medium">
                当前好感度:{' '}
                <span className="text-primary">{props.favorability}</span>
              </div>
            </div>
            <div className="w-32 bg-surface-container-high rounded-full h-2.5">
              <div
                className="bg-primary h-2.5 rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, Math.max(0, (props.favorability / 1000) * 100))}%`,
                }}
              />
            </div>
          </div>
        </Container>
      </div>
    </AppShell>
  );
};

const AvatarWithRing = ({
  url,
  name,
  ringColor,
}: {
  url: string;
  name: string;
  ringColor: string;
}) => (
  <div className="flex flex-col items-center gap-2">
    <div
      className={`w-20 h-20 rounded-full p-1 border-2 ${ringColor} shadow-lg shadow-surface-dim/20`}
    >
      <img
        src={url}
        alt={name}
        className="w-full h-full rounded-full object-cover"
      />
    </div>
    <div className="text-sm font-bold opacity-80 max-w-[100px] truncate">
      {name}
    </div>
  </div>
);
