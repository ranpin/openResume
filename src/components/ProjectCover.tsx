import React, { useId } from 'react';
import Icon from './Icon';
import type { Project } from '../types';

/**
 * 作品集程序化封面。
 * 数据里没有真实截图，因此按项目 id 确定性地生成一张「端侧 AI 技术质感」封面：
 * 深墨色渐变 + 电路节点纹理 + 主视觉图标 + 幽灵序号 + 状态徽章。
 * 同一 id 永远得到同一配色，刷新不变；若项目提供了 cover 真实图则优先使用。
 */

interface Palette {
  from: string;
  to: string;
  accent: string;
  glow: string;
}

// 与 sage 主色协调的克制冷色板（松绿 / 板岩蓝 / 梅紫 / 琥珀墨 / 深青）
const PALETTES: Palette[] = [
  { from: '#16241d', to: '#2e4a3b', accent: '#a9c494', glow: 'rgba(169,196,148,0.30)' },
  { from: '#1a2432', to: '#2e4260', accent: '#93b6dd', glow: 'rgba(147,182,221,0.28)' },
  { from: '#251d2e', to: '#413452', accent: '#bba6dc', glow: 'rgba(187,166,220,0.28)' },
  { from: '#2a2318', to: '#4c3e29', accent: '#dcbc8c', glow: 'rgba(220,188,140,0.28)' },
  { from: '#14262a', to: '#24494d', accent: '#8ec6c6', glow: 'rgba(142,198,198,0.28)' },
];

// 端侧 AI 主题的主视觉图标（均在 Icon 的 ICON_MAP 内）
const MOTIFS = ['microchip', 'network', 'layer-group', 'robot', 'terminal', 'cubes'] as const;

// 三套电路走线布局，按 hash 取其一
const TRACES: string[][] = [
  ['M -20 52 H 118 V 128 H 268', 'M 300 -20 V 74 H 420', 'M 40 240 V 168 H 180'],
  ['M -20 180 H 96 V 88 H 236 V -20', 'M 320 250 V 150 H 430', 'M 150 -20 V 40 H 60'],
  ['M -20 110 H 70 V 200 H 210', 'M 250 -20 V 96 H 400 V 190', 'M 430 60 H 330 V -20'],
];

const STATUS_STYLE: Record<string, string> = {
  已交付: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30',
  已完成: 'bg-emerald-400/15 text-emerald-200 ring-emerald-300/30',
  持续迭代: 'bg-sky-400/15 text-sky-200 ring-sky-300/30',
  研究中: 'bg-amber-400/15 text-amber-200 ring-amber-300/30',
};

const hashId = (s: string): number => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h >>> 0;
};

interface ProjectCoverProps {
  project: Project;
  /** 用于幽灵序号（1 起） */
  index?: number;
  /** 弹窗 banner 等场景可隐藏状态徽章（避免与关闭按钮重叠） */
  showStatus?: boolean;
  className?: string;
}

const ProjectCover: React.FC<ProjectCoverProps> = ({
  project,
  index,
  showStatus = true,
  className = '',
}) => {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '');
  const key = String(project.id ?? project.title);
  const h = hashId(key);
  const palette = PALETTES[h % PALETTES.length];
  const motif = MOTIFS[hashId(key + ':motif') % MOTIFS.length];
  const traces = TRACES[hashId(key + ':trace') % TRACES.length];

  return (
    <div className={`relative overflow-hidden ${className}`}>
      {/* 装饰背景层 */}
      <div
        aria-hidden="true"
        className="absolute inset-0"
        style={{ background: `linear-gradient(135deg, ${palette.from} 0%, ${palette.to} 100%)` }}
      >
        {project.cover ? (
          <img src={project.cover} alt="" className="absolute inset-0 h-full w-full object-cover" loading="lazy" />
        ) : (
          <>
            {/* 主色辉光 */}
            <div
              className="absolute -left-16 -top-20 h-64 w-64 rounded-full blur-3xl"
              style={{ background: palette.glow }}
            />
            {/* 电路节点纹理 */}
            <svg
              className="absolute inset-0 h-full w-full"
              viewBox="0 0 400 225"
              preserveAspectRatio="xMidYMid slice"
            >
              <defs>
                <pattern id={`dots-${uid}`} width="26" height="26" patternUnits="userSpaceOnUse">
                  <circle cx="1.6" cy="1.6" r="1.2" fill={palette.accent} opacity="0.16" />
                </pattern>
              </defs>
              <rect width="400" height="225" fill={`url(#dots-${uid})`} />
              {traces.map((d) => (
                <g key={d}>
                  <path d={d} fill="none" stroke={palette.accent} strokeWidth="1.4" opacity="0.28" />
                  <circle
                    cx={Number(d.match(/H (\d+)/)?.[1] ?? 0)}
                    cy={Number(d.match(/V (\d+)/)?.[1] ?? 0)}
                    r="3"
                    fill={palette.accent}
                    opacity="0.5"
                  />
                </g>
              ))}
            </svg>
            {/* 主视觉图标 */}
            <div className="absolute left-7 top-1/2 -translate-y-1/2">
              <div
                className="flex h-16 w-16 items-center justify-center rounded-2xl border"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  borderColor: `${palette.accent}59`,
                  boxShadow: `0 0 42px ${palette.glow}`,
                }}
              >
                <Icon name={motif} className="h-8 w-8" style={{ color: palette.accent }} />
              </div>
            </div>
            {/* 幽灵序号 */}
            {index !== undefined && (
              <span
                className="font-serif absolute -bottom-7 right-3 select-none text-[92px] font-bold leading-none tracking-tight"
                style={{ color: palette.accent, opacity: 0.16 }}
              >
                {String(index).padStart(2, '0')}
              </span>
            )}
          </>
        )}
      </div>
      {/* 状态徽章（真实内容，不隐藏） */}
      {showStatus && project.status && (
        <span
          className={`absolute right-3 top-3 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 backdrop-blur-sm ${
            STATUS_STYLE[project.status] ?? 'bg-white/10 text-white/80 ring-white/20'
          }`}
        >
          {project.status}
        </span>
      )}
    </div>
  );
};

export default ProjectCover;
