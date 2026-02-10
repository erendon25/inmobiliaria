/** @type {import('tailwindcss').Config} */
export default {
    content: [
        "./index.html",
        "./src/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
        extend: {
            colors: {
                primary: '#FF385C',
                secondary: '#008489',
                accent: '#D4AF37',
            },
            fontFamily: {
                sans: ['Nunito Sans', 'sans-serif'],
            },
        },
    },
    plugins: [],
}
