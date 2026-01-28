import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Container } from '../ui/Container.js';
import { MessageSquare, Calendar, User, CircleDot, CheckCircle2 } from 'lucide-react';

interface IssueCardProps {
  number: number;
  title: string;
  isOpen: boolean;
  authorAvatarUrl: string;
  authorLogin: string;
  createdAt: string;
  body: string | null;
  comments: number;
}

export const IssueCard: React.FC<IssueCardProps> = (props) => {
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
              {props.isOpen ? (
                <span className="flex items-center gap-1 px-3 py-1 bg-[#2e7d32] text-white rounded-full text-xs font-bold">
                  <CircleDot size={14} /> Open
                </span>
              ) : (
                <span className="flex items-center gap-1 px-3 py-1 bg-[#8250df] text-white rounded-full text-xs font-bold">
                  <CheckCircle2 size={14} /> Closed
                </span>
              )}
              <div className="flex items-center gap-2 text-sm text-on-surface-variant">
                <div className="w-6 h-6 rounded-full overflow-hidden border border-outline-variant">
                  <img src={props.authorAvatarUrl} alt={props.authorLogin} className="w-full h-full object-cover" />
                </div>
                <span className="font-medium">{props.authorLogin}</span>
                <span>opened on {props.createdAt}</span>
              </div>
            </div>
          </div>
        </div>

        {props.body && (
          <Container label="Description" variant="outline" className="bg-surface-container-low">
            <div className="text-sm text-on-surface whitespace-pre-wrap max-h-[300px] overflow-hidden relative">
              {props.body}
              <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-surface-container-low to-transparent" />
            </div>
          </Container>
        )}

        <div className="flex justify-end gap-4">
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-md">
            <MessageSquare size={16} />
            <span className="font-bold">{props.comments}</span>
            <span className="text-xs uppercase opacity-70 tracking-tighter">Comments</span>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
