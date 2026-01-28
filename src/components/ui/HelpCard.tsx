import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Container } from '../ui/Container.js';
import { HelpCircle, Terminal, Book, Lightbulb } from 'lucide-react';

interface HelpCardProps {
  helpText: string;
}

export const HelpCard: React.FC<HelpCardProps> = ({ helpText }) => {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-3 border-b-2 border-outline-variant pb-4 mb-4">
          <div className="p-3 bg-primary text-on-primary rounded-xl shadow-md">
            <HelpCircle size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-primary">
              AmiaBot 帮助手册
            </h1>
            <p className="text-xs text-on-surface-variant opacity-70">
              探索所有的功能与指令
            </p>
          </div>
        </div>

        <section className="space-y-4">
          <div className="flex items-center gap-2 text-primary">
            <Terminal size={18} />
            <span className="font-bold uppercase tracking-widest text-sm">
              指令说明
            </span>
          </div>

          <Container
            variant="outline"
            className="bg-surface-container-low text-sm leading-relaxed whitespace-pre-wrap"
          >
            {helpText}
          </Container>
        </section>

        <div className="grid grid-cols-2 gap-4 pt-4 border-t border-outline-variant/30">
          <div className="flex items-start gap-3 p-3 bg-secondary-container text-on-secondary-container rounded-lg">
            <Book size={20} className="shrink-0 mt-1 opacity-70" />
            <div className="min-w-0">
              <div className="font-bold text-xs uppercase mb-1">快速入门</div>
              <div className="text-[10px] leading-tight">
                使用 "/" 前缀来触发大部分指令喵~
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-tertiary-container text-on-tertiary-container rounded-lg">
            <Lightbulb size={20} className="shrink-0 mt-1 opacity-70" />
            <div className="min-w-0">
              <div className="font-bold text-xs uppercase mb-1">小提示</div>
              <div className="text-[10px] leading-tight">
                可以通过 GitHub 链接直接获取仓库信息喵!
              </div>
            </div>
          </div>
        </div>
      </div>
    </AppShell>
  );
};
