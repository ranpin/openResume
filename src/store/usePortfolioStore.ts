import { create } from 'zustand';
import {
  projects as initialProjects,
  publications as initialPublications,
  internships as initialInternships,
  honors as initialHonors,
} from '../data/content';
import type { Project, Publication, Internship, Honor } from '../types';

// 向后兼容：允许从 store 处继续导入这些类型
export type { Project, Publication, Internship, Honor } from '../types';

// 经历库只读数据 + 「详细经历」目录的分类切换状态。
export interface PortfolioState {
  projects: Project[];
  publications: Publication[];
  internships: Internship[];
  honors: Honor[];

  resumeCategory: string;
  setResumeCategory: (category: string) => void;
}

export const usePortfolioStore = create<PortfolioState>()((set) => ({
  projects: initialProjects as Project[],
  publications: initialPublications as Publication[],
  internships: initialInternships as Internship[],
  honors: initialHonors as Honor[],

  resumeCategory: 'projects',
  setResumeCategory: (category) => set({ resumeCategory: category }),
}));
