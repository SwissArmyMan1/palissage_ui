import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import { defineConfig, globalIgnores } from 'eslint/config'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommended,
      reactHooks.configs.flat.recommended,
      reactRefresh.configs.vite,
    ],
    languageOptions: {
      globals: globals.browser,
    },
    rules: {
      // A provider that also exports its own hook, or a pattern component that
      // exports the helper that builds its rows, is ordinary React. Fast
      // Refresh handles both; the rule is only told to expect them.
      'react-refresh/only-export-components': [
        'error',
        { allowExportNames: ['useTheme', 'useToast', 'reserveLines'] },
      ],
    },
  },
])
