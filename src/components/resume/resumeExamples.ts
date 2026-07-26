// 各模块的「示例」内容：点击分区右上角「示例」即插入一条写好的范例条目，
// 既降低上手门槛，也示范了良好写法（动词开头、量化成果、STAR 结构）。
// 用户应替换为自己的真实信息——示例仅作参照。

import type {
  ResumeActivity,
  ResumeAward,
  ResumeCertificate,
  ResumeEducation,
  ResumeLanguage,
  ResumeProject,
  ResumeWork,
} from '../../types/resume';

export const EXAMPLE_EDUCATION: ResumeEducation = {
  school: '上海交通大学',
  college: '电子信息与电气工程学院',
  degree: '硕士',
  major: '计算机科学与技术',
  period: '2022.09 - 2025.06',
  gpa: '3.8 / 4.0（专业前 10%）',
  courses: '高级算法、机器学习、分布式系统、数据库系统',
  detail: '校级优秀毕业生；导师课题组研究方向为推荐系统。',
};

export const EXAMPLE_WORK: ResumeWork = {
  company: '字节跳动',
  position: '后端研发工程师',
  period: '2023.06 - 2024.09',
  location: '上海',
  highlights: [
    '**主导**订单核心链路重构，将下单接口 P99 延迟从 800ms 降至 120ms，稳定支撑日均 **500 万** 笔订单。',
    '设计并落地多级缓存方案，数据库 QPS 下降 **60%**，年节省服务器成本约 **30 万元**。',
    '推动团队接入统一可观测平台，线上故障平均定位时间（MTTR）由 45 分钟缩短至 **10 分钟**。',
  ],
};

export const EXAMPLE_PROJECT: ResumeProject = {
  name: '智能简历解析引擎',
  role: '核心开发',
  period: '2024.03 - 2024.08',
  tech: ['TypeScript', 'Node.js', 'Elasticsearch', 'LLM'],
  highlights: [
    '从 0 到 1 搭建简历结构化解析服务，支持 PDF / Word / 图片，字段识别准确率达 **95%**。',
    '引入大模型抽取 + 规则校验的混合方案，较纯正则方案召回率提升 **40%**。',
  ],
  link: 'github.com/yourname/resume-parser',
};

// 专业技能示例：富文本（Markdown），每行一个类别，**加粗**为类别名
export const EXAMPLE_SKILL =
  '**后端开发**：TypeScript、Node.js、Go、MySQL、Redis、Kafka\n' +
  '**工程能力**：Docker、Kubernetes、CI/CD、性能调优、分布式架构';

export const EXAMPLE_AWARD: ResumeAward = {
  title: '国家奖学金',
  issuer: '教育部',
  date: '2023.10',
};

export const EXAMPLE_CERTIFICATE: ResumeCertificate = {
  name: '软件设计师（中级）',
  issuer: '工信部',
  date: '2023.05',
};

export const EXAMPLE_LANGUAGE: ResumeLanguage = {
  name: '英语',
  level: 'CET-6',
};

export const EXAMPLE_ACTIVITY: ResumeActivity = {
  name: '校研究生会',
  role: '技术部部长',
  period: '2022.09 - 2023.06',
  highlights: [
    '统筹 10 人团队搭建活动报名小程序，覆盖全校 **2 万+** 师生。',
    '组织 12 场技术分享会，累计参与 **1500+** 人次。',
  ],
};

export const EXAMPLE_INTERESTS: string[] = ['开源贡献', '技术写作', '马拉松', '摄影'];

// 自我评价示例（基本信息区）
export const EXAMPLE_SUMMARY =
  '后端研发工程师，3 年高并发系统开发经验，擅长性能优化与分布式架构；主导过日均千万级订单链路重构，具备从 0 到 1 的项目落地能力与良好的工程素养。';
