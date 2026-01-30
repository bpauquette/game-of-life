// ESLint v9+ flat config for Game of Life
// See: https://eslint.org/docs/latest/use/configure/configuration-files-new

import babelParser from '@babel/eslint-parser';
import reactPlugin from 'eslint-plugin-react';
import reactHooksPlugin from 'eslint-plugin-react-hooks';
import importPlugin from 'eslint-plugin-import';
import tsPlugin from '@typescript-eslint/eslint-plugin';

export default [
  {
    files: ['**/*.{js,jsx}'],
    ignores: [
      'node_modules/',
      'build/**',
      'dist/**',
      'public/**',
      'coverage/**',
      '**/*.d.ts',
      '**/serviceWorker.js',
      '**/setupTests.js',
      '**/reportWebVitals.js',
      '**/*.css',
      '**/*.png',
      '**/*.jpg',
      '**/*.svg',
      '**/*.woff',
      '**/*.woff2',
    ],
    languageOptions: {
      parser: babelParser,
      parserOptions: {
        requireConfigFile: false,
        babelOptions: {
          presets: ['@babel/preset-react'],
        },
        ecmaVersion: 2021,
        sourceType: 'module',
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: reactPlugin,
      'react-hooks': reactHooksPlugin,
      import: importPlugin,
      '@typescript-eslint': tsPlugin,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
      // Add import/first and @typescript-eslint/no-var-requires explicitly
      'import/first': 'error',
      '@typescript-eslint/no-var-requires': 'off',
    },
    linterOptions: {
      reportUnusedDisableDirectives: true,
    },
  },
];
