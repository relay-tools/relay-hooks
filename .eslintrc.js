module.exports = {
    extends: [
        'plugin:@typescript-eslint/recommended', // Uses the recommended rules from the @typescript-eslint/eslint-plugin
        'prettier/@typescript-eslint', // Uses eslint-config-prettier to disable ESLint rules from @typescript-eslint/eslint-plugin that would conflict with prettier
        'plugin:prettier/recommended', // Enables eslint-plugin-prettier and displays prettier errors as ESLint errors. Make sure this is always the last configuration in the extends array.
        'plugin:react-hooks/recommended',
    ],
    parserOptions: {
        ecmaVersion: 2018, // Allows for the parsing of modern ECMAScript features
        sourceType: 'module', // Allows for the use of imports
    },
    parser: '@typescript-eslint/parser',
    plugins: ['@typescript-eslint', 'react', 'prettier', 'eslint-plugin-import'],
    settings: {
        'import/parsers': {
            '@typescript-eslint/parser': ['.ts', '.tsx'],
        },
        'import/resolver': {
            typescript: {},
        },
    },
    rules: {
        'react/jsx-filename-extension': [2, { extensions: ['.js', '.jsx', '.ts', '.tsx'] }],
        'import/no-extraneous-dependencies': [
            2,
            { devDependencies: ['**/test.tsx', '**/test.ts'] },
        ],
        indent: [2, 4, { SwitchCase: 1 }],
        'lines-between-class-members': ['error', 'always', { exceptAfterSingleLine: true }],
        'space-before-function-paren': [
            'error',
            { anonymous: 'never', named: 'never', asyncArrow: 'ignore' },
        ],
        'max-len': [
            2,
            {
                code: 100,
                ignorePattern: '^import [^,]+ from |^export | implements',
            },
        ],
        '@typescript-eslint/no-unused-vars': [2, { argsIgnorePattern: '^_' }],
        'object-curly-newline': ['error', { consistent: true }],
        '@typescript-eslint/no-explicit-any': [0],
        'no-plusplus': ['error', { allowForLoopAfterthoughts: true }],
        'linebreak-style': [0],
        '@typescript-eslint/no-use-before-define': [0],
        'no-duplicate-imports': ['error'],
        semi: 'off',
        '@typescript-eslint/semi': [2, 'always'],
        '@typescript-eslint/no-empty-function': ['error', { allow: ['arrowFunctions'] }],
        'import/no-default-export': ['error'],
        'import/order': [
            'error',
            {
                groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
                alphabetize: {
                    order: 'asc',
                    caseInsensitive: true,
                },
            },
        ],
    },
};
