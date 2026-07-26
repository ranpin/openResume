import React from 'react';
import Icon from '../Icon';
import RichText from './RichText';
import Paginator, { type Block } from './Paginator';
import { THEMES, type ThemeClasses } from './resumeTheme';
import { resolveSections, type ResolvedSection } from './resumeSections';
import { fontStack } from './resumeFonts';
import type {
  ResumeData,
  ResumeBasics,
  ResumeEducation,
  ResumeWork,
  ResumeProject,
  ResumeSkill,
  ResumeAward,
  ResumeCertificate,
  ResumeLanguage,
  ResumeActivity,
  ResumeSettings,
  ResumeFieldSeparator,
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
  onPages?: (count: number) => void; // 屏幕分页页数变化回调（智能一页用；sidebar 恒为 1 页不触发）
}

const clean = (arr?: string[]) => (arr || []).filter((s) => s && s.trim());
const LIST_MARKER = /^\s*([-*+]|\d+[.)]|>|#{1,6})\s/;

// 把 settings 折算成简历根节点的内联 CSS 变量（供 .resume-root 下所有 rs-* 类使用）
const rootVars = (s?: ResumeSettings): React.CSSProperties =>
  ({
    '--rs-scale': s?.fontScale ?? 1,
    '--rs-lh': s?.lineHeight ?? 1.6,
    '--rs-gap': `${s?.blockGap ?? 16}px`,
    ...(fontStack(s?.fontFamily)
      ? { fontFamily: fontStack(s?.fontFamily) }
      : {}),
  }) as React.CSSProperties;

// 条目标题排版（单/双行 + 字段排列）：由 ResumeDocument 从 data.settings 解析后经 Context 下发，
// 供教育/工作/项目/活动等条目共用的 EntryHeader 读取（单栏与双栏模板一致生效）。
interface EntryLayout {
  headerLines: 1 | 2;
  separator: ResumeFieldSeparator;
}
const DEFAULT_ENTRY_LAYOUT: EntryLayout = { headerLines: 2, separator: 'dot' };
const EntryLayoutContext = React.createContext<EntryLayout>(DEFAULT_ENTRY_LAYOUT);

// 字段排列方式 → 连接符（justify 为分散对齐，无连接符）
const SEP_CHAR: Record<ResumeFieldSeparator, string> = {
  justify: '',
  dot: ' · ',
  slash: ' / ',
  bar: ' | ',
};

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
  horizontal?: boolean; // 深色底色下也横排（卡片模板头部用）
}> = ({ basics, onDark, align = 'center', horizontal }) => {
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
          ? horizontal
            ? `rs-meta flex flex-wrap items-center gap-x-4 gap-y-1 text-white/90 ${
                align === 'left' ? 'justify-start' : 'justify-center'
              }`
            : 'rs-meta flex flex-col gap-1.5 text-white/90'
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

/**
 * 条目标题行（教育/工作/项目/活动共用）。排版由 EntryLayoutContext 决定：
 * - 双行(2)：第一行 主标题(左,粗) + 时间(右)，两端对齐；第二行 其余字段（按分隔符连接或分散）。
 * - 单行(1)：所有字段同行。justify=分散对齐（首字段贴左、时间贴右、中间均分）；
 *   其余=用分隔符连成左组 + 时间右对齐。
 * 「多个信息怎么在一行分散开并保持两端对齐」即靠 flex 的 justify-between 实现。
 */
const EntryHeader: React.FC<{
  primary: string;
  secondary?: string;
  meta?: (string | undefined)[];
  period?: string;
}> = ({ primary, secondary, meta, period }) => {
  const { headerLines, separator } = React.useContext(EntryLayoutContext);
  const fields = [secondary, ...(meta || [])].filter(
    (s): s is string => !!s && !!s.trim(),
  );
  const sep = SEP_CHAR[separator];
  const periodNode = period ? (
    <div className="text-right whitespace-nowrap">
      <Period text={period} />
    </div>
  ) : null;

  if (headerLines === 1) {
    if (separator === 'justify') {
      // 分散对齐：主标题、各字段、时间作为 flex 子项，justify-between 两端对齐
      return (
        <div className="flex items-baseline justify-between gap-3">
          <h3 className="rs-h3 font-semibold text-gray-900 min-w-0">{primary}</h3>
          {fields.map((f, i) => (
            <span
              key={i}
              className="rs-h3 font-normal text-gray-600 whitespace-nowrap"
            >
              {f}
            </span>
          ))}
          {periodNode}
        </div>
      );
    }
    // 分隔符连成左组 + 时间右对齐
    return (
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="rs-h3 font-semibold text-gray-900 min-w-0">
          {primary}
          {fields.length > 0 && (
            <span className="font-normal text-gray-600">
              {sep}
              {fields.join(sep)}
            </span>
          )}
        </h3>
        {periodNode}
      </div>
    );
  }

  // 双行：主标题 + 时间一行；其余字段次行
  return (
    <>
      <div className="flex items-baseline justify-between gap-3">
        <h3 className="rs-h3 font-semibold text-gray-900 min-w-0">{primary}</h3>
        {periodNode}
      </div>
      {fields.length > 0 &&
        (separator === 'justify' ? (
          <div className="rs-body flex flex-wrap items-baseline gap-x-4 text-gray-600">
            {fields.map((f, i) => (
              <span key={i}>{f}</span>
            ))}
          </div>
        ) : (
          <div className="rs-body text-gray-600">{fields.join(sep)}</div>
        ))}
    </>
  );
};

// --- 单条目渲染（分页与侧栏共用）---

const EduEntry: React.FC<{ e: ResumeEducation }> = ({ e }) => (
  <div className="resume-block">
    <EntryHeader
      primary={e.school}
      secondary={e.college}
      meta={[e.degree, e.major, e.gpa ? `GPA ${e.gpa}` : undefined]}
      period={e.period}
    />
    {e.courses && (
      <div className="rs-body text-gray-600">
        <span className="text-gray-500">主修课程：</span>
        {e.courses}
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
    <EntryHeader primary={p.name} secondary={p.role} period={p.period} />
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
    <EntryHeader
      primary={w.company}
      secondary={w.position}
      meta={[w.location]}
      period={w.period}
    />
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

const SKILL_LEVELS = ['了解', '熟悉', '掌握', '精通'];

// 技能熟练度圆点：了解=1 … 精通=4；未知级别不渲染
const LevelDots: React.FC<{ level: string; onDark?: boolean }> = ({
  level,
  onDark,
}) => {
  const n = SKILL_LEVELS.indexOf(level) + 1;
  if (n <= 0) return null;
  return (
    <span
      className="inline-flex items-center gap-0.5 ml-1.5 align-middle"
      title={level}
    >
      {[0, 1, 2, 3].map((i) => (
        <span
          key={i}
          className={`resume-color-exact inline-block w-1.5 h-1.5 rounded-full ${
            i < n
              ? onDark
                ? 'bg-white'
                : 'bg-gray-700'
              : onDark
                ? 'bg-white/25'
                : 'bg-gray-300'
          }`}
        />
      ))}
    </span>
  );
};

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
          {clean(s.items).map((it, idx, arr) => (
            <span key={it} className="inline-flex items-center">
              {it}
              {s.levels?.[it] && <LevelDots level={s.levels[it]} onDark={onDark} />}
              {idx < arr.length - 1 && <span>、</span>}
            </span>
          ))}
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

const CertificatesBlock: React.FC<{
  items: ResumeCertificate[];
  theme: ThemeClasses;
  title: string;
  onDark?: boolean;
}> = ({ items, theme, title, onDark }) => (
  <section>
    <SectionTitle icon="certificate" theme={theme} onDark={onDark}>
      {title}
    </SectionTitle>
    <ul
      className={`rs-body space-y-1 ${onDark ? 'text-white/90' : 'text-gray-700'}`}
    >
      {items.map((c, i) => (
        <li
          key={i}
          className={`resume-block ${
            onDark ? '' : 'flex items-baseline justify-between gap-3'
          }`}
        >
          <span>
            {c.name}
            {c.issuer && (
              <span className={onDark ? 'text-white/70' : 'text-gray-500'}>
                {' '}
                · {c.issuer}
              </span>
            )}
          </span>
          {c.date &&
            (onDark ? (
              <span className="rs-meta text-white/60"> （{c.date}）</span>
            ) : (
              <Period text={c.date} />
            ))}
        </li>
      ))}
    </ul>
  </section>
);

const LanguagesBlock: React.FC<{
  items: ResumeLanguage[];
  theme: ThemeClasses;
  title: string;
  onDark?: boolean;
}> = ({ items, theme, title, onDark }) => (
  <section>
    <SectionTitle icon="language" theme={theme} onDark={onDark}>
      {title}
    </SectionTitle>
    <ul
      className={`rs-body space-y-1 ${onDark ? 'text-white/90' : 'text-gray-700'}`}
    >
      {items.map((l, i) => (
        <li
          key={i}
          className={`resume-block ${
            onDark ? '' : 'flex items-baseline justify-between gap-3'
          }`}
        >
          <span>{l.name}</span>
          {l.level && (
            <span
              className={onDark ? 'rs-meta text-white/70' : 'rs-meta text-gray-500'}
            >
              {l.level}
            </span>
          )}
        </li>
      ))}
    </ul>
  </section>
);

const ActivityEntry: React.FC<{ a: ResumeActivity }> = ({ a }) => (
  <div className="resume-block">
    <EntryHeader primary={a.name} secondary={a.role} period={a.period} />
    <Highlights items={a.highlights} />
  </div>
);

const InterestsBlock: React.FC<{
  items: string[];
  theme: ThemeClasses;
  title: string;
  onDark?: boolean;
}> = ({ items, theme, title, onDark }) => (
  <section className="resume-block">
    <SectionTitle icon="heart" theme={theme} onDark={onDark}>
      {title}
    </SectionTitle>
    <div className={`rs-body ${onDark ? 'text-white/90' : 'text-gray-700'}`}>
      {clean(items).join('、')}
    </div>
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

// 自定义模块：自由标题 + 富文本正文（渲染逻辑同个人简介）
const CustomBlock: React.FC<{
  content: string;
  theme: ThemeClasses;
  title: string;
  icon: string;
  onDark?: boolean;
}> = ({ content, theme, title, icon, onDark }) => (
  <section className="resume-block">
    <SectionTitle icon={icon} theme={theme} onDark={onDark}>
      {title}
    </SectionTitle>
    <RichText>{content}</RichText>
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

// 卡片模板头部：主题色圆角卡片，白字，联系方式横排
const CardHeader: React.FC<{
  basics: ResumeBasics;
  theme: ThemeClasses;
}> = ({ basics, theme }) => {
  const hasPhoto = !!basics.photo;
  return (
    <header
      className={`resume-color-exact resume-block rounded-xl px-6 py-5 text-white ${
        theme.sidebarBg
      } ${hasPhoto ? 'flex items-center gap-5' : ''}`}
    >
      <div className={hasPhoto ? 'flex-1 min-w-0' : ''}>
        <h1 className="rs-name font-bold">{basics.name}</h1>
        {basics.title && (
          <p className="rs-title mt-1 text-white/85">{basics.title}</p>
        )}
        <div className="mt-3">
          <ContactList basics={basics} onDark horizontal align="left" />
        </div>
      </div>
      {hasPhoto && <PhotoBox src={basics.photo} onDark />}
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
      case 'certificates':
        if (data.certificates && data.certificates.length > 0)
          blocks.push({
            key: 'certificates',
            node: (
              <CertificatesBlock
                items={data.certificates}
                theme={theme}
                title={sec.title}
              />
            ),
          });
        break;
      case 'languages':
        if (data.languages && data.languages.length > 0)
          blocks.push({
            key: 'languages',
            node: (
              <LanguagesBlock
                items={data.languages}
                theme={theme}
                title={sec.title}
              />
            ),
          });
        break;
      case 'activities':
        addListSection(
          'act',
          sec.icon,
          sec.title,
          data.activities,
          ({ item }) => <ActivityEntry a={item} />,
        );
        break;
      case 'interests':
        if (clean(data.interests).length > 0)
          blocks.push({
            key: 'interests',
            node: (
              <InterestsBlock
                items={data.interests || []}
                theme={theme}
                title={sec.title}
              />
            ),
          });
        break;
      case 'custom': {
        const c = (data.custom || []).find((x) => x.id === sec.customId);
        if (c && c.content && c.content.trim())
          blocks.push({
            key: `custom-${sec.customId}`,
            node: (
              <CustomBlock
                content={c.content}
                theme={theme}
                title={sec.title}
                icon={sec.icon}
              />
            ),
          });
        break;
      }
    }
  });

  return blocks;
};

// --- 卡片风格模板：灰底页面 + 主题色头部卡片 + 各内容块白色圆角卡片 ---
// 复用 buildBlocks 的内容块：替换头部为彩色卡片，其余每块包一层白色卡片。
const CARD_SHEET_BG = 'bg-slate-100';

const buildCardBlocks = (
  data: ResumeData,
  theme: ThemeClasses,
  sections: ResolvedSection[],
): Block[] => {
  const inner = buildBlocks(data, theme, sections);
  const blocks: Block[] = [
    { key: 'header', node: <CardHeader basics={data.basics} theme={theme} /> },
  ];
  for (const b of inner) {
    if (b.key === 'header') continue;
    blocks.push({
      key: b.key,
      node: (
        <div className="resume-color-exact bg-white rounded-xl border border-slate-200/80 shadow-sm px-4 py-3">
          {b.node}
        </div>
      ),
    });
  }
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

  // 侧栏（紧凑列表型）：技能 / 荣誉 / 证书 / 语言 / 兴趣；其余进主栏
  const ASIDE_KEYS = new Set([
    'skills',
    'awards',
    'certificates',
    'languages',
    'interests',
  ]);
  const asideKeys = visible.filter((s) => ASIDE_KEYS.has(s.key));
  const mainKeys = visible.filter((s) => !ASIDE_KEYS.has(s.key));

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
      case 'activities':
        return data.activities && data.activities.length > 0 ? (
          <section key="activities">
            <SectionTitle icon={sec.icon} theme={theme}>
              {sec.title}
            </SectionTitle>
            <div className="space-y-3">
              {data.activities.map((a, i) => (
                <ActivityEntry key={i} a={a} />
              ))}
            </div>
          </section>
        ) : null;
      case 'custom': {
        const c = (data.custom || []).find((x) => x.id === sec.customId);
        return c && c.content && c.content.trim() ? (
          <CustomBlock
            key={`custom-${sec.customId}`}
            content={c.content}
            theme={theme}
            title={sec.title}
            icon={sec.icon}
          />
        ) : null;
      }
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
        {asideKeys.map((sec) => {
          switch (sec.key) {
            case 'skills':
              return data.skills && data.skills.length > 0 ? (
                <div key="skills" className="mb-6">
                  <SkillsBlock
                    items={data.skills}
                    theme={theme}
                    title={sec.title}
                    onDark
                  />
                </div>
              ) : null;
            case 'awards':
              return data.awards && data.awards.length > 0 ? (
                <div key="awards" className="mb-6">
                  <AwardsBlock
                    items={data.awards}
                    theme={theme}
                    title={sec.title}
                    onDark
                  />
                </div>
              ) : null;
            case 'certificates':
              return data.certificates && data.certificates.length > 0 ? (
                <div key="certificates" className="mb-6">
                  <CertificatesBlock
                    items={data.certificates}
                    theme={theme}
                    title={sec.title}
                    onDark
                  />
                </div>
              ) : null;
            case 'languages':
              return data.languages && data.languages.length > 0 ? (
                <div key="languages" className="mb-6">
                  <LanguagesBlock
                    items={data.languages}
                    theme={theme}
                    title={sec.title}
                    onDark
                  />
                </div>
              ) : null;
            case 'interests':
              return clean(data.interests).length > 0 ? (
                <div key="interests" className="mb-6">
                  <InterestsBlock
                    items={data.interests || []}
                    theme={theme}
                    title={sec.title}
                    onDark
                  />
                </div>
              ) : null;
            default:
              return null;
          }
        })}
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
  onPages,
}) => {
  const theme = THEMES[data.theme || 'blue'];
  const template = data.template || 'classic';
  const sections = resolveSections(data.sections, data.custom);
  const style = rootVars(data.settings);
  const pageMargin = data.settings?.pageMargin ?? 45;
  const dense = template === 'compact';
  const isCard = template === 'card';

  // 条目标题排版（单/双行 + 字段排列），经 Context 下发给各条目（单栏/卡片/双栏一致生效）
  const entryLayout: EntryLayout = {
    headerLines: data.settings?.headerLines ?? DEFAULT_ENTRY_LAYOUT.headerLines,
    separator: data.settings?.fieldSeparator ?? DEFAULT_ENTRY_LAYOUT.separator,
  };

  if (template === 'sidebar') {
    return (
      <EntryLayoutContext.Provider value={entryLayout}>
        <div
          id={id}
          style={style}
          className={`resume-root resume-page bg-white text-gray-800 mx-auto w-full max-w-[820px] ${className}`}
        >
          <SidebarLayout data={data} theme={theme} sections={sections} />
        </div>
      </EntryLayoutContext.Provider>
    );
  }

  const blocks = isCard
    ? buildCardBlocks(data, theme, sections)
    : buildBlocks(data, theme, sections);
  const signature = JSON.stringify(data);
  // 卡片模板灰底页面：屏幕 sheet 与打印连续文档同灰底，并强制打印背景色
  const sheetBg = isCard ? CARD_SHEET_BG : 'bg-white';

  return (
    <EntryLayoutContext.Provider value={entryLayout}>
      <div className={className}>
        {/* 打印用：连续文档（屏幕隐藏），承载 id 作为打印目标 */}
        <div
          id={id}
          style={{ ...style, padding: pageMargin }}
          className={`resume-root${
            dense ? ' dense' : ''
          } resume-print-only ${sheetBg} text-gray-800 mx-auto w-full max-w-[820px]${
            isCard ? ' resume-color-exact' : ''
          }`}
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
          sheetBg={sheetBg}
          onPages={onPages}
        />
      </div>
    </EntryLayoutContext.Provider>
  );
};

export default ResumeDocument;
