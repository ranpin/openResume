import type {
  ResumeData,
  ResumeCustomSection,
  ResumeSectionConfig,
  ResumeSectionKey,
} from '../../types/resume';

// 模块（分区）的内置默认元信息：默认标题 + 图标。
// 用户可在编辑器里改标题、调顺序、隐藏；这里只提供缺省与图标。
export const SECTION_META: Record<
  ResumeSectionKey,
  { title: string; icon: string }
> = {
  summary: { title: '个人简介', icon: 'user' },
  education: { title: '教育经历', icon: 'graduation-cap' },
  work: { title: '工作经历', icon: 'briefcase' },
  internship: { title: '实习经历', icon: 'briefcase' },
  projects: { title: '项目经历', icon: 'code' },
  skills: { title: '专业技能', icon: 'cogs' },
  awards: { title: '荣誉奖项', icon: 'trophy' },
  certificates: { title: '资格证书', icon: 'certificate' },
  languages: { title: '语言能力', icon: 'language' },
  activities: { title: '校园活动', icon: 'users' },
  interests: { title: '兴趣爱好', icon: 'heart' },
  custom: { title: '自定义模块', icon: 'plus' },
};

// 缺省顺序（未配置 sections 时）
export const DEFAULT_SECTION_ORDER: ResumeSectionKey[] = [
  'summary',
  'education',
  'work',
  'internship',
  'projects',
  'skills',
  'awards',
  'certificates',
  'languages',
  'activities',
  'interests',
];

export interface ResolvedSection {
  key: ResumeSectionKey;
  title: string; // 已合并自定义/默认后的最终标题
  icon: string;
  hidden: boolean;
  customId?: string; // key === 'custom' 时指向 data.custom[].id
}

/**
 * 把 data.sections 与内置默认合并成一份完整、有序的模块列表：
 * - 缺失的内置模块按默认顺序补到末尾（保证新增内容不会因旧配置而丢失）；
 * - 自定义模块（key==='custom'）按 customId 去重，数据已删除的忽略；未被 sections 引用的也会补到末尾；
 * - 未知/重复的 key 忽略；
 * - 标题缺省回落到默认名（自定义模块回落到其 data.custom[].title）。
 * 渲染与编辑器都以此为唯一事实来源。
 */
export const resolveSections = (
  sections?: ResumeSectionConfig[],
  custom?: ResumeCustomSection[],
): ResolvedSection[] => {
  const seen = new Set<string>();
  const out: ResolvedSection[] = [];
  const customById = new Map((custom || []).map((c) => [c.id, c]));

  const push = (cfg: Partial<ResumeSectionConfig> & { key: ResumeSectionKey }) => {
    if (cfg.key === 'custom') {
      const id = cfg.customId;
      if (!id || !customById.has(id)) return; // 数据已删除则忽略
      const ident = `custom:${id}`;
      if (seen.has(ident)) return;
      seen.add(ident);
      const c = customById.get(id)!;
      out.push({
        key: 'custom',
        customId: id,
        title: (cfg.title && cfg.title.trim()) || c.title || SECTION_META.custom.title,
        icon: SECTION_META.custom.icon,
        hidden: !!cfg.hidden,
      });
      return;
    }
    if (seen.has(cfg.key) || !SECTION_META[cfg.key]) return;
    seen.add(cfg.key);
    out.push({
      key: cfg.key,
      title: (cfg.title && cfg.title.trim()) || SECTION_META[cfg.key].title,
      icon: SECTION_META[cfg.key].icon,
      hidden: !!cfg.hidden,
    });
  };

  (sections || []).forEach(push);
  DEFAULT_SECTION_ORDER.forEach((key) => push({ key }));
  // 未被 sections 引用的自定义模块补到末尾（保证新建的自定义模块一定可见）
  (custom || []).forEach((c) => push({ key: 'custom', customId: c.id }));
  return out;
};

// 供编辑器初始化「模块管理器」用：把当前 data 展开成可编辑的配置数组
export const sectionConfigFromData = (
  data: ResumeData,
): ResumeSectionConfig[] =>
  resolveSections(data.sections, data.custom).map((s) => ({
    key: s.key,
    ...(s.key === 'custom' ? { customId: s.customId } : {}),
    title: s.title,
    hidden: s.hidden,
  }));
