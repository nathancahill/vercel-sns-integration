/* eslint-disable global-require, import/no-extraneous-dependencies */
module.exports = {
    plugins: [
        require('tailwindcss'),
        require('@fullhuman/postcss-purgecss')({
            content: ['./public/*.html'],
            defaultExtractor: content =>
                content.match(/[A-Za-z0-9-_:/]+/g) || [],
        }),
        require('cssnano'),
    ],
}
