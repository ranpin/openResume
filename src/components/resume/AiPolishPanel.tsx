import React, { useEffect, useState } from 'react';
import Icon from '../Icon';
import { AI_MODELS, polishHighlights } from './aiGenerate';

/**
 * AI 润色要点（BYOK）：把一组要点交给 Anthropic 逐条润色，
 * 展示「原文 → 润色后」对照，确认后写回编辑器。
 * 密钥仅存本地浏览器，直连 Anthropic，不经服务器。以 lazy + Suspense 加载。
 */

const KEY_STORAGE = 'ranpin-anthropic-key';

interface AiPolishPanelProps {
  lines: string[];
  onApply: (lines: string[]) => void;
  onClose: () => void;
}

const AiPolishPanel: React.FC<AiPolishPanelProps> = ({ lines, onApply, onClose }) => {
  const originals = lines.map((l) => l.trim()).filter((l) => l.length > 0);
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState(AI_MODELS[0].id);
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string[] | null>(null);

  useEffect(() => {
    try {
      const k = localStorage.getItem(KEY_STORAGE);
      if (k) setApiKey(k);
    } catch {
      /* ignore */
    }
  }, []);

  const saveKey = (v: string) => {
    setApiKey(v);
    try {
      if (v) localStorage.setItem(KEY_STORAGE, v);
      else localStorage.removeItem(KEY_STORAGE);
    } catch {
      /* ignore */
    }
  };

  const canRun = !!apiKey.trim() && originals.length > 0 && !loading;

  const handleRun = async () => {
    if (!canRun) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const polished = await polishHighlights({
        apiKey: apiKey.trim(),
        model,
        highlights: originals,
      });
      setResult(polished);
    } catch (e) {
      setError(e instanceof Error ? e.message : '润色失败，请重试');
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
            AI 润色要点
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
              将逐条润色 <span className="font-medium">{originals.length}</span>{' '}
              条要点：动词开头、突出成果、能量化就量化，不编造数据。润色结果需你确认后才会写回。
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
          </div>

          {/* 模型 */}
          <label className="block">
            <span className="block text-sm font-medium text-gray-700 mb-1.5">模型</span>
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

          {/* 对照预览 */}
          {result && (
            <div className="space-y-2">
              <p className="text-sm font-semibold text-gray-700">润色对照（左原文 / 右润色）</p>
              <div className="max-h-64 space-y-2 overflow-y-auto pr-1">
                {originals.map((o, i) => (
                  <div
                    key={i}
                    className="grid grid-cols-2 gap-2 rounded-lg border border-gray-100 bg-gray-50/60 p-2.5"
                  >
                    <p className="text-xs leading-relaxed text-gray-400">{o}</p>
                    <p className="text-xs leading-relaxed text-gray-800">
                      <Icon name="sparkles" className="mr-1 inline h-3 w-3 text-purple-500" />
                      {result[i]}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            {result ? (
              <button
                onClick={() => onApply(result)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 transition-colors"
              >
                <Icon name="check" />
                应用润色结果
              </button>
            ) : (
              <button
                onClick={handleRun}
                disabled={!canRun}
                className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  canRun
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                <Icon name={loading ? 'spinner' : 'sparkles'} spin={loading} />
                {loading ? '润色中…' : '开始润色'}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AiPolishPanel;
