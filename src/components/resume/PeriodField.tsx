import React, { useEffect, useState } from 'react';

/** 年-月；month 缺省表示仅精确到年（如 "2026"） */
export interface YearMonth {
  year: number;
  month?: number; // 1-12
}

export interface PeriodParts {
  start: YearMonth | null;
  end: YearMonth | null;
  toPresent: boolean; // 结束时间为「至今」
}

const TO_PRESENT_RE = /^(至今|迄今|今|present|now|today)$/i;

/** 解析 "2025.07" / "2025-07" / "2025年7月" / "2025" 等单侧时间 */
export function parseYM(raw: string): YearMonth | null {
  const m = raw.trim().match(/^(\d{4})(?:[.\-/年](\d{1,2})月?)?$/);
  if (!m) return null;
  const month = m[2] ? Number(m[2]) : undefined;
  if (month !== undefined && (month < 1 || month > 12)) return null;
  return { year: Number(m[1]), month };
}

/** 序列化为简历展示格式：YYYY.MM 或 YYYY */
export function formatYM(ym: YearMonth): string {
  return ym.month
    ? `${ym.year}.${String(ym.month).padStart(2, '0')}`
    : String(ym.year);
}

/** 解析 "2025.07 - 至今" / "2025 - 2026" / "2026" 等区间字符串 */
export function parsePeriod(value?: string | number): PeriodParts {
  const res: PeriodParts = { start: null, end: null, toPresent: false };
  // YAML 会把 "period: 2026" 解析成数字，这里统一转字符串
  const s = value === undefined || value === null ? '' : String(value).trim();
  if (!s) return res;
  const parts = s
    .split(/\s*[-–—~]\s*/)
    .map((p) => p.trim())
    .filter(Boolean);
  if (parts.length === 0) return res;
  res.start = parseYM(parts[0]);
  if (parts.length > 1) {
    if (TO_PRESENT_RE.test(parts[1])) res.toPresent = true;
    else res.end = parseYM(parts[1]);
  }
  return res;
}

export function composePeriod({ start, end, toPresent }: PeriodParts): string {
  const s = start ? formatYM(start) : '';
  if (toPresent) return s ? `${s} - 至今` : '至今';
  const e = end ? formatYM(end) : '';
  if (s && e) return `${s} - ${e}`;
  return s || e;
}

const MONTHS = Array.from({ length: 12 }, (_, i) => i + 1);

const Chevron: React.FC<{ open?: boolean }> = ({ open }) => (
  <svg
    viewBox="0 0 16 16"
    className={`h-3.5 w-3.5 shrink-0 text-gray-400 transition-transform duration-200 ${
      open ? 'rotate-180' : ''
    }`}
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
  >
    <path d="M4 6l4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const MonthPicker: React.FC<{
  value: YearMonth | null;
  placeholder: string;
  align: 'left' | 'right';
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (ym: YearMonth | null) => void;
}> = ({ value, placeholder, align, open, onOpenChange, onSelect }) => {
  const thisYear = new Date().getFullYear();
  const thisMonth = new Date().getMonth() + 1;
  const [viewYear, setViewYear] = useState(value?.year ?? thisYear);

  useEffect(() => {
    if (open) setViewYear(value?.year ?? new Date().getFullYear());
  }, [open, value?.year]);

  const pick = (month: number) => {
    // 再次点击已选月份 → 仅保留年份
    if (value && value.year === viewYear && value.month === month) {
      onSelect({ year: viewYear });
    } else {
      onSelect({ year: viewYear, month });
    }
    onOpenChange(false);
  };

  return (
    <div className="relative min-w-0 flex-1">
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        className={`flex w-full items-center justify-between gap-1 rounded-lg border bg-white px-3 py-2 text-sm outline-none transition-colors ${
          open
            ? 'border-blue-500 ring-1 ring-blue-500'
            : 'border-gray-200 hover:border-blue-400'
        }`}
      >
        <span className={`truncate ${value ? 'text-gray-800' : 'text-gray-400'}`}>
          {value ? formatYM(value) : placeholder}
        </span>
        <Chevron open={open} />
      </button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => onOpenChange(false)}
          />
          <div
            className={`rs-pop absolute top-full z-50 mt-1.5 w-52 origin-top rounded-xl border border-gray-200 bg-white p-3 shadow-xl ${
              align === 'right' ? 'right-0' : 'left-0'
            }`}
          >
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setViewYear((y) => y - 1)}
                title="上一年"
                className="flex h-7 w-7 items-center justify-center rounded-md text-base text-gray-500 transition-colors hover:bg-gray-100"
              >
                ‹
              </button>
              <span className="text-sm font-semibold tabular-nums text-gray-800">
                {viewYear} 年
              </span>
              <button
                type="button"
                onClick={() => setViewYear((y) => y + 1)}
                title="下一年"
                className="flex h-7 w-7 items-center justify-center rounded-md text-base text-gray-500 transition-colors hover:bg-gray-100"
              >
                ›
              </button>
            </div>
            <div className="mt-2 grid grid-cols-4 gap-1">
              {MONTHS.map((m) => {
                const selected = value?.year === viewYear && value.month === m;
                const current = viewYear === thisYear && m === thisMonth;
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => pick(m)}
                    title={selected ? '再次点击可仅保留年份' : undefined}
                    className={`rounded-md py-1.5 text-xs transition-colors ${
                      selected
                        ? 'bg-blue-600 font-semibold text-white shadow-sm'
                        : current
                          ? 'font-semibold text-blue-600 hover:bg-blue-50'
                          : 'text-gray-700 hover:bg-blue-50'
                    }`}
                  >
                    {m}月
                  </button>
                );
              })}
            </div>
            <div className="mt-2 flex items-center justify-between border-t border-gray-100 pt-2">
              <button
                type="button"
                onClick={() => setViewYear(thisYear)}
                className="text-xs text-gray-500 transition-colors hover:text-blue-600"
              >
                今年
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelect(null);
                  onOpenChange(false);
                }}
                className="text-xs text-gray-500 transition-colors hover:text-red-500"
              >
                清除
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

/**
 * 时间段选择器：日历面板选择开始/结束年月 + 「至今」开关。
 * 对外仍是字符串（如 "2025.07 - 至今"），与简历数据格式一致。
 */
const PeriodField: React.FC<{
  label: string;
  value?: string | number;
  onChange: (v: string) => void;
}> = ({ label, value, onChange }) => {
  const parts = parsePeriod(value);
  const [open, setOpen] = useState<'start' | 'end' | null>(null);
  const emit = (next: PeriodParts) => onChange(composePeriod(next));

  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-gray-500">
        {label}
      </span>
      <div className="flex items-center gap-1.5">
        <MonthPicker
          value={parts.start}
          placeholder="开始"
          align="left"
          open={open === 'start'}
          onOpenChange={(o) => setOpen(o ? 'start' : null)}
          onSelect={(start) => emit({ ...parts, start })}
        />
        <span className="shrink-0 text-sm text-gray-400">–</span>
        {parts.toPresent ? (
          <span className="min-w-0 flex-1 truncate rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-center text-sm text-blue-700">
            至今
          </span>
        ) : (
          <MonthPicker
            value={parts.end}
            placeholder="结束"
            align="right"
            open={open === 'end'}
            onOpenChange={(o) => setOpen(o ? 'end' : null)}
            onSelect={(end) => emit({ ...parts, end })}
          />
        )}
        <label className="flex shrink-0 cursor-pointer select-none items-center gap-1 text-xs text-gray-600">
          <input
            type="checkbox"
            checked={parts.toPresent}
            onChange={(e) =>
              emit({
                ...parts,
                toPresent: e.target.checked,
                end: e.target.checked ? null : parts.end,
              })
            }
            className="h-3.5 w-3.5 cursor-pointer accent-blue-600"
          />
          至今
        </label>
      </div>
    </div>
  );
};

export default PeriodField;
