// 简历完成度面板：置于编辑器表单顶部，实时计算完成度并给出可点击的改进建议
// （点击建议滚动到对应分区）。

import React, { useMemo, useState } from 'react';
import Icon from '../Icon';
import { computeCompleteness, scoreTone } from './resumeCompleteness';
import type { ResumeData } from '../../types/resume';

const CompletenessPanel: React.FC<{ data: ResumeData }> = ({ data }) => {
  const { score, missing } = useMemo(() => computeCompleteness(data), [data]);
  const tone = scoreTone(score);
  const [open, setOpen] = useState(true);

  const go = (sectionKey?: string) => {
    if (!sectionKey) return;
    const el = document.getElementById(`sec-${sectionKey}`);
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
          <Icon name="chart-bar" className="text-sage-600" />
          简历完成度
        </h3>
        <div className="flex items-baseline gap-1.5">
          <span
            className={`text-2xl font-extrabold tabular-nums leading-none ${tone.text}`}
          >
            {score}
          </span>
          <span className="text-xs text-gray-400">/ 100 · {tone.label}</span>
        </div>
      </div>

      <div className="mt-3 h-2 overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full transition-all duration-700 ease-out ${tone.bar}`}
          style={{ width: `${score}%` }}
        />
      </div>

      {missing.length > 0 ? (
        <>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            className="mt-3 flex w-full items-center justify-between text-xs font-medium text-gray-500 transition-colors hover:text-gray-700"
          >
            <span>还能提升 · {missing.length} 项建议</span>
            <Icon
              name="chevron-right"
              className={`transition-transform duration-300 ${
                open ? 'rotate-90' : ''
              }`}
            />
          </button>
          {open && (
            <ul className="mt-2 space-y-1">
              {missing.map((m) => (
                <li key={m.key}>
                  <button
                    type="button"
                    onClick={() => go(m.sectionKey)}
                    title="定位到该分区"
                    className="group flex w-full items-start gap-2 rounded-lg px-2 py-1.5 text-left transition-colors hover:bg-sage-50"
                  >
                    <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" />
                    <span className="min-w-0 flex-1">
                      <span className="text-xs font-medium text-gray-700">
                        {m.label}
                      </span>
                      <span className="block text-[11px] leading-snug text-gray-400">
                        {m.tip}
                      </span>
                    </span>
                    <Icon
                      name="chevron-right"
                      className="mt-1 shrink-0 text-gray-300 transition-colors group-hover:text-sage-500"
                    />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </>
      ) : (
        <p className="mt-3 flex items-center gap-1.5 text-xs font-medium text-emerald-600">
          <Icon name="check" />
          各项都填好了，去导出 / 发布吧！
        </p>
      )}
    </div>
  );
};

export default CompletenessPanel;
