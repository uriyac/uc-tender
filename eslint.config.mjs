// eslint.config.mjs — lint בסיסי ומקל. מטרה: לתפוס באגים אמיתיים (משתנה לא מוגדר, import שבור),
// לא סגנון. ב-CI רץ כ-report-only (continue-on-error).
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**', '**/dist/**', 'desktop/dist/**',
      'server/uploads/**', 'server/tools/out/**', 'server/src/data/backups/**',
      'server/eval/results*', 'archive/**', 'test-data/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['**/*.js', '**/*.mjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'module', globals: { ...globals.node } },
  },
  {
    files: ['**/*.cjs'],
    languageOptions: { ecmaVersion: 2024, sourceType: 'commonjs', globals: { ...globals.node } },
  },
  {
    files: ['prototype/**/*.js'],
    languageOptions: { sourceType: 'script', globals: { ...globals.browser } },
  },
  {
    rules: {
      'no-unused-vars': ['warn', { args: 'none', caughtErrors: 'none', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-useless-escape': 'warn',
      'no-control-regex': 'off',     // ניקוי RTF/טקסט עברי משתמש בתווי בקרה בכוונה
      'no-misleading-character-class': 'warn',
      'no-irregular-whitespace': 'off', // טקסט עברי עם RLM/NBSP במחרוזות
      'no-prototype-builtins': 'off',
    },
  },
];
