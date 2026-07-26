// 「竞争力」tab 内容：六维雷达式条形评分，看简历「写得强不强」，并给出每个维度的提升建议。

import React, { useMemo } from 'react';
import { computeCompetitiveness } from './resumeCompetitiveness';
import type { ResumeData } from '../../types/resume';

const band = (score: number) =>
  score >= 80
    ? { bar: 'bg-emerald-500', text: 'text-emerald-600', label: '强' }
    : score >= 60
      ? { bar: 'bg-sage-500', text: 'text-sage-600', label: '良' }
      : score >= 40
        ? { bar: 'bg-amber-400', text: 'text-amber-600', label: '中' }
        : { bar: 'bg-rose-400', text: 'text-rose-500', label: '弱' };

const overallGrade = (score: number) =>
  score >= 80
    ? { label: '竞争力强', text: 'text-emerald-600' }
    : score >= 60
      ? { label: '有竞争力', text: 'text-sage-600' }
      : score >= 40
        ? { label: '待加强', text: 'text-amber-600' }
        : { label: '起步阶段', text: 'text-rose-500' };

const CompetitivenessList: React.FC<{ data: ResumeData }> = ({ data }) => {
  const { overall, dims } = useMemo(() => computeCompetitiveness(data), [data]);
  const grade = overallGrade(overall);

  return (
    <div>
      <div className="flex items-end justify-between">
        <div>
          <p className="text-xs font-medium text-gray-400">综合竞争力</p>
          <p className={`text-sm font-semibold ${grade.text}`}>{grade.label}</p>
        </div>
        <div className="flex items-baseline gap-1">
          <span className={`text-3xl font-extrabold tabular-nums leading-none ${grade.text}`}>
            {overall}
          </span>
          <span className="text-xs text-gray-400">/ 100</span>
        </div>
      </div>

      <ul className="mt-3 space-y-2.5">
        {dims.map((d) => {
          const b = band(d.score);
          return (
            <li key={d.key}>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-700">{d.label}</span>
                <span className={`text-xs font-bold tabular-nums ${b.text}`}>
                  {d.score}
                  <span className="ml-1 font-normal text-gray-300">· {b.label}</span>
                </span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-gray-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ease-out ${b.bar}`}
                  style={{ width: `${d.score}%` }}
                />
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-gray-400">{d.hint}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default CompetitivenessList;
