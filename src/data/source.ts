// 数据源配置 —— 数据与代码仓库隔离：
// 应用本体（代码仓库 ranpin/resume）不含任何个人数据；简历与经历库存放在独立的
// 数据仓库，运行时从 raw.githubusercontent.com 拉取（见 resume-data 仓库 README）。
//
// fork 使用者：改成自己的数据仓库（结构相同）；置 null 则进入纯本地模式——
// 无远程数据，简历只存在于浏览器 IndexedDB，经「AI 生成 / 导入简历」创建，
// 「发布到线上」自动隐藏。

export interface DataSourceConfig {
  owner: string;
  repo: string;
  branch: string;
}

export const DATA_SOURCE: DataSourceConfig | null = {
  owner: 'ranpin',
  repo: 'resume-data',
  branch: 'main',
};

export const DATA_BASE_URL: string | null = DATA_SOURCE
  ? `https://raw.githubusercontent.com/${DATA_SOURCE.owner}/${DATA_SOURCE.repo}/${DATA_SOURCE.branch}`
  : null;
