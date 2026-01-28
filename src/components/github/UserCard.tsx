import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Container } from '../ui/Container.js';
import { Users, BookOpen, MapPin, Link as LinkIcon, Building, Calendar, Github } from 'lucide-react';

interface UserCardProps {
  avatarUrl: string;
  name: string;
  login: string;
  bio: string | null;
  publicRepos: number;
  following: number;
  followers: number;
  location: string | null;
  blog: string | null;
  company: string | null;
  createdAt: string;
  updatedAt: string;
}

export const UserCard: React.FC<UserCardProps> = (props) => {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-center gap-6 border-b-2 border-outline-variant pb-6 mb-4">
          <div className="w-24 h-24 rounded-full overflow-hidden border-4 border-primary shadow-lg">
            <img src={props.avatarUrl} alt={props.login} className="w-full h-full object-cover" />
          </div>
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-on-surface leading-tight">
              {props.name}
            </h1>
            <div className="text-xl text-primary font-medium mb-2 flex items-center gap-2">
              <Github size={20} /> @{props.login}
            </div>
            {props.bio && (
              <p className="text-on-surface-variant italic text-sm">
                "{props.bio}"
              </p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 mb-4">
          <StatBox icon={<Users size={18} />} label="Followers" value={props.followers} />
          <StatBox icon={<Users size={18} />} label="Following" value={props.following} />
          <StatBox icon={<BookOpen size={18} />} label="Repos" value={props.publicRepos} />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            {props.location && <InfoRow icon={<MapPin size={16} />} text={props.location} />}
            {props.company && <InfoRow icon={<Building size={16} />} text={props.company} />}
          </div>
          <div className="space-y-2">
            {props.blog && <InfoRow icon={<LinkIcon size={16} />} text={props.blog} />}
            <InfoRow icon={<Calendar size={16} />} text={`Joined: ${props.createdAt.split(' ')[0]}`} />
          </div>
        </div>
      </div>
    </AppShell>
  );
};

const StatBox = ({ icon, label, value }: { icon: React.ReactNode, label: string, value: number }) => (
  <div className="flex flex-col items-center p-3 border border-outline-variant rounded-md bg-secondary-container text-on-secondary-container">
    <div className="mb-1">{icon}</div>
    <div className="text-2xl font-bold">{value}</div>
    <div className="text-[10px] uppercase font-bold opacity-70">{label}</div>
  </div>
);

const InfoRow = ({ icon, text }: { icon: React.ReactNode, text: string }) => (
  <div className="flex items-center gap-2 text-sm text-on-surface-variant p-2 bg-surface-container rounded border border-outline-variant">
    <span className="text-primary">{icon}</span>
    <span className="truncate">{text}</span>
  </div>
);
