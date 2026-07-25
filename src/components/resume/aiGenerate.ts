import type { ResumeData } from '../../types/resume';

// 浏览器直连 Anthropic Messages API 生成简历（BYOK：用户自带密钥）。
// 纯静态站无后端，密钥仅存用户本地浏览器、不入库、不经服务器；仅站点所有者本人使用。

const API = 'https://api.anthropic.com/v1/messages';
const DOCS_MANIFEST = '/edge-ai-docs/docs.json';

export const AI_MODELS: { id: string; label: string }[] = [
  { id: 'claude-sonnet-5', label: 'Sonnet 5（均衡，推荐）' },
  { id: 'claude-opus-4-8', label: 'Opus 4.8（最强）' },
  { id: 'claude-haiku-4-5-20251001', label: 'Haiku 4.5（最快省）' },
];

export interface GenerateOpts {
  apiKey: string;
  model: string;
  jd: string;
  base: ResumeData;
  signal?: AbortSignal;
}

// 从 edge-ai-docs 清单收集文档标题，作为「能力佐证」上下文（失败则忽略）
async function fetchDocTitles(): Promise<string[]> {
  try {
    const res = await fetch(DOCS_MANIFEST, { cache: 'no-cache' });
    if (!res.ok) return [];
    const m = await res.json();
    const titles: string[] = [];
    (m.groups || []).forEach((g: { docs?: { title?: string }[] }) =>
      (g.docs || []).forEach((d) => {
        if (d.title) titles.push(d.title);
      }),
    );
    return titles;
  } catch {
    return [];
  }
}

// 从模型回复里稳健地抠出 JSON（容忍代码块围栏 / 前后杂字），对象与数组都支持
export function extractJson(text: string): unknown {
  let t = (text || '').trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
  if (fence) t = fence[1].trim();
  if (!t.startsWith('{') && !t.startsWith('[')) {
    const so = t.indexOf('{');
    const sa = t.indexOf('[');
    let s = -1;
    let e = -1;
    if (so >= 0 && (sa < 0 || so < sa)) {
      s = so;
      e = t.lastIndexOf('}');
    } else if (sa >= 0) {
      s = sa;
      e = t.lastIndexOf(']');
    }
    if (s >= 0 && e > s) t = t.slice(s, e + 1);
  }
  return JSON.parse(t);
}

const SYSTEM = `你是资深简历顾问。只输出一个 JSON 对象，符合下面的 TypeScript 类型，禁止输出任何解释或 markdown 代码块：
type Project = {name:string;role?:string;period?:string;tech?:string[];highlights?:string[];link?:string};
type ResumeData = { label:string; target?:string; template?:'classic'|'sidebar'|'compact'; theme?:'blue'|'emerald'|'violet'|'rose'|'slate'; settings?:{fontScale?:number;lineHeight?:number;blockGap?:number;pageMargin?:number;fontFamily?:'default'|'song'|'hei'|'kai'|'serif'}; sections?:{key:'summary'|'education'|'work'|'projects'|'skills'|'awards'|'certificates'|'languages'|'activities'|'interests';title?:string;hidden?:boolean}[]; basics:{name:string;title?:string;email?:string;phone?:string;location?:string;website?:string;github?:string;summary?:string;photo?:string}; education?:{school:string;college?:string;degree?:string;major?:string;period?:string;gpa?:string;courses?:string;detail?:string}[]; work?:{company:string;position?:string;period?:string;location?:string;highlights?:string[];projects?:Project[]}[]; projects?:Project[]; skills?:{category?:string;items:string[];levels?:{[name:string]:'了解'|'熟悉'|'掌握'|'精通'}}[]; awards?:{title:string;issuer?:string;date?:string}[]; certificates?:{name:string;issuer?:string;date?:string}[]; languages?:{name:string;level?:string}[]; activities?:{name:string;role?:string;period?:string;highlights?:string[]}[]; interests?:string[] };
规则：保留候选人真实信息，不要编造经历或数字；针对 JD 调整措辞与条目顺序，突出匹配点；要点简洁有力，可用 **粗体** 强调关键成果/数字；语言与 JD 保持一致（默认中文）。若同一公司有多个项目，用 work[].projects 承载；不要臆造 photo（证件照由用户上传）；sections/settings 保持用户原值，除非 JD 明显需要调整模块顺序。`;

export async function generateResume(opts: GenerateOpts): Promise<ResumeData> {
  const { apiKey, model, jd, base, signal } = opts;
  const docTitles = await fetchDocTitles();
  const user = `目标岗位 JD：
${jd}

候选人现有简历(JSON)：
${JSON.stringify({ ...base, id: undefined })}

候选人技术文档主题（可参考以佐证能力）：
${docTitles.join('、') || '（无）'}

请据此生成一份针对该 JD 优化后的 ResumeData JSON。`;

  const text = await callAnthropic(apiKey, model, SYSTEM, user, 4096, signal);

  const parsed = extractJson(text) as ResumeData;
  if (!parsed || !parsed.basics || !parsed.basics.name) {
    throw new Error('模型返回的内容不是有效的简历 JSON');
  }
  return parsed;
}

// 浏览器直连 Anthropic 的底层调用：返回模型文本。供生成 / 润色 / 翻译等复用。
async function callAnthropic(
  apiKey: string,
  model: string,
  system: string,
  user: string,
  maxTokens: number,
  signal?: AbortSignal,
): Promise<string> {
  const res = await fetch(API, {
    method: 'POST',
    signal,
    headers: {
      'content-type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model,
      max_tokens: maxTokens,
      system,
      messages: [{ role: 'user', content: user }],
    }),
  });

  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    const err = await res.json().catch(() => null);
    if (err?.error?.message) msg = err.error.message;
    throw new Error(msg);
  }

  const payload = await res.json();
  return (payload.content || [])
    .filter((b: { type?: string }) => b.type === 'text')
    .map((b: { text?: string }) => b.text || '')
    .join('\n');
}

const POLISH_SYSTEM = `你是资深简历顾问，擅长把简历要点润色得更专业、更有说服力。
规则：
- 逐条润色，保持条数与顺序完全不变；
- 保留真实信息与数字，不要编造新的经历或数据；
- 用动词开头，突出成果与影响，能量化就量化；
- 每条简洁有力（一般 8-60 字），可用 **粗体** 强调关键成果/数字；
- 语言与原要点保持一致（中文原句润色为中文）；
- 只输出一个 JSON 对象 {"highlights":["...","..."]}，禁止输出解释或 markdown 代码块。`;

export interface PolishOpts {
  apiKey: string;
  model: string;
  highlights: string[];
  signal?: AbortSignal;
}

// AI 润色要点：输入若干条要点，返回等长的润色后要点数组。
export async function polishHighlights(opts: PolishOpts): Promise<string[]> {
  const { apiKey, model, highlights, signal } = opts;
  const cleaned = highlights.map((h) => h.trim()).filter((h) => h.length > 0);
  if (cleaned.length === 0) return [];

  const user = `请润色以下简历要点（JSON 数组）：
${JSON.stringify(cleaned, null, 2)}

输出 {"highlights":[...]}，条数与顺序与输入一致。`;

  const text = await callAnthropic(apiKey, model, POLISH_SYSTEM, user, 2048, signal);
  const parsed = extractJson(text) as { highlights?: unknown };
  const arr = Array.isArray(parsed)
    ? (parsed as unknown[])
    : Array.isArray(parsed?.highlights)
      ? (parsed.highlights as unknown[])
      : null;
  if (!arr) {
    throw new Error('模型返回的内容不是有效的要点 JSON');
  }
  const result = arr.map((x) => String(x).trim());
  if (result.length !== cleaned.length) {
    throw new Error(`润色结果条数（${result.length}）与原文（${cleaned.length}）不一致`);
  }
  return result;
}

const TRANSLATE_SYSTEM = `你是专业的简历翻译，把简历翻译成地道、专业的英文。
规则：
- 只输出一个 JSON 对象，结构与输入的 ResumeData 完全一致，禁止输出解释或 markdown 代码块；
- 翻译所有面向人类阅读的文本为英文：label、target，basics 的 title/summary/location，education 的 school/college/degree/major/courses/detail，work 的 company/position/location/highlights 及其内嵌 projects，projects 的 name/role/highlights，skills 的 category/items，awards 的 title/issuer，certificates 的 name/issuer，languages 的 name/level，activities 的 name/role/highlights，interests，以及 sections 里的自定义 title；
- 保留专有名词与技术栈原名（如 React、TypeScript、Kubernetes、Vue、GitHub 等）不翻译；
- 以下字段原样保留不动：id、basics.name（人名可转为拼音或英文写法）、email、phone、website、github、photo、avatar、所有 link、各类 period/date 的数字与格式、template、theme、settings、sections 的 key 与 hidden、skills.levels 的键与值（了解/熟悉/掌握/精通 保持不变）；
- 英文要点用动词开头、简洁有力，可保留 **粗体** 标记；
- 不要编造新的经历或数字，不要增删条目，保持条数与顺序不变。`;

export interface TranslateOpts {
  apiKey: string;
  model: string;
  base: ResumeData;
  signal?: AbortSignal;
}

// AI 翻译：把整份简历翻译成英文版，保留结构 / 模块 / 排版设置，返回新的 ResumeData。
export async function translateResume(opts: TranslateOpts): Promise<ResumeData> {
  const { apiKey, model, base, signal } = opts;
  const user = `请把下面这份简历(JSON)翻译成英文，输出同样结构的 ResumeData JSON：
${JSON.stringify(base)}`;

  const text = await callAnthropic(apiKey, model, TRANSLATE_SYSTEM, user, 4096, signal);
  const parsed = extractJson(text) as ResumeData;
  if (!parsed || !parsed.basics) {
    throw new Error('模型返回的内容不是有效的简历 JSON');
  }
  return parsed;
}

const PARSE_SYSTEM = `你是资深简历顾问，擅长把任意格式的简历文本解析成结构化数据。只输出一个 JSON 对象，符合下面的 TypeScript 类型，禁止输出任何解释或 markdown 代码块：
type Project = {name:string;role?:string;period?:string;tech?:string[];highlights?:string[];link?:string};
type ResumeData = { label:string; target?:string; template?:'classic'|'sidebar'|'compact'; theme?:'blue'|'emerald'|'violet'|'rose'|'slate'; sections?:{key:'summary'|'education'|'work'|'projects'|'skills'|'awards'|'certificates'|'languages'|'activities'|'interests'|'custom';title?:string;hidden?:boolean;customId?:string}[]; custom?:{id:string;title:string;content?:string}[]; basics:{name:string;title?:string;email?:string;phone?:string;location?:string;website?:string;github?:string;summary?:string}; education?:{school:string;college?:string;degree?:string;major?:string;period?:string;gpa?:string;courses?:string;detail?:string}[]; work?:{company:string;position?:string;period?:string;location?:string;highlights?:string[];projects?:Project[]}[]; projects?:Project[]; skills?:{category?:string;items:string[]}[]; awards?:{title:string;issuer?:string;date?:string}[]; certificates?:{name:string;issuer?:string;date?:string}[]; languages?:{name:string;level?:string}[]; activities?:{name:string;role?:string;period?:string;highlights?:string[]}[]; interests?:string[] };
规则：
- 从用户给的简历文本里如实抽取信息，不要编造原文没有的经历、数字或字段；原文没有的字段直接省略；
- label 用「姓名+目标岗位」或姓名概括（如「张三·前端工程师」）；
- 要点拆成 highlights 数组，每条简洁有力；能识别出的技术栈放进 tech / skills；
- 保持候选人原语言（中文简历输出中文）；
- 不要臆造 photo / avatar。`;

export interface ParseOpts {
  apiKey: string;
  model: string;
  text: string;
  signal?: AbortSignal;
}

// AI 导入：把粘贴的简历纯文本解析成结构化 ResumeData。
export async function parseResume(opts: ParseOpts): Promise<ResumeData> {
  const { apiKey, model, text, signal } = opts;
  const user = `请把下面这份简历文本解析成 ResumeData JSON：
${text}`;

  const out = await callAnthropic(apiKey, model, PARSE_SYSTEM, user, 4096, signal);
  const parsed = extractJson(out) as ResumeData;
  if (!parsed || !parsed.basics || !parsed.basics.name) {
    throw new Error('未能从文本中解析出有效的简历（至少需要姓名）');
  }
  return parsed;
}
