import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { idbStateStorage } from './idb';
import type { ResumeData } from '../types/resume';

// 持久化键名（旧版 localStorage 同名键，首次启动时由 migrateLegacyKeys 迁入 IndexedDB）
export const DRAFTS_STORAGE_KEY = 'ranpin-resume-drafts';

/**
 * 简历编辑器的可变状态：本地草稿（按简历 id）持久化到 IndexedDB（见 src/store/idb.ts，
 * 不可用时自动降级 localStorage）。已发布数据只读地来自数据仓库（见 src/data/content.ts）；
 * 草稿是用户在编辑器里的改动，刷新不丢，直到「重置」或发布到数据仓库。
 *
 * SSG 安全：persist 用 skipHydration，避免预渲染 / 水合期读取存储造成不一致。
 * 组件挂载后在 useEffect 里先 migrateLegacyKeys 再 useResumeStore.persist.rehydrate()。
 */

export interface ResumeStoreState {
  drafts: Record<string, ResumeData>;
  // 最近一次「发布到仓库」时的内容指纹（normalizeResume 字符串），用于判定是否还有未发布改动
  published: Record<string, string>;
  activeId: string | null;
  hydrated: boolean;

  setActiveId: (id: string) => void;
  /** 用一份完整的 ResumeData 覆盖某 id 的草稿 */
  setDraft: (id: string, data: ResumeData) => void;
  /** 删除某 id 的草稿（恢复到已发布版本） */
  resetDraft: (id: string) => void;
  /** 记录某 id 已发布的内容指纹 */
  markPublished: (id: string, signature: string) => void;
  setHydrated: (v: boolean) => void;
}

export const useResumeStore = create<ResumeStoreState>()(
  persist(
    (set) => ({
      drafts: {},
      published: {},
      activeId: null,
      hydrated: false,

      setActiveId: (id) => set({ activeId: id }),
      setDraft: (id, data) =>
        set((s) => ({ drafts: { ...s.drafts, [id]: data } })),
      resetDraft: (id) =>
        set((s) => {
          const next = { ...s.drafts };
          delete next[id];
          return { drafts: next };
        }),
      markPublished: (id, signature) =>
        set((s) => ({ published: { ...s.published, [id]: signature } })),
      setHydrated: (v) => set({ hydrated: v }),
    }),
    {
      name: DRAFTS_STORAGE_KEY,
      storage: createJSONStorage(() => idbStateStorage),
      // 持久化草稿与已发布指纹，UI 状态（activeId/hydrated）不入库
      partialize: (s) => ({ drafts: s.drafts, published: s.published }),
      skipHydration: true,
    },
  ),
);
