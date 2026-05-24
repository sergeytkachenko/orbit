// Flat ESLint config. Reflects the Nest CLI preset style — TS recommended +
// Prettier integration — adjusted for ESLint v9+ flat config.
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import prettier from 'eslint-plugin-prettier';
import prettierConfig from 'eslint-config-prettier';

export default [
  {
    // Ignore every build output: top-level dist and per-package dist
    // dirs (apps/*/dist, libs/*/dist, libs/contracts/*/dist). Also
    // skip JS files (config + scaffolding scripts) and generated
    // proto types under any contracts package.
    ignores: [
      '**/dist/**',
      '**/node_modules/**',
      'coverage/**',
      '**/*.js',
      '**/*.mjs',
      '**/*.cjs',
      '**/generated/**',
    ],
  },
  {
    files: ['**/*.ts'],
    languageOptions: {
      parser: tsparser,
      parserOptions: {
        ecmaVersion: 2022,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
      prettier,
    },
    rules: {
      ...tseslint.configs.recommended.rules,
      ...prettierConfig.rules,
      'prettier/prettier': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      '@typescript-eslint/no-empty-object-type': 'off',
    },
  },
];
