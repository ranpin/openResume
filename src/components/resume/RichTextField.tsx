import React, { useRef, useState } from 'react';
import Icon from '../Icon';

/**
 * 富文本编辑字段：textarea + Markdown 工具栏。
 * 工具栏按钮把选中文本包裹/加前缀为 Markdown（或受限 HTML），
 * 数据仍以可读、可提交、AI 友好的文本存储，由 <RichText> 渲染。
 */

interface RichTextFieldProps {
  label: string;
  value?: string;
  onChange: (v: string) => void;
  rows?: number;
}

const COLORS: { cls: string; hex: string; name: string }[] = [
  { cls: 'rt-c-black', hex: '#111827', name: '黑' },
  { cls: 'rt-c-gray', hex: '#6b7280', name: '灰' },
  { cls: 'rt-c-red', hex: '#dc2626', name: '红' },
  { cls: 'rt-c-orange', hex: '#ea580c', name: '橙' },
  { cls: 'rt-c-amber', hex: '#d97706', name: '琥珀' },
  { cls: 'rt-c-green', hex: '#16a34a', name: '绿' },
  { cls: 'rt-c-teal', hex: '#0d9488', name: '青' },
  { cls: 'rt-c-blue', hex: '#2563eb', name: '蓝' },
  { cls: 'rt-c-violet', hex: '#7c3aed', name: '紫' },
  { cls: 'rt-c-pink', hex: '#db2777', name: '粉' },
];

interface EditResult {
  value: string;
  start: number;
  end: number;
}

const ToolBtn: React.FC<{
  icon?: string;
  text?: string;
  title: string;
  onClick: () => void;
}> = ({ icon, text, title, onClick }) => (
  <button
    type="button"
    title={title}
    onMouseDown={(e) => e.preventDefault()} // 保持 textarea 选区
    onClick={onClick}
    className="h-7 min-w-7 px-1.5 flex items-center justify-center rounded text-gray-600 hover:bg-white hover:text-blue-600 text-sm transition-colors"
  >
    {icon ? <Icon name={icon} /> : <span className="font-medium">{text}</span>}
  </button>
);

const RichTextField: React.FC<RichTextFieldProps> = ({
  label,
  value = '',
  onChange,
  rows = 4,
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [colorOpen, setColorOpen] = useState(false);

  const runEdit = (
    transform: (ctx: {
      before: string;
      sel: string;
      after: string;
      s: number;
    }) => EditResult,
  ) => {
    const ta = ref.current;
    if (!ta) return;
    const s = ta.selectionStart ?? value.length;
    const e = ta.selectionEnd ?? value.length;
    const before = value.slice(0, s);
    const sel = value.slice(s, e);
    const after = value.slice(e);
    const r = transform({ before, sel, after, s });
    onChange(r.value);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(r.start, r.end);
    });
  };

  const wrap = (m: string, m2: string = m, placeholderText = '文字') =>
    runEdit(({ before, sel, after, s }) => {
      const ph = sel || placeholderText;
      return {
        value: before + m + ph + m2 + after,
        start: s + m.length,
        end: s + m.length + ph.length,
      };
    });

  const prefixLines = (make: (i: number) => string, blank = '列表项') =>
    runEdit(({ before, sel, after, s }) => {
      const block = sel || blank;
      const out = block
        .split('\n')
        .map((ln, i) => make(i) + ln)
        .join('\n');
      return { value: before + out + after, start: s, end: s + out.length };
    });

  const insertLink = () =>
    runEdit(({ before, sel, after, s }) => {
      const t = sel || '链接文字';
      const md = `[${t}](https://)`;
      const urlStart = s + 1 + t.length + 2;
      return {
        value: before + md + after,
        start: urlStart,
        end: urlStart + 'https://'.length,
      };
    });

  const spanClass = (cls: string) => wrap(`<span class="${cls}">`, '</span>');
  const setSize = (cls: string) => {
    setSizeOpen(false);
    spanClass(cls);
  };
  const setColor = (cls: string) => {
    setColorOpen(false);
    spanClass(cls);
  };

  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">
        {label}
      </span>
      <div className="rounded-lg border border-gray-200 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 overflow-hidden">
        {/* 工具栏 */}
        <div className="flex flex-wrap items-center gap-0.5 bg-gray-50 border-b border-gray-200 px-1.5 py-1">
          <ToolBtn icon="bold" title="加粗" onClick={() => wrap('**')} />
          <ToolBtn icon="italic" title="斜体" onClick={() => wrap('*')} />
          <ToolBtn
            icon="underline"
            title="下划线"
            onClick={() => wrap('<u>', '</u>')}
          />
          <ToolBtn
            icon="strikethrough"
            title="删除线"
            onClick={() => wrap('~~')}
          />
          <ToolBtn icon="code" title="行内代码" onClick={() => wrap('`')} />
          <span className="w-px h-4 bg-gray-300 mx-1" />
          <ToolBtn
            icon="list-ul"
            title="箭头列表"
            onClick={() => prefixLines(() => '- ')}
          />
          <ToolBtn
            icon="list-ol"
            title="有序列表（序列号）"
            onClick={() => prefixLines((i) => `${i + 1}. `)}
          />
          <ToolBtn
            icon="quote-right"
            title="引用"
            onClick={() => prefixLines(() => '> ')}
          />
          <ToolBtn icon="link" title="链接" onClick={insertLink} />
          <span className="w-px h-4 bg-gray-300 mx-1" />
          {/* 字号 */}
          <div className="relative">
            <ToolBtn
              icon="text-height"
              title="字号"
              onClick={() => setSizeOpen((o) => !o)}
            />
            {sizeOpen && (
              <div className="absolute z-10 mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-24">
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSize('rt-sm')}
                  className="block w-full text-left px-3 py-1 text-xs hover:bg-gray-50"
                >
                  小
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSize('rt-lg')}
                  className="block w-full text-left px-3 py-1 text-base hover:bg-gray-50"
                >
                  大
                </button>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => setSize('rt-xl')}
                  className="block w-full text-left px-3 py-1 text-lg hover:bg-gray-50"
                >
                  特大
                </button>
              </div>
            )}
          </div>
          {/* 颜色 */}
          <div className="relative">
            <ToolBtn
              icon="palette"
              title="字体颜色"
              onClick={() => setColorOpen((o) => !o)}
            />
            {colorOpen && (
              <div className="absolute z-10 mt-1 left-0 bg-white border border-gray-200 rounded-lg shadow-lg p-2 grid grid-cols-5 gap-1.5 w-40">
                {COLORS.map((c) => (
                  <button
                    key={c.cls}
                    type="button"
                    title={c.name}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => setColor(c.cls)}
                    className="w-5 h-5 rounded-full ring-1 ring-black/10 hover:scale-110 transition"
                    style={{ backgroundColor: c.hex }}
                  />
                ))}
              </div>
            )}
          </div>
          <span className="w-px h-4 bg-gray-300 mx-1" />
          {/* 对齐 */}
          <ToolBtn
            icon="align-left"
            title="左对齐"
            onClick={() => spanClass('rt-left')}
          />
          <ToolBtn
            icon="align-center"
            title="居中"
            onClick={() => spanClass('rt-center')}
          />
          <ToolBtn
            icon="align-right"
            title="右对齐"
            onClick={() => spanClass('rt-right')}
          />
        </div>
        <textarea
          ref={ref}
          value={value}
          rows={rows}
          onChange={(e) => onChange(e.target.value)}
          className="w-full px-3 py-2 text-sm outline-none resize-y"
        />
      </div>
      <span className="mt-1 block text-[11px] text-gray-400">
        选中文字后点工具栏套用格式；每行可作一个列表项。
      </span>
    </label>
  );
};

export default RichTextField;
