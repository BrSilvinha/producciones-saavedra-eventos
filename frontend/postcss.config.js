module.exports = {
  plugins: {
    'tailwindcss': {},
    'autoprefixer': {},
    // Plugin para optimizar CSS en producción
    ...(process.env.NODE_ENV === 'production' && {
      'cssnano': {
        preset: [
          'default',
          {
            discardComments: {
              removeAll: true,
            },
            normalizeWhitespace: false,
          },
        ],
      },
    }),
  },
}