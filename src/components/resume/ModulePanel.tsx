import React, { useRef, useState } from 'react';
import Icon from '../Icon';
import IconBtn from './IconBtn';
import ToolbarPopover from './ToolbarPopover';
import { moveInArray, moveItem } from '../../utils/array';
import { sectionConfigFromData, type ResolvedSection } from './resumeSections';
import type { ResumeData } from '../../types/resume';

interface ModulePanelProps {
  resolved: ResolvedSection[];
  update: (fn: (d: ResumeData) => void) => void;
  onRemoveCustom: (id: string) => void;
}

/** 工具栏「模块」面板：模块拖拽排序 / 改名 / 显隐 / 删除。 */
const ModulePanel: React.FC<ModulePanelProps> = ({
  resolved,
  update,
  onRemoveCustom,
}) => {
  const [secDrag, setSecDrag] = useState<number | null>(null);
  // 拖拽源索引用 ref 同步追踪：state 在事件密集派发时（Safari/WebKit）尚未刷进闭包，
  // dragenter 会读到旧值导致整段拖拽失效；ref 始终读到最新值。state 仅用于高亮样式。
  const secDragRef = useRef<number | null>(null);
  // 任何模块编辑都先「物化」出完整有序配置，再改
  const editSections = (fn: (arr: ReturnType<typeof sectionConfigFromData>) => void) =>
    update((d) => {
      const arr = sectionConfigFromData({ ...d, id: d.id });
      fn(arr);
      d.sections = arr;
    });
  const moveSection = (i: number, dir: number) =>
    editSections((arr) => moveInArray(arr, i, dir));
  const moveSectionTo = (from: number, to: number) =>
    editSections((arr) => moveItem(arr, from, to));
  const setSectionTitle = (i: number, v: string) => {
    // 自定义模块的标题存在 data.custom[].title（单一事实来源），其余存 sections 配置
    const sec = resolved[i];
    if (sec?.key === 'custom' && sec.customId) {
      update((d) => {
        const c = (d.custom || []).find((x) => x.id === sec.customId);
        if (c) c.title = v;
      });
      return;
    }
    editSections((arr) => (arr[i].title = v));
  };
  const toggleSectionHidden = (i: number) =>
    editSections((arr) => (arr[i].hidden = !arr[i].hidden));

  return (
    <ToolbarPopover
      icon="arrows-alt"
      label="模块"
      title="模块管理"
      panelClassName="w-[26rem] max-w-[92vw] max-h-[70vh] overflow-y-auto"
    >
      {() => (
        <div>
          <p className="mb-3 text-[11px] text-gray-400">
            拖动或用箭头调整模块顺序；改名后简历分区标题随之变化；可隐藏暂不需要的模块。
          </p>
          <div className="space-y-2">
            {resolved.map((sec, i) => (
              <div
                key={sec.customId ? `custom:${sec.customId}` : sec.key}
                onDragEnter={(e) => {
                  e.preventDefault();
                  const from = secDragRef.current;
                  if (from === null || from === i) return;
                  moveSectionTo(from, i);
                  secDragRef.current = i;
                  setSecDrag(i);
                }}
                onDragOver={(e) => {
                  e.preventDefault();
                  e.dataTransfer.dropEffect = 'move';
                }}
                className={`flex items-center gap-2 rounded-lg border p-2 transition-shadow ${
                  secDrag === i
                    ? 'border-sage-400 shadow-md opacity-60'
                    : 'border-gray-200'
                } ${sec.hidden ? 'bg-gray-50' : 'bg-white'}`}
              >
                <span
                  draggable
                  onDragStart={(e) => {
                    // Safari / Firefox 必须在 dragstart 调用 setData，否则拖拽根本不启动
                    e.dataTransfer.setData('text/plain', String(i));
                    e.dataTransfer.effectAllowed = 'move';
                    secDragRef.current = i;
                    setSecDrag(i);
                  }}
                  onDragEnd={() => {
                    secDragRef.current = null;
                    setSecDrag(null);
                  }}
                  title="拖拽排序"
                  className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 px-1"
                >
                  <Icon name="arrows-alt" />
                </span>
                <Icon
                  name={sec.icon}
                  className={sec.hidden ? 'text-gray-300' : 'text-sage-500'}
                />
                <input
                  type="text"
                  value={sec.title}
                  onChange={(e) => setSectionTitle(i, e.target.value)}
                  className={`flex-1 min-w-0 rounded-md border border-transparent hover:border-gray-200 focus:border-sage-500 px-2 py-1 text-sm outline-none ${
                    sec.hidden ? 'text-gray-400 line-through' : 'text-gray-800'
                  }`}
                />
                <div className="flex items-center gap-0.5 shrink-0">
                  <IconBtn
                    icon="arrow-up"
                    onClick={() => moveSection(i, -1)}
                    disabled={i === 0}
                    title="上移"
                  />
                  <IconBtn
                    icon="arrow-down"
                    onClick={() => moveSection(i, 1)}
                    disabled={i === resolved.length - 1}
                    title="下移"
                  />
                  <button
                    type="button"
                    onClick={() => toggleSectionHidden(i)}
                    title={sec.hidden ? '点击显示' : '点击隐藏'}
                    className={`px-2 h-7 rounded-md text-xs font-medium transition-colors ${
                      sec.hidden
                        ? 'text-gray-400 hover:text-sage-600 hover:bg-sage-50'
                        : 'text-sage-600 hover:bg-sage-50'
                    }`}
                  >
                    {sec.hidden ? '已隐藏' : '显示'}
                  </button>
                  {sec.key === 'custom' && sec.customId ? (
                    <IconBtn
                      icon="trash"
                      onClick={() => onRemoveCustom(sec.customId!)}
                      title="删除该自定义模块"
                    />
                  ) : (
                    !sec.hidden && (
                      <IconBtn
                        icon="trash"
                        onClick={() => toggleSectionHidden(i)}
                        title="从简历中移除（可在模块管理里恢复）"
                      />
                    )
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </ToolbarPopover>
  );
};

export default ModulePanel;
