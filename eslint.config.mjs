// @ts-check
import eslint from '@eslint/js'
import tseslint from 'typescript-eslint'

export default tseslint.config(
  {
    ignores: [
      'node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      'allure-results/**',
      'allure-report/**',
      'tests/specs/generated/**',
    ],
  },
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      // This codebase leans on `any` on purpose at Playwright/Groq boundaries
      // (helpers/selfHealing/types.ts, groq response shapes) — don't fight that.
      '@typescript-eslint/no-explicit-any': 'off',
      // Unused function args are common in fixture signatures (`async ({}, use) => ...`)
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
      // House style: no semicolons, anywhere
      semi: ['error', 'never'],
      'no-extra-semi': 'error',
    },
  },
  {
    // Playwright fixture convention: `heal: async ({}, use) => ...` — the
    // empty destructure means "no fixture dependencies", not a mistake
    files: ['tests/fixtures/**/*.ts'],
    rules: {
      'no-empty-pattern': 'off',
    },
  },
  {
    // CommonJS helper scripts loaded by GitHub Actions (actions/github-script's
    // `require('./...')` pattern) — plain Node, not part of the TS project
    files: ['.github/scripts/**/*.js'],
    languageOptions: {
      globals: {
        module: 'writable',
        require: 'readonly',
        console: 'readonly',
      },
    },
  },
  {
    // rabbit-hole's own Playwright specs (see rabbit-hole-e2e/) — plain JS
    // (that app has no TypeScript setup), run under Node via @playwright/test
    files: ['rabbit-hole-e2e/tests/**/*.js'],
    languageOptions: {
      globals: {
        setTimeout: 'readonly',
      },
    },
  }
)
