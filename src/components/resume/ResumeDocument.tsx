import React from 'react';
import Icon from '../Icon';
import RichText from './RichText';
import Paginator, { type Block } from './Paginator';
import { THEMES, type ThemeClasses } from './resumeTheme';
import { resolveSections, type ResolvedSection } from './resumeSections';
import type {
  ResumeData,
  ResumeBasics,
  ResumeEducation,
  ResumeWork,
  ResumeProject,
  ResumeSkill,
  ResumeAward,
  ResumeSettings,
} from '../../types/resume';

/**
 * 纯展示组件：把 ResumeData 渲染成 A4 简历。
 * - classic / compact（单栏）：真·多页分页（屏幕 Paginator；打印用连续文档 + CSS 分页）。
 * - sidebar（双栏彩色侧边）：单张 A4 版式。
 * 支持多配色主题；正文富文本（RichText）；证件照；全局排版设置（字号/行距/间距/页边距）；
 * 模块顺序 / 自定义标题 / 显隐（见 resumeSections）；工作经历可内嵌多个子项目。
 * 传 id="resume-print" 的实例的连续文档会被打印样式选中并输出为 PDF。
 */

interface ResumeDocumentProps {
  data: ResumeData;
  id?: string;
  className?: string;
}

const clean = (arr?: string[]) => (arr || []).filter((s) => s && s.trim());
const LIST_MARKER = /^\s*([-*+]|\d+[.)]|>|#{1,6})\s/;

// 把 settings 折算成简历根节点的内联 CSS 变量（供 .resume-root 下所有 rs-* 类使用）
const rootVars = (s?: ResumeSettings): React.CSSProperties =>
  ({
    '--rs-scale': s?.fontScale ?? 1,
    '--rs-lh': s?.lineHeight ?? 1.6,
    '--rs-gap': `${s?.blockGap ?? 16}px`,
  }) as React.CSSProperties;

const SectionTitle: React.FC<{
  icon: string;
  theme: ThemeClasses;
  onDark?: boolean;
  children: React.ReactNode;
}> = ({ icon, theme, onDark, children }) =>
  onDark ? (
    <h2 className="rs-h2-dark flex items-center gap-2 font-bold uppercase tracking-wide text-white/90 border-b border-white/30 pb-1 mb-2">
      <Icon name={icon} />
      {children}
    </h2>
  ) : (
    <h2
      className={`rs-h2 flex items-center gap-2 font-bold tracking-wide text-gray-900 border-b-2 ${theme.ruleBorder} pb-1 mb-3`}
    >
      <Icon name={icon} className={theme.icon} />
      {children}
    </h2>
  );

const ContactList: React.FC<{
  basics: ResumeBasics;
  onDark?: boolean;
  align?: 'center' | 'left';
}> = ({ basics, onDark, align = 'center' }) => {
  const items: { icon: string; text: string; href?: string }[] = [];
  if (basics.email)
    items.push({
      icon: 'envelope',
      text: basics.email,
      href: `mailto:${basics.email}`,
    });
  if (basics.phone) items.push({ icon: 'phone', text: basics.phone });
  if (basics.location)
    items.push({ icon: 'map-marker-alt', text: basics.location });
  if (basics.github)
    items.push({
      icon: 'github',
      text: basics.github.replace(/^https?:\/\//, ''),
      href: basics.github,
    });
  if (basics.website)
    items.push({
      icon: 'external-link-alt',
      text: basics.website.replace(/^https?:\/\//, ''),
      href: basics.website,
    });

  return (
    <div
      className={
        onDark
          ? 'rs-meta flex flex-col gap-1.5 text-white/90'
          : `rs-body flex flex-wrap items-center gap-x-5 gap-y-1 ${
              align === 'left' ? 'justify-start' : 'justify-center'
            }`
      }
    >
      {items.map((it, i) => {
        const inner = (
          <span
            className={`inline-flex items-center gap-1 ${
              onDark ? 'text-white/90' : 'text-gray-600'
            }`}
          >
            <Icon
              name={it.icon}
              className={onDark ? 'text-white/70' : 'text-gray-400'}
            />
            <span className="break-all">{it.text}</span>
          </span>
        );
        return it.href ? (
          <a
            key={i}
            href={it.href}
            target="_blank"
            rel="noreferrer"
            className={onDark ? 'hover:text-white' : 'hover:text-blue-600'}
          >
            {inner}
          </a>
        ) : (
          <React.Fragment key={i}>{inner}</React.Fragment>
        );
      })}
    </div>
  );
};

// 证件照：dataURL / URL 均可；A4 上按典型证件照 3:4 比例展示
const PhotoBox: React.FC<{ src?: string; onDark?: boolean }> = ({
  src,
  onDark,
}) =>
  src ? (
    <img
      src={src}
      alt="证件照"
      className={`resume-color-exact shrink-0 w-[76px] h-[102px] object-cover rounded-sm border ${
        onDark ? 'border-white/30' : 'border-gray-200'
      }`}
    />
  ) : null;

// 要点：整块作为 Markdown 富文本渲染；未显式标记的普通行默认补成箭头列表项
const Highlights: React.FC<{ items?: string[] }> = ({ items }) => {
  const md = clean(items)
    .map((line) => (LIST_MARKER.test(line) ? line : `- ${line}`))
    .join('\n');
  return md ? <RichText className="mt-1">{md}</RichText> : null;
};

const Period: React.FC<{ text?: string }> = ({ text }) =>
  text ? (
    <span className="rs-meta font-mono text-gray-500 shrink-0">{text}</span>
  ) : null;

// --- 单条目渲染（分页与侧栏共用）---

const EduEntry: React.FC<{ e: ResumeEducation }> = ({ e }) => (
  <div className="resume-block">
    <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
      <h3 className="rs-h3 font-semibold text-gray-900 min-w-0">{e.school}</h3>
      <span className="rs-h3 font-normal text-gray-600 text-center">
        {e.college}
      </span>
      <div className="text-right whitespace-nowrap">
        <Period text={e.period} />
      </div>
    </div>
    {(e.degree || e.major || e.gpa) && (
      <div className="rs-body text-gray-600">
        {[e.degree, e.major].filter(Boolean).join(' · ')}
        {e.gpa && <span> · GPA {e.gpa}</span>}
      </div>
    )}
    {e.detail && <RichText className="mt-0.5">{e.detail}</RichText>}
  </div>
);

// 项目条目：既用于独立「项目经历」，也用于工作经历下的子项目（nested）
const ProjEntry: React.FC<{ p: ResumeProject; nested?: boolean }> = ({
  p,
  nested,
}) => (
  <div
    className={
      nested
        ? 'border-l-2 border-gray-200 pl-3'
        : 'resume-block'
    }
  >
    <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
      <h3 className="rs-h3 font-semibold text-gray-900 min-w-0">{p.name}</h3>
      <span className="rs-h3 font-normal text-gray-600 text-center">
        {p.role}
      </span>
      <div className="text-right whitespace-nowrap">
        <Period text={p.period} />
      </div>
    </div>
    {clean(p.tech).length > 0 && (
      <div className="rs-meta text-gray-500 mt-0.5">
        {clean(p.tech).join(' / ')}
      </div>
    )}
    <Highlights items={p.highlights} />
    {p.link && (
      <a
        href={p.link}
        target="_blank"
        rel="noreferrer"
        className="rs-meta inline-flex items-center gap-1 text-blue-600 hover:underline mt-1"
      >
        <Icon name="external-link-alt" />
        {p.link.replace(/^https?:\/\//, '')}
      </a>
    )}
  </div>
);

const WorkEntry: React.FC<{ w: ResumeWork }> = ({ w }) => (
  <div className="resume-block">
    <div className="grid grid-cols-[1fr_auto_1fr] items-baseline gap-3">
      <h3 className="rs-h3 font-semibold text-gray-900 min-w-0">
        {w.company}
      </h3>
      <span className="rs-h3 font-normal text-gray-600 text-center">
        {w.position}
      </span>
      <div className="text-right whitespace-nowrap">
        <Period text={w.period} />
      </div>
    </div>
    {w.location && <div className="rs-meta text-gray-500">{w.location}</div>}
    <Highlights items={w.highlights} />
    {/* 同一公司下的多个子项目 */}
    {w.projects && w.projects.length > 0 && (
      <div className="mt-2 space-y-2">
        {w.projects.map((p, i) => (
          <ProjEntry key={i} p={p} nested />
        ))}
      </div>
    )}
  </div>
);

const SkillsBlock: React.FC<{
  items: ResumeSkill[];
  theme: ThemeClasses;
  title: string;
  onDark?: boolean;
}> = ({ items, theme, title, onDark }) => (
  <section>
    <SectionTitle icon="cogs" theme={theme} onDark={onDark}>
      {title}
    </SectionTitle>
    <div className="space-y-1.5">
      {items.map((s, i) => (
        <div
          key={i}
          className={`resume-block rs-body ${
            onDark ? 'text-white/90' : 'text-gray-700'
          }`}
        >
          {s.category && (
            <span
              className={`font-semibold ${onDark ? 'text-white' : 'text-gray-900'}`}
            >
              {s.category}：
            </span>
          )}
          {clean(s.items).join('、')}
        </div>
      ))}
    </div>
  </section>
);

const AwardsBlock: React.FC<{
  items: ResumeAward[];
  theme: ThemeClasses;
  title: string;
  onDark?: boolean;
}> = ({ items, theme, title, onDark }) => (
  <section>
    <SectionTitle icon="trophy" theme={theme} onDark={onDark}>
      {title}
    </SectionTitle>
    <ul className={`rs-body space-y-1 ${onDark ? 'text-white/90' : 'text-gray-700'}`}>
      {items.map((a, i) => (
        <li
          key={i}
          className={`resume-block ${
            onDark ? '' : 'flex items-baseline justify-between gap-3'
          }`}
        >
          <span>
            {a.title}
            {a.issuer && (
              <span className={onDark ? 'text-white/70' : 'text-gray-500'}>
                {' '}
                · {a.issuer}
              </span>
            )}
          </span>
          {a.date &&
            (onDark ? (
              <span className="rs-meta text-white/60"> （{a.date}）</span>
            ) : (
              <Period text={a.date} />
            ))}
        </li>
      ))}
    </ul>
  </section>
);

const SummaryBlock: React.FC<{
  summary: string;
  theme: ThemeClasses;
  title: string;
}> = ({ summary, theme, title }) => (
  <section className="resume-block">
    <SectionTitle icon="user" theme={theme}>
      {title}
    </SectionTitle>
    <RichText>{summary}</RichText>
  </section>
);

const SingleHeader: React.FC<{
  basics: ResumeBasics;
  theme: ThemeClasses;
}> = ({ basics, theme }) => {
  const hasPhoto = !!basics.photo;
  return (
    <header
      className={`resume-block border-b border-gray-200 pb-4 ${
        hasPhoto ? 'flex items-center gap-5 text-left' : 'text-center'
      }`}
    >
      <div className={hasPhoto ? 'flex-1 min-w-0' : ''}>
        <h1 className="rs-name font-bold text-gray-900">{basics.name}</h1>
        {basics.title && (
          <p className={`rs-title mt-1 font-medium ${theme.title}`}>
            {basics.title}
          </p>
        )}
        <div className="mt-3">
          <ContactList basics={basics} align={hasPhoto ? 'left' : 'center'} />
        </div>
      </div>
      {hasPhoto && <PhotoBox src={basics.photo} />}
    </header>
  );
};

// --- 单栏：按模块配置构建可分页的内容块 ---

const buildBlocks = (
  data: ResumeData,
  theme: ThemeClasses,
  sections: ResolvedSection[],
): Block[] => {
  const blocks: Block[] = [];
  blocks.push({
    key: 'header',
    node: <SingleHeader basics={data.basics} theme={theme} />,
  });

  // 一个「多条目」分区：首块带标题，其余条目各成一块（便于跨页）
  const addListSection = <T,>(
    k: string,
    icon: string,
    title: string,
    items: T[] | undefined,
    Entry: React.FC<{ item: T }>,
  ) => {
    if (!items || items.length === 0) return;
    blocks.push({
      key: `${k}-0`,
      node: (
        <section>
          <SectionTitle icon={icon} theme={theme}>
            {title}
          </SectionTitle>
          <Entry item={items[0]} />
        </section>
      ),
    });
    for (let i = 1; i < items.length; i++) {
      blocks.push({ key: `${k}-${i}`, node: <Entry item={items[i]} /> });
    }
  };

  sections.forEach((sec) => {
    if (sec.hidden) return;
    switch (sec.key) {
      case 'summary':
        if (data.basics.summary)
          blocks.push({
            key: 'summary',
            node: (
              <SummaryBlock
                summary={data.basics.summary}
                theme={theme}
                title={sec.title}
              />
            ),
          });
        break;
      case 'education':
        addListSection('edu', sec.icon, sec.title, data.education, ({ item }) => (
          <EduEntry e={item} />
        ));
        break;
      case 'work':
        addListSection('work', sec.icon, sec.title, data.work, ({ item }) => (
          <WorkEntry w={item} />
        ));
        break;
      case 'projects':
        addListSection('proj', sec.icon, sec.title, data.projects, ({ item }) => (
          <ProjEntry p={item} />
        ));
        break;
      case 'skills':
        if (data.skills && data.skills.length > 0)
          blocks.push({
            key: 'skills',
            node: (
              <SkillsBlock items={data.skills} theme={theme} title={sec.title} />
            ),
          });
        break;
      case 'awards':
        if (data.awards && data.awards.length > 0)
          blocks.push({
            key: 'awards',
            node: (
              <AwardsBlock items={data.awards} theme={theme} title={sec.title} />
            ),
          });
        break;
    }
  });

  return blocks;
};

// --- 双栏侧边模板（单张 A4）---
// 侧栏放：联系方式 + 技能 + 荣誉；主栏放：简介 + 教育/工作/项目。
// 顺序与显隐、自定义标题均遵循 resolveSections（各栏内部按解析顺序渲染）。

const SidebarLayout: React.FC<{
  data: ResumeData;
  theme: ThemeClasses;
  sections: ResolvedSection[];
}> = ({ data, theme, sections }) => {
  const { basics } = data;
  const visible = sections.filter((s) => !s.hidden);

  const asideKeys = visible.filter(
    (s) => s.key === 'skills' || s.key === 'awards',
  );
  const mainKeys = visible.filter(
    (s) => s.key !== 'skills' && s.key !== 'awards',
  );

  const renderMain = (sec: ResolvedSection) => {
    switch (sec.key) {
      case 'summary':
        return basics.summary ? (
          <SummaryBlock
            key="summary"
            summary={basics.summary}
            theme={theme}
            title={sec.title}
          />
        ) : null;
      case 'work':
        return data.work && data.work.length > 0 ? (
          <section key="work">
            <SectionTitle icon={sec.icon} theme={theme}>
              {sec.title}
            </SectionTitle>
            <div className="space-y-3">
              {data.work.map((w, i) => (
                <WorkEntry key={i} w={w} />
              ))}
            </div>
          </section>
        ) : null;
      case 'projects':
        return data.projects && data.projects.length > 0 ? (
          <section key="projects">
            <SectionTitle icon={sec.icon} theme={theme}>
              {sec.title}
            </SectionTitle>
            <div className="space-y-3">
              {data.projects.map((p, i) => (
                <ProjEntry key={i} p={p} />
              ))}
            </div>
          </section>
        ) : null;
      case 'education':
        return data.education && data.education.length > 0 ? (
          <section key="education">
            <SectionTitle icon={sec.icon} theme={theme}>
              {sec.title}
            </SectionTitle>
            <div className="space-y-3">
              {data.education.map((e, i) => (
                <EduEntry key={i} e={e} />
              ))}
            </div>
          </section>
        ) : null;
      default:
        return null;
    }
  };

  return (
    <div className="grid grid-cols-[34%_1fr]">
      <aside
        className={`${theme.sidebarBg} resume-color-exact text-white px-6 py-8`}
      >
        <div className="resume-block mb-6">
          {basics.photo && (
            <div className="mb-3">
              <PhotoBox src={basics.photo} onDark />
            </div>
          )}
          <h1 className="rs-name-sm font-bold leading-tight">{basics.name}</h1>
          {basics.title && (
            <p className="rs-meta mt-1 text-white/80">{basics.title}</p>
          )}
        </div>
        <div className="resume-block mb-6">
          <SectionTitle icon="paper-plane" theme={theme} onDark>
            联系方式
          </SectionTitle>
          <ContactList basics={basics} onDark />
        </div>
        {asideKeys.map((sec) =>
          sec.key === 'skills' && data.skills && data.skills.length > 0 ? (
            <div key="skills" className="mb-6">
              <SkillsBlock
                items={data.skills}
                theme={theme}
                title={sec.title}
                onDark
              />
            </div>
          ) : sec.key === 'awards' && data.awards && data.awards.length > 0 ? (
            <div key="awards" className="mb-6">
              <AwardsBlock
                items={data.awards}
                theme={theme}
                title={sec.title}
                onDark
              />
            </div>
          ) : null,
        )}
      </aside>

      <div className="px-8 py-8 space-y-6">
        {mainKeys.map((sec) => renderMain(sec))}
      </div>
    </div>
  );
};

const ResumeDocument: React.FC<ResumeDocumentProps> = ({
  data,
  id,
  className = '',
}) => {
  const theme = THEMES[data.theme || 'blue'];
  const template = data.template || 'classic';
  const sections = resolveSections(data.sections);
  const style = rootVars(data.settings);
  const pageMargin = data.settings?.pageMargin ?? 45;
  const dense = template === 'compact';

  if (template === 'sidebar') {
    return (
      <div
        id={id}
        style={style}
        className={`resume-root resume-page bg-white text-gray-800 mx-auto w-full max-w-[820px] ${className}`}
      >
        <SidebarLayout data={data} theme={theme} sections={sections} />
      </div>
    );
  }

  const blocks = buildBlocks(data, theme, sections);
  const signature = JSON.stringify(data);

  return (
    <div className={className}>
      {/* 打印用：连续文档（屏幕隐藏），承载 id 作为打印目标 */}
      <div
        id={id}
        style={{ ...style, padding: pageMargin }}
        className={`resume-root${
          dense ? ' dense' : ''
        } resume-print-only bg-white text-gray-800 mx-auto w-full max-w-[820px]`}
      >
        {blocks.map((b) => (
          <div key={b.key} className="rt-pageblock">
            {b.node}
          </div>
        ))}
      </div>

      {/* 屏幕用：真·多页 A4 */}
      <Paginator
        blocks={blocks}
        signature={signature}
        pad={pageMargin}
        rootStyle={style}
        dense={dense}
      />
    </div>
  );
};

export default ResumeDocument;
