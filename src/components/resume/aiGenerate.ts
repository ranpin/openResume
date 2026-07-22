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

// 从模型回复里稳健地抠出 JSON（容忍代码块围栏 / 前后杂字）
export function extractJson(text: string): unknown {
  let t = (text || '').trim();
  const fence = /```(?:json)?\s*([\s\S]*?)```/.exec(t);
  if (fence) t = fence[1].trim();
  if (!t.startsWith('{')) {
    const s = t.indexOf('{');
    const e = t.lastIndexOf('}');
    if (s >= 0 && e > s) t = t.slice(s, e + 1);
  }
  return JSON.parse(t);
}

const SYSTEM = `你是资深简历顾问。只输出一个 JSON 对象，符合下面的 TypeScript 类型，禁止输出任何解释或 markdown 代码块：
type Project = {name:string;role?:string;period?:string;tech?:string[];highlights?:string[];link?:string};
type ResumeData = { label:string; target?:string; template?:'classic'|'sidebar'|'compact'; theme?:'blue'|'emerald'|'violet'|'rose'|'slate'; settings?:{fontScale?:number;lineHeight?:number;blockGap?:number;pageMargin?:number}; sections?:{key:'summary'|'education'|'work'|'projects'|'skills'|'awards';title?:string;hidden?:boolean}[]; basics:{name:string;title?:string;email?:string;phone?:string;location?:string;website?:string;github?:string;summary?:string;photo?:string}; education?:{school:string;degree?:string;major?:string;period?:string;gpa?:string;detail?:string}[]; work?:{company:string;position?:string;period?:string;location?:string;highlights?:string[];projects?:Project[]}[]; projects?:Project[]; skills?:{category?:string;items:string[]}[]; awards?:{title:string;issuer?:string;date?:string}[] };
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
      max_tokens: 4096,
      system: SYSTEM,
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
  const text: string = (payload.content || [])
    .filter((b: { type?: string }) => b.type === 'text')
    .map((b: { text?: string }) => b.text || '')
    .join('\n');

  const parsed = extractJson(text) as ResumeData;
  if (!parsed || !parsed.basics || !parsed.basics.name) {
    throw new Error('模型返回的内容不是有效的简历 JSON');
  }
  return parsed;
}
