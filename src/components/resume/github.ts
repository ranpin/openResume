// 浏览器直连 GitHub Contents API，把简历 YAML 一键提交到数据仓库（见 data/source.ts）。
// 数据仓库是纯数据、不参与构建，站点运行时从 raw.githubusercontent.com 拉取，
// 提交后约 1 分钟（raw 刷新）线上即可见。
// BYO Token：用户自带 GitHub 个人访问令牌，仅存本地浏览器、不入库、仅站点所有者本人用。
// 令牌需要对数据仓库的 Contents 读写权限（fine-grained token 勾选 Contents: Read and write，
// 或经典 token 勾选 repo）。
// 纯本地模式（DATA_SOURCE = null）下发布不可用，UI 相应隐藏发布入口。

import { DATA_SOURCE, DATA_BASE_URL } from '../../data/source';

const API = 'https://api.github.com';

export const publishEnabled = DATA_SOURCE !== null;

const repoUrl = (): string => {
  if (!DATA_SOURCE) throw new Error('纯本地模式不可发布（未配置数据仓库）');
  return `${API}/repos/${DATA_SOURCE.owner}/${DATA_SOURCE.repo}`;
};

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
});

const utf8ToBase64 = (str: string): string => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  bytes.forEach((b) => (bin += String.fromCharCode(b)));
  return btoa(bin);
};

const errMsg = async (res: Response): Promise<string> => {
  const e = await res.json().catch(() => null);
  return e?.message ? `${e.message}（HTTP ${res.status}）` : `HTTP ${res.status}`;
};

// 取文件当前 sha（更新已有文件时必需）；不存在则返回 undefined（新建）
const getSha = async (
  token: string,
  path: string,
): Promise<string | undefined> => {
  const res = await fetch(
    `${repoUrl()}/contents/${path}?ref=${DATA_SOURCE!.branch}`,
    { headers: authHeaders(token) },
  );
  if (res.status === 404) return undefined;
  if (!res.ok) throw new Error(await errMsg(res));
  const data = await res.json();
  return data.sha as string;
};

export interface PublishResult {
  commitUrl: string;
}

const putFile = async (
  token: string,
  path: string,
  content: string,
  message: string,
  sha?: string,
): Promise<PublishResult> => {
  const res = await fetch(`${repoUrl()}/contents/${path}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify({
      message,
      content: utf8ToBase64(content),
      branch: DATA_SOURCE!.branch,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new Error(await errMsg(res));
  const data = await res.json();
  return { commitUrl: data.commit?.html_url || '' };
};

// 新发布的简历登记进数据仓库清单 index.json（读 → 追加 → 写回，第二次提交）
const addToIndex = async (token: string, relPath: string): Promise<void> => {
  const res = await fetch(`${DATA_BASE_URL}/index.json`, { cache: 'no-store' });
  if (!res.ok) throw new Error(`读取 index.json 失败（HTTP ${res.status}）`);
  const index = (await res.json()) as { resumes?: string[] };
  const resumes = index.resumes ?? [];
  if (resumes.includes(relPath)) return;
  resumes.push(relPath);
  resumes.sort();
  const sha = await getSha(token, 'index.json');
  await putFile(
    token,
    'index.json',
    `${JSON.stringify({ ...index, resumes }, null, 2)}\n`,
    'chore: 登记新发布的简历进 index.json',
    sha,
  );
};

/**
 * 发布一份简历到数据仓库：提交 resumes/<id>.yaml；
 * 若为首次发布（文件不存在），随后把路径登记进 index.json。
 */
export async function publishResume(opts: {
  token: string;
  resumeId: string;
  yaml: string;
  label: string;
}): Promise<PublishResult> {
  const { token, resumeId, yaml, label } = opts;
  const path = `resumes/${resumeId}.yaml`;
  const sha = await getSha(token, path);
  const result = await putFile(
    token,
    path,
    yaml,
    `chore(resume): 更新「${label}」`,
    sha,
  );
  if (sha === undefined) await addToIndex(token, path);
  return result;
}
