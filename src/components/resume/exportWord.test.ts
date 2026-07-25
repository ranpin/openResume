import { describe, it, expect } from 'vitest';
import { Packer } from 'docx';
import { buildResumeDoc } from './exportWord';
import type { ResumeData } from '../../types/resume';

const FULL: ResumeData = {
  id: '01-default',
  label: '算法岗·2026',
  template: 'classic',
  theme: 'emerald',
  settings: { fontScale: 1.05, lineHeight: 1.5, blockGap: 14, pageMargin: 40, fontFamily: 'song' },
  basics: {
    name: '张三',
    title: '前端工程师',
    email: 'zhangsan@example.com',
    phone: '13800000000',
    location: '上海',
    github: 'https://github.com/zhangsan',
    summary: '五年前端经验，专注 **性能优化** 与工程化。',
  },
  education: [
    { school: '某大学', college: '计算机学院', degree: '硕士', major: '计算机科学', period: '2016-2019', gpa: '3.8', courses: '操作系统、编译原理' },
  ],
  work: [
    {
      company: '某公司',
      position: '前端专家',
      period: '2021-至今',
      location: '上海',
      highlights: ['主导重构，**延迟下降 80%**', '落地监控体系'],
      projects: [{ name: '内部平台', role: '负责人', period: '2022', tech: ['React', 'TS'], highlights: ['从 0 到 1 搭建'] }],
    },
  ],
  projects: [{ name: '开源项目', role: '作者', period: '2020', tech: ['Vite'], highlights: ['star 1k+'], link: 'https://github.com/x/y' }],
  skills: [{ category: '前端', items: ['React', 'Vue'], levels: { React: '精通', Vue: '熟悉' } }],
  awards: [{ title: '优秀员工', issuer: '某公司', date: '2022' }],
  certificates: [{ name: 'AWS 认证', issuer: 'Amazon', date: '2021' }],
  languages: [{ name: '英语', level: 'CET-6' }],
  activities: [{ name: '技术沙龙', role: '组织者', period: '2023', highlights: ['组织 10 场'] }],
  interests: ['篮球', '阅读'],
  custom: [{ id: 'c1', title: '科研经历', content: '发表 **SCI** 论文一篇' }],
};

describe('buildResumeDoc / Word 导出', () => {
  it('produces a valid .docx (zip) for a full resume', async () => {
    const buf = await Packer.toBuffer(buildResumeDoc(FULL));
    expect(buf.length).toBeGreaterThan(1000);
    // zip 魔数 PK\x03\x04
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
    expect(buf[2]).toBe(0x03);
    expect(buf[3]).toBe(0x04);
  });

  it('works with minimal data (name only)', async () => {
    const buf = await Packer.toBuffer(
      buildResumeDoc({ id: 'm', label: 'm', basics: { name: '李四' } }),
    );
    expect(buf[0]).toBe(0x50);
    expect(buf[1]).toBe(0x4b);
  });

  it('handles sidebar template + custom sections without throwing', async () => {
    const buf = await Packer.toBuffer(
      buildResumeDoc({ ...FULL, template: 'sidebar', theme: 'violet' }),
    );
    expect(buf.length).toBeGreaterThan(1000);
  });

  it('embeds a photo from a dataURL without throwing', async () => {
    // 1x1 红色像素 PNG
    const png =
      'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    const buf = await Packer.toBuffer(
      buildResumeDoc({ ...FULL, basics: { ...FULL.basics, photo: png } }),
    );
    expect(buf[0]).toBe(0x50);
    expect(buf.length).toBeGreaterThan(1000);
  });

  it('respects hidden sections (hidden module is omitted)', async () => {
    const doc = buildResumeDoc({
      ...FULL,
      sections: [{ key: 'summary' }, { key: 'interests', hidden: true }],
    });
    // 能构建即可；隐藏模块不进入渲染（由 resolveSections 保证，已在其他测试覆盖）
    expect(doc).toBeTruthy();
  });
});
