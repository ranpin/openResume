// 简历正文字体选项：key 存入 settings.fontFamily，stack 下发到简历根节点的 font-family。
// 选用跨平台（macOS/Windows/打印）都能回落的中文字体栈；default 表示不覆盖、沿用站点默认。

export interface FontOption {
  key: string;
  label: string;
  stack: string; // 空串 = 不覆盖
}

export const FONT_OPTIONS: FontOption[] = [
  { key: 'default', label: '系统默认', stack: '' },
  {
    key: 'song',
    label: '宋体·正式',
    stack: '"Songti SC","STSong","SimSun","Source Han Serif SC",serif',
  },
  {
    key: 'hei',
    label: '黑体·无衬线',
    stack: '"PingFang SC","Microsoft YaHei","Source Han Sans SC",sans-serif',
  },
  { key: 'kai', label: '楷体', stack: '"Kaiti SC","STKaiti","KaiTi",serif' },
  { key: 'serif', label: '英文衬线', stack: 'Georgia,"Times New Roman",serif' },
];

export const fontStack = (key?: string): string =>
  FONT_OPTIONS.find((f) => f.key === key)?.stack || '';
