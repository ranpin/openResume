import React, { useState, useEffect, useRef, useCallback, useMemo, lazy, Suspense } from 'react';
import Icon from '../Icon';
import ResumeDocument from './ResumeDocument';
import PreviewFit from './PreviewFit';
import RichTextField from './RichTextField';
import PeriodField from './PeriodField';
import TagField from './TagField';
import DiagnosticsPanel from './DiagnosticsPanel';
import IconBtn from './IconBtn';
import ToolbarPopover from './ToolbarPopover';
import TemplatePanel from './TemplatePanel';
import ColorPanel from './ColorPanel';
import LayoutPanel from './LayoutPanel';
import ModulePanel from './ModulePanel';
import {
  cloneResume,
  downloadResumeYaml,
  fileToResizedDataUrl,
  isSameResume,
  migrateResume,
  normalizeResume,
} from './resumeIo';
import { resolveSections, type ResolvedSection } from './resumeSections';
import { FIT_MIN, SETTING_DEFAULTS } from './resumeSettings';
import { moveInArray, moveItem } from '../../utils/array';
import {
  EXAMPLE_ACTIVITY,
  EXAMPLE_AWARD,
  EXAMPLE_CERTIFICATE,
  EXAMPLE_EDUCATION,
  EXAMPLE_INTERESTS,
  EXAMPLE_INTERNSHIP,
  EXAMPLE_LANGUAGE,
  EXAMPLE_PROJECT,
  EXAMPLE_SKILL,
  EXAMPLE_SUMMARY,
  EXAMPLE_WORK,
} from './resumeExamples';
import { useResumeStore } from '../../store/useResumeStore';
import { publishEnabled } from './github';
import { downloadBackup } from '../../store/backup';

const PublishDialog = lazy(() => import('./PublishDialog'));
const AiPolishPanel = lazy(() => import('./AiPolishPanel'));
const AiTranslatePanel = lazy(() => import('./AiTranslatePanel'));
import type {
  ResumeData,
  ResumeCustomSection,
  ResumeProject,
  ResumeSettings,
} from '../../types/resume';

// 可拖拽排序的数组字段
type ArrayKey =
  | 'education'
  | 'work'
  | 'internship'
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

/**
 * 简历编辑器：左侧分区表单，右侧实时预览。
 * 所有改动写入 useResumeStore 的本地草稿（IndexedDB，刷新不丢）。
 * 以 lazy + Suspense 加载，且只在客户端打开，SSG 预渲染不涉及。
 */

interface ResumeEditorProps {
  resumeId: string;
  published: ResumeData; // 已发布版本，用于「重置」
  onClose: () => void;
}

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

const SectionHeader: React.FC<{
  icon: string;
  title: string;
  onAdd?: () => void;
  onExample?: () => void;
  onClear?: () => void; // 一键清空该模块全部内容
}> = ({ icon, title, onAdd, onExample, onClear }) => (
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
      {onClear && (
        <button
          type="button"
          onClick={onClear}
          title="删除该模块下的全部内容"
          className="inline-flex items-center gap-1 text-xs font-medium text-gray-400 hover:text-red-600"
        >
          <Icon name="trash" />
          清空
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
  onDragStart?: (e: React.DragEvent) => void;
  onDragEnd?: () => void;
  onDragEnter?: (e: React.DragEvent) => void;
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
  // 翻译成英文版面板（文档级全局功能，从查看器工具条移入编辑器工具栏）
  const [translateOpen, setTranslateOpen] = useState(false);
  // 预览模式：隐藏左侧表单、预览占满（全屏预览）
  const [previewMode, setPreviewMode] = useState(false);
  // 顶栏简历名内联编辑：null = 展示态，字符串 = 编辑中文本（Enter/失焦提交，Esc 取消）
  const [labelEdit, setLabelEdit] = useState<string | null>(null);
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

  // ⌘Z / ⌘⇧Z 全局撤销重做；焦点在可编辑元素（输入框/文本域/富文本）内时
  // 交还浏览器默认行为，经 ref 始终调用最新闭包
  const undoRedoRef = useRef({ undo, redo });
  undoRedoRef.current = { undo, redo };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!(e.metaKey || e.ctrlKey) || e.key.toLowerCase() !== 'z') return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('input, textarea, select, [contenteditable="true"]')) return;
      e.preventDefault();
      if (e.shiftKey) undoRedoRef.current.redo();
      else undoRedoRef.current.undo();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

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

  // 拖拽排序：拖动过程中实时把被拖项移动到目标位置。
  // 源索引用 ref 同步追踪——state 在事件密集派发时（Safari/WebKit）尚未刷进闭包，
  // dragenter 会读到旧值使整段拖拽失效；state 仅用于高亮样式。
  const [drag, setDrag] = useState<{ key: ArrayKey; index: number } | null>(
    null,
  );
  const dragRef = useRef<{ key: ArrayKey; index: number } | null>(null);
  const dragProps = (key: ArrayKey, i: number) => ({
    dragging: drag?.key === key && drag.index === i,
    onDragStart: (e: React.DragEvent) => {
      // Safari / Firefox 必须在 dragstart 调用 setData，否则拖拽根本不启动
      e.dataTransfer.setData('text/plain', `${key}:${i}`);
      e.dataTransfer.effectAllowed = 'move';
      dragRef.current = { key, index: i };
      setDrag({ key, index: i });
    },
    onDragEnd: () => {
      dragRef.current = null;
      setDrag(null);
    },
    onDragEnter: (e: React.DragEvent) => {
      e.preventDefault();
      const cur = dragRef.current;
      if (!cur || cur.key !== key || cur.index === i) return;
      const from = cur.index;
      update((d) => {
        const arr = d[key] as unknown[] | undefined;
        if (arr) moveItem(arr, from, i);
      });
      dragRef.current = { key, index: i };
      setDrag({ key, index: i });
    },
  });

  // --- 智能一页：按屏幕分页页数，逐步压缩排版设置直到一页或到达下限 ---
  const [pageCount, setPageCount] = useState(1);
  const pageCountRef = useRef(pageCount);
  pageCountRef.current = pageCount;
  const [autoFit, setAutoFit] = useState<{ steps: number } | null>(null);
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
      return;
    }
    preFitSettingsRef.current = { ...SETTING_DEFAULTS, ...(data.settings || {}) };
    if (pageCountRef.current <= 1) {
      // 已经是一页：无需压缩，仅点亮开关（再次点击恢复原排版）
      setFitApplied(true);
      return;
    }
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
      return;
    }
    if (atMin || autoFit.steps >= 14) {
      setAutoFit(null);
      setFitApplied(true);
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
  // 预览头部点击上传：触发隐藏的 file input（上传逻辑仍走 handlePhotoFile）
  const photoInputRef = useRef<HTMLInputElement>(null);
  const triggerPhotoUpload = () => photoInputRef.current?.click();

  // --- 预览模块点击 → 跳转左侧对应编辑分区（sec-<key>）并闪烁提示 ---
  const handlePreviewSectionClick = (key: string) => {
    const el = document.getElementById(`sec-${key}`);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    el.classList.remove('sec-flash');
    void el.offsetWidth; // 强制 reflow，重复点同一模块也能重新闪烁
    el.classList.add('sec-flash');
    window.setTimeout(() => el.classList.remove('sec-flash'), 1300);
  };

  // --- 模块管理（顺序 / 改名 / 显隐）---
  const resolved: ResolvedSection[] = resolveSections(data.sections, data.custom);
  const titleOf = (key: string) =>
    resolved.find((s) => s.key === key)?.title || '';

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

  // --- 实习经历下的子项目（与工作经历一致）---
  const addSubProjectIntern = (wi: number) =>
    update((d) => {
      if (!d.internship) return;
      (d.internship[wi].projects ||= []).push({ name: '' });
    });
  const updateSubProjectIntern = (
    wi: number,
    pi: number,
    fn: (p: ResumeProject) => void,
  ) =>
    update((d) => {
      const p = d.internship?.[wi].projects?.[pi];
      if (p) fn(p);
    });
  const moveSubProjectIntern = (wi: number, pi: number, dir: number) =>
    update((d) => {
      const arr = d.internship?.[wi].projects;
      if (arr) moveInArray(arr, pi, dir);
    });
  const deleteSubProjectIntern = (wi: number, pi: number) =>
    update((d) => d.internship?.[wi].projects?.splice(pi, 1));

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex flex-col">
      {/* 顶栏：左侧标题；右侧全局设置（模板/配色/排版/智能一页）+ 撤销重做 + 预览 + 操作 */}
      <div className="bg-white border-b px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="edit" className="text-sage-600" />
          <span className="font-semibold text-gray-900 shrink-0">
            编辑简历 ·
          </span>
          {labelEdit === null ? (
            <button
              type="button"
              onClick={() => setLabelEdit(data.label)}
              title="点击修改简历名称"
              className="group inline-flex items-center gap-1 min-w-0 -ml-0.5 rounded-md px-1.5 py-0.5 font-semibold text-gray-900 transition-colors hover:bg-sage-50 hover:text-sage-700"
            >
              <span className="truncate">{data.label}</span>
              <Icon
                name="edit"
                className="shrink-0 text-gray-300 transition-colors group-hover:text-sage-500"
              />
            </button>
          ) : (
            <input
              autoFocus
              value={labelEdit}
              onChange={(e) => setLabelEdit(e.target.value)}
              onFocus={(e) => e.target.select()}
              onKeyDown={(e) => {
                if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
                else if (e.key === 'Escape') setLabelEdit(null);
              }}
              onBlur={() => {
                const v = labelEdit.trim();
                if (v && v !== data.label) update((d) => (d.label = v));
                setLabelEdit(null);
              }}
              title="简历名称（Enter 保存，Esc 取消）"
              className="w-36 sm:w-56 rounded-md border border-sage-400 px-1.5 py-0.5 font-semibold text-gray-900 outline-none ring-2 ring-sage-100 focus:ring-sage-200"
            />
          )}
          {dirty && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
              未发布
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 全局设置：模板 / 配色 / 排版（下拉面板）+ 智能一页 */}
          <div className="flex items-center gap-1.5 pr-2 border-r border-gray-200">
            <TemplatePanel data={data} update={update} />

            <ColorPanel data={data} update={update} />

            <LayoutPanel data={data} update={update} />

            <ModulePanel
              resolved={resolved}
              update={update}
              onRemoveCustom={removeCustomSection}
            />

            <button
              type="button"
              onClick={toggleSmartFit}
              disabled={!!autoFit}
              title={fitApplied ? '恢复压缩前的排版' : '自动压缩排版直到塞进一页'}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-sm font-medium border transition-all active:scale-95 disabled:cursor-not-allowed ${
                autoFit
                  ? 'border-sage-300 bg-sage-100 text-sage-700'
                  : fitApplied
                    ? 'bg-sage-600 border-sage-600 text-white shadow-sm hover:bg-sage-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:bg-gray-50 hover:border-sage-300'
              }`}
            >
              <Icon name={autoFit ? 'spinner' : 'magic'} spin={!!autoFit} />
              <span className="hidden lg:inline">
                {autoFit ? '压缩中…' : '智能一页'}
              </span>
            </button>
            <span className="text-xs text-gray-500 whitespace-nowrap">
              共 {pageCount} 页
            </span>
            {fitApplied && !autoFit && (
              <button
                type="button"
                onClick={toggleSmartFit}
                title="恢复压缩前的排版"
                className="p-1 -ml-0.5 rounded-md text-xs text-gray-400 hover:text-sage-600 hover:bg-sage-50 transition-colors"
              >
                <Icon name="undo" />
              </button>
            )}
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
            title="导出 PDF / Word / 数据 / 备份"
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
                <button
                  type="button"
                  onClick={() => {
                    downloadBackup();
                    close();
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
                >
                  <Icon name="save" className="text-gray-400" />
                  备份全部数据（JSON）
                </button>
              </div>
            )}
          </ToolbarPopover>

          <button
            onClick={() => setTranslateOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-200 hover:bg-gray-50"
            title="把当前简历整体翻译成英文版，生成一份新草稿"
          >
            <Icon name="language" />
            <span className="hidden sm:inline">翻译成英文</span>
          </button>
          {publishEnabled && (
            <button
              onClick={() => setPublishOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-200 hover:bg-gray-50"
            >
              <Icon name="paper-plane" />
              <span className="hidden sm:inline">发布到线上</span>
            </button>
          )}
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
          编辑器是全屏覆盖层，用户预期始终是左右双栏，
          仅窄于 768px（手机）才退化为上下堆叠。预览模式下隐藏左侧表单、预览占满。 */}
      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-2">
        {/* 左：表单（预览模式下隐藏） */}
        {!previewMode && (
        <div className="overflow-y-auto bg-white p-4 sm:p-6 space-y-8 border-r">
          {/* 简历诊断：完成度 + 智能检查 */}
          <DiagnosticsPanel data={data} onFix={(fix) => update(fix)} />

          {/* 基本信息 */}
          <section id="sec-basics">
            <SectionHeader icon="user" title="基本信息" />
            <p className="-mt-1 mb-2 inline-flex items-center gap-1.5 text-[11px] text-gray-400">
              <Icon name="image" />
              证件照在右侧预览头部直接点击上传 / 更换 / 移除。
            </p>
            <div className="grid sm:grid-cols-2 gap-x-3 gap-y-2">
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
                label="籍贯"
                value={data.basics.hometown}
                onChange={(v) => update((d) => (d.basics.hometown = v))}
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
            <div className="mt-2">
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

          {/* 实习经历 */}
          <section id="sec-internship">
            <SectionHeader
              icon="briefcase"
              title={titleOf('internship')}
              onExample={() =>
                update((d) => {
                  d.internship ||= [];
                  d.internship.push(EXAMPLE_INTERNSHIP);
                })
              }
              onAdd={() =>
                update((d) => {
                  d.internship ||= [];
                  d.internship.push({ company: '' });
                })
              }
            />
            <div className="space-y-3">
              {(data.internship || []).map((w, i) => (
                <EntryCard
                  key={i}
                  label="实习"
                  index={i}
                  total={(data.internship || []).length}
                  {...dragProps('internship', i)}
                  onUp={() =>
                    update((d) => d.internship && moveInArray(d.internship, i, -1))
                  }
                  onDown={() =>
                    update((d) => d.internship && moveInArray(d.internship, i, 1))
                  }
                  onDelete={() => update((d) => d.internship?.splice(i, 1))}
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field
                      label="公司"
                      value={w.company}
                      onChange={(v) =>
                        update((d) => d.internship && (d.internship[i].company = v))
                      }
                    />
                    <Field
                      label="职位"
                      value={w.position}
                      onChange={(v) =>
                        update((d) => d.internship && (d.internship[i].position = v))
                      }
                    />
                    <PeriodField
                      label="时间"
                      value={w.period}
                      onChange={(v) =>
                        update((d) => d.internship && (d.internship[i].period = v))
                      }
                    />
                    <Field
                      label="地点"
                      value={w.location}
                      onChange={(v) =>
                        update((d) => d.internship && (d.internship[i].location = v))
                      }
                    />
                  </div>
                  <RichTextField
                    label="实习要点"
                    value={lines(w.highlights)}
                    rows={5}
                    onChange={(v) =>
                      update(
                        (d) =>
                          d.internship && (d.internship[i].highlights = toLines(v)),
                      )
                    }
                    onPolish={() =>
                      openPolish(w.highlights, (ls) =>
                        update(
                          (d) => d.internship && (d.internship[i].highlights = ls),
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
                        onClick={() => addSubProjectIntern(i)}
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
                              onClick={() => moveSubProjectIntern(i, pi, -1)}
                              disabled={pi === 0}
                              title="上移"
                            />
                            <IconBtn
                              icon="arrow-down"
                              onClick={() => moveSubProjectIntern(i, pi, 1)}
                              disabled={pi === (w.projects || []).length - 1}
                              title="下移"
                            />
                            <IconBtn
                              icon="trash"
                              onClick={() => deleteSubProjectIntern(i, pi)}
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
                              updateSubProjectIntern(i, pi, (p) => (p.name = v))
                            }
                          />
                          <Field
                            label="角色"
                            value={sp.role}
                            onChange={(v) =>
                              updateSubProjectIntern(i, pi, (p) => (p.role = v))
                            }
                          />
                          <PeriodField
                            label="时间"
                            value={sp.period}
                            onChange={(v) =>
                              updateSubProjectIntern(i, pi, (p) => (p.period = v))
                            }
                          />
                          <Field
                            label="链接"
                            value={sp.link}
                            onChange={(v) =>
                              updateSubProjectIntern(i, pi, (p) => (p.link = v))
                            }
                          />
                        </div>
                        <TagField
                          label="技术栈"
                          placeholder="如 C++, Python"
                          items={sp.tech || []}
                          onChange={(v) =>
                            updateSubProjectIntern(i, pi, (p) => (p.tech = v))
                          }
                        />
                        <RichTextField
                          label="项目要点"
                          value={lines(sp.highlights)}
                          rows={4}
                          onChange={(v) =>
                            updateSubProjectIntern(
                              i,
                              pi,
                              (p) => (p.highlights = toLines(v)),
                            )
                          }
                          onPolish={() =>
                            openPolish(sp.highlights, (ls) =>
                              updateSubProjectIntern(
                                i,
                                pi,
                                (p) => (p.highlights = ls),
                              ),
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
              onClear={
                (data.interests || []).length > 0
                  ? () => {
                      update((d) => (d.interests = []));
                      setInterestsOpen(false);
                    }
                  : undefined
              }
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
            可排序。改动<strong>实时自动保存</strong>在本浏览器（刷新不丢）；点「保存」可确认。要正式发布到线上，点工具栏
            「发布到线上」（一键提交到数据仓库）。
          </p>
        </div>
        )}

        {/* 右：实时预览（真·多页）；预览模式下占满整行。
            PreviewFit：可用宽度不足一页 A4 时等比缩小，避免预览被裁切/覆盖。
            预览交互：点头部证件照上传/更换/移除；点任意模块跳转左侧对应编辑分区。 */}
        <PreviewFit
          className={`overflow-auto bg-gray-100 p-4 sm:p-8 ${
            previewMode ? 'md:col-span-2' : ''
          }`}
        >
          <ResumeDocument
            data={data}
            onPages={handlePages}
            onSectionClick={previewMode ? undefined : handlePreviewSectionClick}
            onPhotoUpload={triggerPhotoUpload}
            onPhotoRemove={removePhoto}
            photoBusy={photoBusy}
          />
        </PreviewFit>
        {/* 隐藏 file input：由预览头部证件照点击触发 */}
        <input
          ref={photoInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            handlePhotoFile(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
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

      {/* 翻译成英文版（BYOK）：成功后关闭编辑器，查看器展示新生成的英文草稿 */}
      {translateOpen && (
        <Suspense fallback={null}>
          <AiTranslatePanel
            resumeId={resumeId}
            baseData={data}
            onClose={() => setTranslateOpen(false)}
            onTranslated={() => {
              setTranslateOpen(false);
              onClose();
            }}
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
