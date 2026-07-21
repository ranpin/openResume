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
 * 纯静态站无后端：密钥仅存本地浏览器（localStorage），不入库、不经服务器，仅站点所有者本人使用。
 * 以 lazy + Suspense 加载，只在客户端打开。
 */

const KEY_STORAGE = 'ranpin-anthropic-key';

interface AiGeneratePanelProps {
  resumeId: string;
  baseData: ResumeData;
  onClose: () => void;
}

const AiGeneratePanel: React.FC<AiGeneratePanelProps> = ({
  resumeId,
  baseData,
  onClose,
}) => {
  const [jd, setJd] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(AI_MODELS[0].id);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setDraft = useResumeStore((s) => s.setDraft);
  const setActiveId = useResumeStore((s) => s.setActiveId);

  // 客户端加载已保存的密钥
  useEffect(() => {
    try {
      const k = localStorage.getItem(KEY_STORAGE);
      if (k) setApiKey(k);
    } catch {
      setError(null);
    }
  }, []);

  const saveKey = (v: string) => {
    setApiKey(v);
    try {
      if (v) localStorage.setItem(KEY_STORAGE, v);
      else localStorage.removeItem(KEY_STORAGE);
    } catch {
      /* localStorage 不可用时忽略，仅本次会话有效 */
      setError(null);
    }
  };

  const canGenerate = !!apiKey.trim() && !!jd.trim() && !loading;

  const handleGenerate = async () => {
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
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
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '生成失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden my-8">
        <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Icon name="sparkles" className="text-purple-500" />
            AI 生成简历
          </h2>
          <button
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200"
            title="关闭"
          >
            <Icon name="times" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          <div className="flex items-start gap-3 rounded-xl bg-purple-50 border border-purple-100 p-4">
            <Icon name="lightbulb" className="text-purple-500 mt-0.5" />
            <p className="text-sm text-purple-900/80 leading-relaxed">
              基于「
              <span className="font-medium">{baseData.label}</span>
              」和你的技术文档，结合目标 JD 生成一份优化简历，作为该简历的
              <span className="font-medium">本地草稿</span>
              （可再编辑 / 导出 / 重置）。
            </p>
          </div>

          {/* API Key（BYOK）*/}
          <div>
            <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1.5">
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
            />
            <p className="mt-1 text-xs text-gray-400 leading-relaxed">
              密钥仅保存在你本地浏览器、直连 Anthropic，不会上传服务器或进入仓库。仅供你本人使用。
            </p>
          </div>

          {/* 模型 */}
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">
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
            <span className="block text-sm font-medium text-gray-700 mb-1.5">
              目标岗位描述（JD）
            </span>
            <textarea
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              rows={6}
              placeholder="粘贴岗位职责与要求…"
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500 resize-y"
            />
          </label>

          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 p-3 text-sm text-red-700">
              <Icon name="exclamation-triangle" className="mt-0.5 shrink-0" />
              <span className="break-all">{error}</span>
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100"
            >
              取消
            </button>
            <button
              onClick={handleGenerate}
              disabled={!canGenerate}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                canGenerate
                  ? 'bg-purple-600 text-white hover:bg-purple-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
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
