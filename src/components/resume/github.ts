// 浏览器直连 GitHub Contents API，把简历 YAML 一键提交到仓库（触发自动部署）。
// BYO Token：用户自带 GitHub 个人访问令牌，仅存本地浏览器、不入库、仅站点所有者本人用。
// 令牌需要对本仓库的 Contents 读写权限（fine-grained token 勾选 Contents: Read and write，
// 或经典 token 勾选 repo）。

const OWNER = 'ranpin';
const REPO = 'resume';
const BRANCH = 'main';
const API = 'https://api.github.com';

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
    `${API}/repos/${OWNER}/${REPO}/contents/${path}?ref=${BRANCH}`,
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

export async function publishFile(opts: {
  token: string;
  path: string;
  content: string;
  message: string;
}): Promise<PublishResult> {
  const { token, path, content, message } = opts;
  const sha = await getSha(token, path);
  const res = await fetch(`${API}/repos/${OWNER}/${REPO}/contents/${path}`, {
    method: 'PUT',
    headers: { ...authHeaders(token), 'content-type': 'application/json' },
    body: JSON.stringify({
      message,
      content: utf8ToBase64(content),
      branch: BRANCH,
      ...(sha ? { sha } : {}),
    }),
  });
  if (!res.ok) throw new Error(await errMsg(res));
  const data = await res.json();
  return { commitUrl: data.commit?.html_url || '' };
}
