import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkBreaks from 'remark-breaks';
import rehypeRaw from 'rehype-raw';
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize';

/**
 * 简历正文的富文本渲染：Markdown（GFM）+ 受限的内联 HTML。
 * 支持：加粗/斜体/删除线/行内代码、有序列表(序列号)、无序列表(箭头样式)、
 * 引用、链接、分割线，以及字号(<span class="rt-sm|rt-lg|rt-xl">)与下划线(<u>)。
 * 用 rehype-sanitize 白名单确保安全（即使 AI/他人内容也不会 XSS）。
 * 样式见 src/styles/resume.css 的 .resume-rt。
 */

// 富文本工具栏可产出的受限 span class：字号 / 对齐 / 颜色
const SPAN_CLASSES = [
  'rt-sm',
  'rt-lg',
  'rt-xl',
  'rt-left',
  'rt-center',
  'rt-right',
  'rt-c-red',
  'rt-c-orange',
  'rt-c-amber',
  'rt-c-green',
  'rt-c-teal',
  'rt-c-blue',
  'rt-c-violet',
  'rt-c-pink',
  'rt-c-gray',
  'rt-c-black',
];

// 在默认白名单基础上，额外允许 span（仅限上述 class）与 u（下划线）
const schema = {
  ...defaultSchema,
  tagNames: [...(defaultSchema.tagNames || []), 'span', 'u'],
  attributes: {
    ...defaultSchema.attributes,
    span: [['className', ...SPAN_CLASSES]],
  },
};

interface RichTextProps {
  children?: string;
  className?: string;
}

const RichText: React.FC<RichTextProps> = ({ children, className = '' }) => (
  <div className={`resume-rt ${className}`.trim()}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkBreaks]}
      rehypePlugins={[rehypeRaw, [rehypeSanitize, schema]]}
      components={{
        a: ({ ...props }) => (
          <a {...props} target="_blank" rel="noreferrer" />
        ),
      }}
    >
      {children || ''}
    </ReactMarkdown>
  </div>
);

export default RichText;
