import js from '@eslint/js';
import globals from 'globals';

export default [
  // Ignored paths
  { ignores: ['node_modules/', 'coverage/', 'dist/', 'supabase/'] },

  // Base recommended rules for all JS files
  {
    ...js.configs.recommended,
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {
      ...js.configs.recommended.rules,
      'no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
      }],
    },
  },

  // Server code — Node.js globals
  {
    files: ['src/api/**/*.js', 'src/agent/**/*.js', 'src/queue/**/*.js'],
    languageOptions: {
      globals: { ...globals.node },
    },
  },

  // Test files — Node.js + Vitest globals
  {
    files: ['tests/**/*.js'],
    languageOptions: {
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        vi: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        test: 'readonly',
      },
    },
  },
];
