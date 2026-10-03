import js from '@eslint/js'
import svelte from 'eslint-plugin-svelte'
import globals from 'globals'
import ts from 'typescript-eslint'

export default ts.config(
  {
    ignores: [
      '**/dist/',
      '**/node_modules/',
      'coverage/',
      '.changeset/',
      'playwright-report/',
      'test-results/'
    ]
  },
  js.configs.recommended,
  ...ts.configs.strict,
  ...svelte.configs.recommended,
  {
    languageOptions: { globals: { ...globals.browser } }
  },
  {
    files: ['**/*.svelte', '**/*.svelte.ts'],
    languageOptions: { parserOptions: { parser: ts.parser } }
  },
  {
    files: [
      'spec/**',
      '**/*.config.{js,ts}',
      '**/scripts/**',
      'apps/playground/mock-api.ts',
      'e2e/**'
    ],
    languageOptions: { globals: { ...globals.node } }
  },
  {
    files: ['**/*.test.ts'],
    rules: { '@typescript-eslint/no-non-null-assertion': 'off' }
  },
  {
    rules: {
      eqeqeq: 'error',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }]
    }
  }
)
