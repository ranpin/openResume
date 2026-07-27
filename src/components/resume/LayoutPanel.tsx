import React from 'react';
import Icon from '../Icon';
import ToolbarPopover from './ToolbarPopover';
import { FONT_OPTIONS, fontStack } from './resumeFonts';
import {
  BODY_BASE_PT,
  FIELD_SEPARATOR_OPTIONS,
  HEADER_ALIGN_OPTIONS,
  HEADER_LINES_OPTIONS,
  SETTING_DEFAULTS,
  fontSizeOptions,
  scaleToPt,
} from './resumeSettings';
import type {
  ResumeData,
  ResumeFieldSeparator,
  ResumeHeaderAlign,
} from '../../types/resume';

const Slider: React.FC<{
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  display: (v: number) => string;
  onChange: (v: number) => void;
}> = ({ label, value, min, max, step, display, onChange }) => (
  <label className="block">
    <span className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
      <span>{label}</span>
      <span className="font-mono text-gray-700">{display(value)}</span>
    </span>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-sage-600 cursor-pointer"
    />
  </label>
);

interface LayoutPanelProps {
  data: ResumeData;
  update: (fn: (d: ResumeData) => void) => void;
}

/** 工具栏「排版」面板：全局字号 / 行距 / 间距 / 字体 / 条目标题格式 / 头部对齐。 */
const LayoutPanel: React.FC<LayoutPanelProps> = ({ data, update }) => {
  const settings = { ...SETTING_DEFAULTS, ...(data.settings || {}) };
  const setSetting = (k: keyof typeof SETTING_DEFAULTS, v: number) =>
    update((d) => {
      d.settings = { ...SETTING_DEFAULTS, ...(d.settings || {}), [k]: v };
    });
  const setFontFamily = (v: string) =>
    update((d) => {
      d.settings = {
        ...SETTING_DEFAULTS,
        ...(d.settings || {}),
        fontFamily: v === 'default' ? undefined : v,
      };
    });
  const resetSettings = () => update((d) => (d.settings = { ...SETTING_DEFAULTS }));
  const setHeaderLines = (v: 1 | 2) =>
    update((d) => {
      d.settings = { ...SETTING_DEFAULTS, ...(d.settings || {}), headerLines: v };
    });
  const setFieldSeparator = (v: ResumeFieldSeparator) =>
    update((d) => {
      d.settings = {
        ...SETTING_DEFAULTS,
        ...(d.settings || {}),
        fieldSeparator: v,
      };
    });
  const setHeaderAlign = (v: ResumeHeaderAlign) =>
    update((d) => {
      d.settings = {
        ...SETTING_DEFAULTS,
        ...(d.settings || {}),
        headerAlign: v,
      };
    });

  return (
    <ToolbarPopover
      icon="text-height"
      label="排版"
      title="全局排版"
      panelClassName="w-80 max-h-[70vh] overflow-y-auto"
    >
      {() => (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-800">
              全局排版
            </span>
            <button
              type="button"
              onClick={resetSettings}
              className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 hover:text-sage-600"
            >
              <Icon name="redo" />
              恢复默认
            </button>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            <label className="block">
              <span className="flex items-center justify-between text-xs font-medium text-gray-500 mb-1">
                <span>全局字号</span>
                <span className="font-mono text-gray-700">
                  {scaleToPt(settings.fontScale)} pt
                </span>
              </span>
              <select
                value={String(scaleToPt(settings.fontScale))}
                onChange={(e) =>
                  setSetting(
                    'fontScale',
                    +(parseInt(e.target.value, 10) / BODY_BASE_PT).toFixed(4),
                  )
                }
                className="w-full rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm text-gray-700 outline-none cursor-pointer hover:border-sage-400 focus:border-sage-500 focus:ring-1 focus:ring-sage-500 transition-colors"
              >
                {fontSizeOptions(scaleToPt(settings.fontScale)).map((pt) => (
                  <option key={pt} value={String(pt)}>
                    {pt}
                  </option>
                ))}
              </select>
            </label>
            <Slider
              label="行间距"
              value={settings.lineHeight}
              min={1.2}
              max={2}
              step={0.05}
              display={(v) => v.toFixed(2)}
              onChange={(v) => setSetting('lineHeight', v)}
            />
            <Slider
              label="模块间距"
              value={settings.blockGap}
              min={6}
              max={32}
              step={1}
              display={(v) => `${v}px`}
              onChange={(v) => setSetting('blockGap', v)}
            />
            <Slider
              label="页边距"
              value={settings.pageMargin}
              min={24}
              max={72}
              step={1}
              display={(v) => `${v}px`}
              onChange={(v) => setSetting('pageMargin', v)}
            />
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500 mb-1">
              正文字体
            </span>
            <div className="flex flex-wrap gap-2">
              {FONT_OPTIONS.map((f) => {
                const active =
                  (settings.fontFamily || 'default') === f.key;
                const stack = fontStack(f.key);
                return (
                  <button
                    key={f.key}
                    type="button"
                    onClick={() => setFontFamily(f.key)}
                    style={stack ? { fontFamily: stack } : undefined}
                    className={`px-2.5 py-1 rounded-lg border text-xs transition-colors ${
                      active
                        ? 'border-sage-500 bg-sage-50 text-sage-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {f.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500 mb-1">
              标题行数
            </span>
            <div className="flex flex-wrap gap-2">
              {HEADER_LINES_OPTIONS.map((o) => {
                const active =
                  (data.settings?.headerLines ?? 2) === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setHeaderLines(o.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                      active
                        ? 'bg-sage-600 text-white border-sage-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500 mb-1">
              字段样式
            </span>
            <div className="flex flex-wrap gap-2">
              {FIELD_SEPARATOR_OPTIONS.map((o) => {
                const active =
                  (data.settings?.fieldSeparator ?? 'dot') === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    title={
                      o.id === 'justify'
                        ? '字段分散对齐：首字段贴左、时间贴右、中间均分（两端对齐）'
                        : `用「${o.label}」分隔字段`
                    }
                    onClick={() => setFieldSeparator(o.id)}
                    className={`px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                      active
                        ? 'bg-sage-600 text-white border-sage-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              控制学校/学院/专业/学位等字段在标题行的排布。
            </p>
          </div>
          <div>
            <span className="block text-xs font-medium text-gray-500 mb-1">
              个人信息对齐
            </span>
            <div className="flex flex-wrap gap-2">
              {HEADER_ALIGN_OPTIONS.map((o) => {
                const active = data.settings?.headerAlign === o.id;
                return (
                  <button
                    key={o.id}
                    type="button"
                    onClick={() => setHeaderAlign(o.id)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border transition-colors ${
                      active
                        ? 'bg-sage-600 text-white border-sage-600'
                        : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    <Icon name={o.icon} />
                    {o.label}
                  </button>
                );
              })}
            </div>
            <p className="mt-1 text-[11px] text-gray-400">
              姓名 / 头衔 / 联系方式在头部的对齐；默认随证件照（有照片左对齐、无照片居中）。
            </p>
          </div>
        </div>
      )}
    </ToolbarPopover>
  );
};

export default LayoutPanel;
