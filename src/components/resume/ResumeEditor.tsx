import React, { useState, lazy, Suspense } from 'react';
import Icon from '../Icon';
import ResumeDocument from './ResumeDocument';
import RichTextField from './RichTextField';
import {
  cloneResume,
  downloadResumeYaml,
  isSameResume,
  normalizeResume,
} from './resumeIo';
import { THEME_OPTIONS, TEMPLATE_OPTIONS } from './resumeTheme';
import { useResumeStore } from '../../store/useResumeStore';

const PublishDialog = lazy(() => import('./PublishDialog'));
import type {
  ResumeData,
  ResumeTemplate,
  ResumeTheme,
} from '../../types/resume';

// 可拖拽排序的数组字段
type ArrayKey = 'education' | 'work' | 'projects' | 'skills' | 'awards';

const moveItem = (arr: unknown[], from: number, to: number): void => {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length)
    return;
  const [it] = arr.splice(from, 1);
  arr.splice(to, 0, it);
};

/**
 * 超级简历式简历编辑器：左侧分区表单，右侧实时预览。
 * 所有改动写入 useResumeStore 的本地草稿（localStorage，刷新不丢）。
 * 以 lazy + Suspense 加载，且只在客户端打开，SSG 预渲染不涉及。
 */

interface ResumeEditorProps {
  resumeId: string;
  published: ResumeData; // 已发布版本，用于「重置」
  onClose: () => void;
}

const moveInArray = <T,>(arr: T[], i: number, dir: number): void => {
  const j = i + dir;
  if (j < 0 || j >= arr.length) return;
  const tmp = arr[i];
  arr[i] = arr[j];
  arr[j] = tmp;
};

const Field: React.FC<{
  label: string;
  value?: string;
  onChange: (v: string) => void;
  placeholder?: string;
}> = ({ label, value, onChange, placeholder }) => (
  <label className="block">
    <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
    <input
      type="text"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
    />
  </label>
);

const IconBtn: React.FC<{
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  danger?: boolean;
  title?: string;
}> = ({ icon, onClick, disabled, danger, title }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    title={title}
    className={`w-7 h-7 flex items-center justify-center rounded-md text-sm transition-colors ${
      disabled
        ? 'text-gray-300 cursor-not-allowed'
        : danger
          ? 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          : 'text-gray-500 hover:text-blue-600 hover:bg-blue-50'
    }`}
  >
    <Icon name={icon} />
  </button>
);

const SectionHeader: React.FC<{
  icon: string;
  title: string;
  onAdd?: () => void;
}> = ({ icon, title, onAdd }) => (
  <div className="flex items-center justify-between border-b border-gray-100 pb-2 mb-3">
    <h3 className="flex items-center gap-2 text-sm font-bold text-gray-800">
      <Icon name={icon} className="text-blue-600" />
      {title}
    </h3>
    {onAdd && (
      <button
        type="button"
        onClick={onAdd}
        className="inline-flex items-center gap-1 text-xs font-medium text-blue-600 hover:text-blue-700"
      >
        <Icon name="plus" />
        添加
      </button>
    )}
  </div>
);

const EntryCard: React.FC<{
  label: string;
  index: number;
  total: number;
  onUp: () => void;
  onDown: () => void;
  onDelete: () => void;
  dragging?: boolean;
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onDragEnter?: () => void;
  children: React.ReactNode;
}> = ({
  label,
  index,
  total,
  onUp,
  onDown,
  onDelete,
  dragging,
  onDragStart,
  onDragEnd,
  onDragEnter,
  children,
}) => (
  <div
    onDragEnter={onDragEnter}
    onDragOver={(e) => e.preventDefault()}
    className={`rounded-xl border bg-gray-50/60 p-4 space-y-3 transition-shadow ${
      dragging ? 'border-blue-400 shadow-md opacity-60' : 'border-gray-200'
    }`}
  >
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-1.5 text-xs font-semibold text-gray-400">
        <span
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          title="拖拽排序"
          className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
        >
          <Icon name="arrows-alt" />
        </span>
        {label} #{index + 1}
      </span>
      <div className="flex items-center gap-0.5">
        <IconBtn
          icon="arrow-up"
          onClick={onUp}
          disabled={index === 0}
          title="上移"
        />
        <IconBtn
          icon="arrow-down"
          onClick={onDown}
          disabled={index === total - 1}
          title="下移"
        />
        <IconBtn icon="trash" onClick={onDelete} danger title="删除" />
      </div>
    </div>
    {children}
  </div>
);

const ResumeEditor: React.FC<ResumeEditorProps> = ({
  resumeId,
  published,
  onClose,
}) => {
  const draft = useResumeStore((s) => s.drafts[resumeId]);
  const setDraft = useResumeStore((s) => s.setDraft);
  const resetDraft = useResumeStore((s) => s.resetDraft);
  const publishedSig = useResumeStore((s) => s.published[resumeId]);
  const [publishOpen, setPublishOpen] = useState(false);

  const data: ResumeData = draft ?? published;
  // 是否有未发布改动：与内置基线、最近一次发布都不同
  const dirty =
    !!draft &&
    !isSameResume(data, published) &&
    publishedSig !== normalizeResume(data);

  // 不可变更新：克隆当前数据 → 修改 → 写回草稿（首次编辑即自动生成草稿）
  const update = (fn: (d: ResumeData) => void) => {
    const next = cloneResume(data);
    fn(next);
    setDraft(resumeId, next);
  };

  const lines = (arr?: string[]) => (arr || []).join('\n');
  const toLines = (v: string) => v.split('\n');
  const commas = (arr?: string[]) => (arr || []).join(', ');
  const toCommas = (v: string) => v.split(',').map((s) => s.trim());

  // 显式「保存」：改动本就实时自动存本地草稿，这里给明确反馈；
  // 若内容与已发布版本一致，则清掉草稿（不再显示「未发布」）。
  const [saved, setSaved] = useState(false);
  const handleSave = () => {
    if (isSameResume(data, published)) resetDraft(resumeId);
    else setDraft(resumeId, cloneResume(data));
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2200);
  };

  // 拖拽排序：拖动过程中实时把被拖项移动到目标位置
  const [drag, setDrag] = useState<{ key: ArrayKey; index: number } | null>(
    null,
  );
  const dragProps = (key: ArrayKey, i: number) => ({
    dragging: drag?.key === key && drag.index === i,
    onDragStart: () => setDrag({ key, index: i }),
    onDragEnd: () => setDrag(null),
    onDragEnter: () => {
      if (!drag || drag.key !== key || drag.index === i) return;
      const from = drag.index;
      update((d) => {
        const arr = d[key] as unknown[] | undefined;
        if (arr) moveItem(arr, from, i);
      });
      setDrag({ key, index: i });
    },
  });

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex flex-col">
      {/* 顶栏 */}
      <div className="bg-white border-b px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <Icon name="edit" className="text-blue-600" />
          <span className="font-semibold text-gray-900 truncate">
            编辑简历 · {data.label}
          </span>
          {dirty && (
            <span className="text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 shrink-0">
              未发布
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleSave}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium text-white transition-colors ${
              saved ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            <Icon name={saved ? 'check' : 'save'} />
            <span>{saved ? '已保存' : '保存'}</span>
          </button>
          <button
            onClick={() => window.print()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-200 hover:bg-gray-50"
          >
            <Icon name="print" />
            <span className="hidden sm:inline">导出 PDF</span>
          </button>
          <button
            onClick={() => setPublishOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-200 hover:bg-gray-50"
          >
            <Icon name="paper-plane" />
            <span className="hidden sm:inline">发布到线上</span>
          </button>
          <button
            onClick={() => downloadResumeYaml(data)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-700 border border-gray-200 hover:bg-gray-50"
          >
            <Icon name="download" />
            <span className="hidden sm:inline">导出数据</span>
          </button>
          {dirty && (
            <button
              onClick={() => resetDraft(resumeId)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm text-gray-500 hover:text-red-600"
            >
              <Icon name="redo" />
              <span className="hidden sm:inline">重置</span>
            </button>
          )}
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
            title="关闭"
          >
            <Icon name="times" />
          </button>
        </div>
      </div>

      {/* 双栏主体 */}
      <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-2">
        {/* 左：表单 */}
        <div className="overflow-y-auto bg-white p-4 sm:p-6 space-y-8 border-r">
          {/* 简历元信息 */}
          <section>
            <SectionHeader icon="file-alt" title="简历信息" />
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label="简历名称（横排显示）"
                value={data.label}
                onChange={(v) => update((d) => (d.label = v))}
              />
              <Field
                label="目标岗位"
                value={data.target}
                onChange={(v) => update((d) => (d.target = v))}
              />
            </div>

            {/* 模板 */}
            <div className="mt-3">
              <span className="block text-xs font-medium text-gray-500 mb-1.5">
                模板版式
              </span>
              <div className="flex flex-wrap gap-2">
                {TEMPLATE_OPTIONS.map((t) => {
                  const active = (data.template || 'classic') === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        update((d) => (d.template = t.id as ResumeTemplate))
                      }
                      className={`px-3 py-1.5 rounded-lg text-sm border transition-colors ${
                        active
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-200 hover:bg-gray-50'
                      }`}
                    >
                      {t.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 配色 */}
            <div className="mt-3">
              <span className="block text-xs font-medium text-gray-500 mb-1.5">
                配色主题
              </span>
              <div className="flex flex-wrap items-center gap-2">
                {THEME_OPTIONS.map((t) => {
                  const active = (data.theme || 'blue') === t.id;
                  return (
                    <button
                      key={t.id}
                      type="button"
                      title={t.label}
                      onClick={() =>
                        update((d) => (d.theme = t.id as ResumeTheme))
                      }
                      className={`w-8 h-8 rounded-full ${t.dot} ring-2 ring-offset-2 transition ${
                        active ? 'ring-gray-800' : 'ring-transparent'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          </section>

          {/* 基本信息 */}
          <section>
            <SectionHeader icon="user" title="基本信息" />
            <div className="grid sm:grid-cols-2 gap-3">
              <Field
                label="姓名"
                value={data.basics.name}
                onChange={(v) => update((d) => (d.basics.name = v))}
              />
              <Field
                label="头衔 / 求职意向"
                value={data.basics.title}
                onChange={(v) => update((d) => (d.basics.title = v))}
              />
              <Field
                label="邮箱"
                value={data.basics.email}
                onChange={(v) => update((d) => (d.basics.email = v))}
              />
              <Field
                label="电话"
                value={data.basics.phone}
                onChange={(v) => update((d) => (d.basics.phone = v))}
              />
              <Field
                label="所在地"
                value={data.basics.location}
                onChange={(v) => update((d) => (d.basics.location = v))}
              />
              <Field
                label="GitHub"
                value={data.basics.github}
                onChange={(v) => update((d) => (d.basics.github = v))}
              />
              <Field
                label="个人网站"
                value={data.basics.website}
                onChange={(v) => update((d) => (d.basics.website = v))}
              />
            </div>
            <div className="mt-3">
              <RichTextField
                label="个人简介"
                value={data.basics.summary}
                rows={4}
                onChange={(v) => update((d) => (d.basics.summary = v))}
              />
            </div>
          </section>

          {/* 教育经历 */}
          <section>
            <SectionHeader
              icon="graduation-cap"
              title="教育经历"
              onAdd={() =>
                update((d) => {
                  d.education ||= [];
                  d.education.push({ school: '' });
                })
              }
            />
            <div className="space-y-3">
              {(data.education || []).map((e, i) => (
                <EntryCard
                  key={i}
                  label="教育"
                  index={i}
                  total={(data.education || []).length}
                  {...dragProps('education', i)}
                  onUp={() =>
                    update((d) => d.education && moveInArray(d.education, i, -1))
                  }
                  onDown={() =>
                    update((d) => d.education && moveInArray(d.education, i, 1))
                  }
                  onDelete={() =>
                    update((d) => d.education?.splice(i, 1))
                  }
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field
                      label="学校"
                      value={e.school}
                      onChange={(v) =>
                        update((d) => d.education && (d.education[i].school = v))
                      }
                    />
                    <Field
                      label="时间"
                      value={e.period}
                      onChange={(v) =>
                        update((d) => d.education && (d.education[i].period = v))
                      }
                    />
                    <Field
                      label="学历"
                      value={e.degree}
                      onChange={(v) =>
                        update((d) => d.education && (d.education[i].degree = v))
                      }
                    />
                    <Field
                      label="专业"
                      value={e.major}
                      onChange={(v) =>
                        update((d) => d.education && (d.education[i].major = v))
                      }
                    />
                    <Field
                      label="GPA"
                      value={e.gpa}
                      onChange={(v) =>
                        update((d) => d.education && (d.education[i].gpa = v))
                      }
                    />
                  </div>
                  <RichTextField
                    label="补充说明"
                    value={e.detail}
                    rows={2}
                    onChange={(v) =>
                      update((d) => d.education && (d.education[i].detail = v))
                    }
                  />
                </EntryCard>
              ))}
            </div>
          </section>

          {/* 工作经历 */}
          <section>
            <SectionHeader
              icon="briefcase"
              title="工作经历"
              onAdd={() =>
                update((d) => {
                  d.work ||= [];
                  d.work.push({ company: '' });
                })
              }
            />
            <div className="space-y-3">
              {(data.work || []).map((w, i) => (
                <EntryCard
                  key={i}
                  label="工作"
                  index={i}
                  total={(data.work || []).length}
                  {...dragProps('work', i)}
                  onUp={() => update((d) => d.work && moveInArray(d.work, i, -1))}
                  onDown={() => update((d) => d.work && moveInArray(d.work, i, 1))}
                  onDelete={() => update((d) => d.work?.splice(i, 1))}
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field
                      label="公司"
                      value={w.company}
                      onChange={(v) =>
                        update((d) => d.work && (d.work[i].company = v))
                      }
                    />
                    <Field
                      label="职位"
                      value={w.position}
                      onChange={(v) =>
                        update((d) => d.work && (d.work[i].position = v))
                      }
                    />
                    <Field
                      label="时间"
                      value={w.period}
                      onChange={(v) =>
                        update((d) => d.work && (d.work[i].period = v))
                      }
                    />
                    <Field
                      label="地点"
                      value={w.location}
                      onChange={(v) =>
                        update((d) => d.work && (d.work[i].location = v))
                      }
                    />
                  </div>
                  <RichTextField
                    label="工作要点"
                    value={lines(w.highlights)}
                    rows={5}
                    onChange={(v) =>
                      update(
                        (d) => d.work && (d.work[i].highlights = toLines(v)),
                      )
                    }
                  />
                </EntryCard>
              ))}
            </div>
          </section>

          {/* 项目经历 */}
          <section>
            <SectionHeader
              icon="code"
              title="项目经历"
              onAdd={() =>
                update((d) => {
                  d.projects ||= [];
                  d.projects.push({ name: '' });
                })
              }
            />
            <div className="space-y-3">
              {(data.projects || []).map((p, i) => (
                <EntryCard
                  key={i}
                  label="项目"
                  index={i}
                  total={(data.projects || []).length}
                  {...dragProps('projects', i)}
                  onUp={() =>
                    update((d) => d.projects && moveInArray(d.projects, i, -1))
                  }
                  onDown={() =>
                    update((d) => d.projects && moveInArray(d.projects, i, 1))
                  }
                  onDelete={() => update((d) => d.projects?.splice(i, 1))}
                >
                  <div className="grid sm:grid-cols-2 gap-3">
                    <Field
                      label="项目名"
                      value={p.name}
                      onChange={(v) =>
                        update((d) => d.projects && (d.projects[i].name = v))
                      }
                    />
                    <Field
                      label="角色"
                      value={p.role}
                      onChange={(v) =>
                        update((d) => d.projects && (d.projects[i].role = v))
                      }
                    />
                    <Field
                      label="时间"
                      value={p.period}
                      onChange={(v) =>
                        update((d) => d.projects && (d.projects[i].period = v))
                      }
                    />
                    <Field
                      label="链接"
                      value={p.link}
                      onChange={(v) =>
                        update((d) => d.projects && (d.projects[i].link = v))
                      }
                    />
                  </div>
                  <Field
                    label="技术栈"
                    placeholder="逗号分隔，如 C++, Python"
                    value={commas(p.tech)}
                    onChange={(v) =>
                      update((d) => d.projects && (d.projects[i].tech = toCommas(v)))
                    }
                  />
                  <RichTextField
                    label="项目要点"
                    value={lines(p.highlights)}
                    rows={5}
                    onChange={(v) =>
                      update(
                        (d) =>
                          d.projects && (d.projects[i].highlights = toLines(v)),
                      )
                    }
                  />
                </EntryCard>
              ))}
            </div>
          </section>

          {/* 专业技能 */}
          <section>
            <SectionHeader
              icon="cogs"
              title="专业技能"
              onAdd={() =>
                update((d) => {
                  d.skills ||= [];
                  d.skills.push({ category: '', items: [] });
                })
              }
            />
            <div className="space-y-3">
              {(data.skills || []).map((s, i) => (
                <EntryCard
                  key={i}
                  label="技能"
                  index={i}
                  total={(data.skills || []).length}
                  {...dragProps('skills', i)}
                  onUp={() =>
                    update((d) => d.skills && moveInArray(d.skills, i, -1))
                  }
                  onDown={() =>
                    update((d) => d.skills && moveInArray(d.skills, i, 1))
                  }
                  onDelete={() => update((d) => d.skills?.splice(i, 1))}
                >
                  <Field
                    label="类别"
                    value={s.category}
                    onChange={(v) =>
                      update((d) => d.skills && (d.skills[i].category = v))
                    }
                  />
                  <Field
                    label="技能项"
                    placeholder="逗号分隔，如 C++, Python"
                    value={commas(s.items)}
                    onChange={(v) =>
                      update((d) => d.skills && (d.skills[i].items = toCommas(v)))
                    }
                  />
                </EntryCard>
              ))}
            </div>
          </section>

          {/* 荣誉奖项 */}
          <section>
            <SectionHeader
              icon="trophy"
              title="荣誉奖项"
              onAdd={() =>
                update((d) => {
                  d.awards ||= [];
                  d.awards.push({ title: '' });
                })
              }
            />
            <div className="space-y-3">
              {(data.awards || []).map((a, i) => (
                <EntryCard
                  key={i}
                  label="荣誉"
                  index={i}
                  total={(data.awards || []).length}
                  {...dragProps('awards', i)}
                  onUp={() =>
                    update((d) => d.awards && moveInArray(d.awards, i, -1))
                  }
                  onDown={() =>
                    update((d) => d.awards && moveInArray(d.awards, i, 1))
                  }
                  onDelete={() => update((d) => d.awards?.splice(i, 1))}
                >
                  <div className="grid sm:grid-cols-3 gap-3">
                    <Field
                      label="名称"
                      value={a.title}
                      onChange={(v) =>
                        update((d) => d.awards && (d.awards[i].title = v))
                      }
                    />
                    <Field
                      label="颁发方"
                      value={a.issuer}
                      onChange={(v) =>
                        update((d) => d.awards && (d.awards[i].issuer = v))
                      }
                    />
                    <Field
                      label="日期"
                      value={a.date}
                      onChange={(v) =>
                        update((d) => d.awards && (d.awards[i].date = v))
                      }
                    />
                  </div>
                </EntryCard>
              ))}
            </div>
          </section>

          <p className="text-xs text-gray-400 pt-2 leading-relaxed">
            要点/简介支持富文本工具栏：加粗/斜体/下划线/删除线/代码、序列号/箭头列表/引用/链接、
            <strong>字号</strong>、<strong>颜色</strong>、<strong>对齐(左/中/右)</strong>；拖动条目左侧
            <Icon name="arrows-alt" className="mx-0.5" />
            可排序。改动<strong>实时自动保存</strong>在本浏览器（刷新不丢）；点「保存」可确认。要正式发布到线上，请「导出数据」并把
            YAML 提交到 content/resumes/。
          </p>
        </div>

        {/* 右：实时预览（真·多页）*/}
        <div className="overflow-auto bg-gray-100 p-4 sm:p-8">
          <ResumeDocument data={data} />
        </div>
      </div>

      {/* 保存反馈 toast */}
      {saved && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-gray-900 text-white text-sm shadow-lg">
          <Icon name="check" className="text-green-400" />
          已保存到本地浏览器
        </div>
      )}

      {/* 一键发布 */}
      {publishOpen && (
        <Suspense fallback={null}>
          <PublishDialog
            resumeId={resumeId}
            data={data}
            onClose={() => setPublishOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
};

export default ResumeEditor;
