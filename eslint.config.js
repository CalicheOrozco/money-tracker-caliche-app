import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'

export default [
  { ignores: ['dist', '.vercel', 'Money Tracker*/**'] },
  js.configs.recommended,
  {
    files: ['src/**/*.{js,jsx}'],
    languageOptions: {
      globals: globals.browser,
      parserOptions: { ecmaFeatures: { jsx: true } }
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh
    },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true, allowExportNames: ['useAuth', 'useAppData', 'useAppUI'] }
      ]
    }
  },
  {
    // The entry file is never hot-reloaded on its own.
    files: ['src/main.jsx'],
    rules: { 'react-refresh/only-export-components': 'off' }
  },
  {
    files: ['public/sw.js'],
    languageOptions: { globals: globals.serviceworker }
  },
  {
    files: ['server/**/*.js', 'api/**/*.js', '*.config.js'],
    languageOptions: { globals: globals.node }
  }
]
