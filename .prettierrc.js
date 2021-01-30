module.exports = {
  arrowParens: 'always',
  bracketSpacing: false,
  endOfLine: 'lf',
  printWidth: 100,
  quoteProps: 'consistent',
  tabWidth: 2,
  semi: false,
  singleQuote: true,
  trailingComma: 'all',
  overrides: [
    {
      files: '*.css',
      options: {
        parser: 'css',
      },
    },
  ],
}
