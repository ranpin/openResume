import React, { useEffect, useState } from 'react';
import Icon from '../Icon';
import { AI_MODELS, translateResume } from './aiGenerate';
import { useResumeStore } from '../../store/useResumeStore';
import type { ResumeData } from '../../types/resume';

/**
 * AI 翻译 / 中英双版（BYOK：Bring Your Own Key）。
 * 把当前简历整体翻译成英文版，作为一份新的本地草稿（id = `<原id>-en`）写入，
 * 随后可在简历横排里切换、再编辑 / 导出 / 发布。
 *
 * 纯静态站无后端：密钥仅存本地浏览器（localStorage），不入库、不经服务器，仅站点所有者本人使用。
 * 以 lazy + Suspense 加载，只在客户端打开。
 */

const KEY_STORAGE = 'ranpin-anthropic-key';

interface AiTranslatePanelProps {
  resumeId: string;
  baseData: ResumeData;
  onClose: () => void;
}

const AiTranslatePanel: React.FC<AiTranslatePanelProps> = ({
  resumeId,
  baseData,
  onClose,
}) => {
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

  const canTranslate = !!apiKey.trim() && !loading;

  const handleTranslate = async () => {
    if (!canTranslate) return;
    setLoading(true);
    setError(null);
    try {
      const result = await translateResume({
        apiKey: apiKey.trim(),
        model,
        base: baseData,
      });
      // 生成一份新的英文版草稿：id 加 -en 后缀，标签标注「英文版」
      const newId = resumeId.endsWith('-en') ? resumeId : `${resumeId}-en`;
      setDraft(newId, {
        ...result,
        id: newId,
        label: `${baseData.label}（英文版）`,
        // 沿用原简历的版式 / 配色 / 排版设置
        template: result.template || baseData.template,
        theme: result.theme || baseData.theme,
        settings: result.settings || baseData.settings,
      });
      setActiveId(newId);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : '翻译失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden my-8">
        <div className="sticky top-0 bg-white border-b p-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Icon name="language" className="text-blue-500" />
            翻译成英文版
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
          <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 p-4">
            <Icon name="lightbulb" className="text-blue-500 mt-0.5" />
            <p className="text-sm text-blue-900/80 leading-relaxed">
              把「
              <span className="font-medium">{baseData.label}</span>
              」整体翻译成英文，生成一份
              <span className="font-medium">新的英文版草稿</span>
              （保留版式与排版，可在简历切换栏里查看、再编辑 / 导出 / 发布）。
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
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
              className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            >
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.label}
                </option>
              ))}
            </select>
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
              onClick={handleTranslate}
              disabled={!canTranslate}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                canTranslate
                  ? 'bg-blue-600 text-white hover:bg-blue-700'
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              <Icon name={loading ? 'spinner' : 'language'} spin={loading} />
              {loading ? '翻译中…' : '开始翻译'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiTranslatePanel;
