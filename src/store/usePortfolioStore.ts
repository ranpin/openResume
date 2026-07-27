import { create } from 'zustand';

// 向后兼容：允许从 store 处继续导入这些类型
export type { Project, Publication, Internship, Honor } from '../types';

// 「作品集」目录的分类切换状态。
// 经历库数据本身在 useContentStore（远程数据仓库 / 离线缓存）。
export interface PortfolioState {
  resumeCategory: string;
  setResumeCategory: (category: string) => void;
}

export const usePortfolioStore = create<PortfolioState>()((set) => ({
  resumeCategory: 'projects',
  setResumeCategory: (category) => set({ resumeCategory: category }),
}));
