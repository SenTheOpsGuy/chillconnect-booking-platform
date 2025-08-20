/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // ChillConnect Premium Color Palette
        primary: {
          black: '#000000',
          red: '#DC2626',
          gray: '#6B7280',
        },
        dark: {
          50: '#f9fafb',
          100: '#f3f4f6',
          200: '#e5e7eb',
          300: '#d1d5db',
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827',
          950: '#030712',
        },
        sensual: {
          red: '#DC2626',
          'red-dark': '#B91C1C',
          'red-light': '#F87171',
          black: '#000000',
          'black-light': '#1a1a1a',
          'black-dark': '#0a0a0a',
          gray: '#6B7280',
          'gray-light': '#9CA3AF',
          'gray-dark': '#374151',
        }
      },
      fontFamily: {
        'sans': ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        'display': ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
      },
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'pulse-slow': 'pulse 3s ease-in-out infinite',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      boxShadow: {
        'sensual': '0 10px 40px rgba(220, 38, 38, 0.1)',
        'sensual-lg': '0 20px 60px rgba(220, 38, 38, 0.15)',
        'dark': '0 10px 40px rgba(0, 0, 0, 0.3)',
        'dark-lg': '0 20px 60px rgba(0, 0, 0, 0.4)',
      },
      borderRadius: {
        'xl': '1rem',
        '2xl': '1.5rem',
        '3xl': '2rem',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/typography'),
  ],
}