import React from 'react';
import ToolbarPopover from './ToolbarPopover';
import { TEMPLATE_OPTIONS } from './resumeTheme';
import type { ResumeData, ResumeTemplate } from '../../types/resume';

interface TemplatePanelProps {
  data: ResumeData;
  update: (fn: (d: ResumeData) => void) => void;
}

/** 工具栏「模板」面板：模板版式切换。 */
const TemplatePanel: React.FC<TemplatePanelProps> = ({ data, update }) => (
  <ToolbarPopover
    icon="layer-group"
    label="模板"
    title="模板版式"
    panelClassName="w-44"
  >
    {(close) => (
      <div className="space-y-1">
        {TEMPLATE_OPTIONS.map((t) => {
          const active = (data.template || 'classic') === t.id;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                update((d) => (d.template = t.id as ResumeTemplate));
                close();
              }}
              className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                active
                  ? 'bg-sage-600 text-white'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              {t.label}
            </button>
          );
        })}
      </div>
    )}
  </ToolbarPopover>
);

export default TemplatePanel;
