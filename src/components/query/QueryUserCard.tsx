import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Container } from '../ui/Container.js';
import { User as UserIcon, Calendar, Trophy, Shield, Hash, MapPin, Clock } from 'lucide-react';

interface QueryUserCardProps {
  avatarUrl: string;
  fullName: string;
  id: number;
  sex: string | null;
  sexText: string;
  age: number | null;
  regYear: number | null;
  qAge: number | null;
  qqLevel: number | null;
  card: string | null;
  role: string | null;
  roleText: string;
  groupLevel: string | null;
  title: string | null;
  joinTime: string | undefined;
  lastSentTime: string | undefined;
  hasVipInfo: boolean;
  isVip: boolean | null;
  isYearsVip: boolean | null;
  vipLevel: number | null;
}

export const QueryUserCard: React.FC<QueryUserCardProps> = (props) => {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-6 border-b-2 border-outline-variant pb-6 mb-4">
          <div className="relative">
            <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary shadow-lg">
              <img src={props.avatarUrl} alt={props.fullName} className="w-full h-full object-cover" />
            </div>
            {props.isVip && (
              <div className="absolute -bottom-1 -right-1 bg-error-container text-on-error-container p-1 rounded-full border-2 border-surface shadow-sm">
                <Trophy size={16} />
              </div>
            )}
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-on-surface leading-tight">
              {props.fullName}
            </h1>
            <div className="text-xl text-primary font-medium mb-1 flex items-center gap-2">
              <Hash size={20} /> {props.id}
            </div>
            <div className="flex gap-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${props.role === 'owner' ? 'bg-error-container text-on-error-container' : props.role === 'admin' ? 'bg-primary-container text-on-primary-container' : 'bg-secondary-container text-on-secondary-container'}`}>
                {props.roleText}
              </span>
              {props.title && (
                <span className="px-2 py-0.5 bg-tertiary-container text-on-tertiary-container rounded text-[10px] font-bold uppercase">
                  {props.title}
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <section className="space-y-3">
             <div className="text-[10px] font-bold opacity-60 flex items-center gap-1 uppercase tracking-wider">
               <UserIcon size={12} /> 个人资料
             </div>
             <div className="grid grid-cols-2 gap-2">
                <DetailItem label="性别" value={props.sexText} />
                <DetailItem label="年龄" value={props.age ?? '未知'} />
                <DetailItem label="Q龄" value={props.qAge ? `${props.qAge}年` : '未知'} />
                <DetailItem label="等级" value={props.qqLevel ? `Lv.${props.qqLevel}` : '未知'} />
             </div>
          </section>

          <section className="space-y-3">
             <div className="text-[10px] font-bold opacity-60 flex items-center gap-1 uppercase tracking-wider">
               <Shield size={12} /> 群内信息
             </div>
             <div className="grid grid-cols-1 gap-2">
                <DetailItem label="群名片" value={props.card || '无'} />
                <DetailItem label="群等级" value={props.groupLevel || '未知'} />
             </div>
          </section>
        </div>

        <div className="grid grid-cols-2 gap-4">
           <InfoBox icon={<Clock size={14} />} label="入群时间" value={props.joinTime || '未知'} />
           <InfoBox icon={<Clock size={14} />} label="最后发言" value={props.lastSentTime || '未知'} />
        </div>
      </div>
    </AppShell>
  );
};

const DetailItem = ({ label, value }: { label: string, value: string | number }) => (
  <div className="flex flex-col p-2 bg-surface-container rounded border border-outline-variant/30">
    <div className="text-[9px] opacity-60 font-bold uppercase mb-0.5">{label}</div>
    <div className="text-sm font-bold text-on-surface truncate">{value}</div>
  </div>
);

const InfoBox = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) => (
  <div className="flex items-center gap-3 p-2 bg-surface-container-low rounded border border-outline-variant/50">
    <div className="text-primary opacity-70">{icon}</div>
    <div className="min-w-0">
      <div className="text-[9px] opacity-60 font-bold uppercase">{label}</div>
      <div className="text-xs font-medium truncate">{value}</div>
    </div>
  </div>
);
