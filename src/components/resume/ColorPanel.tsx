import React from 'react';
import ToolbarPopover from './ToolbarPopover';
import { THEME_OPTIONS } from './resumeTheme';
import type { ResumeData, ResumeTheme } from '../../types/resume';

interface ColorPanelProps {
  data: ResumeData;
  update: (fn: (d: ResumeData) => void) => void;
}

/** 工具栏「配色」面板：配色主题切换。 */
const ColorPanel: React.FC<ColorPanelProps> = ({ data, update }) => (
  <ToolbarPopover
    icon="palette"
    label="配色"
    title="配色主题"
    panelClassName="w-40"
  >
    {(close) => (
      <div className="flex flex-wrap gap-2">
        {THEME_OPTIONS.map((t) => {
          const active = (data.theme || 'blue') === t.id;
          return (
            <button
              key={t.id}
              type="button"
              title={t.label}
              onClick={() => {
                update((d) => (d.theme = t.id as ResumeTheme));
                close();
              }}
              className={`w-8 h-8 rounded-full ${t.dot} ring-2 ring-offset-2 transition ${
                active
                  ? 'ring-gray-800'
                  : 'ring-transparent hover:ring-gray-300'
              }`}
            />
          );
        })}
      </div>
    )}
  </ToolbarPopover>
);

export default ColorPanel;
