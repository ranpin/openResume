import {
  AlignmentType,
  BorderStyle,
  Document,
  ImageRun,
  LevelFormat,
  Packer,
  Paragraph,
  TabStopType,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from 'docx';
import type {
  ResumeActivity,
  ResumeData,
  ResumeEducation,
  ResumeProject,
  ResumeSettings,
  ResumeTheme,
  ResumeWork,
} from '../../types/resume';
import { resolveSections } from './resumeSections';

/**
 * 导出 Word（.docx）：把 ResumeData 构建成 Word 原生文档（标题 / 表格 / 项目符号列表），
 * 而非截图或 HTML 套壳——这样导出的文件在 Word 里可直接编辑，且不受网页 CSS（变量 / grid / flex）
 * 在 Word 渲染引擎里失真的影响。版式取经典单栏（最适合 Word 编辑），配色沿用所选主题强调色，
 * 字号 / 行距 / 间距 / 页边距沿用 settings。模块顺序 / 自定义标题 / 显隐遵循 resolveSections。
 *
 * 仅在浏览器端点击「导出 Word」时按需 dynamic import，不进入 SSG 预渲染树。
 */

// 主题强调色（对应 Tailwind *-600，去掉 #）
const ACCENT: Record<ResumeTheme, string> = {
  blue: '2563EB',
  emerald: '059669',
  violet: '7C3AED',
  rose: 'E11D48',
  slate: '334155',
};

// 正文中文字体栈 → Word 字体（ascii/hAnsi 用西文，eastAsia 用中文）
const FONTS: Record<string, { ascii: string; eastAsia: string; hAnsi: string }> = {
  default: { ascii: 'Calibri', eastAsia: 'Microsoft YaHei', hAnsi: 'Calibri' },
  song: { ascii: 'Times New Roman', eastAsia: 'SimSun', hAnsi: 'Times New Roman' },
  hei: { ascii: 'Arial', eastAsia: 'Microsoft YaHei', hAnsi: 'Arial' },
  kai: { ascii: 'Times New Roman', eastAsia: 'KaiTi', hAnsi: 'Times New Roman' },
  serif: { ascii: 'Georgia', eastAsia: 'SimSun', hAnsi: 'Georgia' },
};

const GRAY = '555555';
const LIGHT = '777777';

// 排版上下文：把 settings 折算成 docx 用的具体数值（字号=半磅，行距=1/240 行，间距/页宽=twip）
interface Ctx {
  accent: string;
  body: number; // 正文字号（半磅）
  meta: number; // 次要信息字号
  h2: number; // 分区标题字号
  h3: number; // 条目标题字号
  name: number; // 姓名字号
  title: number; // 头衔字号
  line: number; // 行距（1/240 行）
  gap: number; // 条目间距（twip）
  contentW: number; // 正文宽度（twip，用于右对齐制表位）
}

const pt = (n: number, scale: number): number => Math.round(n * scale * 2);

const buildCtx = (data: ResumeData): Ctx => {
  const s: ResumeSettings = data.settings || {};
  const scale = s.fontScale ?? 1;
  const margin = Math.round((s.pageMargin ?? 45) * 15); // px → twip
  return {
    accent: ACCENT[data.theme || 'blue'] || ACCENT.blue,
    body: pt(10.5, scale),
    meta: pt(10, scale),
    h2: pt(12.5, scale),
    h3: pt(11, scale),
    name: pt(19, scale),
    title: pt(12, scale),
    line: Math.round((s.lineHeight ?? 1.6) * 240),
    gap: Math.round((s.blockGap ?? 16) * 15),
    contentW: 11906 - margin * 2, // A4 宽 − 左右页边距
  };
};

const clean = (arr?: string[]): string[] =>
  (arr || []).map((x) => x.trim()).filter(Boolean);

// 行内：去掉链接语法 [t](u)→t 与反引号；**粗体** 由 richRuns 处理
const cleanInline = (s: string): string =>
  s
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/`/g, '');

// 把含 **粗体** 的文本拆成 TextRun 序列
const richRuns = (
  text: string,
  size: number,
  color?: string,
  bold?: boolean,
): TextRun[] => {
  const runs: TextRun[] = [];
  const parts = cleanInline(text).split(/(\*\*[^*]+\*\*)/g);
  for (const part of parts) {
    if (!part) continue;
    const m = /^\*\*([^*]+)\*\*$/.exec(part);
    if (m) runs.push(new TextRun({ text: m[1], bold: true, size, color }));
    else runs.push(new TextRun({ text: part, bold, size, color }));
  }
  if (runs.length === 0) runs.push(new TextRun({ text: '', size, color }));
  return runs;
};

const noBorders = {
  top: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  bottom: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  left: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  right: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'auto' },
  insideVertical: { style: BorderStyle.NONE, size: 0, color: 'auto' },
};

// 条目标题行：三列无边表格（左=名称加粗，中=角色/学院，右=时间）
const headerRow = (
  left: string,
  center: string | undefined,
  right: string | undefined,
  ctx: Ctx,
): Table => {
  const cell = (
    children: TextRun[],
    width: number,
    alignment: (typeof AlignmentType)[keyof typeof AlignmentType],
  ) =>
    new TableCell({
      width: { size: width, type: WidthType.PERCENTAGE },
      margins: { top: 0, bottom: 0, left: 0, right: 0 },
      children: [
        new Paragraph({ alignment, spacing: { line: ctx.line }, children }),
      ],
    });
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: noBorders,
    rows: [
      new TableRow({
        children: [
          cell([new TextRun({ text: left || '', bold: true, size: ctx.h3 })], 55, AlignmentType.LEFT),
          cell([new TextRun({ text: center || '', size: ctx.h3, color: GRAY })], 25, AlignmentType.CENTER),
          cell([new TextRun({ text: right || '', size: ctx.meta, color: LIGHT })], 20, AlignmentType.RIGHT),
        ],
      }),
    ],
  });
};

// 项目符号要点（逐条解析 **粗体**）
const bullet = (text: string, ctx: Ctx): Paragraph =>
  new Paragraph({
    numbering: { reference: 'rs-bullets', level: 0 },
    spacing: { line: ctx.line, after: 40 },
    children: richRuns(text, ctx.body),
  });

const bullets = (items: string[] | undefined, ctx: Ctx): Paragraph[] =>
  clean(items).map((h) => bullet(h, ctx));

// 一行次要文本（如地点 / 技术栈 / 学位）
const metaLine = (text: string, ctx: Ctx): Paragraph =>
  new Paragraph({
    spacing: { line: ctx.line },
    children: [new TextRun({ text, size: ctx.meta, color: GRAY })],
  });

// 左正文 + 右对齐时间（荣誉 / 证书 / 语言）
const lineWithRight = (
  left: string,
  right: string | undefined,
  ctx: Ctx,
): Paragraph =>
  new Paragraph({
    tabStops: [{ type: TabStopType.RIGHT, position: ctx.contentW }],
    spacing: { line: ctx.line, after: 40 },
    children: [
      ...richRuns(left, ctx.body),
      ...(right ? [new TextRun({ text: `\t${right}`, size: ctx.meta, color: LIGHT })] : []),
    ],
  });

// 分区标题：强调色文字 + 强调色下划线
const sectionHeading = (title: string, ctx: Ctx): Paragraph =>
  new Paragraph({
    spacing: { before: ctx.gap, after: 100 },
    border: { bottom: { style: BorderStyle.SINGLE, size: 10, color: ctx.accent, space: 2 } },
    children: [new TextRun({ text: title, bold: true, size: ctx.h2, color: ctx.accent })],
  });

// 富文本块（个人简介 / 自定义模块 / 教育详情）：按行解析标题 / 列表 / 粗体
const richBlock = (md: string, ctx: Ctx): Paragraph[] => {
  const out: Paragraph[] = [];
  for (const raw of (md || '').split(/\r?\n/)) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const list = /^\s*([-*+]|\d+[.)])\s+(.*)$/.exec(line);
    const head = /^\s*#{1,6}\s+(.*)$/.exec(line);
    if (list) out.push(bullet(list[2], ctx));
    else if (head)
      out.push(
        new Paragraph({
          spacing: { line: ctx.line, before: 60 },
          children: [new TextRun({ text: cleanInline(head[1]), bold: true, size: ctx.body })],
        }),
      );
    else
      out.push(
        new Paragraph({ spacing: { line: ctx.line }, children: richRuns(line, ctx.body) }),
      );
  }
  return out;
};

const dataUrlToBytes = (dataUrl: string): Uint8Array => {
  const base64 = dataUrl.split(',')[1] || '';
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes;
};

const photoRun = (src: string): ImageRun | null => {
  try {
    const type = src.startsWith('data:image/png') ? 'png' : 'jpg';
    return new ImageRun({
      data: src.startsWith('data:') ? dataUrlToBytes(src) : src,
      transformation: { width: 76, height: 102 },
      type,
    });
  } catch {
    return null;
  }
};

// 联系方式一行
const contactLine = (data: ResumeData, align: 'center' | 'left', ctx: Ctx): Paragraph => {
  const b = data.basics;
  const items: string[] = [];
  if (b.email) items.push(b.email);
  if (b.phone) items.push(b.phone);
  if (b.wechat) items.push(b.wechat);
  if (b.location) items.push(b.location);
  if (b.birth) items.push(b.birth);
  if (b.political) items.push(b.political);
  if (b.github) items.push(b.github.replace(/^https?:\/\//, ''));
  if (b.website) items.push(b.website.replace(/^https?:\/\//, ''));
  return new Paragraph({
    alignment: align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
    spacing: { line: ctx.line, before: 60 },
    children: [new TextRun({ text: items.join('   ·   '), size: ctx.meta, color: GRAY })],
  });
};

// 文档头部：姓名 + 头衔 + 联系方式（有证件照时排成左右两列）
const buildHeader = (data: ResumeData, ctx: Ctx): (Paragraph | Table)[] => {
  const b = data.basics;
  const namePara = (align: 'center' | 'left') =>
    new Paragraph({
      alignment: align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
      spacing: { line: ctx.line },
      children: [new TextRun({ text: b.name || '', bold: true, size: ctx.name })],
    });
  const titlePara = (align: 'center' | 'left') =>
    b.title
      ? new Paragraph({
          alignment: align === 'center' ? AlignmentType.CENTER : AlignmentType.LEFT,
          spacing: { line: ctx.line, before: 40 },
          children: [new TextRun({ text: b.title, size: ctx.title, color: ctx.accent, bold: true })],
        })
      : null;

  const img = b.photo ? photoRun(b.photo) : null;
  if (!img) {
    return [namePara('center'), titlePara('center'), contactLine(data, 'center', ctx)].filter(
      Boolean,
    ) as Paragraph[];
  }

  const left = new TableCell({
    width: { size: 78, type: WidthType.PERCENTAGE },
    margins: { top: 0, bottom: 0, left: 0, right: 80 },
    children: [
      namePara('left'),
      titlePara('left'),
      contactLine(data, 'left', ctx),
    ].filter(Boolean) as Paragraph[],
  });
  const right = new TableCell({
    width: { size: 22, type: WidthType.PERCENTAGE },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    children: [
      new Paragraph({ alignment: AlignmentType.RIGHT, children: [img] }),
    ],
  });
  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: noBorders,
      rows: [new TableRow({ children: [left, right] })],
    }),
  ];
};

// --- 各模块渲染 ---

const eduEntry = (e: ResumeEducation, ctx: Ctx): (Paragraph | Table)[] => [
  headerRow(e.school, e.college, e.period, ctx),
  ...((e.degree || e.major || e.gpa)
    ? [
        metaLine(
          [e.degree, e.major].filter(Boolean).join(' · ') +
            (e.gpa ? ` · GPA ${e.gpa}` : ''),
          ctx,
        ),
      ]
    : []),
  ...(e.courses ? [metaLine(`主修课程：${e.courses}`, ctx)] : []),
  ...(e.detail ? richBlock(e.detail, ctx) : []),
];

const projEntry = (p: ResumeProject, ctx: Ctx): (Paragraph | Table)[] => [
  headerRow(p.name, p.role, p.period, ctx),
  ...(clean(p.tech).length > 0 ? [metaLine(clean(p.tech).join(' / '), ctx)] : []),
  ...bullets(p.highlights, ctx),
  ...(p.link ? [metaLine(p.link.replace(/^https?:\/\//, ''), ctx)] : []),
];

const workEntry = (w: ResumeWork, ctx: Ctx): (Paragraph | Table)[] => [
  headerRow(w.company, w.position, w.period, ctx),
  ...(w.location ? [metaLine(w.location, ctx)] : []),
  ...bullets(w.highlights, ctx),
  ...(w.projects || []).flatMap((p) => [
    new Paragraph({ spacing: { before: 60 }, children: [] }),
    ...projEntry(p, ctx),
  ]),
];

const actEntry = (a: ResumeActivity, ctx: Ctx): (Paragraph | Table)[] => [
  headerRow(a.name, a.role, a.period, ctx),
  ...bullets(a.highlights, ctx),
];

// 把解析后的模块逐个渲染成 docx 子节点
const renderSection = (
  key: string,
  title: string,
  customId: string | undefined,
  data: ResumeData,
  ctx: Ctx,
): (Paragraph | Table)[] => {
  const head = () => sectionHeading(title, ctx);
  switch (key) {
    case 'summary':
      return data.basics.summary ? [head(), ...richBlock(data.basics.summary, ctx)] : [];
    case 'education':
      return data.education && data.education.length > 0
        ? [head(), ...data.education.flatMap((e) => eduEntry(e, ctx))]
        : [];
    case 'work':
      return data.work && data.work.length > 0
        ? [head(), ...data.work.flatMap((w) => workEntry(w, ctx))]
        : [];
    case 'internship':
      return data.internship && data.internship.length > 0
        ? [head(), ...data.internship.flatMap((w) => workEntry(w, ctx))]
        : [];
    case 'projects':
      return data.projects && data.projects.length > 0
        ? [head(), ...data.projects.flatMap((p) => projEntry(p, ctx))]
        : [];
    case 'skills':
      return data.skills && data.skills.trim()
        ? [head(), ...richBlock(data.skills, ctx)]
        : [];
    case 'awards':
      return data.awards && data.awards.length > 0
        ? [
            head(),
            ...data.awards.map((a) =>
              lineWithRight(
                a.title + (a.issuer ? ` · ${a.issuer}` : ''),
                a.date,
                ctx,
              ),
            ),
          ]
        : [];
    case 'certificates':
      return data.certificates && data.certificates.length > 0
        ? [
            head(),
            ...data.certificates.map((c) =>
              lineWithRight(c.name + (c.issuer ? ` · ${c.issuer}` : ''), c.date, ctx),
            ),
          ]
        : [];
    case 'languages':
      return data.languages && data.languages.length > 0
        ? [head(), ...data.languages.map((l) => lineWithRight(l.name, l.level, ctx))]
        : [];
    case 'activities':
      return data.activities && data.activities.length > 0
        ? [head(), ...data.activities.flatMap((a) => actEntry(a, ctx))]
        : [];
    case 'interests':
      return clean(data.interests).length > 0
        ? [head(), new Paragraph({ spacing: { line: ctx.line }, children: richRuns(clean(data.interests).join('、'), ctx.body) })]
        : [];
    case 'custom': {
      const c = (data.custom || []).find((x) => x.id === customId);
      return c && c.content && c.content.trim() ? [head(), ...richBlock(c.content, ctx)] : [];
    }
    default:
      return [];
  }
};

// 构建 docx 文档（导出供测试：可用 Packer.toBuffer 验证产物）
export const buildResumeDoc = (data: ResumeData): Document => {
  const ctx = buildCtx(data);
  const font = FONTS[data.settings?.fontFamily || 'default'] || FONTS.default;
  const margin = Math.round((data.settings?.pageMargin ?? 45) * 15);

  const children: (Paragraph | Table)[] = [...buildHeader(data, ctx)];
  resolveSections(data.sections, data.custom).forEach((sec) => {
    if (sec.hidden) return;
    children.push(...renderSection(sec.key, sec.title, sec.customId, data, ctx));
  });

  return new Document({
    styles: {
      default: {
        document: { run: { font, size: ctx.body } },
      },
    },
    numbering: {
      config: [
        {
          reference: 'rs-bullets',
          levels: [
            {
              level: 0,
              format: LevelFormat.BULLET,
              text: '•',
              alignment: AlignmentType.LEFT,
              style: { paragraph: { indent: { left: 360, hanging: 200 } } },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          page: {
            size: { width: 11906, height: 16838 }, // A4
            margin: { top: margin, right: margin, bottom: margin, left: margin },
          },
        },
        children,
      },
    ],
  });
};

// 浏览器端导出：生成 .docx Blob 并触发下载
export const downloadResumeWord = async (data: ResumeData): Promise<void> => {
  const blob = await Packer.toBlob(buildResumeDoc(data));
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${data.id}.docx`;
  a.click();
  URL.revokeObjectURL(url);
};
