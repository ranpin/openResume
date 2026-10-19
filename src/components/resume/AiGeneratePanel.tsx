import React, { useEffect, useState } from 'react';
import Icon from '../Icon';
import { AI_MODELS, generateResume } from './aiGenerate';
import { useResumeStore } from '../../store/useResumeStore';
import type { ResumeData } from '../../types/resume';

/**
 * AI 生成简历（BYOK：Bring Your Own Key）。
 * 读取岗位 JD + 当前简历 + 技术文档主题，浏览器直连 Anthropic 生成一份优化简历，
 * 写入当前简历的本地草稿（可再编辑/导出/重置）。
 *
 * 2026-10-19 起由「工具栏按钮 + 弹窗」提升为与「我的简历」并列的**一级视图**，
 * 因此这里是内联卡片而非 fixed 遮罩层；生成成功后回调 onGenerated 让上层切回简历视图。
 *
 * 纯静态站无后端：密钥仅存本地浏览器（localStorage），不入库、不经服务器，仅站点所有者本人使用。
 * 以 lazy + Suspense 加载，只在客户端渲染。
 */

const KEY_STORAGE = 'ranpin-anthropic-key';

interface AiGeneratePanelProps {
  resumeId: string;
  baseData: ResumeData;
  /** 生成成功后回调（上层据此切回「我的简历」视图查看结果） */
  onGenerated?: () => void;
}

const AiGeneratePanel: React.FC<AiGeneratePanelProps> = ({
  resumeId,
  baseData,
  onGenerated,
}) => {
  const [jd, setJd] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(AI_MODELS[0].id);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const setDraft = useResumeStore((s) => s.setDraft);
  const setActiveId = useResumeStore((s) => s.setActiveId);

  // 客户端加载已保存的密钥
  useEffect(() => {
    try {
      const k = localStorage.getItem(KEY_STORAGE);
      if (k) setApiKey(k);
    } catch {
      /* localStorage 不可用时忽略，仅本次会话有效 */
    }
  }, []);

  const saveKey = (v: string) => {
    setApiKey(v);
    try {
      if (v) localStorage.setItem(KEY_STORAGE, v);
      else localStorage.removeItem(KEY_STORAGE);
    } catch {
      /* localStorage 不可用时忽略，仅本次会话有效 */
    }
  };

  const canGenerate = !!apiKey.trim() && !!jd.trim() && !loading;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setDone(false);
    try {
      const result = await generateResume({
        apiKey: apiKey.trim(),
        model,
        jd: jd.trim(),
        base: baseData,
      });
      // 写入当前简历草稿（保留 id / 已有模板与配色）
      setDraft(resumeId, {
        ...result,
        id: resumeId,
        template: result.template || baseData.template,
        theme: result.theme || baseData.theme,
      });
      setActiveId(resumeId);
      setDone(true);
      // 稍作停留让用户看到成功态，再切回简历视图
      window.setTimeout(() => onGenerated?.(), 600);
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center">
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b bg-white p-5">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Icon name="sparkles" className="text-purple-500" />
            AI 生成简历
          </h2>
          <p className="mt-1 text-sm text-gray-500">
            结合目标岗位 JD，为「{baseData.label}」生成一份优化草稿。
          </p>
        </div>

        <div className="space-y-5 p-6">
          <div className="flex items-start gap-3 rounded-xl border border-purple-100 bg-purple-50 p-4">
            <Icon name="lightbulb" className="mt-0.5 text-purple-500" />
            <p className="text-sm leading-relaxed text-purple-900/80">
              基于「
              <span className="font-medium">{baseData.label}</span>
              」和你的技术文档，结合目标 JD 生成一份优化简历，作为该简历的
              <span className="font-medium">本地草稿</span>
              （可再编辑 / 导出 / 重置）。
            </p>
          </div>

          {/* API Key（BYOK）*/}
          <div>
            <label className="mb-1.5 flex items-center justify-between text-sm font-medium text-gray-700">
              <span className="flex items-center gap-1.5">
                <Icon name="user-shield" className="text-gray-400" />
                Anthropic API Key
              </span>
              <button
                type="button"
                onClick={() => setShowKey((s) => !s)}
                className="text-xs text-gray-400 hover:text-gray-600"
              >
                {showKey ? '隐藏' : '显示'}
              </button>
            </label>
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => saveKey(e.target.value)}
              placeholder="sk-ant-..."
              autoComplete="off"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 font-mono text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs leading-relaxed text-gray-400">
              密钥仅保存在你本地浏览器、直连 Anthropic，不会上传服务器或进入仓库。仅供你本人使用。
            </p>
          </div>

          {/* 模型 */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              模型
            </span>
            <select
              value={model}
              onChange={(e) => setModel(e.target.value)}
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            >
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
          </label>

          {/* JD */}
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-gray-700">
              目标岗位描述（JD）
            </span>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={8}
              placeholder="粘贴岗位职责与要求…"
              className="w-full resize-y rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              <Icon name="exclamation-triangle" className="mt-0.5 shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}

          {done && (
            <div className="flex items-center gap-2 rounded-lg border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
              <Icon name="check" className="shrink-0" />
              已生成并写入草稿，正在返回「我的简历」…
            </div>
          )}

          <div className="flex items-center justify-end">
            <button
              type="button"
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-colors ${
                canGenerate
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'cursor-not-allowed bg-gray-200 text-gray-400'
              }`}
            >
              <Icon name={loading ? 'spinner' : 'sparkles'} spin={loading} />
              {loading ? '生成中…' : '生成简历'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiGeneratePanel;
