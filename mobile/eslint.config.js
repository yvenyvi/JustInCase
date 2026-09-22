const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['coverage/**', 'dist/**'],
    rules: {
      // React Native text is not HTML and does not require entity escaping.
      'react/no-unescaped-entities': 'off',
    },
  },
]);
