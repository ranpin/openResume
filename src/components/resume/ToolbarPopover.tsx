import React, { useEffect, useRef, useState } from 'react';
import Icon from '../Icon';

/**
 * 顶栏下拉面板：点击按钮展开设置面板，点外部 / Esc 关闭。
 * 全局设置（模板 / 配色 / 排版 / 导出）都收进这里，左侧面板只留内容编辑。
 */
const ToolbarPopover: React.FC<{
  icon: string;
  label: string;
  active?: boolean;
  align?: 'left' | 'right';
  panelClassName?: string;
  title?: string;
  children: (close: () => void) => React.ReactNode;
}> = ({ icon, label, active, align = 'left', panelClassName, title, children }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        title={title}
        onClick={() => setOpen((o) => !o)}
        className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
          active
            ? 'border-sage-500 bg-sage-50 text-sage-700'
            : 'border-gray-200 text-gray-700 hover:bg-gray-50'
        }`}
      >
        <Icon name={icon} />
        <span className="hidden lg:inline">{label}</span>
        <Icon
          name="chevron-down"
          className={`text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div
          className={`absolute top-full mt-2 z-50 bg-white rounded-xl border border-gray-200 shadow-xl p-4 ${
            align === 'right' ? 'right-0' : 'left-0'
          } ${panelClassName || 'w-72'}`}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
};

export default ToolbarPopover;
