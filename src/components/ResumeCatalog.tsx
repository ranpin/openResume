import React from 'react';
import { usePortfolioStore } from '../store/usePortfolioStore';
import { useContentStore } from '../store/useContentStore';
import Icon from './Icon';
import ProjectCover from './ProjectCover';
import { visibleProjects } from '../utils/presentationMode';
import type { Project, Publication, Internship, ProjectResult } from '../types';

// 「作品集」目录：项目 / 论文 / 实习 / 荣誉 四个分类。
// 项目以程序化封面卡片网格呈现（精选项目置顶为 hero 卡），作为简历背后的详细佐证。

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

const EmptyState: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <div className="text-center py-12 text-gray-500">
    <Icon name={icon} className="text-4xl mb-4" />
    <p>{text}</p>
  </div>
);

const TagChips: React.FC<{ tags?: string[]; tone?: 'sage' | 'violet' }> = ({
  tags,
  tone = 'sage',
}) =>
  tags && tags.length > 0 ? (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag, i) => (
        <span
          key={`${tag}-${i}`}
          className={
            tone === 'violet'
              ? 'rounded-full bg-violet-50 px-2 py-0.5 text-[11px] font-medium text-violet-600 ring-1 ring-inset ring-violet-200/70'
              : 'rounded-full bg-sage-50 px-2 py-0.5 text-[11px] font-medium text-sage-600 ring-1 ring-inset ring-sage-200/70'
          }
        >
          {tag}
        </span>
      ))}
    </div>
  ) : null;

const MetricChips: React.FC<{ results?: ProjectResult[] }> = ({ results }) =>
  results && results.length > 0 ? (
    <div className="flex flex-wrap gap-1.5">
      {results.slice(0, 2).map((r, i) => (
        <span
          key={i}
          className="inline-flex items-baseline gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] text-emerald-700"
        >
          <span className="font-bold">{r.value}</span>
          <span className="text-emerald-600/80">{r.metric}</span>
        </span>
      ))}
    </div>
  ) : null;

const ResumeCatalog: React.FC<ResumeCatalogProps> = ({
  resumeCategory,
  onArticleClick,
  onPaperClick,
  onInternshipClick,
}) => {
  const {
    projects: allProjects,
    publications,
    internships,
    honors,
  } = useContentStore();
  // 演示模式（?mode=present）下仅保留显式 public 项目；缺省完整模式原样展示
  const projects = visibleProjects(allProjects);
  const setResumeCategory = usePortfolioStore((s) => s.setResumeCategory);

  // 空分类不显示 Tab（论文当前恒为空，避免出现点了什么都没有的标签）
  const counts: Record<string, number> = {
    projects: projects.length,
    publications: publications.length,
    internships: internships.length,
    honors: honors.length,
  };
  const visibleTabs = TABS.filter((t) => counts[t.key] > 0);

  const featured = projects.filter((p) => p.featured);
  const rest = projects.filter((p) => !p.featured);

  return (
    <div>
      {/* 分类切换 Tab */}
      <div className="mb-8 flex flex-wrap gap-3">
        {visibleTabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setResumeCategory(tab.key)}
            className={`px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-medium transition-all duration-200 text-sm sm:text-base flex items-center ${
              resumeCategory === tab.key
                ? 'bg-sage-600 text-white shadow-lg'
                : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200 shadow-sm'
            }`}
          >
            <Icon name={tab.icon} className="mr-2" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* 项目经历：精选 hero + 卡片网格 */}
      {resumeCategory === 'projects' &&
        (projects.length === 0 ? (
          <EmptyState icon="code" text="暂无项目数据" />
        ) : (
          <div className="space-y-8">
            {featured.length > 0 && (
              <div className="space-y-6">
                {featured.map((project, i) => (
                  <article
                    key={project.id || `featured-${i}`}
                    onClick={() => onArticleClick(project)}
                    className="group animate-card-in cursor-pointer overflow-hidden rounded-2xl border border-warm-200 bg-white shadow-sm transition-all duration-300 hover:shadow-xl motion-reduce:animate-none"
                    style={{ animationDelay: `${i * 80}ms` }}
                  >
                    <div className="grid md:grid-cols-5">
                      <div className="relative overflow-hidden md:col-span-2">
                        <ProjectCover
                          project={project}
                          index={i + 1}
                          className="h-52 w-full transition-transform duration-500 group-hover:scale-105 md:h-full md:min-h-[248px]"
                        />
                      </div>
                      <div className="flex flex-col justify-center p-6 md:col-span-3 md:p-8">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full bg-sage-100 px-2.5 py-0.5 text-[11px] font-semibold text-sage-700">
                            <Icon name="star" className="h-3 w-3" />
                            精选
                          </span>
                          {project.period && (
                            <span className="font-mono text-xs text-warm-500">{project.period}</span>
                          )}
                        </div>
                        <h3 className="font-serif text-2xl font-bold leading-tight text-gray-900 transition-colors group-hover:text-sage-700">
                          {project.title}
                        </h3>
                        <p className="mt-3 text-sm leading-relaxed text-warm-600 line-clamp-3">
                          {project.description}
                        </p>
                        <div className="mt-4 space-y-2">
                          <TagChips tags={project.tags} />
                          <MetricChips results={project.results} />
                        </div>
                        <span className="mt-5 inline-flex items-center gap-1 text-sm font-medium text-sage-600">
                          查看详情
                          <Icon
                            name="arrow-right"
                            className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1"
                          />
                        </span>
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}

            <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
              {rest.map((project, i) => (
                <article
                  key={project.id || `project-${i}`}
                  onClick={() => onArticleClick(project)}
                  className="group animate-card-in flex cursor-pointer flex-col overflow-hidden rounded-2xl border border-warm-200 bg-white shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl motion-reduce:animate-none motion-reduce:transition-none"
                  style={{ animationDelay: `${(featured.length + i) * 70}ms` }}
                >
                  <div className="relative overflow-hidden">
                    <ProjectCover
                      project={project}
                      index={featured.length + i + 1}
                      className="aspect-[16/9] w-full transition-transform duration-500 group-hover:scale-105"
                    />
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    {project.period && (
                      <div className="mb-1.5 font-mono text-[11px] text-warm-500">{project.period}</div>
                    )}
                    <h3 className="font-serif text-lg font-bold leading-snug text-gray-900 transition-colors group-hover:text-sage-700">
                      {project.title}
                    </h3>
                    <p className="mt-2 text-sm leading-relaxed text-warm-600 line-clamp-2">
                      {project.description}
                    </p>
                    <div className="mt-auto space-y-2 pt-4">
                      <TagChips tags={project.tags} />
                      <MetricChips results={project.results} />
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </div>
        ))}

      {/* 论文发表 */}
      {resumeCategory === 'publications' &&
        (publications.length === 0 ? (
          <EmptyState icon="file-alt" text="暂无学术论文" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {publications.map((paper, index) => (
              <div
                key={paper.id || index}
                onClick={() => onPaperClick(paper)}
                className="group animate-card-in cursor-pointer rounded-2xl border border-warm-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:animate-none"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <h3 className="font-serif text-lg font-bold text-gray-900 mb-2 group-hover:text-sage-700 transition-colors">
                  {paper.title}
                </h3>
                <div className="text-xs text-warm-500 mb-3">
                  {paper.authors && <span>{paper.authors}</span>}
                  {paper.venue && <span> · {paper.venue}</span>}
                  {paper.year && <span> · {paper.year}</span>}
                </div>
                {paper.abstract && (
                  <p className="text-sm leading-relaxed text-warm-600 line-clamp-3">{paper.abstract}</p>
                )}
              </div>
            ))}
          </div>
        ))}

      {/* 实习经历 */}
      {resumeCategory === 'internships' &&
        (internships.length === 0 ? (
          <EmptyState icon="briefcase" text="暂无工作经历" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {internships.map((internship, index) => (
              <div
                key={internship.id || index}
                onClick={() => onInternshipClick(internship)}
                className="group animate-card-in cursor-pointer rounded-2xl border border-warm-200 bg-white p-6 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-lg motion-reduce:animate-none"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <h3 className="font-serif text-lg font-bold text-gray-900 transition-colors group-hover:text-sage-700">
                    {internship.position || internship.role}{' '}
                    <span className="text-warm-400">@</span> {internship.company}
                  </h3>
                  {internship.type && (
                    <span className="shrink-0 rounded-full bg-violet-50 px-2.5 py-0.5 text-[11px] font-medium text-violet-600">
                      {internship.type}
                    </span>
                  )}
                </div>
                <div className="font-mono text-xs text-warm-500 mb-3">
                  {internship.period || internship.duration}
                  {internship.location && <span> · {internship.location}</span>}
                </div>
                <p className="text-sm leading-relaxed text-warm-600 mb-3">{internship.description}</p>
                <TagChips tags={internship.skills} tone="violet" />
              </div>
            ))}
          </div>
        ))}

      {/* 荣誉奖项 */}
      {resumeCategory === 'honors' &&
        (honors.length === 0 ? (
          <EmptyState icon="trophy" text="暂无荣誉奖项" />
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {honors.map((honor, index) => (
              <div
                key={honor.id || index}
                className="animate-card-in rounded-2xl border border-warm-200 bg-white p-6 shadow-sm transition-all duration-300 hover:shadow-md motion-reduce:animate-none"
                style={{ animationDelay: `${index * 70}ms` }}
              >
                <div className="flex items-start gap-3">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-50 text-amber-500">
                    <Icon name="trophy" className="h-5 w-5" />
                  </span>
                  <div className="min-w-0">
                    <h3 className="font-serif text-lg font-bold text-gray-900">
                      {honor.award || honor.title}
                    </h3>
                    <div className="text-xs text-warm-500">
                      {honor.organization || honor.issuer}
                      {honor.year && <span> · {honor.year}</span>}
                    </div>
                    {honor.description && (
                      <p className="mt-2 text-sm leading-relaxed text-warm-600">{honor.description}</p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ))}
    </div>
  );
};

export default ResumeCatalog;
