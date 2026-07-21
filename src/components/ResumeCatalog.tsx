import React from 'react';
import { usePortfolioStore } from '../store/usePortfolioStore';
import Icon from './Icon';
import type { Project, Publication, Internship } from '../types';

// 「详细经历」目录：项目 / 论文 / 实习 / 荣誉 四个分类。
// 由原 ResumeSection 平移而来，行为不变，作为简历背后的详细佐证。

interface ResumeCatalogProps {
  resumeCategory: string;
  onArticleClick: (article: Project) => void;
  onPaperClick: (paper: Publication) => void;
  onInternshipClick: (internship: Internship) => void;
}

const TABS = [
  { key: 'projects', label: '项目经历', icon: 'code' },
  { key: 'publications', label: '论文发表', icon: 'file-alt' },
  { key: 'internships', label: '实习经历', icon: 'briefcase' },
  { key: 'honors', label: '荣誉奖项', icon: 'trophy' },
];

const EmptyState: React.FC<{ icon: string; text: string }> = ({
  icon,
  text,
}) => (
  <div className="text-center py-12 text-gray-500">
    <Icon name={icon} className="text-4xl mb-4" />
    <p>{text}</p>
  </div>
);

const ResumeCatalog: React.FC<ResumeCatalogProps> = ({
  resumeCategory,
  onArticleClick,
  onPaperClick,
  onInternshipClick,
}) => {
  const { projects, publications, internships, honors } = usePortfolioStore();
  const setResumeCategory = usePortfolioStore((s) => s.setResumeCategory);

  return (
    <div>
      {/* 分类切换 Tab */}
      <div className="mb-8 flex flex-wrap gap-3">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setResumeCategory(tab.key)}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base flex items-center ${
              resumeCategory === tab.key
                ? 'bg-blue-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm'
            }`}
          >
            <Icon name={tab.icon} className="mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 项目经历 */}
      {resumeCategory === 'projects' && (
        <div className="space-y-4">
          {projects.map((project, index) => (
            <div
              key={project.id || index}
              onClick={() => onArticleClick(project)}
              className="border-l-4 border-blue-500 pl-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer rounded-r-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="text-lg font-medium text-gray-800 hover:text-blue-600 transition-colors">
                      {project.title}
                    </h3>
                    {project.status && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {project.status}
                      </span>
                    )}
                  </div>
                  {project.period && (
                    <div className="text-sm text-gray-500 mb-2 font-mono">
                      {project.period}
                    </div>
                  )}
                </div>
                <Icon
                  name="chevron-right"
                  className="text-gray-300 text-sm mt-1"
                />
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                {project.description}
              </p>
              {project.results && project.results.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {project.results.slice(0, 2).map((r, i) => (
                    <span
                      key={i}
                      className="inline-flex items-baseline gap-1.5 px-2.5 py-1 bg-green-50 text-green-700 rounded-md text-xs"
                    >
                      <span className="font-bold">{r.value}</span>
                      <span className="text-green-600/80">{r.metric}</span>
                    </span>
                  ))}
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                {(project.tags || []).map((tag, i) => (
                  <span
                    key={`${tag}-${i}`}
                    className="px-2 py-1 bg-blue-100 text-blue-700 rounded text-xs font-medium"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {projects.length === 0 && (
            <EmptyState icon="code" text="暂无项目数据" />
          )}
        </div>
      )}

      {/* 论文发表 */}
      {resumeCategory === 'publications' && (
        <div className="space-y-4">
          {publications.map((paper, index) => (
            <div
              key={paper.id || index}
              onClick={() => onPaperClick(paper)}
              className="border-l-4 border-green-500 pl-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer rounded-r-lg"
            >
              <h3 className="text-lg font-medium text-gray-800 mb-1">
                {paper.title}
              </h3>
              <div className="text-sm text-gray-600 mb-2">
                {paper.authors && <span>{paper.authors}</span>}
                {paper.venue && <span> • {paper.venue}</span>}
                {paper.year && <span> • {paper.year}</span>}
              </div>
              {paper.abstract && (
                <p className="text-gray-600 text-sm leading-relaxed">
                  {paper.abstract}
                </p>
              )}
            </div>
          ))}
          {publications.length === 0 && (
            <EmptyState icon="file-alt" text="暂无学术论文" />
          )}
        </div>
      )}

      {/* 实习经历 */}
      {resumeCategory === 'internships' && (
        <div className="space-y-4">
          {internships.map((internship, index) => (
            <div
              key={internship.id || index}
              onClick={() => onInternshipClick(internship)}
              className="border-l-4 border-purple-500 pl-6 py-4 hover:bg-gray-50 transition-colors cursor-pointer rounded-r-lg"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-1">
                    <h3 className="text-lg font-medium text-gray-800 hover:text-purple-600 transition-colors">
                      {internship.position || internship.role} @{' '}
                      {internship.company}
                    </h3>
                    {internship.type && (
                      <span className="px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700">
                        {internship.type}
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-gray-500 mb-2 font-mono">
                    {internship.period || internship.duration}
                    {internship.location && (
                      <span> • {internship.location}</span>
                    )}
                  </div>
                </div>
                <Icon
                  name="chevron-right"
                  className="text-gray-300 text-sm mt-1"
                />
              </div>
              <p className="text-gray-600 text-sm leading-relaxed mb-3">
                {internship.description}
              </p>
              <div className="flex flex-wrap gap-2">
                {(internship.skills || []).map((skill, i) => (
                  <span
                    key={`${skill}-${i}`}
                    className="px-2 py-1 bg-purple-100 text-purple-700 rounded text-xs font-medium"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {internships.length === 0 && (
            <EmptyState icon="briefcase" text="暂无工作经历" />
          )}
        </div>
      )}

      {/* 荣誉奖项 */}
      {resumeCategory === 'honors' && (
        <div className="space-y-4">
          {honors.map((honor, index) => (
            <div
              key={honor.id || index}
              className="border-l-4 border-yellow-500 pl-6 py-4 hover:bg-gray-50 transition-colors rounded-r-lg"
            >
              <div className="flex items-center space-x-3 mb-1">
                <h3 className="text-lg font-medium text-gray-800">
                  {honor.award || honor.title}
                </h3>
              </div>
              <div className="text-sm text-gray-600">
                {honor.organization || honor.issuer}
                {honor.year && <span> • {honor.year}</span>}
              </div>
              {honor.description && (
                <p className="text-gray-600 text-sm leading-relaxed mt-2">
                  {honor.description}
                </p>
              )}
            </div>
          ))}
          {honors.length === 0 && (
            <EmptyState icon="trophy" text="暂无荣誉奖项" />
          )}
        </div>
      )}
    </div>
  );
};

export default ResumeCatalog;
