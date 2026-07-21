import React from 'react';
import Icon from '../Icon';
import RichText from './RichText';
import Paginator, { type Block } from './Paginator';
import { THEMES, type ThemeClasses } from './resumeTheme';
import type {
  ResumeData,
  ResumeBasics,
  ResumeEducation,
  ResumeWork,
  ResumeProject,
  ResumeSkill,
  ResumeAward,
} from '../../types/resume';

/**
 * 纯展示组件：把 ResumeData 渲染成 A4 简历。
 * - classic / compact（单栏）：真·多页分页（屏幕 Paginator；打印用连续文档 + CSS 分页）。
 * - sidebar（双栏彩色侧边）：单张 A4 版式。
 * 支持多配色主题；正文富文本（RichText）。
 * 传 id="resume-print" 的实例的连续文档会被打印样式选中并输出为 PDF。
 */

interface ResumeDocumentProps {
  data: ResumeData;
  id?: string;
  className?: string;
}

const clean = (arr?: string[]) => (arr || []).filter((s) => s && s.trim());
const LIST_MARKER = /^\s*([-*+]|\d+[.)]|>|#{1,6})\s/;

const SectionTitle: React.FC<{
  icon: string;
  theme: ThemeClasses;
  onDark?: boolean;
  children: React.ReactNode;
}> = ({ icon, theme, onDark, children }) =>
  onDark ? (
    <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-white/90 border-b border-white/30 pb-1 mb-2">
      <Icon name={icon} />
      {children}
    </h2>
  ) : (
    <h2
      className={`flex items-center gap-2 text-[15px] font-bold tracking-wide text-gray-900 border-b-2 ${theme.ruleBorder} pb-1 mb-3`}
    >
      <Icon name={icon} className={theme.icon} />
      {children}
    </h2>
  );

const ContactList: React.FC<{ basics: ResumeBasics; onDark?: boolean }> = ({
  basics,
  onDark,
}) => {
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
          ? 'flex flex-col gap-1.5 text-[12px] text-white/90'
          : 'flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-[13px]'
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

// 要点：整块作为 Markdown 富文本渲染；未显式标记的普通行默认补成箭头列表项
const Highlights: React.FC<{ items?: string[] }> = ({ items }) => {
  const md = clean(items)
    .map((line) => (LIST_MARKER.test(line) ? line : `- ${line}`))
    .join('\n');
  return md ? <RichText className="mt-1">{md}</RichText> : null;
};

const Period: React.FC<{ text?: string }> = ({ text }) =>
  text ? (
    <span className="text-[12px] font-mono text-gray-500 shrink-0">{text}</span>
  ) : null;

// --- 单条目渲染（分页与侧栏共用）---

const EduEntry: React.FC<{ e: ResumeEducation }> = ({ e }) => (
  <div className="resume-block">
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-[14px] font-semibold text-gray-900">{e.school}</h3>
      <Period text={e.period} />
    </div>
    <div className="text-[13px] text-gray-600">
      {[e.degree, e.major].filter(Boolean).join(' · ')}
      {e.gpa && <span> · GPA {e.gpa}</span>}
    </div>
    {e.detail && <RichText className="mt-0.5">{e.detail}</RichText>}
  </div>
);

const WorkEntry: React.FC<{ w: ResumeWork }> = ({ w }) => (
  <div className="resume-block">
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-[14px] font-semibold text-gray-900">
        {w.position ? `${w.position} · ${w.company}` : w.company}
      </h3>
      <Period text={w.period} />
    </div>
    {w.location && (
      <div className="text-[12px] text-gray-500">{w.location}</div>
    )}
    <Highlights items={w.highlights} />
  </div>
);

const ProjEntry: React.FC<{ p: ResumeProject }> = ({ p }) => (
  <div className="resume-block">
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-[14px] font-semibold text-gray-900">
        {p.name}
        {p.role && (
          <span className="font-normal text-gray-600"> · {p.role}</span>
        )}
      </h3>
      <Period text={p.period} />
    </div>
    {clean(p.tech).length > 0 && (
      <div className="text-[12px] text-gray-500 mt-0.5">
        {clean(p.tech).join(' / ')}
      </div>
    )}
    <Highlights items={p.highlights} />
    {p.link && (
      <a
        href={p.link}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-1 text-[12px] text-blue-600 hover:underline mt-1"
      >
        <Icon name="external-link-alt" />
        {p.link.replace(/^https?:\/\//, '')}
      </a>
    )}
  </div>
);

const SkillsBlock: React.FC<{
  items: ResumeSkill[];
  theme: ThemeClasses;
  onDark?: boolean;
}> = ({ items, theme, onDark }) => (
  <section>
    <SectionTitle icon="cogs" theme={theme} onDark={onDark}>
      专业技能
    </SectionTitle>
    <div className="space-y-1.5">
      {items.map((s, i) => (
        <div
          key={i}
          className={`resume-block text-[13px] ${
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
  onDark?: boolean;
}> = ({ items, theme, onDark }) => (
  <section>
    <SectionTitle icon="trophy" theme={theme} onDark={onDark}>
      荣誉奖项
    </SectionTitle>
    <ul
      className={`space-y-1 text-[13px] ${onDark ? 'text-white/90' : 'text-gray-700'}`}
    >
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
              <span className="text-[12px] text-white/60"> （{a.date}）</span>
            ) : (
              <Period text={a.date} />
            ))}
        </li>
      ))}
    </ul>
  </section>
);

const SummaryBlock: React.FC<{ summary: string; theme: ThemeClasses }> = ({
  summary,
  theme,
}) => (
  <section className="resume-block">
    <SectionTitle icon="user" theme={theme}>
      个人简介
    </SectionTitle>
    <RichText>{summary}</RichText>
  </section>
);

const SingleHeader: React.FC<{
  basics: ResumeBasics;
  theme: ThemeClasses;
  dense?: boolean;
}> = ({ basics, theme, dense }) => (
  <header className="resume-block text-center border-b border-gray-200 pb-4">
    <h1 className={`${dense ? 'text-2xl' : 'text-3xl'} font-bold text-gray-900`}>
      {basics.name}
    </h1>
    {basics.title && (
      <p className={`mt-1 text-[15px] font-medium ${theme.title}`}>
        {basics.title}
      </p>
    )}
    <div className="mt-3">
      <ContactList basics={basics} />
    </div>
  </header>
);

// --- 单栏：构建可分页的内容块 ---

const buildBlocks = (
  data: ResumeData,
  theme: ThemeClasses,
  dense: boolean,
): Block[] => {
  const blocks: Block[] = [];
  blocks.push({
    key: 'header',
    node: <SingleHeader basics={data.basics} theme={theme} dense={dense} />,
  });
  if (data.basics.summary)
    blocks.push({
      key: 'summary',
      node: <SummaryBlock summary={data.basics.summary} theme={theme} />,
    });

  const addSection = <T,>(
    k: string,
    title: string,
    icon: string,
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

  addSection('edu', '教育经历', 'graduation-cap', data.education, ({ item }) => (
    <EduEntry e={item} />
  ));
  addSection('work', '工作经历', 'briefcase', data.work, ({ item }) => (
    <WorkEntry w={item} />
  ));
  addSection('proj', '项目经历', 'code', data.projects, ({ item }) => (
    <ProjEntry p={item} />
  ));
  if (data.skills && data.skills.length > 0)
    blocks.push({
      key: 'skills',
      node: <SkillsBlock items={data.skills} theme={theme} />,
    });
  if (data.awards && data.awards.length > 0)
    blocks.push({
      key: 'awards',
      node: <AwardsBlock items={data.awards} theme={theme} />,
    });

  return blocks;
};

// --- 双栏侧边模板（单张 A4）---

const SidebarLayout: React.FC<{ data: ResumeData; theme: ThemeClasses }> = ({
  data,
  theme,
}) => {
  const { basics } = data;
  return (
    <div className="grid grid-cols-[34%_1fr]">
      <aside
        className={`${theme.sidebarBg} resume-color-exact text-white px-6 py-8`}
      >
        <div className="resume-block mb-6">
          <h1 className="text-2xl font-bold leading-tight">{basics.name}</h1>
          {basics.title && (
            <p className="mt-1 text-[13px] text-white/80">{basics.title}</p>
          )}
        </div>
        <div className="resume-block mb-6">
          <SectionTitle icon="paper-plane" theme={theme} onDark>
            联系方式
          </SectionTitle>
          <ContactList basics={basics} onDark />
        </div>
        {data.skills && data.skills.length > 0 && (
          <div className="mb-6">
            <SkillsBlock items={data.skills} theme={theme} onDark />
          </div>
        )}
        {data.awards && data.awards.length > 0 && (
          <AwardsBlock items={data.awards} theme={theme} onDark />
        )}
      </aside>

      <div className="px-8 py-8 space-y-6">
        {basics.summary && (
          <SummaryBlock summary={basics.summary} theme={theme} />
        )}
        {data.work && data.work.length > 0 && (
          <section>
            <SectionTitle icon="briefcase" theme={theme}>
              工作经历
            </SectionTitle>
            <div className="space-y-3">
              {data.work.map((w, i) => (
                <WorkEntry key={i} w={w} />
              ))}
            </div>
          </section>
        )}
        {data.projects && data.projects.length > 0 && (
          <section>
            <SectionTitle icon="code" theme={theme}>
              项目经历
            </SectionTitle>
            <div className="space-y-3">
              {data.projects.map((p, i) => (
                <ProjEntry key={i} p={p} />
              ))}
            </div>
          </section>
        )}
        {data.education && data.education.length > 0 && (
          <section>
            <SectionTitle icon="graduation-cap" theme={theme}>
              教育经历
            </SectionTitle>
            <div className="space-y-3">
              {data.education.map((e, i) => (
                <EduEntry key={i} e={e} />
              ))}
            </div>
          </section>
        )}
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

  if (template === 'sidebar') {
    return (
      <div
        id={id}
        className={`resume-page bg-white text-gray-800 mx-auto w-full max-w-[820px] ${className}`}
      >
        <SidebarLayout data={data} theme={theme} />
      </div>
    );
  }

  const dense = template === 'compact';
  const blocks = buildBlocks(data, theme, dense);
  const signature = JSON.stringify(data);

  return (
    <div className={className}>
      {/* 打印用：连续文档（屏幕隐藏），承载 id 作为打印目标 */}
      <div
        id={id}
        className="resume-print-only bg-white text-gray-800 mx-auto w-full max-w-[820px] px-8 py-10"
      >
        {blocks.map((b) => (
          <div key={b.key} className="rt-pageblock">
            {b.node}
          </div>
        ))}
      </div>

      {/* 屏幕用：真·多页 A4 */}
      <Paginator blocks={blocks} signature={signature} />
    </div>
  );
};

export default ResumeDocument;
