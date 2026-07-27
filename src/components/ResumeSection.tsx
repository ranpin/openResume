import React, { useEffect, useRef, useState, useMemo, lazy, Suspense } from 'react';
import Icon from './Icon';
import ResumeCatalog from './ResumeCatalog';
import ResumeDocument from './resume/ResumeDocument';
import PreviewFit from './resume/PreviewFit';
import { migrateResume, normalizeResume } from './resume/resumeIo';
import { useContentStore } from '../store/useContentStore';
import { DATA_SOURCE } from '../data/source';
import { migrateLegacyKeys } from '../store/idb';
import { restoreBackup } from '../store/backup';
import { useResumeStore, DRAFTS_STORAGE_KEY } from '../store/useResumeStore';
import type { Project, Publication, Internship } from '../types';
import type { ResumeData } from '../types/resume';

// 编辑器 / AI 面板仅在打开时才需要，按需加载（并避免进入 SSG 预渲染树）
const ResumeEditor = lazy(() => import('./resume/ResumeEditor'));
const AiGeneratePanel = lazy(() => import('./resume/AiGeneratePanel'));
const AiImportPanel = lazy(() => import('./resume/AiImportPanel'));

interface ResumeSectionProps {
  resumeCategory: string;
  onArticleClick: (article: Project) => void;
  onPaperClick: (paper: Publication) => void;
  onInternshipClick: (internship: Internship) => void;
}

type View = 'resume' | 'catalog';

const ToolbarButton: React.FC<{
  icon: string;
  label: string;
  onClick: () => void;
  primary?: boolean;
}> = ({ icon, label, onClick, primary }) => (
  <button
    onClick={onClick}
    className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
      primary
        ? 'bg-sage-600 text-white hover:bg-sage-700 shadow-sm'
        : 'bg-white text-gray-700 border border-gray-200 hover:bg-gray-50'
    }`}
  >
    <Icon name={icon} />
    {label}
  </button>
);

const ResumeSection: React.FC<ResumeSectionProps> = ({
  resumeCategory,
  onArticleClick,
  onPaperClick,
  onInternshipClick,
}) => {
  const [view, setView] = useState<View>('resume');
  const [editing, setEditing] = useState(false);
  const [aiOpen, setAiOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [backupToast, setBackupToast] = useState<string | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  const drafts = useResumeStore((s) => s.drafts);
  const publishedMap = useResumeStore((s) => s.published);
  const hydrated = useResumeStore((s) => s.hydrated);
  const activeId = useResumeStore((s) => s.activeId);
  const setActiveId = useResumeStore((s) => s.setActiveId);
  const setHydrated = useResumeStore((s) => s.setHydrated);

  // 远程内容（数据仓库）：简历列表与经历库
  const resumes = useContentStore((s) => s.resumes);
  const contentStatus = useContentStore((s) => s.status);
  const contentError = useContentStore((s) => s.error);
  const fromCache = useContentStore((s) => s.fromCache);
  const loadContent = useContentStore((s) => s.load);

  // 水合后再从 IndexedDB 载入草稿，避免预渲染 / 水合不一致；同时拉取远程内容。
  // 旧版 localStorage 草稿先一次性迁入 IndexedDB，再 rehydrate
  useEffect(() => {
    let cancelled = false;
    (async () => {
      await migrateLegacyKeys([DRAFTS_STORAGE_KEY]);
      await useResumeStore.persist.rehydrate();
      if (!cancelled) setHydrated(true);
    })();
    loadContent();
    return () => {
      cancelled = true;
    };
  }, [setHydrated, loadContent]);

  // 草稿型简历：仅存在于本地草稿、不在数据仓库里（如 AI 翻译生成的英文版）。
  // 水合后合并进切换栏，使其可查看 / 编辑 / 导出 / 发布。
  const draftOnly: { id: string; label: string }[] = hydrated
    ? Object.keys(drafts)
        .filter((id) => !resumes.some((r) => r.id === id))
        .map((id) => ({ id, label: drafts[id].label || id }))
    : [];
  const allResumes = [...resumes, ...draftOnly];

  const selectedId = activeId && allResumes.some((r) => r.id === activeId)
    ? activeId
    : allResumes[0]?.id;
  const published = resumes.find((r) => r.id === selectedId);
  // 有草稿则展示草稿（水合后），否则展示已发布版本；
  // 旧草稿可能还是 skills 分组数组的旧结构，读出时统一迁移为富文本字符串
  const rawCurrent: ResumeData | undefined =
    (selectedId && drafts[selectedId]) || published;
  const current: ResumeData | undefined = useMemo(
    () => (rawCurrent ? migrateResume(rawCurrent) : rawCurrent),
    [rawCurrent],
  );

  // 「有未发布改动」= 存在草稿，且与内置基线、最近一次发布都不同
  const isDirty = (rid: string): boolean => {
    const dr = drafts[rid];
    if (!dr) return false;
    const norm = normalizeResume(dr);
    const pub = resumes.find((r) => r.id === rid);
    if (pub && normalizeResume(pub) === norm) return false;
    if (publishedMap[rid] === norm) return false;
    return true;
  };
  const hasDraft = !!(selectedId && hydrated && isDirty(selectedId));

  // 导入备份：合并式恢复草稿（见 store/backup.ts）
  const handleBackupFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const count = restoreBackup(await file.text());
      setBackupToast(`导入成功，共 ${count} 份简历草稿`);
    } catch (err) {
      setBackupToast(err instanceof Error ? err.message : '导入失败');
    }
    window.setTimeout(() => setBackupToast(null), 3000);
  };

  return (
    <div>
      {/* 顶部：一级切换（我的简历 / 作品集）与创建级入口（AI 生成 / 导入简历）同行 */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-xl bg-gray-100 p-1">
          {(
            [
              { key: 'resume', label: '我的简历', icon: 'file-alt' },
              { key: 'catalog', label: '作品集', icon: 'folder-open' },
            ] as const
          ).map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`inline-flex items-center gap-2 px-5 py-2 rounded-lg text-sm sm:text-base font-medium transition-colors ${
                view === t.key
                  ? 'bg-white text-sage-700 shadow-sm'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              <Icon name={t.icon} />
              {t.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <ToolbarButton
            icon="sparkles"
            label="AI 生成"
            primary
            onClick={() => setAiOpen(true)}
          />
          <ToolbarButton
            icon="file-import"
            label="导入简历"
            onClick={() => setImportOpen(true)}
          />
          <ToolbarButton
            icon="upload"
            label="导入备份"
            onClick={() => backupInputRef.current?.click()}
          />
        </div>
      </div>
      <input
        ref={backupInputRef}
        type="file"
        accept="application/json,.json"
        className="hidden"
        onChange={handleBackupFile}
      />

      {contentStatus === 'loading' ? (
        <div className="text-center py-16 text-gray-400">
          <Icon name="spinner" spin className="text-3xl mb-4 text-sage-500" />
          <p>正在加载简历数据…</p>
        </div>
      ) : contentStatus === 'error' ? (
        <div className="text-center py-16">
          <Icon
            name="exclamation-triangle"
            className="text-4xl mb-4 text-red-400"
          />
          <p className="mb-1 text-gray-600">简历数据加载失败</p>
          <p className="mb-4 text-sm text-gray-400">{contentError}</p>
          <button
            onClick={() => loadContent()}
            className="inline-flex items-center gap-2 rounded-lg bg-sage-600 px-4 py-2 text-sm font-medium text-white hover:bg-sage-700"
          >
            <Icon name="sync-alt" />
            重试
          </button>
        </div>
      ) : view === 'catalog' ? (
        <ResumeCatalog
          resumeCategory={resumeCategory}
          onArticleClick={onArticleClick}
          onPaperClick={onPaperClick}
          onInternshipClick={onInternshipClick}
        />
      ) : allResumes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Icon name="file-alt" className="text-4xl mb-4" />
          <p>
            {DATA_SOURCE
              ? '数据仓库暂无简历，发布一份后即可在这里展示。'
              : '还没有简历，用右上角「AI 生成」或「导入简历」创建第一份。'}
          </p>
        </div>
      ) : (
        <div>
          {fromCache && (
            <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-500">
              <Icon name="wifi-off" className="shrink-0" />
              <span>网络不可用，当前展示本机离线缓存的数据。</span>
            </div>
          )}
          {/* 简历横排：多份简历切换（含 AI 翻译生成的英文版草稿）*/}
          <div className="mb-5 flex flex-wrap gap-3">
            {allResumes.map((r) => {
              const active = r.id === selectedId;
              const edited = hydrated && isDirty(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => {
                    setActiveId(r.id);
                    setEditing(true);
                  }}
                  title="点击进入编辑"
                  className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base flex items-center ${
                    active
                      ? 'bg-sage-600 text-white shadow-lg'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm'
                  }`}
                >
                  <Icon name="file-alt" className="mr-2" />
                  {r.label}
                  {edited && (
                    <span
                      className={`ml-2 text-xs px-1.5 py-0.5 rounded ${
                        active
                          ? 'bg-white/25 text-white'
                          : 'bg-amber-100 text-amber-700'
                      }`}
                    >
                      未发布
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {hasDraft && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5 text-sm text-amber-800">
              <Icon name="exclamation-triangle" className="mt-0.5 shrink-0" />
              <span>
                当前简历有<strong>本地修改</strong>（已自动保存在本浏览器）。点上方
                <strong>简历卡片</strong>进入编辑器，可发布到线上、导出 PDF /
                Word / 数据，或重置为已发布版本。
              </span>
            </div>
          )}

          {/* A4 预览（真·多页；打印时单独输出为 PDF）。
              PreviewFit：可用宽度不足一页 A4 时等比缩小，小屏也不被裁切。 */}
          {current && (
            <PreviewFit className="rounded-2xl border border-gray-200 shadow-sm overflow-auto bg-gray-100 p-4 sm:p-8">
              <ResumeDocument id="resume-print" data={current} />
            </PreviewFit>
          )}
        </div>
      )}

      {/* 编辑器（左右双栏）*/}
      {editing && current && selectedId && (
        <Suspense fallback={null}>
          <ResumeEditor
            resumeId={selectedId}
            published={published ?? current}
            onClose={() => setEditing(false)}
          />
        </Suspense>
      )}

      {/* AI 生成入口 */}
      {aiOpen && current && selectedId && (
        <Suspense fallback={null}>
          <AiGeneratePanel
            resumeId={selectedId}
            baseData={current}
            onClose={() => setAiOpen(false)}
          />
        </Suspense>
      )}

      {/* AI 导入：粘贴任意简历文本 → 结构化新草稿 */}
      {importOpen && (
        <Suspense fallback={null}>
          <AiImportPanel onClose={() => setImportOpen(false)} />
        </Suspense>
      )}

      {/* 备份导入反馈 */}
      {backupToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900 text-white text-sm shadow-lg">
          <Icon
            name={backupToast.startsWith('导入成功') ? 'check' : 'exclamation-triangle'}
          />
          {backupToast}
        </div>
      )}
    </div>
  );
};

export default ResumeSection;
