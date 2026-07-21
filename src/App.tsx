import { useState, lazy, Suspense } from 'react';
import ResumeSection from './components/ResumeSection';
import Icon from './components/Icon';
import { usePortfolioStore } from './store/usePortfolioStore';
import type { Project, Publication, Internship, ContentItem } from './types';

// 经历库详情弹窗仅在打开时才需要（含 Markdown + 代码高亮），按需加载
const GlobalModals = lazy(() => import('./components/GlobalModals'));

// 简历中心（独立应用）。主站以入口卡片链接到这里（ranpin.github.io/resume/）。
const MAIN_SITE = 'https://ranpin.github.io/';

const App = () => {
  const resumeCategory = usePortfolioStore((s) => s.resumeCategory);
  // 被主站以 iframe 内嵌时，隐藏自身页头/页脚（由主站导航提供），呈现更无缝
  const embedded = typeof window !== 'undefined' && window.self !== window.top;

  // 经历库详情弹窗的选中项
  const [selectedArticle, setSelectedArticle] = useState<Project | null>(null);
  const [selectedPaper, setSelectedPaper] = useState<Publication | null>(null);
  const [selectedInternship, setSelectedInternship] =
    useState<Internship | null>(null);

  const handleRecommendClick = (item: ContentItem, type: string) => {
    const t = type.toLowerCase();
    if (t === 'project') setSelectedArticle(item as Project);
    else if (t === 'publication') setSelectedPaper(item as Publication);
    else if (t === 'internship') setSelectedInternship(item as Internship);
  };

  const anyModalOpen = selectedArticle || selectedPaper || selectedInternship;

  return (
    // 被主站内嵌时不撑满视口（高度由主站按内容自适应）；独立访问时占满整屏
    <div
      className={`${embedded ? '' : 'min-h-screen '}flex flex-col bg-gray-50`}
    >
      {!embedded && (
        <header className="bg-white shadow-sm border-b sticky top-0 z-40">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-2 font-bold text-gray-900">
              <Icon name="file-alt" className="text-blue-600" />
              简历中心
            </div>
            <a
              href={MAIN_SITE}
              className="text-sm text-gray-600 hover:text-blue-600 inline-flex items-center gap-1.5"
            >
              <Icon name="home" />
              返回主站
            </a>
          </div>
        </header>
      )}

      <main className="container mx-auto px-4 py-8 flex-1">
        <ResumeSection
          resumeCategory={resumeCategory}
          onArticleClick={(p) => setSelectedArticle(p)}
          onPaperClick={(p) => setSelectedPaper(p)}
          onInternshipClick={(i) => setSelectedInternship(i)}
        />
      </main>

      {!embedded && (
        <footer className="border-t bg-white py-6 text-center text-sm text-gray-400">
          © Ranpin · 简历中心 ·{' '}
          <a href={MAIN_SITE} className="hover:text-blue-600">
            ranpin.github.io
          </a>
        </footer>
      )}

      {anyModalOpen && (
        <Suspense fallback={null}>
          <GlobalModals
            selectedArticle={selectedArticle}
            selectedPaper={selectedPaper}
            selectedInternship={selectedInternship}
            onCloseArticle={() => setSelectedArticle(null)}
            onClosePaper={() => setSelectedPaper(null)}
            onCloseInternship={() => setSelectedInternship(null)}
            onRecommendClick={handleRecommendClick}
          />
        </Suspense>
      )}
    </div>
  );
};

export default App;
