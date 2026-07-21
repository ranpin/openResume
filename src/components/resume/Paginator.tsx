import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';

/**
 * 真·多页 A4 分页（屏幕预览）：测量每个内容块高度，按 A4 可用高度贪心打包成多页 A4 sheet。
 * 打印用连续文档 + CSS 分页（见 ResumeDocument 的 resume-print-only），此组件为 resume-screen-only。
 */

// A4 @96dpi：794 × 1123；四周留白 45px
const PAGE_W = 794;
const PAGE_H = 1123;
const PAD = 45;
const CONTENT_W = PAGE_W - PAD * 2; // 704
const BUDGET = PAGE_H - PAD * 2; // 1033

export interface Block {
  key: string;
  node: React.ReactNode;
}

interface PaginatorProps {
  blocks: Block[];
  signature: string; // 内容/模板/主题指纹，变化时重新分页
}

const Paginator: React.FC<PaginatorProps> = ({ blocks, signature }) => {
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([blocks.map((_, i) => i)]);
  const [bump, setBump] = useState(0);

  // 字体加载完成 / 窗口尺寸变化后重新测量
  useEffect(() => {
    const rerun = () => setBump((b) => b + 1);
    interface FontFaceSetLike {
      ready?: Promise<unknown>;
    }
    const fonts = (document as unknown as { fonts?: FontFaceSetLike }).fonts;
    if (fonts?.ready) fonts.ready.then(rerun).catch(() => {});
    window.addEventListener('resize', rerun);
    return () => window.removeEventListener('resize', rerun);
  }, []);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const kids = Array.from(el.children) as HTMLElement[];
    const heights = kids.map((k) => k.offsetHeight);
    const result: number[][] = [];
    let cur: number[] = [];
    let h = 0;
    for (let i = 0; i < blocks.length; i++) {
      const bh = heights[i] || 0;
      if (cur.length && h + bh > BUDGET) {
        result.push(cur);
        cur = [];
        h = 0;
      }
      cur.push(i);
      h += bh;
    }
    if (cur.length) result.push(cur);
    setPages(result.length ? result : [[]]);
    // 仅在指纹/尺寸变化时重排；blocks 每次渲染都是新数组，故不入依赖
  }, [signature, bump]);

  return (
    <div className="resume-screen-only flex flex-col items-center gap-6">
      {/* 隐藏测量层 */}
      <div
        ref={measureRef}
        aria-hidden
        className="absolute left-[-9999px] top-0"
        style={{ width: CONTENT_W }}
      >
        {blocks.map((b) => (
          <div key={b.key} className="rt-pageblock">
            {b.node}
          </div>
        ))}
      </div>

      {/* 可见分页 */}
      {pages.map((idxs, p) => (
        <div
          key={p}
          className="resume-sheet bg-white shadow-lg relative shrink-0"
          style={{ width: PAGE_W, minHeight: PAGE_H, padding: PAD }}
        >
          {idxs.map((i) => (
            <div key={blocks[i].key} className="rt-pageblock">
              {blocks[i].node}
            </div>
          ))}
          <div className="absolute bottom-3 right-4 text-[10px] text-gray-400">
            第 {p + 1} / {pages.length} 页
          </div>
        </div>
      ))}
    </div>
  );
};

export default Paginator;
