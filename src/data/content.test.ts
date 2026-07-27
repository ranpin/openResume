import { describe, it, expect, vi, afterEach } from 'vitest';
import { loadContent } from './content';

// 远程模式：mock fetch 模拟数据仓库（raw.githubusercontent.com）响应

const res = (body: string, status = 200) => new Response(body, { status });

/** 按 URL 后缀路由到响应体；未命中的 URL 返回 404 */
const mockRoutes = (routes: Record<string, string>) =>
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    for (const [suffix, body] of Object.entries(routes)) {
      if (url.endsWith(suffix)) return res(body);
    }
    return res('', 404);
  });

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadContent（远程模式）', () => {
  it('按 index.json 清单拉取各 YAML，id 取自文件名、按路径升序', async () => {
    const fetchSpy = mockRoutes({
      // 清单故意乱序，验证排序
      '/index.json': JSON.stringify({
        resumes: ['resumes/02-second.yaml', 'resumes/01-default.yaml'],
        projects: ['projects/01-a.yaml'],
        internships: ['internships/01-x.yaml'],
        honors: ['honors.yaml'],
      }),
      '/resumes/01-default.yaml': 'label: 默认简历\nbasics:\n  name: 张三\n',
      '/resumes/02-second.yaml': 'label: 第二份\nbasics:\n  name: 李四\n',
      '/projects/01-a.yaml': 'title: 项目甲\n',
      '/internships/01-x.yaml': 'company: 公司甲\n',
      '/honors.yaml': '- title: 一等奖学金\n- title: 优秀毕业生\n',
    });

    const bundle = await loadContent();

    expect(bundle.resumes.map((r) => r.id)).toEqual(['01-default', '02-second']);
    expect(bundle.resumes[0].label).toBe('默认简历');
    expect(bundle.resumes[0].basics.name).toBe('张三');
    expect(bundle.projects).toEqual([{ id: '01-a', title: '项目甲' }]);
    expect(bundle.internships).toEqual([{ id: '01-x', company: '公司甲' }]);
    expect(bundle.honors).toEqual([
      { id: 1, title: '一等奖学金' },
      { id: 2, title: '优秀毕业生' },
    ]);
    expect(bundle.publications).toEqual([]);
    // 运行时拉取必须绕过缓存
    expect(fetchSpy).toHaveBeenCalledWith(
      expect.stringContaining('/index.json'),
      { cache: 'no-store' },
    );
  });

  it('单个文件拉取失败只跳过该文件，其余正常', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    mockRoutes({
      '/index.json': JSON.stringify({
        projects: ['projects/01-a.yaml', 'projects/02-gone.yaml'],
      }),
      '/projects/01-a.yaml': 'title: 项目甲\n',
      // 02-gone.yaml 未命中 → 404
    });

    const bundle = await loadContent();

    expect(bundle.projects).toEqual([{ id: '01-a', title: '项目甲' }]);
    expect(warn).toHaveBeenCalled();
  });

  it('清单本身失败则抛错（由上层回退离线缓存）', async () => {
    mockRoutes({}); // 全部 404
    await expect(loadContent()).rejects.toThrow('HTTP 404');
  });

  it('载入时迁移旧格式（skills 分组数组 → 富文本字符串）', async () => {
    mockRoutes({
      '/index.json': JSON.stringify({ resumes: ['resumes/01-legacy.yaml'] }),
      '/resumes/01-legacy.yaml':
        'label: 旧格式\nbasics:\n  name: 张三\nskills:\n  - group: 语言\n    items:\n      - Go\n',
    });

    const bundle = await loadContent();

    expect(typeof bundle.resumes[0].skills).toBe('string');
    expect(bundle.resumes[0].skills).toContain('Go');
  });
});
