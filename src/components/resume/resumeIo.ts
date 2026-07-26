import { dump } from 'js-yaml';
import type { ResumeData } from '../../types/resume';

// 简历数据的克隆 / 清洗 / 导出（编辑器与查看页共用）。

export const cloneResume = (d: ResumeData): ResumeData =>
  JSON.parse(JSON.stringify(d));

const clean = (arr?: string[]): string[] =>
  (arr || []).map((s) => s.trim()).filter(Boolean);

const cleanProject = <T extends { tech?: string[]; highlights?: string[] }>(
  p: T,
): T => ({ ...p, tech: clean(p.tech), highlights: clean(p.highlights) });

// 去掉编辑过程中产生的空白数组项，得到可发布的干净数据
export const sanitizeResume = (d: ResumeData): ResumeData => {
  const c = cloneResume(d);
  if (c.work)
    c.work = c.work.map((w) => ({
      ...w,
      highlights: clean(w.highlights),
      // 工作经历下的子项目同样清洗
      projects: w.projects ? w.projects.map(cleanProject) : w.projects,
    }));
  if (c.projects) c.projects = c.projects.map(cleanProject);
  if (typeof c.skills === 'string') {
    const t = c.skills.trim();
    if (t) c.skills = t;
    else delete c.skills;
  }
  return c;
};

// 旧版 skills 为分组数组（{category, items, levels}），现为富文本字符串。
// 迁移规则：每组一行，类别加粗作前缀，技能用「、」连接，熟练度以括号附注。
interface LegacySkillGroup {
  category?: string;
  items?: string[];
  levels?: Record<string, string>;
}

export const legacySkillsToText = (groups: LegacySkillGroup[]): string =>
  groups
    .map((g) => {
      const items = clean(g.items).map((it) =>
        g.levels?.[it] ? `${it}（${g.levels[it]}）` : it,
      );
      if (items.length === 0) return '';
      return g.category ? `**${g.category}**：${items.join('、')}` : items.join('、');
    })
    .filter(Boolean)
    .join('\n');

/**
 * 数据迁移入口：把旧格式字段就地转为现行格式。
 * 纯函数，无需迁移时原样返回（同一引用）。
 * 调用点：content/resumes 载入（content.ts）、编辑器取数（兼容旧 localStorage 草稿）、
 * AI 生成/导入/翻译的返回值（模型可能输出旧格式）。
 */
export const migrateResume = <T extends ResumeData>(d: T): T => {
  const raw = d as T & { skills?: unknown };
  if (Array.isArray(raw.skills)) {
    const text = legacySkillsToText(raw.skills as LegacySkillGroup[]);
    const next = { ...d } as T & { skills?: unknown };
    if (text) next.skills = text;
    else delete next.skills;
    return next;
  }
  return d;
};

// 规范化内容指纹（忽略 id 与空白项差异），用于比较草稿/已发布/已提交是否一致
export const normalizeResume = (d: ResumeData): string => {
  const { id, ...rest } = sanitizeResume(d);
  void id;
  return JSON.stringify(rest);
};

// 两份简历内容是否等价
export const isSameResume = (a: ResumeData, b: ResumeData): boolean =>
  normalizeResume(a) === normalizeResume(b);

// 导出与 content/resumes/*.yaml 同构的 YAML（id 由文件名派生，故省略）
export const resumeToYaml = (d: ResumeData): string => {
  const { id, ...rest } = sanitizeResume(d);
  void id;
  return dump(rest, { lineWidth: 100, noRefs: true });
};

/**
 * 读取图片文件并等比压缩为 dataURL（用于证件照上传）。
 * 纯静态站无后端，证件照内嵌进数据（localStorage / 导出的 YAML）。
 * 默认压到最长边 640px、JPEG q0.85，控制体积在数十 KB 量级。
 * 仅在浏览器端调用（编辑器为客户端懒加载组件）。
 */
export const fileToResizedDataUrl = (
  file: File,
  maxW = 480,
  maxH = 640,
  quality = 0.85,
): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('无法解析图片'));
      img.onload = () => {
        const ratio = Math.min(maxW / img.width, maxH / img.height, 1);
        const w = Math.max(1, Math.round(img.width * ratio));
        const h = Math.max(1, Math.round(img.height * ratio));
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('画布不可用'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });

export const downloadResumeYaml = (d: ResumeData): void => {
  const blob = new Blob([resumeToYaml(d)], {
    type: 'text/yaml;charset=utf-8',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${d.id}.yaml`;
  a.click();
  URL.revokeObjectURL(url);
};
