// 简历诊断中心：顶部 tab 容器，聚合「完成度」「智能检查」「竞争力」三个视角。
// 智能检查 tab 上带问题数角标，有问题时更显眼。

import React, { useMemo, useState } from 'react';
import Icon from '../Icon';
import CompletenessPanel from './CompletenessPanel';
import ResumeCheckList from './ResumeCheckList';
import CompetitivenessList from './CompetitivenessList';
import { runChecks, issueCounts } from './resumeCheck';
import type { ResumeData } from '../../types/resume';

type TabId = 'complete' | 'check' | 'competitiveness';

const DiagnosticsPanel: React.FC<{
  data: ResumeData;
  onFix: (fix: (d: ResumeData) => void) => void;
}> = ({ data, onFix }) => {
  const [tab, setTab] = useState<TabId>('complete');
  const counts = useMemo(() => issueCounts(runChecks(data)), [data]);
  const problemCount = counts.error + counts.warn;

  const tabs: { id: TabId; label: string; icon: string }[] = [
    { id: 'complete', label: '完成度', icon: 'chart-bar' },
    { id: 'check', label: '智能检查', icon: 'search' },
    { id: 'competitiveness', label: '竞争力', icon: 'trophy' },
  ];

  return (
    <section className="rounded-2xl border border-gray-200 bg-gradient-to-br from-white to-gray-50 p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-1 rounded-xl bg-gray-100/80 p-1">
        {tabs.map((t) => {
          const active = tab === t.id;
          const badge = t.id === 'check' ? problemCount : 0;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`relative flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                active
                  ? 'bg-white text-gray-800 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              <Icon name={t.icon} />
              {t.label}
              {badge > 0 && (
                <span
                  className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white ${
                    counts.error > 0 ? 'bg-rose-500' : 'bg-amber-400'
                  }`}
                >
                  {badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {tab === 'complete' && <CompletenessPanel data={data} />}
      {tab === 'check' && <ResumeCheckList data={data} onFix={onFix} />}
      {tab === 'competitiveness' && <CompetitivenessList data={data} />}
    </section>
  );
};

export default DiagnosticsPanel;
