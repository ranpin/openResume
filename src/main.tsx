import React from 'react';
import { createRoot } from 'react-dom/client';
// 自托管 Inter 字体
import '@fontsource/inter/300.css';
import '@fontsource/inter/400.css';
import '@fontsource/inter/500.css';
import '@fontsource/inter/600.css';
import App from './App';
import './styles/index.css';
// 经历库详情的代码高亮（Markdown 组件用）
import 'highlight.js/styles/github.css';
// 打印 / 导出 PDF 时只输出简历文档
import './styles/print.css';
// 简历正文富文本排版
import './styles/resume.css';

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
