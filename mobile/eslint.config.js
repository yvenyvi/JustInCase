const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['coverage/**', 'dist/**'],
    rules: {
      // React Native text is not HTML and does not require entity escaping.
      'react/no-unescaped-entities': 'off',
      // These React Compiler-oriented checks are new in the SDK 57 preset.
      // Keep existing screens visible as migration warnings while new code
      // continues to be checked without blocking Metro or CI.
      'react-hooks/immutability': 'warn',
      'react-hooks/preserve-manual-memoization': 'warn',
      'react-hooks/refs': 'warn',
      'react-hooks/set-state-in-effect': 'warn',
      'react-hooks/static-components': 'warn',
    },
  },
]);
