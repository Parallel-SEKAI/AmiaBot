import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Container } from '../ui/Container.js';
import { Users, Shield, Calendar, Info, MessageSquare, Lock, Hash } from 'lucide-react';

interface QueryGroupCardProps {
  avatarUrl: string;
  name: string;
  id: number;
  level: number | null;
  createTime: string | undefined;
  memberCount: number | null;
  maxMemberCount: number | null;
  activeMemberCount: number | null;
  ownerId: number | null;
  rules: string | null;
  joinQuestion: string | null;
  isMutedAll: boolean;
  description: string | null;
}

export const QueryGroupCard: React.FC<QueryGroupCardProps> = (props) => {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-6 border-b-2 border-outline-variant pb-6 mb-4">
          <div className="w-24 h-24 rounded-2xl overflow-hidden border-4 border-primary shadow-lg">
            <img src={props.avatarUrl} alt={props.name} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-on-surface leading-tight mb-1">
              {props.name}
            </h1>
            <div className="text-xl text-primary font-medium mb-2 flex items-center gap-2">
              <Hash size={20} /> {props.id}
            </div>
            <div className="flex gap-2">
              <span className="px-3 py-1 bg-primary-container text-on-primary-container rounded-full text-xs font-bold">
                Lv.{props.level || 0}
              </span>
              {props.isMutedAll && (
                <span className="px-3 py-1 bg-error-container text-on-error-container rounded-full text-xs font-bold flex items-center gap-1">
                  <Lock size={12} /> 全员禁言中
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatBox icon={<Users size={18} />} label="总人数" value={`${props.memberCount}/${props.maxMemberCount}`} />
          <StatBox icon={<Users size={18} />} label="活跃人数" value={props.activeMemberCount || 0} />
          <StatBox icon={<Shield size={18} />} label="创建时间" value={props.createTime?.split(' ')[0] || '未知'} />
        </div>

        {props.description && (
          <Container label="群介绍" variant="outline" className="bg-surface-container-low">
            <p className="text-xs text-on-surface-variant leading-relaxed whitespace-pre-wrap">
              {props.description}
            </p>
          </Container>
        )}

        <div className="grid grid-cols-1 gap-4">
           {props.rules && (
             <section className="space-y-2">
                <div className="text-[10px] font-bold opacity-60 flex items-center gap-1 uppercase tracking-wider">
                  <MessageSquare size={12} /> 群规
                </div>
                <div className="p-3 bg-surface-container rounded-md border border-outline-variant text-xs text-on-surface">
                  {props.rules}
                </div>
             </section>
           )}
           
           {props.joinQuestion && (
             <section className="space-y-2">
                <div className="text-[10px] font-bold opacity-60 flex items-center gap-1 uppercase tracking-wider">
                  <Info size={12} /> 加群问题
                </div>
                <div className="p-3 bg-tertiary-container text-on-tertiary-container rounded-md text-xs italic">
                  "{props.joinQuestion}"
                </div>
             </section>
           )}
        </div>
        
        <div className="text-[10px] text-on-surface-variant flex items-center gap-2 opacity-50 justify-end pt-2">
           <Info size={10} /> 群主: {props.ownerId}
        </div>
      </div>
    </AppShell>
  );
};

const StatBox = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
  <div className="flex flex-col items-center p-3 border border-outline-variant rounded-md bg-surface-container-high">
    <div className="text-primary mb-1">{icon}</div>
    <div className="text-lg font-bold text-on-surface">{value}</div>
    <div className="text-[10px] uppercase font-bold opacity-60">{label}</div>
  </div>
);
