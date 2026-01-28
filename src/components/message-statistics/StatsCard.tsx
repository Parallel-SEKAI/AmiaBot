import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Container } from '../ui/Container.js';
import { MessageSquare, Users, Clock, Zap, Target, Quote, Trophy } from 'lucide-react';

interface Topic {
  topic_id: number;
  topic_name: string;
  participants: number[];
  content: string;
}

interface MemberTitle {
  qq_number: number;
  title: string;
  feature: string;
  name: string;
}

interface Bible {
  sentence: string;
  interpreter: number;
  explanation: string;
  name: string;
}

interface StatsCardProps {
  groupName: string;
  startTime: string;
  endTime: string;
  messageCount: number;
  memberCount: number;
  analysisTime: string;
  tokenUsage: string;
  hot_topics: Topic[];
  group_members_titles: MemberTitle[];
  group_bible: Bible[];
}

export const StatsCard: React.FC<StatsCardProps> = (props) => {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="text-center border-b-2 border-outline-variant pb-4 mb-4">
          <h1 className="text-3xl font-bold text-primary mb-1">{props.groupName}</h1>
          <div className="text-[10px] text-on-surface-variant font-mono flex justify-center gap-2 opacity-70">
            <span>{props.startTime}</span>
            <span>至</span>
            <span>{props.endTime}</span>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-3">
          <StatBox icon={<MessageSquare size={16} />} label="消息总数" value={props.messageCount} />
          <StatBox icon={<Users size={16} />} label="活跃成员" value={props.memberCount} />
          <StatBox icon={<Clock size={16} />} label="分析耗时" value={`${props.analysisTime}s`} />
          <StatBox icon={<Zap size={16} />} label="Token" value={props.tokenUsage} />
        </div>

        <section className="space-y-3">
          <SectionHeader icon={<Target size={18} />} title="热门话题" />
          <div className="grid grid-cols-1 gap-3">
            {props.hot_topics.map((topic, idx) => (
              <div key={idx} className="p-3 bg-surface-container rounded-md border-l-4 border-primary">
                <div className="font-bold text-on-surface mb-1 flex justify-between">
                  <span>{topic.topic_name}</span>
                  <span className="text-[10px] px-2 py-0.5 bg-primary-container text-on-primary-container rounded-full">
                    {topic.participants.length} 人参与
                  </span>
                </div>
                <p className="text-xs text-on-surface-variant line-clamp-2 italic opacity-80">
                  "{topic.content}"
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <SectionHeader icon={<Trophy size={18} />} title="群友封号" />
          <div className="grid grid-cols-2 gap-3">
            {props.group_members_titles.map((title, idx) => (
              <div key={idx} className="p-3 bg-secondary-container text-on-secondary-container rounded-md flex flex-col">
                <div className="font-bold text-sm truncate mb-1">{title.name}</div>
                <div className="text-xs font-black uppercase tracking-widest bg-white/20 px-2 py-0.5 rounded self-start mb-2">
                   {title.title}
                </div>
                <div className="text-[10px] opacity-80">{title.feature}</div>
              </div>
            ))}
          </div>
        </section>

        {props.group_bible.length > 0 && (
          <section className="space-y-3">
            <SectionHeader icon={<Quote size={18} />} title="群圣经" />
            <div className="space-y-3">
              {props.group_bible.map((bible, idx) => (
                <div key={idx} className="relative p-4 bg-surface-container-high rounded-md border border-outline-variant">
                   <div className="absolute top-2 right-4 text-4xl opacity-10 pointer-events-none text-primary">"</div>
                   <div className="text-sm font-bold text-primary mb-2">
                      {bible.name}: "{bible.sentence}"
                   </div>
                   <div className="text-xs text-on-surface-variant pl-4 border-l-2 border-outline-variant italic">
                      {bible.explanation}
                   </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </AppShell>
  );
};

const SectionHeader = ({ icon, title }: { icon: React.ReactNode, title: string }) => (
  <div className="flex items-center gap-2 text-primary border-b border-outline-variant/30 pb-1">
    {icon}
    <span className="font-bold tracking-widest uppercase text-sm">{title}</span>
  </div>
);

const StatBox = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: string | number }) => (
  <div className="flex flex-col items-center p-2 bg-surface-container-low rounded-md border border-outline-variant/50">
    <div className="text-primary opacity-70 mb-1">{icon}</div>
    <div className="text-sm font-bold text-on-surface">{value}</div>
    <div className="text-[9px] opacity-60 font-medium">{label}</div>
  </div>
);
