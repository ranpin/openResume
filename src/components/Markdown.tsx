import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownProps {
  children?: string;
  /** 额外的 prose 尺寸/主题类，如 "prose-sm prose-blue" */
  className?: string;
}

/**
 * 统一的 Markdown 渲染组件：react-markdown + GFM，外层套 Tailwind Typography 的 prose。
 * 用于文章正文与项目详情的长文本字段。
 */
const Markdown: React.FC<MarkdownProps> = ({ children, className = '' }) => (
  <div className={`prose max-w-none ${className}`.trim()}>
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      rehypePlugins={[rehypeHighlight]}
    >
      {children || ''}
    </ReactMarkdown>
  </div>
);

export default Markdown;
