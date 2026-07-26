import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import Icon from '../Icon';
import ResumeDocument from './ResumeDocument';
import PreviewFit from './PreviewFit';
import RichTextField from './RichTextField';
import PeriodField from './PeriodField';
import TagField from './TagField';
import DiagnosticsPanel from './DiagnosticsPanel';
import {
  cloneResume,
  downloadResumeYaml,
  fileToResizedDataUrl,
  isSameResume,
  migrateResume,
  normalizeResume,
} from './resumeIo';
import { THEME_OPTIONS, TEMPLATE_OPTIONS } from './resumeTheme';
import {
  resolveSections,
  sectionConfigFromData,
  type ResolvedSection,
} from './resumeSections';
import { FONT_OPTIONS, fontStack } from './resumeFonts';
import {
  EXAMPLE_ACTIVITY,
  EXAMPLE_AWARD,
  EXAMPLE_CERTIFICATE,
  EXAMPLE_EDUCATION,
  EXAMPLE_INTERESTS,
  EXAMPLE_LANGUAGE,
  EXAMPLE_PROJECT,
  EXAMPLE_SKILL,
  EXAMPLE_SUMMARY,
  EXAMPLE_WORK,
} from './resumeExamples';
import { useResumeStore } from '../../store/useResumeStore';

const PublishDialog = lazy(() => import('./PublishDialog'));
const AiPolishPanel = lazy(() => import('./AiPolishPanel'));
import type {
  ResumeData,
  ResumeCustomSection,
  ResumeProject,
  ResumeSettings,
  ResumeTemplate,
  ResumeTheme,
  ResumeFieldSeparator,
} from '../../types/resume';

// 可拖拽排序的数组字段
type ArrayKey =
  | 'education'
  | 'work'
  | 'projects'
  | 'awards'
  | 'certificates'
  | 'languages'
  | 'activities';

// 语言熟练度常用选项（可选，也可留空自填）
const LANGUAGE_LEVELS = [
  '母语',
  '精通',
  '流利',
  '熟练',
  '熟悉',
  '了解',
  'CET-6',
  'CET-4',
  '雅思 7+',
  '托福 100+',
];

// 全局排版设置的默认值与范围（滑块）
const SETTING_DEFAULTS = {
  fontScale: 1,
  lineHeight: 1.6,
  blockGap: 16,
  pageMargin: 45,
};

// 条目标题排版选项（文本格式：单/双行 + 字段排列）
const HEADER_LINES_OPTIONS: { id: 1 | 2; label: string }[] = [
  { id: 2, label: '双行' },
  { id: 1, label: '单行' },
];
const FIELD_SEPARATOR_OPTIONS: { id: ResumeFieldSeparator; label: string }[] = [
  { id: 'justify', label: '分散对齐' },
  { id: 'dot', label: '·' },
  { id: 'slash', label: '/' },
  { id: 'bar', label: '|' },
];

// 「智能一页」压缩下限（与对应滑块的最小值一致）
const FIT_MIN = { fontScale: 0.8, lineHeight: 1.2, blockGap: 6, pageMargin: 24 };

const moveItem = (arr: unknown[], from: number, to: number): void => {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length)
    return;
  const [it] = arr.splice(from, 1);
  arr.splice(to, 0, it);
};

/**
 * 超级简历式简历编辑器：左侧分区表单，右侧实时预览。
 * 所有改动写入 useResumeStore 的本地草稿（localStorage，刷新不丢）。
 * 以 lazy + Suspense 加载，且只在客户端打开，SSG 预渲染不涉及。
 */

interface ResumeEditorProps {
  resumeId: string;
  published: ResumeData; // 已发布版本，用于「重置」
  onClose: () => void;
}

const moveInArray = <T,>(arr: T[], i: number, dir: number): void => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
};

const Field: React.FC<{
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <label className="block">
    <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
    <input
      type="text"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none transition-colors hover:border-gray-300 focus:border-sage-500 focus:ring-1 focus:ring-sage-500"
    />
  </label>
);

const SelectField: React.FC<{
  label: string;
  value?: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
}> = ({ label, value, onChange, options, placeholder }) => (
  <label className="block">
    <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm outline-none transition-colors hover:border-gray-300 focus:border-sage-500 focus:ring-1 focus:ring-sage-500"
    >
      <option value="">{placeholder || '请选择'}</option>
      {options.map((o) => (
        <option key={o} value={o}>
          {o}
        </option>
      ))}
    </select>
  </label>
);

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: (v: number) => string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, display, onChange }) => (
  <label className="block">
    <span className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
      <span>{label}</span>
      <span className="font-mono text-gray-700">{display(value)}</span>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-sage-600 cursor-pointer"
    />
  </label>
);

const IconBtn: React.FC<{
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}> = ({ icon, onClick, disabled, danger, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`w-7 h-7 flex items-center justify-center rounded-md text-sm transition-colors ${
      disabled
        ? 'text-gray-300 cursor-not-allowed'
        : danger
          ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          : 'text-gray-500 hover:text-sage-600 hover:bg-sage-50'
    }`}
  >
    <Icon name={icon} />
  </button>
);

/**
 * 顶栏下拉面板（超级简历式）：点击按钮展开设置面板，点外部 / Esc 关闭。
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

const SectionHeader: React.FC<{
  icon: string;
  title: string;
  onAdd?: () => void;
  onExample?: () => void;
}> = ({ icon, title, onAdd, onExample }) => (
  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
      <Icon name={icon} className="text-sage-600" />
      {title}
    </h3>
    <div className="flex items-center gap-3">
      {onExample && (
        <button
          type="button"
          onClick={onExample}
          title="插入一条范例，参照写法后替换为你的真实信息"
          className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700"
        >
          <Icon name="lightbulb" />
          示例
        </button>
      )}
      {onAdd && (
        <button
          type="button"
          onClick={onAdd}
          className="inline-flex items-center gap-1 text-xs font-medium text-sage-600 hover:text-sage-700"
        >
          <Icon name="plus" />
          添加
        </button>
      )}
    </div>
  </div>
);

const EntryCard: React.FC<{
  label: string;
  index: number;
  total: number;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
  dragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragEnter?: () => void;
  children: React.ReactNode;
}> = ({
  label,
  index,
  total,
  onUp,
  onDown,
  onDelete,
  dragging,
  onDragStart,
  onDragEnd,
  onDragEnter,
  children,
}) => (
  <div
    onDragEnter={onDragEnter}
    onDragOver={(e) => e.preventDefault()}
    className={`rounded-xl border bg-gray-50/60 p-4 space-y-3 transition-all ${
      dragging
        ? 'border-sage-400 shadow-md opacity-60'
        : 'border-gray-200 hover:border-gray-300 hover:shadow-sm'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="拖拽排序"
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
        >
          <Icon name="arrows-alt" />
        </span>
        {label} #{index + 1}
      </span>
      <div className="flex items-center gap-0.5">
        <IconBtn
          icon="arrow-up"
          onClick={onUp}
          disabled={index === 0}
          title="上移"
        />
        <IconBtn
          icon="arrow-down"
          onClick={onDown}
          disabled={index === total - 1}
          title="下移"
        />
        <IconBtn icon="trash" onClick={onDelete} danger title="删除" />
      </div>
    </div>
    {children}
  </div>
);

const ResumeEditor: React.FC<ResumeEditorProps> = ({
  resumeId,
  published,
  onClose,
}) => {
  const draft = useResumeStore((s) => s.drafts[resumeId]);
  const setDraft = useResumeStore((s) => s.setDraft);
  const resetDraft = useResumeStore((s) => s.resetDraft);
  const publishedSig = useResumeStore((s) => s.published[resumeId]);
  const [publishOpen, setPublishOpen] = useState(false);
  // 预览模式：隐藏左侧表单、预览占满（超级简历式全屏预览）
  const [previewMode, setPreviewMode] = useState(false);
  // 兴趣爱好编辑框：默认收起，点「添加」才展开（与其他条目式模块一致）
  const [interestsOpen, setInterestsOpen] = useState(false);

  // 旧草稿可能还是 skills 分组数组的旧结构，读出时统一迁移为富文本字符串
  // （首次编辑经 update 写回后即归一化）
  const data: ResumeData = useMemo(
    () => migrateResume(draft ?? published),
    [draft, published],
  );
  // 是否有未发布改动：与内置基线、最近一次发布都不同
  const dirty =
    !!draft &&
    !isSameResume(data, published) &&
    publishedSig !== normalizeResume(data);

  // 撤销/重做：历史栈用 ref 持有；短时间内的连续编辑（打字、拖拽、智能一页的
  // 逐级压缩）合并为一个撤销点，避免逐字符撤销。所有内容改动都经 update 这一
  // 入口，在写回前快照改动前的 data；栈的每次变化都伴随 setDraft → 重渲染，
  // 按钮 disabled 直接读 ref 即可。
  const undoStack = useRef<ResumeData[]>([]);
  const redoStack = useRef<ResumeData[]>([]);
  const lastEditAt = useRef(0);
  const COALESCE_MS = 600;

  // 不可变更新：克隆当前数据 → 修改 → 写回草稿（首次编辑即自动生成草稿）
  const update = (fn: (d: ResumeData) => void) => {
    const now = Date.now();
    if (now - lastEditAt.current > COALESCE_MS) {
      undoStack.current.push(cloneResume(data));
      if (undoStack.current.length > 100) undoStack.current.shift();
    }
    lastEditAt.current = now;
    redoStack.current = [];
    const next = cloneResume(data);
    fn(next);
    setDraft(resumeId, next);
  };

  const undo = () => {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push(cloneResume(data));
    lastEditAt.current = 0;
    setDraft(resumeId, prev);
  };
  const redo = () => {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push(cloneResume(data));
    lastEditAt.current = 0;
    setDraft(resumeId, next);
  };

  const lines = (arr?: string[]) => (arr || []).join('\n');
  const toLines = (v: string) => v.split('\n');

  // AI 润色要点：记录当前正在润色的要点及写回方式（BYOK，lazy 对话框）
  const [polish, setPolish] = useState<{
    lines: string[];
    apply: (lines: string[]) => void;
  } | null>(null);
  const openPolish = (
    highlights: string[] | undefined,
    apply: (lines: string[]) => void,
  ) => setPolish({ lines: highlights || [], apply });

  // 显式「保存」：改动本就实时自动存本地草稿，这里给明确反馈；
  // 若内容与已发布版本一致，则清掉草稿（不再显示「未发布」）。
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    if (isSameResume(data, published)) resetDraft(resumeId);
    else setDraft(resumeId, cloneResume(data));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  // 导出 Word：按需加载 docx 构建器（不进入 SSG 预渲染树）
  const handleExportWord = async () => {
    const { downloadResumeWord } = await import('./exportWord');
    await downloadResumeWord(data);
  };

  // 拖拽排序：拖动过程中实时把被拖项移动到目标位置
  const [drag, setDrag] = useState<{ key: ArrayKey; index: number } | null>(
    null,
  );
  const dragProps = (key: ArrayKey, i: number) => ({
    dragging: drag?.key === key && drag.index === i,
    onDragStart: () => setDrag({ key, index: i }),
    onDragEnd: () => setDrag(null),
    onDragEnter: () => {
      if (!drag || drag.key !== key || drag.index === i) return;
      const from = drag.index;
      update((d) => {
        const arr = d[key] as unknown[] | undefined;
        if (arr) moveItem(arr, from, i);
      });
      setDrag({ key, index: i });
    },
  });

  // --- 全局排版设置 ---
  const settings = { ...SETTING_DEFAULTS, ...(data.settings || {}) };
  const setSetting = (k: keyof typeof SETTING_DEFAULTS, v: number) =>
    update((d) => {
      d.settings = { ...SETTING_DEFAULTS, ...(d.settings || {}), [k]: v };
    });
  const setFontFamily = (v: string) =>
    update((d) => {
      d.settings = {
        ...SETTING_DEFAULTS,
        ...(d.settings || {}),
        fontFamily: v === 'default' ? undefined : v,
      };
    });
  const resetSettings = () => update((d) => (d.settings = { ...SETTING_DEFAULTS }));
  const setHeaderLines = (v: 1 | 2) =>
    update((d) => {
      d.settings = { ...SETTING_DEFAULTS, ...(d.settings || {}), headerLines: v };
    });
  const setFieldSeparator = (v: ResumeFieldSeparator) =>
    update((d) => {
      d.settings = {
        ...SETTING_DEFAULTS,
        ...(d.settings || {}),
        fieldSeparator: v,
      };
    });

  // --- 智能一页：按屏幕分页页数，逐步压缩排版设置直到一页或到达下限 ---
  const [pageCount, setPageCount] = useState(1);
  const pageCountRef = useRef(pageCount);
  pageCountRef.current = pageCount;
  const [autoFit, setAutoFit] = useState<{ steps: number } | null>(null);
  const [fitMsg, setFitMsg] = useState<string | null>(null);
  // 开关状态：压缩完成后点亮，再次点击恢复压缩前的排版
  const [fitApplied, setFitApplied] = useState(false);
  const preFitSettingsRef = useRef<ResumeSettings | null>(null);
  const handlePages = useCallback((n: number) => setPageCount(n), []);

  const toggleSmartFit = () => {
    if (autoFit) return;
    if (fitApplied) {
      const snap = preFitSettingsRef.current;
      preFitSettingsRef.current = null;
      setFitApplied(false);
      if (snap) update((d) => (d.settings = snap));
      setFitMsg('已恢复压缩前的排版');
      return;
    }
    if (pageCountRef.current <= 1) {
      setFitMsg('当前已是一页，无需压缩');
      return;
    }
    preFitSettingsRef.current = { ...SETTING_DEFAULTS, ...(data.settings || {}) };
    setFitMsg(null);
    setAutoFit({ steps: 0 });
  };

  useEffect(() => {
    if (!autoFit) return;
    const count = pageCountRef.current;
    const s = { ...SETTING_DEFAULTS, ...(data.settings || {}) };
    const atMin =
      s.fontScale <= FIT_MIN.fontScale + 1e-3 &&
      s.lineHeight <= FIT_MIN.lineHeight + 1e-3 &&
      s.blockGap <= FIT_MIN.blockGap &&
      s.pageMargin <= FIT_MIN.pageMargin;
    if (count <= 1) {
      setAutoFit(null);
      setFitApplied(true);
      setFitMsg('已压缩到一页 ✓');
      return;
    }
    if (atMin || autoFit.steps >= 14) {
      setAutoFit(null);
      setFitApplied(true);
      setFitMsg(`已尽量压缩，仍需 ${count} 页`);
      return;
    }
    // 压缩一步：各维度按比例下调（clamp 到下限），等分页测量稳定后再评估下一步
    update((d) => {
      const cur = { ...SETTING_DEFAULTS, ...(d.settings || {}) };
      d.settings = {
        ...cur,
        fontScale: Math.max(FIT_MIN.fontScale, +(cur.fontScale * 0.94).toFixed(3)),
        lineHeight: Math.max(FIT_MIN.lineHeight, +(cur.lineHeight * 0.96).toFixed(3)),
        blockGap: Math.max(FIT_MIN.blockGap, Math.round(cur.blockGap * 0.9)),
        pageMargin: Math.max(FIT_MIN.pageMargin, Math.round(cur.pageMargin * 0.92)),
      };
    });
    const t = setTimeout(
      () => setAutoFit((a) => (a ? { steps: a.steps + 1 } : a)),
      220,
    );
    return () => clearTimeout(t);
    // 仅随 autoFit 推进；pageCount 经 ref、data 经 update 函数式更新读取，均为最新
  }, [autoFit]);

  // 反馈消息数秒后自动消失
  useEffect(() => {
    if (!fitMsg) return;
    const t = setTimeout(() => setFitMsg(null), 4000);
    return () => clearTimeout(t);
  }, [fitMsg]);

  // --- 证件照 ---
  const [photoBusy, setPhotoBusy] = useState(false);
  const handlePhotoFile = async (file?: File | null) => {
    if (!file) return;
    setPhotoBusy(true);
    try {
      const dataUrl = await fileToResizedDataUrl(file);
      update((d) => (d.basics.photo = dataUrl));
    } catch {
      window.alert('图片处理失败，请换一张（建议 JPG/PNG）。');
    } finally {
      setPhotoBusy(false);
    }
  };
  const removePhoto = () => update((d) => (d.basics.photo = undefined));

  // --- 模块管理（顺序 / 改名 / 显隐）---
  const resolved: ResolvedSection[] = resolveSections(data.sections, data.custom);
  const titleOf = (key: string) =>
    resolved.find((s) => s.key === key)?.title || '';
  // 任何模块编辑都先「物化」出完整有序配置，再改
  const editSections = (fn: (arr: ReturnType<typeof sectionConfigFromData>) => void) =>
    update((d) => {
      const arr = sectionConfigFromData({ ...d, id: d.id });
      fn(arr);
      d.sections = arr;
    });
  const moveSection = (i: number, dir: number) =>
    editSections((arr) => moveInArray(arr, i, dir));
  const moveSectionTo = (from: number, to: number) =>
    editSections((arr) => moveItem(arr, from, to));
  const setSectionTitle = (i: number, v: string) => {
    // 自定义模块的标题存在 data.custom[].title（单一事实来源），其余存 sections 配置
    const sec = resolved[i];
    if (sec?.key === 'custom' && sec.customId) {
      update((d) => {
        const c = (d.custom || []).find((x) => x.id === sec.customId);
        if (c) c.title = v;
      });
      return;
    }
    editSections((arr) => (arr[i].title = v));
  };
  const toggleSectionHidden = (i: number) =>
    editSections((arr) => (arr[i].hidden = !arr[i].hidden));
  const [secDrag, setSecDrag] = useState<number | null>(null);

  // --- 自定义模块（自由标题 + 富文本正文）---
  const addCustomSection = () =>
    update((d) => {
      const id = `c${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      (d.custom ||= []).push({ id, title: '自定义模块', content: '' });
    });
  const updateCustomSection = (
    id: string,
    fn: (c: ResumeCustomSection) => void,
  ) =>
    update((d) => {
      const c = (d.custom || []).find((x) => x.id === id);
      if (c) fn(c);
    });
  const removeCustomSection = (id: string) =>
    update((d) => {
      d.custom = (d.custom || []).filter((x) => x.id !== id);
      if (d.sections)
        d.sections = d.sections.filter(
          (s) => !(s.key === 'custom' && s.customId === id),
        );
    });

  // --- 工作经历下的子项目 ---
  const addSubProject = (wi: number) =>
    update((d) => {
      if (!d.work) return;
      (d.work[wi].projects ||= []).push({ name: '' });
    });
  const updateSubProject = (
    wi: number,
    pi: number,
    fn: (p: ResumeProject) => void,
  ) =>
    update((d) => {
      const p = d.work?.[wi].projects?.[pi];
      if (p) fn(p);
    });
  const moveSubProject = (wi: number, pi: number, dir: number) =>
    update((d) => {
      const arr = d.work?.[wi].projects;
      if (arr) moveInArray(arr, pi, dir);
    });
  const deleteSubProject = (wi: number, pi: number) =>
    update((d) => d.work?.[wi].projects?.splice(pi, 1));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex flex-col">
      {/* 顶栏：左侧标题；右侧全局设置（模板/配色/排版/智能一页）+ 撤销重做 + 预览 + 操作 */}
      <div className="bg-white border-b px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="edit" className="text-sage-600" />
          <span className="font-semibold text-gray-900 truncate">
            编辑简历 · {data.label}
          </span>
          {dirty && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
              未发布
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 全局设置：模板 / 配色 / 排版（下拉面板）+ 智能一页 */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-gray-200">
            <ToolbarPopover
              icon="layer-group"
              label="模板"
              title="模板版式"
              panelClassName="w-44"
            >
              {(close) => (
                <div className="space-y-1">
                  {TEMPLATE_OPTIONS.map((t) => {
                    const active = (data.template || 'classic') === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          update((d) => (d.template = t.id as ResumeTemplate));
                          close();
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                          active
                            ? 'bg-sage-600 text-white'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {t.label}
                      </button>
                    );
                  })}
                </div>
              )}
            </ToolbarPopover>

            <ToolbarPopover
              icon="palette"
              label="配色"
              title="配色主题"
              panelClassName="w-40"
            >
              {(close) => (
                <div className="flex flex-wrap gap-2">
                  {THEME_OPTIONS.map((t) => {
                    const active = (data.theme || 'blue') === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        title={t.label}
                        onClick={() => {
                          update((d) => (d.theme = t.id as ResumeTheme));
                          close();
                        }}
                        className={`w-8 h-8 rounded-full ${t.dot} ring-2 ring-offset-2 transition ${
                          active
                            ? 'ring-gray-800'
                            : 'ring-transparent hover:ring-gray-300'
                        }`}
                      />
                    );
                  })}
                </div>
              )}
            </ToolbarPopover>

            <ToolbarPopover
              icon="text-height"
              label="排版"
              title="全局排版"
              panelClassName="w-80 max-h-[70vh] overflow-y-auto"
            >
              {() => (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-gray-800">
                      全局排版
                    </span>
                    <button
                      type="button"
                      onClick={resetSettings}
                      className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-sage-600"
                    >
                      <Icon name="redo" />
                      恢复默认
                    </button>
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                    <Slider
                      label="全局字号"
                      value={settings.fontScale}
                      min={0.8}
                      max={1.25}
                      step={0.05}
                      display={(v) => `${Math.round(v * 100)}%`}
                      onChange={(v) => setSetting('fontScale', v)}
                    />
                    <Slider
                      label="行间距"
                      value={settings.lineHeight}
                      min={1.2}
                      max={2}
                      step={0.05}
                      display={(v) => v.toFixed(2)}
                      onChange={(v) => setSetting('lineHeight', v)}
                    />
                    <Slider
                      label="模块间距"
                      value={settings.blockGap}
                      min={6}
                      max={32}
                      step={1}
                      display={(v) => `${v}px`}
                      onChange={(v) => setSetting('blockGap', v)}
                    />
                    <Slider
                      label="页边距"
                      value={settings.pageMargin}
                      min={24}
                      max={72}
                      step={1}
                      display={(v) => `${v}px`}
                      onChange={(v) => setSetting('pageMargin', v)}
                    />
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 mb-1">
                      正文字体
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {FONT_OPTIONS.map((f) => {
                        const active =
                          (settings.fontFamily || 'default') === f.key;
                        const stack = fontStack(f.key);
                        return (
                          <button
                            key={f.key}
                            type="button"
                            onClick={() => setFontFamily(f.key)}
                            style={stack ? { fontFamily: stack } : undefined}
                            className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                              active
                                ? 'border-sage-500 bg-sage-50 text-sage-700'
                                : 'border-gray-200 text-gray-600 hover:border-gray-300'
                            }`}
                          >
                            {f.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 mb-1">
                      标题行数
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {HEADER_LINES_OPTIONS.map((o) => {
                        const active =
                          (data.settings?.headerLines ?? 2) === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            onClick={() => setHeaderLines(o.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                              active
                                ? 'bg-sage-600 text-white border-sage-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <span className="block text-xs font-medium text-gray-500 mb-1">
                      字段样式
                    </span>
                    <div className="flex flex-wrap gap-2">
                      {FIELD_SEPARATOR_OPTIONS.map((o) => {
                        const active =
                          (data.settings?.fieldSeparator ?? 'dot') === o.id;
                        return (
                          <button
                            key={o.id}
                            type="button"
                            title={
                              o.id === 'justify'
                                ? '字段分散对齐：首字段贴左、时间贴右、中间均分（两端对齐）'
                                : `用「${o.label}」分隔字段`
                            }
                            onClick={() => setFieldSeparator(o.id)}
                            className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                              active
                                ? 'bg-sage-600 text-white border-sage-600'
                                : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                            }`}
                          >
                            {o.label}
                          </button>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-[11px] text-gray-400">
                      控制学校/学院/专业/学位等字段在标题行的排布。
                    </p>
                  </div>
                </div>
              )}
            </ToolbarPopover>

            <ToolbarPopover
              icon="arrows-alt"
              label="模块"
              title="模块管理"
              panelClassName="w-[26rem] max-w-[92vw] max-h-[70vh] overflow-y-auto"
            >
              {() => (
                <div>
                  <p className="mb-3 text-[11px] text-gray-400">
                    拖动或用箭头调整模块顺序；改名后简历分区标题随之变化；可隐藏暂不需要的模块。
                  </p>
                  <div className="space-y-2">
                    {resolved.map((sec, i) => (
                      <div
                        key={sec.customId ? `custom:${sec.customId}` : sec.key}
                        onDragEnter={() => {
                          if (secDrag === null || secDrag === i) return;
                          moveSectionTo(secDrag, i);
                          setSecDrag(i);
                        }}
                        onDragOver={(e) => e.preventDefault()}
                        className={`flex items-center gap-2 rounded-lg border p-2 transition-shadow ${
                          secDrag === i
                            ? 'border-sage-400 shadow-md opacity-60'
                            : 'border-gray-200'
                        } ${sec.hidden ? 'bg-gray-50' : 'bg-white'}`}
                      >
                        <span
                          draggable
                          onDragStart={() => setSecDrag(i)}
                          onDragEnd={() => setSecDrag(null)}
                          title="拖拽排序"
                          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 px-1"
                        >
                          <Icon name="arrows-alt" />
                        </span>
                        <Icon
                          name={sec.icon}
                          className={sec.hidden ? 'text-gray-300' : 'text-sage-500'}
                        />
                        <input
                          type="text"
                          value={sec.title}
                          onChange={(e) => setSectionTitle(i, e.target.value)}
                          className={`flex-1 min-w-0 rounded-md border border-transparent hover:border-gray-200 focus:border-sage-500 px-2 py-1 text-sm outline-none ${
                            sec.hidden ? 'text-gray-400 line-through' : 'text-gray-800'
                          }`}
                        />
                        <div className="flex items-center gap-0.5 shrink-0">
                          <IconBtn
                            icon="arrow-up"
                            onClick={() => moveSection(i, -1)}
                            disabled={i === 0}
                            title="上移"
                          />
                          <IconBtn
                            icon="arrow-down"
                            onClick={() => moveSection(i, 1)}
                            disabled={i === resolved.length - 1}
                            title="下移"
                          />
                          <button
                            type="button"
                            onClick={() => toggleSectionHidden(i)}
                            title={sec.hidden ? '点击显示' : '点击隐藏'}
                            className={`px-2 h-7 rounded-md text-xs font-medium transition-colors ${
                              sec.hidden
                                ? 'text-gray-400 hover:text-sage-600 hover:bg-sage-50'
                                : 'text-sage-600 hover:bg-sage-50'
                            }`}
                          >
                            {sec.hidden ? '已隐藏' : '显示'}
                          </button>
                          {sec.key === 'custom' && sec.customId && (
                            <IconBtn
                              icon="trash"
                              onClick={() => removeCustomSection(sec.customId!)}
                              title="删除该自定义模块"
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </ToolbarPopover>

            <button
              type="button"
              onClick={toggleSmartFit}
              disabled={!!autoFit}
              title={fitApplied ? '恢复压缩前的排版' : '自动压缩排版直到塞进一页'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium border transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${
                fitApplied
                  ? 'bg-sage-600 border-sage-600 text-white hover:bg-sage-700'
                  : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Icon name="magic" />
              <span className="hidden lg:inline">
                {autoFit ? '压缩中…' : '智能一页'}
              </span>
            </button>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              共 {pageCount} 页
              {fitMsg && (
                <span className="ml-1 font-medium text-emerald-600">
                  {fitMsg}
                </span>
              )}
            </span>
          </div>

          {/* 撤销 / 重做 */}
          <div className="flex items-center gap-0.5 pr-2 border-r border-gray-200">
            <IconBtn
              icon="undo"
              onClick={undo}
              disabled={undoStack.current.length === 0}
              title="撤销"
            />
            <IconBtn
              icon="redo2"
              onClick={redo}
              disabled={redoStack.current.length === 0}
              title="重做"
            />
          </div>

          {/* 预览切换 */}
          <button
            type="button"
            onClick={() => setPreviewMode((p) => !p)}
            title={previewMode ? '退出预览' : '全屏预览'}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium border transition-colors ${
              previewMode
                ? 'border-sage-500 bg-sage-50 text-sage-700'
                : 'border-gray-200 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Icon name={previewMode ? 'compress' : 'expand'} />
            <span className="hidden lg:inline">
              {previewMode ? '退出预览' : '预览'}
            </span>
          </button>

          {/* 操作：保存 / 导出（PDF·Word·数据）/ 发布到线上 / 重置 / 关闭 */}
          <button
            onClick={handleSave}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors ${
              saved ? 'bg-green-600' : 'bg-sage-600 hover:bg-sage-700'
            }`}
          >
            <Icon name={saved ? 'check' : 'save'} />
            <span>{saved ? '已保存' : '保存'}</span>
          </button>

          <ToolbarPopover
            icon="download"
            label="导出"
            align="right"
            title="导出 PDF / Word / 数据"
            panelClassName="w-48"
          >
            {(close) => (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={() => {
                    window.print();
                    close();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Icon name="print" className="text-gray-400" />
                  导出 PDF
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void handleExportWord();
                    close();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Icon name="file-alt" className="text-gray-400" />
                  导出 Word
                </button>
                <button
                  type="button"
                  onClick={() => {
                    downloadResumeYaml(data);
                    close();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Icon name="download" className="text-gray-400" />
                  导出数据（YAML）
                </button>
              </div>
            )}
          </ToolbarPopover>

          <button
            onClick={() => setPublishOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-200 hover:bg-gray-50"
          >
            <Icon name="paper-plane" />
            <span className="hidden sm:inline">发布到线上</span>
          </button>
          {dirty && (
            <button
              onClick={() => resetDraft(resumeId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-red-600"
            >
              <Icon name="redo" />
              <span className="hidden sm:inline">重置</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
            title="关闭"
          >
            <Icon name="times" />
          </button>
        </div>
      </div>

      {/* 双栏主体：表单左、预览右。md(768px) 起即左右布局——
          编辑器是全屏覆盖层，用户预期始终是超级简历式左右双栏，
          仅窄于 768px（手机）才退化为上下堆叠。预览模式下隐藏左侧表单、预览占满。 */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2">
        {/* 左：表单（预览模式下隐藏） */}
        {!previewMode && (
        <div className="overflow-y-auto bg-white p-4 sm:p-6 space-y-8 border-r">
          {/* 简历诊断：完成度 + 智能检查 */}
          <DiagnosticsPanel data={data} onFix={(fix) => update(fix)} />

          {/* 简历元信息 */}
          <section>
            <SectionHeader icon="file-alt" title="简历信息" />
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label="简历名称（横排显示）"
                value={data.label}
                onChange={(v) => update((d) => (d.label = v))}
              />
              <Field
                label="目标岗位"
                value={data.target}
                onChange={(v) => update((d) => (d.target = v))}
              />
            </div>
          </section>

          {/* 基本信息 */}
          <section id="sec-basics">
            <SectionHeader icon="user" title="基本信息" />
            {/* 证件照 */}
            <div className="mb-4 flex items-center gap-4">
              <div className="w-[76px] h-[102px] shrink-0 rounded-md border border-gray-200 bg-gray-50 overflow-hidden flex items-center justify-center">
                {data.basics.photo ? (
                  <img
                    src={data.basics.photo}
                    alt="证件照预览"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <Icon name="user" className="text-2xl text-gray-300" />
                )}
              </div>
              <div className="space-y-2">
                <span className="block text-xs font-medium text-gray-500">
                  证件照（可选）
                </span>
                <div className="flex items-center gap-2">
                  <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-white bg-sage-600 hover:bg-sage-700 cursor-pointer">
                    <Icon name={photoBusy ? 'spinner' : 'image'} spin={photoBusy} />
                    <span>{data.basics.photo ? '更换' : '上传'}</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        handlePhotoFile(e.target.files?.[0]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                  {data.basics.photo && (
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-600 border border-gray-200 hover:text-red-600 hover:bg-red-50"
                    >
                      <Icon name="trash" />
                      移除
                    </button>
                  )}
                </div>
                <p className="text-[11px] text-gray-400 max-w-[220px]">
                  自动压缩为小图内嵌，随简历一起保存/发布。
                </p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label="姓名"
                value={data.basics.name}
                onChange={(v) => update((d) => (d.basics.name = v))}
              />
              <Field
                label="头衔 / 求职意向"
                value={data.basics.title}
                onChange={(v) => update((d) => (d.basics.title = v))}
              />
              <Field
                label="邮箱"
                value={data.basics.email}
                onChange={(v) => update((d) => (d.basics.email = v))}
              />
              <Field
                label="电话"
                value={data.basics.phone}
                onChange={(v) => update((d) => (d.basics.phone = v))}
              />
              <Field
                label="微信"
                value={data.basics.wechat}
                onChange={(v) => update((d) => (d.basics.wechat = v))}
              />
              <Field
                label="所在地"
                value={data.basics.location}
                onChange={(v) => update((d) => (d.basics.location = v))}
              />
              <Field
                label="出生年月"
                value={data.basics.birth}
                onChange={(v) => update((d) => (d.basics.birth = v))}
              />
              <Field
                label="政治面貌"
                value={data.basics.political}
                onChange={(v) => update((d) => (d.basics.political = v))}
              />
              <Field
                label="GitHub"
                value={data.basics.github}
                onChange={(v) => update((d) => (d.basics.github = v))}
              />
              <Field
                label="个人网站"
                value={data.basics.website}
                onChange={(v) => update((d) => (d.basics.website = v))}
              />
            </div>
            <div className="mt-3">
              {!data.basics.summary && (
                <div className="flex justify-end mb-1">
                  <button
                    type="button"
                    onClick={() =>
                      update((d) => (d.basics.summary = EXAMPLE_SUMMARY))
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700"
                  >
                    <Icon name="lightbulb" />
                    填入示例
                  </button>
                </div>
              )}
              <RichTextField
                label="个人简介"
                value={data.basics.summary}
                rows={4}
                onChange={(v) => update((d) => (d.basics.summary = v))}
              />
            </div>
          </section>

          {/* 教育经历 */}
          <section id="sec-education">
            <SectionHeader
              icon="graduation-cap"
              title={titleOf('education')}
              onExample={() =>
                update((d) => {
                  d.education ||= [];
                  d.education.push(EXAMPLE_EDUCATION);
                })
              }
              onAdd={() =>
                update((d) => {
                  d.education ||= [];
                  d.education.push({ school: '' });
                })
              }
            />
            <div className="space-y-3">
              {(data.education || []).map((e, i) => (
                <EntryCard
                  key={i}
                  label="教育"
                  index={i}
                  total={(data.education || []).length}
                  {...dragProps('education', i)}
                  onUp={() =>
                    update((d) => d.education && moveInArray(d.education, i, -1))
                  }
                  onDown={() =>
                    update((d) => d.education && moveInArray(d.education, i, 1))
                  }
                  onDelete={() =>
                    update((d) => d.education?.splice(i, 1))
                  }
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field
                      label="学校"
                      value={e.school}
                      onChange={(v) =>
                        update((d) => d.education && (d.education[i].school = v))
                      }
                    />
                    <Field
                      label="学院"
                      value={e.college}
                      onChange={(v) =>
                        update(
                          (d) => d.education && (d.education[i].college = v),
                        )
                      }
                    />
                    <PeriodField
                      label="时间"
                      value={e.period}
                      onChange={(v) =>
                        update((d) => d.education && (d.education[i].period = v))
                      }
                    />
                    <Field
                      label="学历"
                      value={e.degree}
                      onChange={(v) =>
                        update((d) => d.education && (d.education[i].degree = v))
                      }
                    />
                    <Field
                      label="专业"
                      value={e.major}
                      onChange={(v) =>
                        update((d) => d.education && (d.education[i].major = v))
                      }
                    />
                    <Field
                      label="GPA"
                      value={e.gpa}
                      onChange={(v) =>
                        update((d) => d.education && (d.education[i].gpa = v))
                      }
                    />
                  </div>
                  <Field
                    label="主修课程"
                    placeholder="如 高等数学、线性代数、数据结构（逗号分隔）"
                    value={e.courses}
                    onChange={(v) =>
                      update((d) => d.education && (d.education[i].courses = v))
                    }
                  />
                  <RichTextField
                    label="补充说明"
                    value={e.detail}
                    rows={2}
                    onChange={(v) =>
                      update((d) => d.education && (d.education[i].detail = v))
                    }
                  />
                </EntryCard>
              ))}
            </div>
          </section>

          {/* 工作经历 */}
          <section id="sec-work">
            <SectionHeader
              icon="briefcase"
              title={titleOf('work')}
              onExample={() =>
                update((d) => {
                  d.work ||= [];
                  d.work.push(EXAMPLE_WORK);
                })
              }
              onAdd={() =>
                update((d) => {
                  d.work ||= [];
                  d.work.push({ company: '' });
                })
              }
            />
            <div className="space-y-3">
              {(data.work || []).map((w, i) => (
                <EntryCard
                  key={i}
                  label="工作"
                  index={i}
                  total={(data.work || []).length}
                  {...dragProps('work', i)}
                  onUp={() => update((d) => d.work && moveInArray(d.work, i, -1))}
                  onDown={() => update((d) => d.work && moveInArray(d.work, i, 1))}
                  onDelete={() => update((d) => d.work?.splice(i, 1))}
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field
                      label="公司"
                      value={w.company}
                      onChange={(v) =>
                        update((d) => d.work && (d.work[i].company = v))
                      }
                    />
                    <Field
                      label="职位"
                      value={w.position}
                      onChange={(v) =>
                        update((d) => d.work && (d.work[i].position = v))
                      }
                    />
                    <PeriodField
                      label="时间"
                      value={w.period}
                      onChange={(v) =>
                        update((d) => d.work && (d.work[i].period = v))
                      }
                    />
                    <Field
                      label="地点"
                      value={w.location}
                      onChange={(v) =>
                        update((d) => d.work && (d.work[i].location = v))
                      }
                    />
                  </div>
                  <RichTextField
                    label="工作要点"
                    value={lines(w.highlights)}
                    rows={5}
                    onChange={(v) =>
                      update(
                        (d) => d.work && (d.work[i].highlights = toLines(v)),
                      )
                    }
                    onPolish={() =>
                      openPolish(w.highlights, (ls) =>
                        update(
                          (d) => d.work && (d.work[i].highlights = ls),
                        ),
                      )
                    }
                  />

                  {/* 子项目：同一公司下的多个项目 */}
                  <div className="rounded-lg border border-dashed border-gray-300 bg-white/70 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-500">
                        <Icon name="code" className="text-sage-500" />
                        公司内项目（{(w.projects || []).length}）
                      </span>
                      <button
                        type="button"
                        onClick={() => addSubProject(i)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-sage-600 hover:text-sage-700"
                      >
                        <Icon name="plus" />
                        添加项目
                      </button>
                    </div>
                    {(w.projects || []).map((sp, pi) => (
                      <div
                        key={pi}
                        className="rounded-lg border border-gray-200 bg-gray-50/70 p-3 space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-semibold text-gray-400">
                            项目 #{pi + 1}
                          </span>
                          <div className="flex items-center gap-0.5">
                            <IconBtn
                              icon="arrow-up"
                              onClick={() => moveSubProject(i, pi, -1)}
                              disabled={pi === 0}
                              title="上移"
                            />
                            <IconBtn
                              icon="arrow-down"
                              onClick={() => moveSubProject(i, pi, 1)}
                              disabled={pi === (w.projects || []).length - 1}
                              title="下移"
                            />
                            <IconBtn
                              icon="trash"
                              onClick={() => deleteSubProject(i, pi)}
                              danger
                              title="删除"
                            />
                          </div>
                        </div>
                        <div className="grid sm:grid-cols-2 gap-2">
                          <Field
                            label="项目名"
                            value={sp.name}
                            onChange={(v) =>
                              updateSubProject(i, pi, (p) => (p.name = v))
                            }
                          />
                          <Field
                            label="角色"
                            value={sp.role}
                            onChange={(v) =>
                              updateSubProject(i, pi, (p) => (p.role = v))
                            }
                          />
                          <PeriodField
                            label="时间"
                            value={sp.period}
                            onChange={(v) =>
                              updateSubProject(i, pi, (p) => (p.period = v))
                            }
                          />
                          <Field
                            label="链接"
                            value={sp.link}
                            onChange={(v) =>
                              updateSubProject(i, pi, (p) => (p.link = v))
                            }
                          />
                        </div>
                        <TagField
                          label="技术栈"
                          placeholder="如 C++, Python"
                          items={sp.tech || []}
                          onChange={(v) =>
                            updateSubProject(i, pi, (p) => (p.tech = v))
                          }
                        />
                        <RichTextField
                          label="项目要点"
                          value={lines(sp.highlights)}
                          rows={4}
                          onChange={(v) =>
                            updateSubProject(
                              i,
                              pi,
                              (p) => (p.highlights = toLines(v)),
                            )
                          }
                          onPolish={() =>
                            openPolish(sp.highlights, (ls) =>
                              updateSubProject(i, pi, (p) => (p.highlights = ls)),
                            )
                          }
                        />
                      </div>
                    ))}
                  </div>
                </EntryCard>
              ))}
            </div>
          </section>

          {/* 项目经历 */}
          <section id="sec-projects">
            <SectionHeader
              icon="code"
              title={titleOf('projects')}
              onExample={() =>
                update((d) => {
                  d.projects ||= [];
                  d.projects.push(EXAMPLE_PROJECT);
                })
              }
              onAdd={() =>
                update((d) => {
                  d.projects ||= [];
                  d.projects.push({ name: '' });
                })
              }
            />
            <div className="space-y-3">
              {(data.projects || []).map((p, i) => (
                <EntryCard
                  key={i}
                  label="项目"
                  index={i}
                  total={(data.projects || []).length}
                  {...dragProps('projects', i)}
                  onUp={() =>
                    update((d) => d.projects && moveInArray(d.projects, i, -1))
                  }
                  onDown={() =>
                    update((d) => d.projects && moveInArray(d.projects, i, 1))
                  }
                  onDelete={() => update((d) => d.projects?.splice(i, 1))}
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field
                      label="项目名"
                      value={p.name}
                      onChange={(v) =>
                        update((d) => d.projects && (d.projects[i].name = v))
                      }
                    />
                    <Field
                      label="角色"
                      value={p.role}
                      onChange={(v) =>
                        update((d) => d.projects && (d.projects[i].role = v))
                      }
                    />
                    <PeriodField
                      label="时间"
                      value={p.period}
                      onChange={(v) =>
                        update((d) => d.projects && (d.projects[i].period = v))
                      }
                    />
                    <Field
                      label="链接"
                      value={p.link}
                      onChange={(v) =>
                        update((d) => d.projects && (d.projects[i].link = v))
                      }
                    />
                  </div>
                  <TagField
                    label="技术栈"
                    placeholder="如 C++, Python"
                    items={p.tech || []}
                    onChange={(v) =>
                      update((d) => d.projects && (d.projects[i].tech = v))
                    }
                  />
                  <RichTextField
                    label="项目要点"
                    value={lines(p.highlights)}
                    rows={5}
                    onChange={(v) =>
                      update(
                        (d) =>
                          d.projects && (d.projects[i].highlights = toLines(v)),
                      )
                    }
                    onPolish={() =>
                      openPolish(p.highlights, (ls) =>
                        update(
                          (d) => d.projects && (d.projects[i].highlights = ls),
                        ),
                      )
                    }
                  />
                </EntryCard>
              ))}
            </div>
          </section>

          {/* 专业技能 */}
          <section id="sec-skills">
            <SectionHeader icon="cogs" title={titleOf('skills')} />
            <div className="mt-1">
              {!(data.skills || '').trim() && (
                <div className="flex justify-end mb-1">
                  <button
                    type="button"
                    onClick={() => update((d) => (d.skills = EXAMPLE_SKILL))}
                    className="inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700"
                  >
                    <Icon name="lightbulb" />
                    填入示例
                  </button>
                </div>
              )}
              <RichTextField
                label="专业技能"
                value={data.skills}
                rows={4}
                onChange={(v) => update((d) => (d.skills = v))}
              />
            </div>
          </section>

          {/* 荣誉奖项 */}
          <section id="sec-awards">
            <SectionHeader
              icon="trophy"
              title={titleOf('awards')}
              onExample={() =>
                update((d) => {
                  d.awards ||= [];
                  d.awards.push(EXAMPLE_AWARD);
                })
              }
              onAdd={() =>
                update((d) => {
                  d.awards ||= [];
                  d.awards.push({ title: '' });
                })
              }
            />
            <div className="space-y-3">
              {(data.awards || []).map((a, i) => (
                <EntryCard
                  key={i}
                  label="荣誉"
                  index={i}
                  total={(data.awards || []).length}
                  {...dragProps('awards', i)}
                  onUp={() =>
                    update((d) => d.awards && moveInArray(d.awards, i, -1))
                  }
                  onDown={() =>
                    update((d) => d.awards && moveInArray(d.awards, i, 1))
                  }
                  onDelete={() => update((d) => d.awards?.splice(i, 1))}
                >
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Field
                      label="名称"
                      value={a.title}
                      onChange={(v) =>
                        update((d) => d.awards && (d.awards[i].title = v))
                      }
                    />
                    <Field
                      label="颁发方"
                      value={a.issuer}
                      onChange={(v) =>
                        update((d) => d.awards && (d.awards[i].issuer = v))
                      }
                    />
                    <PeriodField
                      label="日期"
                      mode="single"
                      value={a.date}
                      onChange={(v) =>
                        update((d) => d.awards && (d.awards[i].date = v))
                      }
                    />
                  </div>
                </EntryCard>
              ))}
            </div>
          </section>

          {/* 资格证书 */}
          <section id="sec-certificates">
            <SectionHeader
              icon="certificate"
              title={titleOf('certificates')}
              onExample={() =>
                update((d) => {
                  d.certificates ||= [];
                  d.certificates.push(EXAMPLE_CERTIFICATE);
                })
              }
              onAdd={() =>
                update((d) => {
                  d.certificates ||= [];
                  d.certificates.push({ name: '' });
                })
              }
            />
            <div className="space-y-3">
              {(data.certificates || []).map((c, i) => (
                <EntryCard
                  key={i}
                  label="证书"
                  index={i}
                  total={(data.certificates || []).length}
                  {...dragProps('certificates', i)}
                  onUp={() =>
                    update(
                      (d) => d.certificates && moveInArray(d.certificates, i, -1),
                    )
                  }
                  onDown={() =>
                    update(
                      (d) => d.certificates && moveInArray(d.certificates, i, 1),
                    )
                  }
                  onDelete={() => update((d) => d.certificates?.splice(i, 1))}
                >
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Field
                      label="证书名称"
                      value={c.name}
                      onChange={(v) =>
                        update(
                          (d) => d.certificates && (d.certificates[i].name = v),
                        )
                      }
                    />
                    <Field
                      label="颁发方"
                      value={c.issuer}
                      onChange={(v) =>
                        update(
                          (d) => d.certificates && (d.certificates[i].issuer = v),
                        )
                      }
                    />
                    <PeriodField
                      label="取得时间"
                      mode="single"
                      value={c.date}
                      onChange={(v) =>
                        update(
                          (d) => d.certificates && (d.certificates[i].date = v),
                        )
                      }
                    />
                  </div>
                </EntryCard>
              ))}
            </div>
          </section>

          {/* 语言能力 */}
          <section id="sec-languages">
            <SectionHeader
              icon="language"
              title={titleOf('languages')}
              onExample={() =>
                update((d) => {
                  d.languages ||= [];
                  d.languages.push(EXAMPLE_LANGUAGE);
                })
              }
              onAdd={() =>
                update((d) => {
                  d.languages ||= [];
                  d.languages.push({ name: '' });
                })
              }
            />
            <div className="space-y-3">
              {(data.languages || []).map((l, i) => (
                <EntryCard
                  key={i}
                  label="语言"
                  index={i}
                  total={(data.languages || []).length}
                  {...dragProps('languages', i)}
                  onUp={() =>
                    update((d) => d.languages && moveInArray(d.languages, i, -1))
                  }
                  onDown={() =>
                    update((d) => d.languages && moveInArray(d.languages, i, 1))
                  }
                  onDelete={() => update((d) => d.languages?.splice(i, 1))}
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field
                      label="语言"
                      placeholder="如 英语 / 日语"
                      value={l.name}
                      onChange={(v) =>
                        update((d) => d.languages && (d.languages[i].name = v))
                      }
                    />
                    <SelectField
                      label="熟练度"
                      value={l.level}
                      options={LANGUAGE_LEVELS}
                      placeholder="选择或留空"
                      onChange={(v) =>
                        update(
                          (d) => d.languages && (d.languages[i].level = v),
                        )
                      }
                    />
                  </div>
                </EntryCard>
              ))}
            </div>
          </section>

          {/* 校园活动 */}
          <section id="sec-activities">
            <SectionHeader
              icon="users"
              title={titleOf('activities')}
              onExample={() =>
                update((d) => {
                  d.activities ||= [];
                  d.activities.push(EXAMPLE_ACTIVITY);
                })
              }
              onAdd={() =>
                update((d) => {
                  d.activities ||= [];
                  d.activities.push({ name: '' });
                })
              }
            />
            <div className="space-y-3">
              {(data.activities || []).map((a, i) => (
                <EntryCard
                  key={i}
                  label="活动"
                  index={i}
                  total={(data.activities || []).length}
                  {...dragProps('activities', i)}
                  onUp={() =>
                    update(
                      (d) => d.activities && moveInArray(d.activities, i, -1),
                    )
                  }
                  onDown={() =>
                    update((d) => d.activities && moveInArray(d.activities, i, 1))
                  }
                  onDelete={() => update((d) => d.activities?.splice(i, 1))}
                >
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Field
                      label="组织 / 活动名"
                      value={a.name}
                      onChange={(v) =>
                        update(
                          (d) => d.activities && (d.activities[i].name = v),
                        )
                      }
                    />
                    <Field
                      label="角色"
                      value={a.role}
                      onChange={(v) =>
                        update(
                          (d) => d.activities && (d.activities[i].role = v),
                        )
                      }
                    />
                    <PeriodField
                      label="时间"
                      value={a.period}
                      onChange={(v) =>
                        update(
                          (d) => d.activities && (d.activities[i].period = v),
                        )
                      }
                    />
                  </div>
                  <RichTextField
                    label="活动要点"
                    value={lines(a.highlights)}
                    rows={3}
                    onChange={(v) =>
                      update(
                        (d) =>
                          d.activities && (d.activities[i].highlights = toLines(v)),
                      )
                    }
                    onPolish={() =>
                      openPolish(a.highlights, (ls) =>
                        update(
                          (d) =>
                            d.activities && (d.activities[i].highlights = ls),
                        ),
                      )
                    }
                  />
                </EntryCard>
              ))}
            </div>
          </section>

          {/* 兴趣爱好 */}
          <section id="sec-interests">
            <SectionHeader
              icon="heart"
              title={titleOf('interests')}
              onAdd={() => setInterestsOpen(true)}
              onExample={() => {
                update((d) => {
                  const cur = d.interests || [];
                  d.interests = [
                    ...cur,
                    ...EXAMPLE_INTERESTS.filter((x) => !cur.includes(x)),
                  ];
                });
                setInterestsOpen(true);
              }}
            />
            {((data.interests || []).length > 0 || interestsOpen) && (
              <TagField
                label="兴趣爱好"
                placeholder="如 篮球、摄影、开源社区"
                items={data.interests || []}
                onChange={(v) => {
                  update((d) => (d.interests = v));
                  if (v.length === 0) setInterestsOpen(false);
                }}
              />
            )}
          </section>

          {/* 自定义模块：自由标题 + 富文本正文 */}
          <section id="sec-custom">
            <SectionHeader
              icon="plus"
              title="自定义模块"
              onAdd={addCustomSection}
            />
            <p className="-mt-1 mb-3 text-[11px] text-gray-400">
              需要「自我评价」「在校经历」「科研经历」等额外分区时，点「添加」新建一个自定义模块；
              标题与顺序可在顶部工具栏「模块」里调整。
            </p>
            {(data.custom || []).length === 0 ? (
              <p className="text-xs text-gray-400">
                暂无自定义模块，点右上角「添加」创建。
              </p>
            ) : (
              <div className="space-y-4">
                {(data.custom || []).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border border-gray-200 bg-white p-3"
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <Field
                        label="模块标题"
                        value={c.title}
                        onChange={(v) =>
                          updateCustomSection(c.id, (x) => (x.title = v))
                        }
                      />
                      <IconBtn
                        icon="trash"
                        onClick={() => removeCustomSection(c.id)}
                        title="删除该自定义模块"
                      />
                    </div>
                    <RichTextField
                      label="模块正文"
                      value={c.content}
                      rows={4}
                      onChange={(v) =>
                        updateCustomSection(c.id, (x) => (x.content = v))
                      }
                    />
                  </div>
                ))}
              </div>
            )}
          </section>

          <p className="text-xs text-gray-400 pt-2 leading-relaxed">
            要点/简介支持富文本工具栏：加粗/斜体/下划线/删除线/代码、序列号/箭头列表/引用/链接、
            <strong>字号</strong>、<strong>颜色</strong>、<strong>对齐(左/中/右)</strong>；拖动条目左侧
            <Icon name="arrows-alt" className="mx-0.5" />
            可排序。改动<strong>实时自动保存</strong>在本浏览器（刷新不丢）；点「保存」可确认。要正式发布到线上，请「导出数据」并把
            YAML 提交到 content/resumes/。
          </p>
        </div>
        )}

        {/* 右：实时预览（真·多页）；预览模式下占满整行。
            PreviewFit：可用宽度不足一页 A4 时等比缩小，避免预览被裁切/覆盖。 */}
        <PreviewFit
          className={`overflow-auto bg-gray-100 p-4 sm:p-8 ${
            previewMode ? 'md:col-span-2' : ''
          }`}
        >
          <ResumeDocument data={data} onPages={handlePages} />
        </PreviewFit>
      </div>

      {/* 保存反馈 toast */}
      {saved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900 text-white text-sm shadow-lg">
          <Icon name="check" className="text-green-400" />
          已保存到本地浏览器
        </div>
      )}

      {/* 一键发布 */}
      {publishOpen && (
        <Suspense fallback={null}>
          <PublishDialog
            resumeId={resumeId}
            data={data}
            onClose={() => setPublishOpen(false)}
          />
        </Suspense>
      )}

      {/* AI 润色要点（BYOK） */}
      {polish && (
        <Suspense fallback={null}>
          <AiPolishPanel
            lines={polish.lines}
            onApply={(ls) => {
              polish.apply(ls);
              setPolish(null);
            }}
            onClose={() => setPolish(null)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ResumeEditor;
