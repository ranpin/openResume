// 「岗位匹配」tab 内容：粘贴 JD → 提取关键词 → 与简历比对，给出命中/缺失关键词。
// 缺失关键词即「值得往简历里补」的词，可点击复制。

import React, { useMemo, useState } from 'react';
import Icon from '../Icon';
import { matchJd, type JdMatchResult } from './resumeJdMatch';
import type { ResumeData } from '../../types/resume';

const scoreTone = (score: number) =>
  score >= 70
    ? { text: 'text-emerald-600', bar: 'bg-emerald-500', label: '匹配度高' }
    : score >= 40
      ? { text: 'text-sage-600', bar: 'bg-sage-500', label: '还有空间' }
      : { text: 'text-amber-600', bar: 'bg-amber-400', label: '匹配度低' };

const JdMatchPanel: React.FC<{ data: ResumeData }> = ({ data }) => {
  const [jd, setJd] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  // JD 文本不变时，简历改动实时刷新结果；JD 为空则不分析
  const result: JdMatchResult | null = useMemo(
    () => (jd.trim() ? matchJd(data, jd) : null),
    [data, jd],
  );

  const copy = async (term: string) => {
    try {
      await navigator.clipboard.writeText(term);
      setCopied(term);
      setTimeout(() => setCopied(null), 1200);
    } catch {
      /* clipboard 不可用时静默 */
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <label className="mb-1 block text-[11px] font-medium text-gray-500">
          粘贴目标岗位的职位描述（JD），分析与简历的关键词匹配度
        </label>
        <textarea
          value={jd}
          onChange={(e) => setJd(e.target.value)}
          placeholder="把招聘启事里的「岗位要求 / 职位描述」整段粘贴进来……"
          rows={4}
          className="w-full resize-y rounded-lg border border-gray-200 bg-white px-2.5 py-2 text-xs leading-relaxed text-gray-700 placeholder:text-gray-300 focus:border-sage-400 focus:outline-none focus:ring-2 focus:ring-sage-100"
        />
      </div>

      {!result ? (
        <p className="text-[11px] text-gray-400">
          粘贴 JD 后自动分析，无需点按钮。
        </p>
      ) : result.total === 0 ? (
        <p className="text-[11px] text-gray-400">没有从 JD 里提取到有效关键词。</p>
      ) : (
        <>
          {(() => {
            const tone = scoreTone(result.score);
            return (
              <div>
                <div className="flex items-end justify-between">
                  <span className={`text-sm font-semibold ${tone.text}`}>
                    {tone.label}
                  </span>
                  <div className="flex items-baseline gap-1">
                    <span
                      className={`text-2xl font-extrabold tabular-nums leading-none ${tone.text}`}
                    >
                      {result.score}
                    </span>
                    <span className="text-xs text-gray-400">
                      % · 命中 {result.matched.length}/{result.total}
                    </span>
                  </div>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded-full bg-gray-100">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ease-out ${tone.bar}`}
                    style={{ width: `${result.score}%` }}
                  />
                </div>
              </div>
            );
          })()}

          {result.missing.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-amber-600">
                缺失关键词 · 建议补进简历（点击复制）
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.missing.map((k) => (
                  <button
                    key={k.term}
                    type="button"
                    onClick={() => copy(k.term)}
                    title="点击复制"
                    className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-medium text-amber-700 transition-colors hover:bg-amber-100"
                  >
                    {k.term}
                    <Icon
                      name={copied === k.term ? 'check' : 'plus'}
                      className="h-2.5 w-2.5"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {result.matched.length > 0 && (
            <div>
              <p className="mb-1.5 text-[11px] font-semibold text-emerald-600">
                已命中关键词
              </p>
              <div className="flex flex-wrap gap-1.5">
                {result.matched.map((k) => (
                  <span
                    key={k.term}
                    className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[11px] font-medium text-emerald-700"
                  >
                    {k.term}
                    <Icon name="check" className="h-2.5 w-2.5" />
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default JdMatchPanel;
