module.exports = {
  extends: [
    'fbjs/strict',
    'plugin:prettier/recommended',
    'plugin:react/recommended',
    'plugin:relay/recommended',
    'prettier/flowtype',
    'prettier/react',
  ],
  parser: 'babel-eslint',
  plugins: ['babel', 'prettier', 'react', 'relay'],
  rules: {
    'no-console': 'off',
    'one-var': 'off',
    'react/prop-types': 'off', // Replaced by flow types

    // Mutations aren't located in the same file as Components
    'relay/unused-fields': 'off',
  },
  settings: {
    react: {
      version: '16.8.1',
      flowVersion: '0.94.0',
    }
  },
};
