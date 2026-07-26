import React, { useEffect, useState, useMemo, lazy, Suspense } from 'react';
import Icon from './Icon';
import ResumeCatalog from './ResumeCatalog';
import ResumeDocument from './resume/ResumeDocument';
import PreviewFit from './resume/PreviewFit';
import { migrateResume, normalizeResume } from './resume/resumeIo';
import { resumes } from '../data/content';
import { useResumeStore } from '../store/useResumeStore';
import type { Project, Publication, Internship } from '../types';
import type { ResumeData } from '../types/resume';

// 编辑器 / AI 面板仅在打开时才需要，按需加载（并避免进入 SSG 预渲染树）
const ResumeEditor = lazy(() => import('./resume/ResumeEditor'));
const AiGeneratePanel = lazy(() => import('./resume/AiGeneratePanel'));
const AiTranslatePanel = lazy(() => import('./resume/AiTranslatePanel'));
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
  const [translateOpen, setTranslateOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  const drafts = useResumeStore((s) => s.drafts);
  const publishedMap = useResumeStore((s) => s.published);
  const hydrated = useResumeStore((s) => s.hydrated);
  const activeId = useResumeStore((s) => s.activeId);
  const setActiveId = useResumeStore((s) => s.setActiveId);
  const setHydrated = useResumeStore((s) => s.setHydrated);

  // 水合后再从 localStorage 载入草稿，避免预渲染 / 水合不一致
  useEffect(() => {
    useResumeStore.persist.rehydrate();
    setHydrated(true);
  }, [setHydrated]);

  // 草稿型简历：仅存在于本地草稿、不在 content/resumes 里（如 AI 翻译生成的英文版）。
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

  return (
    <div>
      {/* 一级切换：我的简历 / 详细经历 */}
      <div className="mb-8 inline-flex rounded-xl bg-gray-100 p-1">
        {(
          [
            { key: 'resume', label: '我的简历', icon: 'file-alt' },
            { key: 'catalog', label: '详细经历', icon: 'folder-open' },
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

      {view === 'catalog' ? (
        <ResumeCatalog
          resumeCategory={resumeCategory}
          onArticleClick={onArticleClick}
          onPaperClick={onPaperClick}
          onInternshipClick={onInternshipClick}
        />
      ) : resumes.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <Icon name="file-alt" className="text-4xl mb-4" />
          <p>暂无简历，请在 content/resumes/ 添加一份 YAML。</p>
        </div>
      ) : (
        <div>
          {/* 简历横排：多份简历切换（含 AI 翻译生成的英文版草稿）*/}
          <div className="mb-5 flex flex-wrap gap-3">
            {allResumes.map((r) => {
              const active = r.id === selectedId;
              const edited = hydrated && isDirty(r.id);
              return (
                <button
                  key={r.id}
                  onClick={() => setActiveId(r.id)}
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

          {/* 工具条：文档级操作（发布 / 导出 / 重置）在编辑器工具栏内，这里只保留创建级入口 */}
          <div className="mb-5 flex flex-wrap items-center gap-3">
            <ToolbarButton
              icon="edit"
              label="编辑"
              primary
              onClick={() => setEditing(true)}
            />
            <ToolbarButton
              icon="sparkles"
              label="AI 生成"
              onClick={() => setAiOpen(true)}
            />
            <ToolbarButton
              icon="language"
              label="翻译成英文"
              onClick={() => setTranslateOpen(true)}
            />
            <ToolbarButton
              icon="file-import"
              label="导入简历"
              onClick={() => setImportOpen(true)}
            />
          </div>

          {hasDraft && (
            <div className="mb-4 flex items-start gap-2 rounded-lg bg-amber-50 border border-amber-100 px-4 py-2.5 text-sm text-amber-800">
              <Icon name="exclamation-triangle" className="mt-0.5 shrink-0" />
              <span>
                当前简历有<strong>本地修改</strong>（已自动保存在本浏览器）。点
                <strong>「编辑」</strong>进入编辑器，可发布到线上、导出 PDF /
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

      {/* 编辑器（超级简历式双栏）*/}
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

      {/* AI 翻译 / 中英双版 */}
      {translateOpen && current && selectedId && (
        <Suspense fallback={null}>
          <AiTranslatePanel
            resumeId={selectedId}
            baseData={current}
            onClose={() => setTranslateOpen(false)}
          />
        </Suspense>
      )}

      {/* AI 导入：粘贴任意简历文本 → 结构化新草稿 */}
      {importOpen && (
        <Suspense fallback={null}>
          <AiImportPanel onClose={() => setImportOpen(false)} />
        </Suspense>
      )}
    </div>
  );
};

export default ResumeSection;
