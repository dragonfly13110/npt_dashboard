import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist', 'output', 'coverage', 'playwright-report', 'test-results', 'tmp']),
  {
    linterOptions: {
      reportUnusedDisableDirectives: 'off',
    },
  },
  {
    files: ['**/*.{js,jsx}'],
    extends: [
      js.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      ecmaVersion: 2020,
      globals: {
        ...globals.browser,
        ...globals.node
      },
      parserOptions: {
        ecmaVersion: 'latest',
        ecmaFeatures: { jsx: true },
        sourceType: 'module',
      },
    },
    rules: {
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_|^error$|^tableName$|^Icon$|^resetErrorBoundary$',
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_|^e$|^error$',
        varsIgnorePattern: '^[A-Z_]|^(Icon|fireEvent|resetErrorBoundary|useCallback|smartFarmers|instituteStats|lpStats|tourism|selectedTypeCount|createDistrictStats|ensureDistrictStats|normalizeDistrict|countBy|applySheetLayout|error)$',
      }],
      'no-empty': ['error', { allowEmptyCatch: true }],
      'no-irregular-whitespace': 'off',
      'react-hooks/exhaustive-deps': 'off',
      'react-hooks/preserve-manual-memoization': 'off',
      'react-hooks/set-state-in-effect': 'off',
    },
  },
])
