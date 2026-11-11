/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#FBF2F1',
          100: '#F6E0DD',
          200: '#EDBFBA',
          300: '#E0948C',
          400: '#D1675E',
          500: '#C2443C',
          600: '#A93530',
          700: '#8C2B27',
          800: '#722622',
          900: '#5E221F',
        },
        gold: {
          50: '#FBF7E9',
          100: '#F5EBC7',
          200: '#EBD68F',
          300: '#DFBE58',
          400: '#CFA62F',
          500: '#B98D22',
          600: '#9A701B',
          700: '#7A5618',
          800: '#654619',
          900: '#563B1A',
        },
        ink: {
          DEFAULT: '#22201E',
          soft: '#4B4744',
          mute: '#8A8480',
        },
        paper: {
          DEFAULT: '#FFFFFF',
          warm: '#FAF8F5',
          soft: '#F3F0EC',
          line: '#E7E2DC',
        },
      },
      fontFamily: {
        display: ['"Noto Serif SC"', '"Songti SC"', '"STSong"', 'SimSun', 'serif'],
        sans: ['"Noto Sans SC"', '"PingFang SC"', '"Microsoft YaHei"', 'sans-serif'],
        brush: ['"Ma Shan Zheng"', '"Noto Serif SC"', 'cursive'],
        cute: ['"ZCOOL XiaoWei"', '"Noto Serif SC"', 'serif'],
      },
      boxShadow: {
        soft: '0 2px 12px rgba(40, 30, 25, 0.06)',
        card: '0 8px 30px rgba(40, 30, 25, 0.08)',
        lift: '0 16px 48px rgba(40, 30, 25, 0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(14px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s ease-out both',
        'fade-in': 'fade-in 0.4s ease-out both',
        'scale-in': 'scale-in 0.35s ease-out both',
      },
    },
  },
  plugins: [],
}
