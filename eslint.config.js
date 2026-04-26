// @ts-check
const tsPlugin = require('@typescript-eslint/eslint-plugin');
const tsParser = require('@typescript-eslint/parser');
const prettierRecommended = require('eslint-plugin-prettier/recommended');
const simpleImportSort = require('eslint-plugin-simple-import-sort');
const unusedImports = require('eslint-plugin-unused-imports');

module.exports = [
  {
    ignores: ['**/build/**', '**/dist/**', '**/node_modules/**']
  },
  {
    files: ['**/*.ts'],
    plugins: {
      '@typescript-eslint': tsPlugin,
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports
    },
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: './tsconfig.eslint.json',
        sourceType: 'module',
        ecmaVersion: 2020
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
        process: 'readonly'
      }
    },
    rules: {
      ...tsPlugin.configs['recommended'].rules,
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-require-imports': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
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
          groups: [['^\\u0000', '^@?\\w', '^[^.]', '^\\.']
          ]
        }
      ],
      'simple-import-sort/exports': 'warn',
      'sort-imports': 'off',
      'spaced-comment': 'off',
      'unused-imports/no-unused-imports': 'warn'
    }
  },
  prettierRecommended
];
