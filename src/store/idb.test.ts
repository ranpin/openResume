import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import {
  idbGet,
  idbSet,
  idbDel,
  idbStateStorage,
  migrateLegacyKeys,
} from './idb';

// fake-indexeddb/auto 提供内存版 IndexedDB；各用例用独立键名互不干扰

beforeEach(() => {
  localStorage.clear();
});

describe('idb kv 封装', () => {
  it('set/get 往返（结构化值）', async () => {
    await idbSet('t1', { a: 1, nested: ['x'] });
    await expect(idbGet('t1')).resolves.toEqual({ a: 1, nested: ['x'] });
  });

  it('get 不存在的键返回 undefined', async () => {
    await expect(idbGet('t-missing')).resolves.toBeUndefined();
  });

  it('del 删除键', async () => {
    await idbSet('t2', 'v');
    await idbDel('t2');
    await expect(idbGet('t2')).resolves.toBeUndefined();
  });
});

describe('idbStateStorage（zustand persist 适配）', () => {
  it('JSON 字符串存取往返', async () => {
    await idbStateStorage.setItem('s1', '{"drafts":{}}');
    await expect(idbStateStorage.getItem('s1')).resolves.toBe('{"drafts":{}}');
    await idbStateStorage.removeItem('s1');
    await expect(idbStateStorage.getItem('s1')).resolves.toBeNull();
  });
});

describe('migrateLegacyKeys（localStorage → IndexedDB 一次性迁移）', () => {
  it('迁入后删除旧 localStorage 键', async () => {
    localStorage.setItem('m1', '{"v":1}');
    await migrateLegacyKeys(['m1']);
    await expect(idbGet('m1')).resolves.toBe('{"v":1}');
    expect(localStorage.getItem('m1')).toBeNull();
  });

  it('IDB 已有值时不覆盖，但仍清掉旧键', async () => {
    await idbSet('m2', 'new');
    localStorage.setItem('m2', 'legacy');
    await migrateLegacyKeys(['m2']);
    await expect(idbGet('m2')).resolves.toBe('new');
    expect(localStorage.getItem('m2')).toBeNull();
  });

  it('无旧键时为空操作', async () => {
    await migrateLegacyKeys(['m3']);
    await expect(idbGet('m3')).resolves.toBeUndefined();
  });
});
