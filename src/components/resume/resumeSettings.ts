import type { ResumeFieldSeparator, ResumeHeaderAlign } from '../../types/resume';

// 全局排版设置的默认值与范围（字号为磅值选择，其余为滑块）
export const SETTING_DEFAULTS = {
  fontScale: 1,
  lineHeight: 1.6,
  blockGap: 16,
  pageMargin: 45,
};

// 全局字号：Word 式磅值选择。正文基准 13px（≈9.75pt），显示磅值 = 9.75 × fontScale，
// 选择字号写回对应倍率（数据模型仍是 fontScale，兼容既有简历 YAML）。
export const BODY_BASE_PT = 9.75;
export const FONT_SIZE_OPTIONS = [8, 9, 10, 11, 12, 13, 14, 15, 16];
export const scaleToPt = (scale: number): number => Math.round(BODY_BASE_PT * scale);
// 选项列表并入当前磅值（压缩排版后的非整档倍率也能正确回显）
export const fontSizeOptions = (current: number): number[] =>
  [...new Set([...FONT_SIZE_OPTIONS, current])].sort((a, b) => a - b);

// 条目标题排版选项（文本格式：单/双行 + 字段排列）
export const HEADER_LINES_OPTIONS: { id: 1 | 2; label: string }[] = [
  { id: 2, label: '双行' },
  { id: 1, label: '单行' },
];
export const FIELD_SEPARATOR_OPTIONS: { id: ResumeFieldSeparator; label: string }[] = [
  { id: 'justify', label: '分散对齐' },
  { id: 'dot', label: '·' },
  { id: 'slash', label: '/' },
  { id: 'bar', label: '|' },
];

// 个人信息（头部）板块对齐选项
export const HEADER_ALIGN_OPTIONS: { id: ResumeHeaderAlign; label: string; icon: string }[] = [
  { id: 'left', label: '左对齐', icon: 'align-left' },
  { id: 'center', label: '居中', icon: 'align-center' },
  { id: 'right', label: '右对齐', icon: 'align-right' },
];

// 「智能一页」压缩下限（与对应滑块的最小值一致）
export const FIT_MIN = { fontScale: 0.8, lineHeight: 1.2, blockGap: 6, pageMargin: 24 };
