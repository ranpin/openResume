/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './index.html'],
  theme: {
    extend: {
      fontFamily: {
        serif: ['Songti SC', 'STSong', 'Noto Serif CJK SC', 'serif'],
        sans: [
          'Inter',
          'system-ui',
          '-apple-system',
          'PingFang SC',
          'Microsoft YaHei',
          'sans-serif',
        ],
      },
      colors: {
        // 2026-10-19 配色刷新：与主站 ranpin.github.io 对齐——
        //   warm-gray 由暖米石色 → 冷调中性灰（冷白底）；sage 由灰橄榄绿 → 明亮蔚蓝（全站唯一主色）。
        //   类名沿用旧名（warm-gray-* / sage-*），既有引用自动换色；名字与新色相不符属已知，勿据此「修复」。
        //   注意：简历文档层的 8 个配色主题（components/resume/resumeTheme.ts）用的是 Tailwind 原生色名
        //   （blue/emerald/violet/rose/slate/amber/cyan/fuchsia），与这里的界面色板无关，不受影响。
        'warm-gray': {
          50: '#f8fafc',
          100: '#f1f5f9',
          200: '#e2e8f0',
          300: '#cbd5e1',
          400: '#94a3b8',
          500: '#64748b',
          600: '#475569',
          700: '#334155',
          800: '#1e293b',
          900: '#0f172a',
        },
        sage: {
          50: '#eff6ff',
          100: '#dbeafe',
          200: '#bedaff',
          300: '#91c3ff',
          400: '#5da2fb',
          500: '#3583f6',
          600: '#1a67eb',
          700: '#1552d1',
          800: '#1744a9',
          900: '#183c85',
        },
      },
      animation: {
        'fade-in': 'fadeIn 0.6s ease-out',
        'slide-up': 'slideUp 0.8s ease-out',
        float: 'float 3s ease-in-out infinite',
        'card-in': 'cardIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        cardIn: {
          '0%': { opacity: '0', transform: 'translateY(18px) scale(0.98)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
    },
  },
  plugins: [require('@tailwindcss/typography')],
};
