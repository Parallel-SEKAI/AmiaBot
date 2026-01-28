import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Container } from '../ui/Container.js';
import {
  GitPullRequest,
  GitMerge,
  MessageSquare,
  Calendar,
  Plus,
  Minus,
  GitBranch,
} from 'lucide-react';

interface PRCardProps {
  number: number;
  title: string;
  isOpen: boolean;
  isMerged: boolean;
  authorAvatarUrl: string | null;
  authorLogin: string;
  createdAt: string;
  updatedAt: string;
  mergedAt: string | null;
  headBranch: string;
  baseBranch: string;
  body: string | null;
  comments: number;
  commits: number;
  additions: number;
  deletions: number;
}

export const PRCard: React.FC<PRCardProps> = (props) => {
  return (
    <AppShell>
      <div className="space-y-4">
        <div className="flex items-start justify-between border-b-2 border-outline-variant pb-4 mb-4">
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-on-surface leading-tight mb-2">
              <span className="text-outline mr-2">#{props.number}</span>
              {props.title}
            </h1>
            <div className="flex items-center gap-3">
              {props.isMerged ? (
                <span className="flex items-center gap-1 px-3 py-1 bg-[#8250df] text-white rounded-full text-xs font-bold">
                  <GitMerge size={14} /> Merged
                </span>
              ) : props.isOpen ? (
                <span className="flex items-center gap-1 px-3 py-1 bg-[#2e7d32] text-white rounded-full text-xs font-bold">
                  <GitPullRequest size={14} /> Open
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1 bg-[#ba1a1a] text-white rounded-full text-xs font-bold">
                  <GitPullRequest size={14} /> Closed
                </span>
              )}

              <div className="flex items-center gap-2 text-sm text-on-surface-variant font-mono bg-surface-container px-2 py-0.5 rounded border border-outline-variant">
                <GitBranch size={12} />
                <span>{props.baseBranch}</span>
                <span className="opacity-50">←</span>
                <span>{props.headBranch}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 mb-4 p-3 bg-surface-container-high rounded-md">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-primary shadow-sm">
            <img
              src={props.authorAvatarUrl || ''}
              alt={props.authorLogin}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="flex-1">
            <div className="text-sm font-bold">{props.authorLogin}</div>
            <div className="text-xs opacity-70">
              {props.isMerged
                ? `merged on ${props.mergedAt ?? props.createdAt}`
                : `opened on ${props.createdAt}`}
            </div>
          </div>
          <div className="flex gap-4">
            <div className="flex items-center gap-1 text-[#2e7d32] font-bold">
              <Plus size={14} /> {props.additions}
            </div>
            <div className="flex items-center gap-1 text-[#ba1a1a] font-bold">
              <Minus size={14} /> {props.deletions}
            </div>
          </div>
        </div>

        {props.body && (
          <Container
            label="Overview"
            variant="outline"
            className="bg-surface-container-low text-sm line-clamp-4"
          >
            {props.body}
          </Container>
        )}

        <div className="grid grid-cols-3 gap-3">
          <StatBox
            icon={<MessageSquare size={16} />}
            label="Comments"
            value={props.comments}
          />
          <StatBox
            icon={<GitPullRequest size={16} />}
            label="Commits"
            value={props.commits}
          />
          <StatBox
            icon={<Calendar size={16} />}
            label="Updated"
            value={props.updatedAt.split(' ')[0]}
          />
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
  <div className="flex flex-col items-center p-2 border border-outline-variant rounded bg-surface-container">
    <div className="text-secondary mb-1">{icon}</div>
    <div className="text-lg font-bold text-on-surface">{value}</div>
    <div className="text-[9px] uppercase opacity-60 font-bold">{label}</div>
  </div>
);
