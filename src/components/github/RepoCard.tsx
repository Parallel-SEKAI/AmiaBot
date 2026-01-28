import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Container } from '../ui/Container.js';
import {
  Star,
  GitFork,
  AlertCircle,
  Eye,
  Shield,
  Code,
  Calendar,
} from 'lucide-react';

interface RepoCardProps {
  fullName: string;
  description: string;
  ownerAvatarUrl: string;
  ownerLogin: string;
  ownerType: string;
  stars: number;
  forks: number;
  issues: number;
  watchers: number;
  language: string;
  license: string;
  defaultBranch: string;
  visibility: string;
  createdAt: string;
  updatedAt: string;
}

export const RepoCard: React.FC<RepoCardProps> = (props) => {
  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-3xl font-bold text-primary border-b-2 border-outline-variant pb-2 mb-4">
          {props.fullName}
        </h1>

        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full overflow-hidden border-2 border-primary">
            <img
              src={props.ownerAvatarUrl}
              alt={props.ownerLogin}
              className="w-full h-full object-cover"
            />
          </div>
          <div>
            <div className="text-xl font-bold">{props.ownerLogin}</div>
            <div className="text-sm opacity-70">{props.ownerType}</div>
          </div>
          <div className="ml-auto flex gap-2">
            <span className="px-3 py-1 bg-secondary-container text-on-secondary-container rounded-full text-sm font-bold">
              {props.visibility.toUpperCase()}
            </span>
          </div>
        </div>

        <Container label="Description" variant="tertiary">
          <p className="text-base leading-relaxed italic">
            "{props.description}"
          </p>
        </Container>

        <div className="grid grid-cols-4 gap-4">
          <StatBox
            icon={<Star size={16} />}
            label="STARS"
            value={props.stars}
          />
          <StatBox
            icon={<GitFork size={16} />}
            label="FORKS"
            value={props.forks}
          />
          <StatBox
            icon={<AlertCircle size={16} />}
            label="ISSUES"
            value={props.issues}
          />
          <StatBox
            icon={<Eye size={16} />}
            label="WATCHERS"
            value={props.watchers}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-3">
            <InfoItem
              icon={<Code size={16} />}
              label="Language"
              value={props.language}
            />
            <InfoItem
              icon={<Shield size={16} />}
              label="License"
              value={props.license}
            />
          </div>
          <div className="space-y-3">
            <InfoItem
              icon={<Calendar size={16} />}
              label="Created At"
              value={props.createdAt}
            />
            <InfoItem
              icon={<Calendar size={16} />}
              label="Updated At"
              value={props.updatedAt}
            />
          </div>
        </div>
      </div>
    </AppShell>
  );
};

const StatBox = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) => (
  <div className="flex flex-col items-center p-3 border border-outline-variant rounded-md bg-surface-container">
    <div className="text-primary mb-1">{icon}</div>
    <div className="text-xl font-bold text-primary">{value}</div>
    <div className="text-[10px] opacity-60 font-bold">{label}</div>
  </div>
);

const InfoItem = ({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) => (
  <div className="flex items-center gap-3 p-2 bg-surface-container-low rounded-sm border border-outline-variant">
    <div className="text-secondary">{icon}</div>
    <div>
      <div className="text-[10px] opacity-60 font-bold uppercase">{label}</div>
      <div className="text-sm font-medium">{value}</div>
    </div>
  </div>
);
