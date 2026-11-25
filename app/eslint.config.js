// https://docs.expo.dev/guides/using-eslint/
const path = require('node:path');
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

/** What each folder of src may use: itself, and those before it. See docs/architecture.md. */
const LAYERS = ['domain', 'data', 'account', 'state', 'theme', 'lib', 'ui', 'features', 'app'];

const zones = LAYERS.slice(0, -1).map((layer, i) => ({
  target: path.join(__dirname, 'src', layer),
  from: LAYERS.slice(i + 1).map((later) => path.join(__dirname, 'src', later)),
  message: `src/${layer} can't use this: see docs/architecture.md.`,
}));

module.exports = defineConfig([
  expoConfig,
  {
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: { parserOptions: { projectService: true, tsconfigRootDir: __dirname } },
    rules: {
      // Work that is started and not waited for is a bug, unless it says so (`void`).
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/consistent-type-imports': ['error', { fixStyle: 'inline-type-imports', disallowTypeAnnotations: false }],
      'import/no-cycle': 'error',
      'import/no-restricted-paths': ['error', { zones }],
      'import/order': [
        'error',
        {
          groups: [['builtin', 'external'], 'internal', ['parent', 'sibling', 'index']],
          pathGroups: [{ pattern: '@/**', group: 'internal' }, { pattern: '@assets/**', group: 'internal' }],
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'no-restricted-syntax': [
        'error',
        { selector: "ImportDeclaration[source.value='@expo/vector-icons']", message: 'Use src/ui/Icon: this puts every icon font into the app.' },
        { selector: "ImportDeclaration[source.value='@expo-google-fonts/google-sans']", message: 'Use src/theme/fonts: this puts every weight into the app.' },
      ],
    },
  },
  {
    // The only places that know the library, or draw plain words.
    files: ['src/**/*.tsx'],
    ignores: ['src/ui/**', 'src/__tests__/**'],
    rules: { 'no-restricted-imports': ['error', { paths: [{ name: 'react-native', importNames: ['Text'], message: 'Use AppText.' }] }] },
  },
  {
    ignores: ['dist/*', '.expo/*'],
  },
]);
