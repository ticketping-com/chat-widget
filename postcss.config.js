export default {
  plugins: {
    autoprefixer: {
      overrideBrowserslist: [
        '> 1%',
        'last 2 versions',
        'not dead'
      ]
    },
    cssnano: process.env.NODE_ENV === 'production' ? {} : false
  }
}