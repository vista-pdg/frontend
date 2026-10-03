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
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-globals': ['error', {
        globals: ['alert', 'confirm', 'prompt'].map((name) => ({
          name,
          message: 'Usa los componentes compartidos Alert y ConfirmationDialog de VISTA.',
        })),
        checkGlobalObject: true,
      }],
    },
  },
  {
    // Specs de Cypress: chai afirma con getters (`expect(x).to.be.null`), que para la regla
    // no-unused-expressions parecen expresiones sueltas. Es el uso previsto de chai, no un
    // descuido, y el resto de reglas siguen aplicando.
    files: ['cypress/**/*.ts', 'cypress.config.ts'],
    languageOptions: {
      globals: { ...globals.browser, ...globals.mocha, cy: 'readonly', Cypress: 'readonly' },
    },
    rules: {
      '@typescript-eslint/no-unused-expressions': 'off',
    },
  },
])
