import { describe, it, expect, vi, afterEach } from 'vitest';

// 纯本地模式（DATA_SOURCE = null）：不发起任何网络请求，内容恒空

vi.mock('./source', () => ({
  DATA_SOURCE: null,
  DATA_BASE_URL: null,
}));

import { loadContent, EMPTY_CONTENT } from './content';

afterEach(() => {
  vi.restoreAllMocks();
});

describe('loadContent（纯本地模式）', () => {
  it('直接返回 EMPTY_CONTENT，不发起 fetch', async () => {
    const fetchSpy = vi.spyOn(globalThis, 'fetch');
    await expect(loadContent()).resolves.toBe(EMPTY_CONTENT);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
