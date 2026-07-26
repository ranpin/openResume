import React, { useLayoutEffect, useRef, useState } from 'react';
import { PAGE_W } from './Paginator';

/**
 * 预览自适应容器：当可用宽度小于一页 A4 宽（794px）时，把内部预览等比例缩小
 * （scale ≤ 1，从不放大），宽度充足时保持原始尺寸。缩放通过 CSS 变量 + class
 * 实现且仅在 @media screen 生效（见 resume.css），打印时包裹层完全透明，
 * 不影响导出 PDF 的版面。
 */
const PreviewFit: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  const paneRef = useRef<HTMLDivElement>(null);
  const innerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [innerH, setInnerH] = useState<number | null>(null);

  useLayoutEffect(() => {
    const pane = paneRef.current;
    const inner = innerRef.current;
    if (!pane || !inner) return;
    const compute = () => {
      const cs = getComputedStyle(pane);
      const avail =
        pane.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
      setScale(Math.round(Math.min(1, avail / PAGE_W) * 1000) / 1000);
      setInnerH(inner.offsetHeight);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(pane);
    ro.observe(inner);
    return () => ro.disconnect();
  }, []);

  return (
    <div ref={paneRef} className={className}>
      <div
        className="preview-fit-sizer mx-auto"
        style={
          {
            '--preview-fit': scale,
            '--preview-fit-h': innerH != null ? `${innerH}px` : undefined,
          } as React.CSSProperties
        }
      >
        <div ref={innerRef} className="preview-fit-inner">
          {children}
        </div>
      </div>
    </div>
  );
};

export default PreviewFit;
