import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Container } from '../ui/Container.js';
import { Music, User, Hash, Headphones } from 'lucide-react';

interface SearchCardProps {
  query: string;
  songs: {
    id: number;
    name: string;
    artists: string[];
    album?: string;
    coverUrl?: string;
  }[];
}

export const SearchCard: React.FC<SearchCardProps> = (props) => {
  return (
    <AppShell>
      <div className="space-y-4">
        <h1 className="text-2xl font-bold text-primary border-b-2 border-outline-variant pb-2 mb-4 flex items-center gap-2">
          <Headphones size={24} /> 搜索结果: "{props.query}"
        </h1>

        <div className="space-y-2">
          {props.songs.map((song, idx) => (
            <div
              key={idx}
              className="flex items-center gap-4 p-3 bg-surface-container rounded-md border border-outline-variant hover:bg-surface-container-high transition-colors"
            >
              <div className="text-lg font-bold text-outline w-6 text-center">
                {idx + 1}
              </div>
              <div className="w-12 h-12 rounded bg-primary-container flex items-center justify-center text-on-primary-container overflow-hidden shrink-0 shadow-sm">
                {song.coverUrl ? (
                  <img
                    src={song.coverUrl}
                    alt={song.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Music size={24} />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-bold text-on-surface truncate">
                  {song.name}
                </div>
                <div className="text-xs text-on-surface-variant flex items-center gap-1 truncate opacity-70">
                  <User size={12} /> {song.artists.join(' / ')}
                </div>
              </div>
              <div className="text-[10px] font-mono bg-secondary-container text-on-secondary-container px-2 py-1 rounded flex items-center gap-1 shrink-0">
                <Hash size={10} /> {song.id}
              </div>
            </div>
          ))}
        </div>

        <div className="p-2 text-center text-[10px] text-on-surface-variant italic border-t border-outline-variant mt-4">
          提示：引用此消息并输入 "/play 序号" 即可播放对应歌曲喵~
        </div>
      </div>
    </AppShell>
  );
};
