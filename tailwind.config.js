module.exports = {
  content: ["./pages/*.{html,js}", "./index.html", "./js/*.js"],
  theme: {
    extend: {
      colors: {
        // Primary Colors
        primary: {
          DEFAULT: "#1A3C34", // deep-teal-800
          50: "#F0F9F7", // teal-50
          100: "#CCEDE7", // teal-100
          200: "#99DBD0", // teal-200
          300: "#66C9B8", // teal-300
          400: "#33B7A1", // teal-400
          500: "#2D5A4F", // teal-600
          600: "#1A3C34", // teal-700
          700: "#143028", // teal-800
          800: "#0F241C", // teal-900
          900: "#0A1810", // teal-950
        },
        // Secondary Colors
        secondary: {
          DEFAULT: "#F4A261", // orange-400
          50: "#FEF7F0", // orange-50
          100: "#FDEBD3", // orange-100
          200: "#FBD7A7", // orange-200
          300: "#F9C37B", // orange-300
          400: "#F4A261", // orange-400
          500: "#E8944F", // orange-500
          600: "#D6863D", // orange-600
          700: "#B8722B", // orange-700
          800: "#9A5E19", // orange-800
          900: "#7C4A07", // orange-900
        },
        // Accent Colors
        accent: {
          DEFAULT: "#2D5A4F", // teal-600
          50: "#F0F9F7", // teal-50
          100: "#CCEDE7", // teal-100
          200: "#99DBD0", // teal-200
          300: "#66C9B8", // teal-300
          400: "#33B7A1", // teal-400
          500: "#2D5A4F", // teal-500
          600: "#1A3C34", // teal-600
          700: "#143028", // teal-700
          800: "#0F241C", // teal-800
          900: "#0A1810", // teal-900
        },
        // Background Colors
        background: "#FEFEFE", // warm-white
        surface: "#F8F9FA", // gray-50
        // Text Colors
        "text-primary": "#1A1A1A", // gray-900
        "text-secondary": "#6B7280", // gray-500
        // Status Colors
        success: {
          DEFAULT: "#10B981", // emerald-500
          50: "#ECFDF5", // emerald-50
          100: "#D1FAE5", // emerald-100
          500: "#10B981", // emerald-500
          600: "#059669", // emerald-600
        },
        warning: {
          DEFAULT: "#F59E0B", // amber-500
          50: "#FFFBEB", // amber-50
          100: "#FEF3C7", // amber-100
          500: "#F59E0B", // amber-500
          600: "#D97706", // amber-600
        },
        error: {
          DEFAULT: "#EF4444", // red-500
          50: "#FEF2F2", // red-50
          100: "#FEE2E2", // red-100
          500: "#EF4444", // red-500
          600: "#DC2626", // red-600
        },
        // Border Colors
        border: "rgba(107, 114, 128, 0.2)", // gray-500 with opacity
        "border-light": "rgba(107, 114, 128, 0.1)", // gray-500 with light opacity
      },
      fontFamily: {
        heading: ['Montserrat', 'sans-serif'],
        body: ['Poppins', 'sans-serif'],
        caption: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
      fontSize: {
        'xs': ['0.75rem', { lineHeight: '1rem' }],
        'sm': ['0.875rem', { lineHeight: '1.25rem' }],
        'base': ['1rem', { lineHeight: '1.5rem' }],
        'lg': ['1.125rem', { lineHeight: '1.75rem' }],
        'xl': ['1.25rem', { lineHeight: '1.75rem' }],
        '2xl': ['1.5rem', { lineHeight: '2rem' }],
        '3xl': ['1.875rem', { lineHeight: '2.25rem' }],
        '4xl': ['2.25rem', { lineHeight: '2.5rem' }],
        '5xl': ['3rem', { lineHeight: '1' }],
        '6xl': ['3.75rem', { lineHeight: '1' }],
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      borderRadius: {
        'lg': '8px',
        'md': '6px',
        'sm': '4px',
      },
      boxShadow: {
        'sm': '0 1px 2px rgba(0, 0, 0, 0.05)',
        'base': '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
        'md': '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
        'lg': '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
        'xl': '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
      },
      transitionDuration: {
        '200': '200ms',
        '400': '400ms',
      },
      transitionTimingFunction: {
        'smooth': 'cubic-bezier(0.4, 0, 0.2, 1)',
      },
      animation: {
        'fade-in': 'fadeIn 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        'slide-up': 'slideUp 400ms cubic-bezier(0.4, 0, 0.2, 1)',
        'scale-in': 'scaleIn 200ms cubic-bezier(0.4, 0, 0.2, 1)',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        slideUp: {
          '0%': { transform: 'translateY(20px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
}