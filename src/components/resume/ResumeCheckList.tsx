// 「智能检查」tab 内容：列出体检发现的问题，支持定位到分区与一键修复（安全清理）。

import React, { useMemo } from 'react';
import Icon from '../Icon';
import { runChecks, issueCounts, type CheckIssue, type Severity } from './resumeCheck';
import type { ResumeData } from '../../types/resume';

const SEV_META: Record<
  Severity,
  { icon: string; cls: string; dot: string; label: string }
> = {
  error: { icon: 'exclamation-triangle', cls: 'text-rose-600', dot: 'bg-rose-500', label: '需处理' },
  warn: { icon: 'exclamation-triangle', cls: 'text-amber-600', dot: 'bg-amber-400', label: '建议改' },
  info: { icon: 'lightbulb', cls: 'text-sage-500', dot: 'bg-sage-400', label: '可优化' },
};

const goTo = (sectionKey?: string) => {
  if (!sectionKey) return;
  document.getElementById(`sec-${sectionKey}`)?.scrollIntoView({
    behavior: 'smooth',
    block: 'start',
  });
};

const ResumeCheckList: React.FC<{
  data: ResumeData;
  onFix: (fix: (d: ResumeData) => void) => void;
}> = ({ data, onFix }) => {
  const issues = useMemo(() => runChecks(data), [data]);
  const counts = useMemo(() => issueCounts(issues), [issues]);

  if (issues.length === 0) {
    return (
      <p className="flex items-center gap-1.5 text-xs font-medium text-emerald-600">
        <Icon name="check" />
        体检通过，没有发现问题，简历很健康！
      </p>
    );
  }

  const groups: Severity[] = ['error', 'warn', 'info'];

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 text-[11px]">
        {counts.error > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 font-medium text-rose-600">
            <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
            需处理 {counts.error}
          </span>
        )}
        {counts.warn > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 font-medium text-amber-600">
            <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
            建议改 {counts.warn}
          </span>
        )}
        {counts.info > 0 && (
          <span className="inline-flex items-center gap-1 rounded-full bg-sage-50 px-2 py-0.5 font-medium text-sage-600">
            <span className="h-1.5 w-1.5 rounded-full bg-sage-400" />
            可优化 {counts.info}
          </span>
        )}
      </div>

      {groups.map((sev) => {
        const list = issues.filter((i) => i.severity === sev);
        if (list.length === 0) return null;
        const meta = SEV_META[sev];
        return (
          <ul key={sev} className="space-y-1">
            {list.map((it: CheckIssue) => (
              <li
                key={it.id}
                className="flex items-start gap-2 rounded-lg border border-gray-100 bg-gray-50/60 px-2.5 py-2"
              >
                <Icon name={meta.icon} className={`mt-0.5 shrink-0 ${meta.cls}`} />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-gray-700">{it.title}</p>
                  <p className="mt-0.5 text-[11px] leading-snug text-gray-400">
                    {it.detail}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {it.fix && (
                    <button
                      type="button"
                      onClick={() => onFix(it.fix!)}
                      className="rounded-md bg-emerald-50 px-2 py-1 text-[11px] font-medium text-emerald-600 transition-colors hover:bg-emerald-100"
                    >
                      一键修复
                    </button>
                  )}
                  {it.sectionKey && (
                    <button
                      type="button"
                      onClick={() => goTo(it.sectionKey)}
                      title="定位到该分区"
                      className="rounded-md px-1.5 py-1 text-gray-300 transition-colors hover:bg-sage-50 hover:text-sage-500"
                    >
                      <Icon name="chevron-right" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        );
      })}
    </div>
  );
};

export default ResumeCheckList;
