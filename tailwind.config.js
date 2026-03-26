/** @type {import('tailwindcss').Config} */
module.exports = {
    content: ['./src/**/*.{ts,tsx}', './index.html'],
    prefix: 'tw-',
    theme: {
        extend: {
            colors: {
                'nordic-blue': '#0069C2',
                primary: '#0069C2',
            },
        },
    },
    plugins: [],
};
