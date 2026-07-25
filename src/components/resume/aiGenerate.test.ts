import { describe, it, expect, vi, afterEach } from 'vitest';
import { extractJson, polishHighlights, translateResume, parseResume } from './aiGenerate';
import type { ResumeData } from '../../types/resume';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('extractJson', () => {
  it('parses a bare JSON object', () => {
    const obj = extractJson('{"a":1,"b":"x"}') as Record<string, unknown>;
    expect(obj.a).toBe(1);
    expect(obj.b).toBe('x');
  });

  it('strips ```json code fences', () => {
    const obj = extractJson('```json\n{"a":2}\n```') as Record<string, unknown>;
    expect(obj.a).toBe(2);
  });

  it('extracts JSON embedded in surrounding prose', () => {
    const obj = extractJson(
      '这是结果：\n{"label":"x","basics":{"name":"R"}} 完成',
    ) as { label: string; basics: { name: string } };
    expect(obj.label).toBe('x');
    expect(obj.basics.name).toBe('R');
  });

  it('parses a bare JSON array', () => {
    const arr = extractJson('["a","b"]') as string[];
    expect(arr).toEqual(['a', 'b']);
  });

  it('extracts an array embedded in prose', () => {
    const arr = extractJson('结果如下：\n["x","y","z"]\n以上') as string[];
    expect(arr).toEqual(['x', 'y', 'z']);
  });

  it('throws on invalid JSON', () => {
    expect(() => extractJson('not json at all')).toThrow();
  });
});

const mockFetchReturning = (json: unknown) =>
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    new Response(
      JSON.stringify({ content: [{ type: 'text', text: JSON.stringify(json) }] }),
      { status: 200, headers: { 'content-type': 'application/json' } },
    ),
  );

describe('polishHighlights', () => {
  it('returns polished highlights of the same length', async () => {
    mockFetchReturning({ highlights: ['重构核心链路，延迟下降 80%', '落地缓存，成本下降 60%'] });
    const out = await polishHighlights({
      apiKey: 'sk-test',
      model: 'claude-sonnet-5',
      highlights: ['做了重构', '搞了缓存'],
    });
    expect(out).toEqual(['重构核心链路，延迟下降 80%', '落地缓存，成本下降 60%']);
  });

  it('accepts a bare array response too', async () => {
    mockFetchReturning(['甲', '乙']);
    const out = await polishHighlights({
      apiKey: 'sk-test',
      model: 'claude-sonnet-5',
      highlights: ['a', 'b'],
    });
    expect(out).toEqual(['甲', '乙']);
  });

  it('returns empty array for empty input without calling the API', async () => {
    const spy = vi.spyOn(globalThis, 'fetch');
    const out = await polishHighlights({
      apiKey: 'sk-test',
      model: 'claude-sonnet-5',
      highlights: ['  ', ''],
    });
    expect(out).toEqual([]);
    expect(spy).not.toHaveBeenCalled();
  });

  it('throws when the model returns a mismatched count', async () => {
    mockFetchReturning({ highlights: ['只有一条'] });
    await expect(
      polishHighlights({
        apiKey: 'sk-test',
        model: 'claude-sonnet-5',
        highlights: ['a', 'b'],
      }),
    ).rejects.toThrow(/条数/);
  });

  it('surfaces API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'invalid x-api-key' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(
      polishHighlights({
        apiKey: 'bad',
        model: 'claude-sonnet-5',
        highlights: ['a'],
      }),
    ).rejects.toThrow('invalid x-api-key');
  });
});

const BASE_RESUME: ResumeData = {
  id: '01-default',
  label: '算法岗·2026',
  template: 'classic',
  theme: 'blue',
  basics: { name: '张三', title: '前端工程师', summary: '五年经验' },
  work: [{ company: '某公司', position: '前端', highlights: ['负责重构'] }],
};

describe('translateResume', () => {
  it('returns the translated ResumeData from the model', async () => {
    const translated: ResumeData = {
      ...BASE_RESUME,
      label: 'Algorithm · 2026',
      basics: { name: 'Zhang San', title: 'Frontend Engineer', summary: 'Five years' },
    };
    mockFetchReturning(translated);
    const out = await translateResume({
      apiKey: 'sk-test',
      model: 'claude-sonnet-5',
      base: BASE_RESUME,
    });
    expect(out.basics.title).toBe('Frontend Engineer');
    expect(out.label).toBe('Algorithm · 2026');
  });

  it('throws when the model returns an invalid resume (no basics)', async () => {
    mockFetchReturning({ label: 'x' });
    await expect(
      translateResume({ apiKey: 'sk-test', model: 'claude-sonnet-5', base: BASE_RESUME }),
    ).rejects.toThrow(/不是有效的简历/);
  });

  it('surfaces API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'invalid x-api-key' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(
      translateResume({ apiKey: 'bad', model: 'claude-sonnet-5', base: BASE_RESUME }),
    ).rejects.toThrow('invalid x-api-key');
  });
});

describe('parseResume', () => {
  it('parses resume text into structured ResumeData', async () => {
    const parsed: ResumeData = {
      id: 'imported',
      label: '李四·后端工程师',
      basics: { name: '李四', title: '后端工程师', email: 'lisi@example.com' },
      work: [{ company: '某厂', position: '后端', highlights: ['负责订单系统'] }],
      skills: [{ category: '语言', items: ['Go', 'Python'] }],
    };
    mockFetchReturning(parsed);
    const out = await parseResume({
      apiKey: 'sk-test',
      model: 'claude-sonnet-5',
      text: '李四 后端工程师 lisi@example.com 工作经历：某厂 后端，负责订单系统…',
    });
    expect(out.basics.name).toBe('李四');
    expect(out.basics.title).toBe('后端工程师');
    expect(out.work?.[0].company).toBe('某厂');
  });

  it('throws when the parsed result has no name', async () => {
    mockFetchReturning({ label: 'x', basics: { title: '工程师' } });
    await expect(
      parseResume({ apiKey: 'sk-test', model: 'claude-sonnet-5', text: '无姓名文本' }),
    ).rejects.toThrow(/姓名/);
  });

  it('surfaces API errors', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: { message: 'invalid x-api-key' } }), {
        status: 401,
        headers: { 'content-type': 'application/json' },
      }),
    );
    await expect(
      parseResume({ apiKey: 'bad', model: 'claude-sonnet-5', text: '张三' }),
    ).rejects.toThrow('invalid x-api-key');
  });
});
