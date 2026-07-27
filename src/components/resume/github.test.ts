import { it, expect, vi, afterEach } from 'vitest';
import { publishResume, publishEnabled } from './github';

// 发布管线（浏览器直连 GitHub Contents API）：mock fetch 验证请求序列

const jsonRes = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

afterEach(() => {
  vi.restoreAllMocks();
});

it('publishEnabled 跟随 DATA_SOURCE（本仓库已配置数据仓库）', () => {
  expect(publishEnabled).toBe(true);
});

it('更新已有简历：带 sha 提交，且不动 index.json', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes('/contents/resumes/01-default.yaml?ref=')) {
      return jsonRes({ sha: 'abc123' });
    }
    if (url.endsWith('/contents/resumes/01-default.yaml')) {
      return jsonRes({ commit: { html_url: 'https://github.com/c/1' } }, 201);
    }
    return jsonRes({ message: 'unexpected' }, 500);
  });

  const result = await publishResume({
    token: 't',
    resumeId: '01-default',
    yaml: 'label: x\n',
    label: '默认',
  });

  expect(result.commitUrl).toBe('https://github.com/c/1');
  const put = calls.find(
    (c) => c.url.endsWith('/contents/resumes/01-default.yaml') && c.init?.method === 'PUT',
  );
  expect(put).toBeTruthy();
  const body = JSON.parse(put!.init!.body as string) as Record<string, unknown>;
  expect(body.sha).toBe('abc123');
  expect(body.message).toBe('chore(resume): 更新「默认」');
  expect(body.content).toBe(btoa('label: x\n'));
  // 已有文件不触发清单维护
  expect(calls.some((c) => c.url.includes('index.json'))).toBe(false);
});

it('首次发布：新建文件后把路径登记进 index.json（第二次提交）', async () => {
  const calls: Array<{ url: string; init?: RequestInit }> = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = String(input);
    calls.push({ url, init });
    if (url.includes('/contents/resumes/09-new.yaml?ref=')) {
      return jsonRes({ message: 'Not Found' }, 404); // 文件不存在 → 新建
    }
    if (url.endsWith('/contents/resumes/09-new.yaml')) {
      return jsonRes({ commit: { html_url: 'https://github.com/c/2' } }, 201);
    }
    if (url.includes('raw.githubusercontent.com') && url.endsWith('/index.json')) {
      return jsonRes({ resumes: ['resumes/01-default.yaml'] });
    }
    if (url.includes('/contents/index.json?ref=')) {
      return jsonRes({ sha: 'idx-sha' });
    }
    if (url.endsWith('/contents/index.json')) {
      return jsonRes({ commit: { html_url: 'https://github.com/c/3' } }, 201);
    }
    return jsonRes({ message: 'unexpected' }, 500);
  });

  const result = await publishResume({
    token: 't',
    resumeId: '09-new',
    yaml: 'label: 新简历\n',
    label: '新简历',
  });

  // 返回的是简历本身的提交链接
  expect(result.commitUrl).toBe('https://github.com/c/2');
  // 简历提交不带 sha（新建）
  const putResume = calls.find(
    (c) => c.url.endsWith('/contents/resumes/09-new.yaml') && c.init?.method === 'PUT',
  );
  expect(JSON.parse(putResume!.init!.body as string).sha).toBeUndefined();
  // index.json 追加并排序后写回
  const putIndex = calls.find(
    (c) => c.url.endsWith('/contents/index.json') && c.init?.method === 'PUT',
  );
  expect(putIndex).toBeTruthy();
  const indexBody = JSON.parse(putIndex!.init!.body as string) as Record<string, unknown>;
  expect(indexBody.sha).toBe('idx-sha');
  const content = JSON.parse(atob(indexBody.content as string)) as { resumes: string[] };
  expect(content.resumes).toEqual([
    'resumes/01-default.yaml',
    'resumes/09-new.yaml',
  ]);
});

it('API 报错时抛出带 HTTP 状态的信息', async () => {
  vi.spyOn(globalThis, 'fetch').mockResolvedValue(
    jsonRes({ message: 'Bad credentials' }, 401),
  );
  await expect(
    publishResume({ token: 'bad', resumeId: '01-default', yaml: 'x', label: 'x' }),
  ).rejects.toThrow('Bad credentials（HTTP 401）');
});
