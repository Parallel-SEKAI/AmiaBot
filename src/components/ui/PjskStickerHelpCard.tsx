import React from 'react';
import { AppShell } from '../ui/AppShell.js';
import { Sparkles, Terminal, Info, Keyboard } from 'lucide-react';

export const PjskStickerHelpCard: React.FC = () => {
  return (
    <AppShell>
      <div className="space-y-6">
        <div className="text-center border-b-2 border-outline-variant pb-4 mb-4">
          <h1 className="text-3xl font-bold text-primary mb-1">
            PJSK 贴纸生成器帮助
          </h1>
          <p className="text-xs text-on-surface-variant opacity-70">
            自定义属于你的 Project SEKAI 风格贴纸
          </p>
        </div>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-sm">
            <Terminal size={18} /> 使用方法
          </div>
          <div className="bg-surface-container-high p-3 rounded-md font-mono text-sm border border-outline-variant">
            /pjsk &lt;角色名&gt; &lt;文本内容&gt; [参数]
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-sm">
            <Info size={18} /> 可选参数
          </div>
          <div className="grid grid-cols-1 gap-2">
            <ParamItem name="pos=(x,y)" desc="文本位置 (例如: pos=(50,50))" />
            <ParamItem
              name="clr=(r,g,b)"
              desc="文本颜色 (例如: clr=(255,0,0))"
            />
            <ParamItem name="fs=大小" desc="字体大小 (默认: 50)" />
            <ParamItem name="font=字体" desc="字体类型" />
            <ParamItem name="rot=角度" desc="旋转角度" />
          </div>
        </section>

        <section className="space-y-3">
          <div className="flex items-center gap-2 text-primary font-bold uppercase tracking-widest text-sm">
            <Keyboard size={18} /> 示例
          </div>
          <div className="space-y-2">
            <div className="bg-surface-container p-2 rounded text-xs font-mono border border-outline-variant/50">
              /pjsk miku 你好
            </div>
            <div className="bg-surface-container p-2 rounded text-xs font-mono border border-outline-variant/50">
              /pjsk rin 测试 pos=(50,50) clr=(255,0,0)
            </div>
          </div>
        </section>

        <div className="pt-4 flex justify-center">
          <div className="flex items-center gap-2 px-4 py-2 bg-secondary-container text-on-secondary-container rounded-full text-xs font-bold">
            <Sparkles size={14} /> 提示: 角色名后加数字可切换不同表情 (例:
            miku2)
          </div>
        </div>
      </div>
    </AppShell>
  );
};

const ParamItem = ({ name, desc }: { name: string; desc: string }) => (
  <div className="flex items-center gap-3 p-2 bg-surface-container rounded border border-outline-variant/30">
    <div className="text-primary font-mono font-bold text-xs min-w-[80px]">
      {name}
    </div>
    <div className="text-xs text-on-surface-variant">{desc}</div>
  </div>
);
