// IndexedDB 极简 kv 封装（零依赖）。用于：
//   1. 编辑器草稿持久化（zustand persist 的异步 storage，见 idbStateStorage）
//   2. 远程内容离线缓存（useContentStore）
// 相比 localStorage：配额以 GB 计，base64 内嵌证件照不再受 5MB 上限威胁。

import type { StateStorage } from 'zustand/middleware';

const DB_NAME = 'ranpin-resume';
const DB_VERSION = 1;
const STORE = 'kv';

let dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = () => {
        if (!req.result.objectStoreNames.contains(STORE)) {
          req.result.createObjectStore(STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  return dbPromise;
};

const txDone = (tx: IDBTransaction): Promise<void> =>
  new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });

export const idbGet = async <T>(key: string): Promise<T | undefined> => {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readonly');
  const req = tx.objectStore(STORE).get(key);
  await txDone(tx);
  return req.result as T | undefined;
};

export const idbSet = async (key: string, value: unknown): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).put(value, key);
  await txDone(tx);
};

export const idbDel = async (key: string): Promise<void> => {
  const db = await openDB();
  const tx = db.transaction(STORE, 'readwrite');
  tx.objectStore(STORE).delete(key);
  await txDone(tx);
};

// --- localStorage 兜底（IDB 不可用的降级环境，如个别隐私模式）---

const lsGet = (name: string): string | null => {
  try {
    return localStorage.getItem(name);
  } catch {
    return null;
  }
};
const lsSet = (name: string, value: string) => {
  try {
    localStorage.setItem(name, value);
  } catch {
    /* 仅本次会话有效 */
  }
};
const lsDel = (name: string) => {
  try {
    localStorage.removeItem(name);
  } catch {
    /* ignore */
  }
};

/**
 * zustand persist 用的异步 storage：IndexedDB 优先，单项操作失败时降级 localStorage。
 * 值以 JSON 字符串存取（与 createJSONStorage 约定一致）。
 */
export const idbStateStorage: StateStorage = {
  getItem: async (name) => {
    try {
      return (await idbGet<string>(name)) ?? null;
    } catch {
      return lsGet(name);
    }
  },
  setItem: async (name, value) => {
    try {
      await idbSet(name, value);
    } catch {
      lsSet(name, value);
    }
  },
  removeItem: async (name) => {
    try {
      await idbDel(name);
    } catch {
      lsDel(name);
    }
  },
};

/**
 * 一次性把旧 localStorage 持久化键迁入 IndexedDB（迁出后删除旧键）。
 * 已有 IDB 值时不覆盖。IDB 不可用时静默跳过（数据仍留在 localStorage）。
 */
export const migrateLegacyKeys = async (keys: string[]): Promise<void> => {
  for (const key of keys) {
    const legacy = lsGet(key);
    if (legacy === null) continue;
    try {
      if ((await idbGet(key)) === undefined) await idbSet(key, legacy);
      lsDel(key);
    } catch {
      /* IDB 不可用：保留旧键，下次再迁 */
    }
  }
};
