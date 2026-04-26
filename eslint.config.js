// @ts-check
const tseslint = require('typescript-eslint');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const unusedImports = require('eslint-plugin-unused-imports');
const importPlugin = require('eslint-plugin-import');

module.exports = tseslint.config(
  {
    ignores: ['**/build/**', '**/dist/**', '**/node_modules/**']
  },
  {
    files: ['**/*.ts'],
    extends: [
      ...tseslint.configs.recommended,
    ],
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
      'import': importPlugin,
    },
    languageOptions: {
      parserOptions: {
        project: './tsconfig.eslint.json',
        sourceType: 'module',
        ecmaVersion: 2020,
      },
      globals: {
        Atomics: 'readonly',
        ng: 'readonly',
        SharedArrayBuffer: 'readonly',
        browser: 'readonly',
        window: 'readonly',
        document: 'readonly',
        console: 'readonly',
        setTimeout: 'readonly',
        clearTimeout: 'readonly',
        setInterval: 'readonly',
        clearInterval: 'readonly',
        Promise: 'readonly',
        require: 'readonly',
        module: 'readonly',
        __dirname: 'readonly',
        process: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      'class-methods-use-this': 'off',
      'consistent-return': 'off',
      'default-param-last': 'off',
      'func-style': 'warn',
      'no-bitwise': 'off',
      'no-empty': 'off',
      'no-nested-ternary': 'off',
      'no-param-reassign': 'off',
      'no-underscore-dangle': 'off',
      'no-unreachable': 'warn',
      'prefer-destructuring': 'off',
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [
            ['^\\u0000', '^@?\\w', '^[^.]', '^\\.']
          ]
        }
      ],
      'simple-import-sort/exports': 'warn',
      'sort-imports': 'off',
      'spaced-comment': 'off',
      'unused-imports/no-unused-imports': 'warn',
      'import/no-extraneous-dependencies': ['error', { devDependencies: true }],
      'import/order': 'off',
      'import/prefer-default-export': 'off',
    }
  },
  prettierRecommended
);
