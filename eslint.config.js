// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: __dirname } },
    // Work that is started and not waited for is a bug, unless it says so (`void`).
    rules: { '@typescript-eslint/no-floating-promises': 'error' },
  },
  {
    ignores: ['dist/*'],
  },
]);
