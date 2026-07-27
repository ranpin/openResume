import React, { useRef, useState } from 'react';

const SPLIT_RE = /[,，;；\n]/;

/**
 * 标签式列表输入：回车 / 逗号添加，粘贴自动批量拆分，× 删除。
 * 取代「逗号分隔」纯文本，数据仍是 string[]。
 */
const TagField: React.FC<{
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  placeholder?: string;
}> = ({ label, items, onChange, placeholder }) => {
  const [draft, setDraft] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const addAll = (parts: string[]) => {
    const adds = parts.map((s) => s.trim()).filter(Boolean);
    if (adds.length === 0) return;
    const merged = [...items];
    for (const a of adds) if (!merged.includes(a)) merged.push(a);
    onChange(merged);
  };

  const commitDraft = () => {
    addAll(draft.split(SPLIT_RE));
    setDraft('');
  };

  const handleChange = (v: string) => {
    if (SPLIT_RE.test(v)) {
      const parts = v.split(SPLIT_RE);
      setDraft(parts.pop() ?? '');
      addAll(parts);
    } else {
      setDraft(v);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData('text');
    if (SPLIT_RE.test(text)) {
      e.preventDefault();
      addAll(text.split(SPLIT_RE));
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitDraft();
    } else if (e.key === 'Backspace' && draft === '' && items.length > 0) {
      onChange(items.slice(0, -1));
    }
  };

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </span>
      <div
        onClick={() => inputRef.current?.focus()}
        className="flex min-h-[38px] w-full cursor-text flex-wrap items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-2 py-1.5 transition-colors hover:border-gray-300 focus-within:border-sage-500 focus-within:ring-1 focus-within:ring-sage-500"
      >
        {items.map((tag, i) => (
          <span
            key={`${tag}-${i}`}
            className="tag-pop inline-flex items-center gap-0.5 rounded-md border border-sage-100 bg-sage-50 py-0.5 pl-2 pr-1 text-xs font-medium text-sage-700"
          >
            {tag}
            <button
              type="button"
              title="移除"
              onClick={(e) => {
                e.stopPropagation();
                onChange(items.filter((_, j) => j !== i));
              }}
              className="flex h-[18px] w-[18px] items-center justify-center rounded-full text-sage-500 transition-colors hover:bg-red-100 hover:text-red-600"
            >
              <svg
                viewBox="0 0 16 16"
                className="h-3 w-3"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
              >
                <path d="M4 4l8 8M12 4l-8 8" strokeLinecap="round" />
              </svg>
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          type="text"
          value={draft}
          placeholder={items.length === 0 ? placeholder : undefined}
          onChange={(e) => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          onPaste={handlePaste}
          onBlur={() => draft.trim() && commitDraft()}
          className="min-w-[90px] flex-1 bg-transparent px-1 py-0.5 text-sm outline-none placeholder:text-gray-400"
        />
      </div>
      <span className="mt-1 block text-[11px] text-gray-400">
        回车或逗号添加，粘贴可批量导入
      </span>
    </div>
  );
};

export default TagField;
