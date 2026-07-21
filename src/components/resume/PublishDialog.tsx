import React, { useEffect, useState } from 'react';
import Icon from '../Icon';
import { publishFile } from './github';
import { resumeToYaml, normalizeResume } from './resumeIo';
import { useResumeStore } from '../../store/useResumeStore';
import type { ResumeData } from '../../types/resume';

/**
 * 一键发布到线上：把当前简历 YAML 提交到仓库 content/resumes/<id>.yaml，
 * GitHub Actions 自动构建部署，约 1 分钟后线上更新——免手动提交。
 * BYO Token：用户自带 GitHub 令牌，仅存本地浏览器，不入库、仅所有者本人用。
 */

const TOKEN_STORAGE = 'ranpin-github-token';

interface PublishDialogProps {
  resumeId: string;
  data: ResumeData;
  onClose: () => void;
}

const PublishDialog: React.FC<PublishDialogProps> = ({
  resumeId,
  data,
  onClose,
}) => {
  const [token, setToken] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [doneUrl, setDoneUrl] = useState<string | null>(null);

  const markPublished = useResumeStore((s) => s.markPublished);

  useEffect(() => {
    try {
      const t = localStorage.getItem(TOKEN_STORAGE);
      if (t) setToken(t);
    } catch {
      setError(null);
    }
  }, []);

  const saveToken = (v: string) => {
    setToken(v);
    try {
      if (v) localStorage.setItem(TOKEN_STORAGE, v);
      else localStorage.removeItem(TOKEN_STORAGE);
    } catch {
      /* localStorage 不可用则仅本次会话有效 */
      setError(null);
    }
  };

  const handlePublish = async () => {
    if (!token.trim() || loading) return;
    setLoading(true);
    setError(null);
    try {
      const path = `content/resumes/${resumeId}.yaml`;
      const { commitUrl } = await publishFile({
        token: token.trim(),
        path,
        content: resumeToYaml(data),
        message: `chore(resume): 更新「${data.label}」`,
      });
      markPublished(resumeId, normalizeResume(data));
      setDoneUrl(commitUrl || 'https://github.com/ranpin/resume/actions');
    } catch (e) {
      setError(e instanceof Error ? e.message : '发布失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden my-8">
        <div className="border-b p-5 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-gray-900">
            <Icon name="paper-plane" className="text-blue-600" />
            发布到线上
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
          {doneUrl ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 rounded-xl bg-green-50 border border-green-100 p-4">
                <Icon name="check" className="text-green-600 mt-0.5" />
                <div className="text-sm text-green-900/80 leading-relaxed">
                  已提交到仓库，GitHub Actions 正在自动构建，
                  <strong>约 1 分钟后线上更新</strong>（刷新页面即可看到）。
                </div>
              </div>
              <div className="flex items-center justify-between">
                <a
                  href={doneUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="text-sm text-blue-600 hover:underline inline-flex items-center gap-1"
                >
                  <Icon name="external-link-alt" />
                  查看提交 / 部署
                </a>
                <button
                  onClick={onClose}
                  className="px-4 py-2 rounded-lg text-sm font-medium bg-blue-600 text-white hover:bg-blue-700"
                >
                  完成
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start gap-3 rounded-xl bg-blue-50 border border-blue-100 p-4">
                <Icon name="lightbulb" className="text-blue-500 mt-0.5" />
                <p className="text-sm text-blue-900/80 leading-relaxed">
                  将「<span className="font-medium">{data.label}</span>
                  」提交到 <code>content/resumes/{resumeId}.yaml</code>
                  ，自动部署到线上——免手动提交。
                </p>
              </div>

              <div>
                <label className="flex items-center justify-between text-sm font-medium text-gray-700 mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <Icon name="user-shield" className="text-gray-400" />
                    GitHub Token
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowToken((s) => !s)}
                    className="text-xs text-gray-400 hover:text-gray-600"
                  >
                    {showToken ? '隐藏' : '显示'}
                  </button>
                </label>
                <input
                  type={showToken ? 'text' : 'password'}
                  value={token}
                  onChange={(e) => saveToken(e.target.value)}
                  placeholder="github_pat_... 或 ghp_..."
                  autoComplete="off"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-mono outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <p className="mt-1 text-xs text-gray-400 leading-relaxed">
                  需要对本仓库的 <strong>Contents 读写</strong>权限（fine-grained
                  token 勾选 Contents: Read and write，或经典 token 勾选 repo）。
                  令牌仅保存在你本地浏览器、直连 GitHub，不上传服务器、不进仓库。
                </p>
              </div>

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
                  onClick={handlePublish}
                  disabled={!token.trim() || loading}
                  className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    token.trim() && !loading
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  }`}
                >
                  <Icon
                    name={loading ? 'spinner' : 'paper-plane'}
                    spin={loading}
                  />
                  {loading ? '发布中…' : '发布到线上'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default PublishDialog;
