import type { ResumeTheme, ResumeTemplate } from '../../types/resume';

// 配色主题 → 一组静态 Tailwind 类名（字面量，便于 Tailwind 扫描收集）。

export interface ThemeClasses {
  ruleBorder: string; // 分区标题下划线颜色
  icon: string; // 分区图标颜色
  title: string; // 头衔文字颜色
  sidebarBg: string; // 双栏模板的侧栏底色
}

export const THEMES: Record<ResumeTheme, ThemeClasses> = {
  blue: {
    ruleBorder: 'border-blue-600',
    icon: 'text-blue-600',
    title: 'text-blue-700',
    sidebarBg: 'bg-blue-800',
  },
  emerald: {
    ruleBorder: 'border-emerald-600',
    icon: 'text-emerald-600',
    title: 'text-emerald-700',
    sidebarBg: 'bg-emerald-800',
  },
  violet: {
    ruleBorder: 'border-violet-600',
    icon: 'text-violet-600',
    title: 'text-violet-700',
    sidebarBg: 'bg-violet-800',
  },
  rose: {
    ruleBorder: 'border-rose-600',
    icon: 'text-rose-600',
    title: 'text-rose-700',
    sidebarBg: 'bg-rose-800',
  },
  slate: {
    ruleBorder: 'border-slate-700',
    icon: 'text-slate-700',
    title: 'text-slate-800',
    sidebarBg: 'bg-slate-800',
  },
};

export const THEME_OPTIONS: { id: ResumeTheme; label: string; dot: string }[] = [
  { id: 'blue', label: '蓝', dot: 'bg-blue-600' },
  { id: 'emerald', label: '绿', dot: 'bg-emerald-600' },
  { id: 'violet', label: '紫', dot: 'bg-violet-600' },
  { id: 'rose', label: '玫红', dot: 'bg-rose-600' },
  { id: 'slate', label: '石墨', dot: 'bg-slate-700' },
];

export const TEMPLATE_OPTIONS: { id: ResumeTemplate; label: string }[] = [
  { id: 'classic', label: '经典单栏' },
  { id: 'sidebar', label: '双栏侧边' },
  { id: 'compact', label: '紧凑单栏' },
];
