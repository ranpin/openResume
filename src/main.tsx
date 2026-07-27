import React from 'react';
import { createRoot } from 'react-dom/client';
// 自托管 Inter 字体：仅 latin / latin-ext 子集（中文走系统字体回落，
// 不引入西里尔/希腊/越南等用不到的子集，减小产物体积）
import '@fontsource/inter/latin-ext-300.css';
import '@fontsource/inter/latin-ext-400.css';
import '@fontsource/inter/latin-ext-500.css';
import '@fontsource/inter/latin-ext-600.css';
import '@fontsource/inter/latin-300.css';
import '@fontsource/inter/latin-400.css';
import '@fontsource/inter/latin-500.css';
import '@fontsource/inter/latin-600.css';
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
