import { create } from 'zustand';
import {
  loadContent,
  EMPTY_CONTENT,
  type ContentBundle,
} from '../data/content';
import { idbGet, idbSet } from './idb';

// 远程内容（简历 + 经历库）的加载态与数据，供 ResumeSection / ResumeCatalog /
// SmartRecommendations 读取。成功拉取后缓存进 IndexedDB，网络失败时回退缓存
// （fromCache=true，UI 提示离线数据）。纯本地模式下 load() 立即 ready、内容恒空。

const CACHE_KEY = 'content-cache';

interface ContentCache {
  fetchedAt: number;
  bundle: ContentBundle;
}

export interface ContentState extends ContentBundle {
  status: 'loading' | 'ready' | 'error';
  error: string | null;
  fromCache: boolean;
  fetchedAt: number | null;
  load: () => Promise<void>;
}

export const useContentStore = create<ContentState>()((set) => {
  let inflight: Promise<void> | null = null;

  const load = (): Promise<void> => {
    if (inflight) return inflight;
    inflight = (async () => {
      set({ status: 'loading', error: null });
      try {
        const bundle = await loadContent();
        const fetchedAt = Date.now();
        set({
          ...bundle,
          status: 'ready',
          error: null,
          fromCache: false,
          fetchedAt,
        });
        idbSet(CACHE_KEY, { fetchedAt, bundle } satisfies ContentCache).catch(
          () => {
            /* 缓存写入失败不影响本次展示 */
          },
        );
      } catch (e) {
        const cached = await idbGet<ContentCache>(CACHE_KEY).catch(
          () => undefined,
        );
        if (cached) {
          set({
            ...cached.bundle,
            status: 'ready',
            error: null,
            fromCache: true,
            fetchedAt: cached.fetchedAt,
          });
        } else {
          set({
            status: 'error',
            error: e instanceof Error ? e.message : '内容加载失败',
          });
        }
      }
    })().finally(() => {
      inflight = null;
    });
    return inflight;
  };

  return {
    ...EMPTY_CONTENT,
    status: 'loading',
    error: null,
    fromCache: false,
    fetchedAt: null,
    load,
  };
});
