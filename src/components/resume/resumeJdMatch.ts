// 岗位匹配度：把 JD（职位描述）文本与简历内容做关键词比对。
// 纯客户端启发式：技术词表 + 英文高频词 + 中文二元组，无需 AI、完全可复现。
// 输出匹配分（0-100）、命中关键词、缺失关键词（缺失的即「值得往简历里补」的词）。

import type { ResumeData } from '../../types/resume';

export interface JdKeyword {
  term: string;
  count: number;
  matched: boolean;
}

export interface JdMatchResult {
  score: number; // 0-100，命中率
  total: number;
  matched: JdKeyword[];
  missing: JdKeyword[];
}

// 常见技术 / 岗位词表（命中即视为关键词，权重更高）
const TECH_TERMS = new Set(
  [
    'javascript', 'typescript', 'react', 'vue', 'angular', 'svelte', 'next.js', 'nextjs',
    'nuxt', 'node', 'node.js', 'nodejs', 'express', 'koa', 'nest', 'nestjs', 'webpack',
    'vite', 'rollup', 'babel', 'eslint', 'tailwind', 'sass', 'less', 'css', 'html',
    'python', 'java', 'golang', 'go', 'rust', 'c++', 'c#', 'php', 'ruby', 'swift',
    'kotlin', 'flutter', 'android', 'ios', 'spring', 'springboot', 'django', 'flask',
    'fastapi', 'rails', 'laravel', 'sql', 'mysql', 'postgres', 'postgresql', 'mongodb',
    'redis', 'kafka', 'rabbitmq', 'elasticsearch', 'es', 'clickhouse', 'hive', 'spark',
    'flink', 'hadoop', 'docker', 'kubernetes', 'k8s', 'jenkins', 'gitlab', 'github',
    'ci/cd', 'devops', 'aws', 'azure', 'gcp', 'aliyun', 'linux', 'nginx', 'grpc',
    'graphql', 'restful', 'microservices', 'serverless', '机器学习', '深度学习',
    '神经网络', 'nlp', '自然语言处理', '计算机视觉', 'opencv', 'pytorch', 'tensorflow',
    '大模型', 'llm', 'prompt', 'rag', 'agent', '数据挖掘', '数据分析', '数据仓库',
    'etl', 'bi', 'tableau', 'powerbi', '产品经理', '产品运营', '用户增长', '增长黑客',
    'seo', 'sem', '新媒体', '内容运营', '活动策划', 'ui', 'ux', '交互设计',
    '视觉设计', 'figma', 'sketch', 'photoshop', 'illustrator', '原型', 'axure',
    '项目管理', 'pmp', '敏捷', 'scrum', 'kanban', '测试开发', '自动化测试',
    '性能测试', 'selenium', 'pytest', 'unittest', '安全', '渗透测试', '密码学',
    '区块链', 'web3', 'solidity', '嵌入式', '单片机', 'stm32', '物联网', 'iot',
    '5g', '云计算', '边缘计算', '音视频', 'webrtc', 'ffmpeg', '小程序', '微信小程序',
    'uniapp', 'taro', 'electron', 'rust', 'wasm', 'webassembly',
  ].map((t) => t.toLowerCase()),
);

// 英文停用词（JD 里的高频填充词，不具区分度）
const EN_STOPWORDS = new Set(
  [
    'the', 'and', 'for', 'with', 'you', 'your', 'yours', 'our', 'ours', 'are', 'is',
    'was', 'were', 'be', 'been', 'being', 'will', 'would', 'have', 'has', 'had',
    'this', 'that', 'these', 'those', 'from', 'they', 'them', 'their', 'what', 'when',
    'where', 'who', 'whom', 'which', 'while', 'about', 'into', 'over', 'under', 'more',
    'most', 'other', 'some', 'such', 'than', 'then', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'out', 'off', 'down', 'further', 'once',
    'here', 'there', 'all', 'any', 'both', 'each', 'few', 'not', 'only', 'own', 'same',
    'can', 'could', 'should', 'shall', 'may', 'might', 'must', 'etc', 'able', 'also',
    'work', 'working', 'works', 'team', 'teams', 'role', 'roles', 'job', 'jobs',
    'position', 'positions', 'candidate', 'candidates', 'experience', 'experienced',
    'years', 'year', 'ability', 'abilities', 'strong', 'good', 'great', 'skills',
    'skill', 'required', 'require', 'requires', 'preferred', 'prefer', 'plus', 'nice',
    'responsibilities', 'responsibility', 'requirements', 'requirement', 'duties',
    'duty', 'including', 'include', 'includes', 'related', 'relevant', 'well', 'like',
    'use', 'used', 'using', 'new', 'one', 'two', 'per', 'day', 'week', 'month',
    'company', 'business', 'service', 'services', 'product', 'products', 'high',
    'best', 'better', 'help', 'join', 'looking', 'seeking', 'ideal', 'passion',
    'passionate', 'excellent', 'solid', 'proven', 'track', 'record', 'degree',
    'bachelor', 'master', 'phd', 'university', 'college', 'major', 'field', 'knowledge',
    'understanding', 'familiar', 'familiarity', 'proficient', 'proficiency', 'hands',
    'on', 'of', 'in', 'to', 'a', 'an', 'as', 'at', 'by', 'or', 'if', 'we', 'us',
    'need', 'needs', 'needed', 'someone', 'people', 'person', 'want', 'wants',
    'across', 'within', 'without', 'via', 'ensure', 'ensures', 'drive', 'drives',
    'etc', 'eg', 'ie', 'must', 'shall', 'may', 'might', 'could', 'would', 'should',
  ].map((t) => t.toLowerCase()),
);

// 中文停用二元组（JD 填充语，不具区分度）
const CN_STOP_BIGRAMS = new Set([
  '岗位', '职责', '任职', '要求', '优先', '具备', '熟悉', '了解', '能够', '使用',
  '具有', '以及', '通过', '进行', '我们', '你们', '他们', '公司', '工作', '经验',
  '能力', '相关', '完成', '负责', '加分', '本科', '学历', '熟练', '掌握', '良好',
  '沟通', '协作', '团队', '积极', '主动', '认真', '以上', '年以', '学历', '专业',
  '以上', '考虑', '特别', '优秀', '者优', '欢迎', '加入', '提供', '具有', '较强',
  '良好', '扎实', '丰富', '优先', '考虑',
]);

const isCjk = (ch: string) => /[\u4e00-\u9fff]/.test(ch);

function extractKeywords(jd: string): JdKeyword[] {
  const text = jd.toLowerCase();
  const counts = new Map<string, { count: number; weight: number }>();

  const bump = (term: string, weight: number) => {
    if (!term) return;
    const cur = counts.get(term) || { count: 0, weight: 0 };
    cur.count += 1;
    cur.weight = Math.max(cur.weight, weight);
    counts.set(term, cur);
  };

  // 1. 英文 / 数字 token（含 # + . / 连写，如 c++ node.js ci/cd）
  const ascii = text.match(/[a-z][a-z0-9+#./-]{1,}/g) || [];
  for (const raw of ascii) {
    const t = raw.replace(/[./-]+$/, '');
    if (!t || t.length < 2) continue;
    if (EN_STOPWORDS.has(t)) continue;
    bump(t, TECH_TERMS.has(t) ? 3 : 1);
  }

  // 2. 中文二元组（连续汉字段内滑窗，出现 >= 2 次才保留）
  const cjkRuns = jd.match(/[\u4e00-\u9fff]{2,}/g) || [];
  const bigramCount = new Map<string, number>();
  for (const run of cjkRuns) {
    for (let i = 0; i + 2 <= run.length; i++) {
      const bg = run.slice(i, i + 2);
      bigramCount.set(bg, (bigramCount.get(bg) || 0) + 1);
    }
  }
  for (const [bg, c] of bigramCount) {
    if (c < 2) continue;
    if (CN_STOP_BIGRAMS.has(bg)) continue;
    // 过滤含标点/数字的伪二元组（理论上不会，保险起见）
    if (!isCjk(bg[0]) || !isCjk(bg[1])) continue;
    bump(bg, TECH_TERMS.has(bg) ? 3 : 2);
  }

  return Array.from(counts.entries())
    .map(([term, { count, weight }]) => ({
      term,
      count: count * weight,
      matched: false,
    }))
    .sort((a, b) => b.count - a.count || a.term.localeCompare(b.term))
    .slice(0, 25);
}

function resumeText(d: ResumeData): string {
  const b = d.basics;
  const parts: (string | undefined)[] = [
    b.name, b.title, b.summary, b.email, b.phone, b.website, b.github,
  ];
  (d.education || []).forEach((e) =>
    parts.push(e.school, e.degree, e.major, e.courses, e.gpa),
  );
  (d.work || []).forEach((w) => {
    parts.push(w.company, w.position, ...(w.highlights || []));
    (w.projects || []).forEach((sp) =>
      parts.push(sp.name, ...(sp.tech || []), ...(sp.highlights || [])),
    );
  });
  (d.internship || []).forEach((w) => {
    parts.push(w.company, w.position, ...(w.highlights || []));
    (w.projects || []).forEach((sp) =>
      parts.push(sp.name, ...(sp.tech || []), ...(sp.highlights || [])),
    );
  });
  (d.projects || []).forEach((p) =>
    parts.push(p.name, ...(p.tech || []), ...(p.highlights || [])),
  );
  parts.push(d.skills);
  (d.awards || []).forEach((a) => parts.push(a.title));
  (d.certificates || []).forEach((c) => parts.push(c.name));
  (d.languages || []).forEach((l) => parts.push(l.name, l.level));
  (d.activities || []).forEach((a) => parts.push(a.name, a.role));
  (d.interests || []).forEach((i) => parts.push(i));
  return parts.filter(Boolean).join(' ').toLowerCase();
}

export function matchJd(d: ResumeData, jd: string): JdMatchResult {
  const keywords = extractKeywords(jd);
  const hay = resumeText(d);

  for (const k of keywords) {
    k.matched = hay.includes(k.term);
  }

  const matched = keywords.filter((k) => k.matched);
  const missing = keywords.filter((k) => !k.matched);
  const total = keywords.length;
  const score = total > 0 ? Math.round((matched.length / total) * 100) : 0;

  return { score, total, matched, missing };
}
