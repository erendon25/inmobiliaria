/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#fc7f51',
                secondary: '#16151a',
                accent: '#D4AF37',
                emerald: {
                    DEFAULT: '#10b981',
                    50: '#ecfdf5',
                    100: '#d1fae5',
                    200: '#a7f3d0',
                    300: '#6ee7b7',
                    400: '#34d399',
                    500: '#10b981',
                    600: '#059669',
                    700: '#047857',
                    800: '#065f46',
                    900: '#064e3b',
                },
            },
            fontFamily: {
                sans: ['Nunito Sans', 'sans-serif'],
            },
            keyframes: {
                'slow-zoom': {
                    '0%, 100%': { transform: 'scale(1.05)' },
                    '50%': { transform: 'scale(1.12)' },
                },
                fadeIn: {
                    '0%': { opacity: '0', transform: 'translateY(8px)' },
                    '100%': { opacity: '1', transform: 'translateY(0)' },
                },
            },
            animation: {
                'slow-zoom': 'slow-zoom 20s ease-in-out infinite',
                'fadeIn': 'fadeIn 0.3s ease-out forwards',
            },
        },
    },
    plugins: [],
}

