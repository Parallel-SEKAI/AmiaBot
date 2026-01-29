import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Container } from '../ui/Container.js';
import { HelpCircle, Terminal, Book, Lightbulb } from 'lucide-react';

export interface CommandInfo {
  pattern: string | RegExp;
  description?: string;
  example?: string;
}

export interface GroupedCommands {
  [featureName: string]: CommandInfo[];
}

interface HelpCardProps {
  helpText: string;
  groupedCommands?: GroupedCommands;
}

export const HelpCard: React.FC<HelpCardProps> = ({
  helpText,
  groupedCommands,
}) => {
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

        {helpText && (
          <Container
            variant="outline"
            className="bg-surface-container-low text-sm leading-relaxed whitespace-pre-wrap p-4"
          >
            {helpText}
          </Container>
        )}

        {groupedCommands && Object.keys(groupedCommands).length > 0 && (
          <div className="space-y-6">
            {Object.entries(groupedCommands).map(([featureName, cmds]) => (
              <section key={featureName} className="space-y-3">
                <div className="flex items-center gap-2 text-primary border-l-4 border-primary pl-2">
                  <Terminal size={18} />
                  <span className="font-bold uppercase tracking-widest text-sm">
                    {featureName}
                  </span>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {cmds.map((cmd, idx) => (
                    <Container
                      key={idx}
                      variant="outline"
                      className="bg-surface-container-low p-3"
                    >
                      <div className="flex flex-col gap-1">
                        <div className="flex items-center gap-2">
                          <code className="px-1.5 py-0.5 bg-primary-container text-on-primary-container rounded text-xs font-bold">
                            {cmd.pattern instanceof RegExp
                              ? cmd.pattern.toString()
                              : cmd.pattern}
                          </code>
                          <span className="text-xs font-medium text-on-surface">
                            {cmd.description}
                          </span>
                        </div>
                        {cmd.example && (
                          <div className="text-[10px] text-on-surface-variant opacity-80 italic">
                            示例: {cmd.example}
                          </div>
                        )}
                      </div>
                    </Container>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

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
