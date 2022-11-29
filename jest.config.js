module.exports = {
    transform: {
        '^.+\\.(js|jsx|ts|tsx)$': 'ts-jest',
    },
    preset: 'ts-jest',
    verbose: true,

    globals: {
        __DEV__: true,
        'ts-jest': {
            astTransformers: {
                before: ['ts-relay-plugin'],
            },
            diagnostics: {
                warnOnly: true,
            },
            isolatedModules: true,
        },
    },

    moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
    testURL: 'http://localhost',
    testEnvironment: 'node',

    testMatch: ['<rootDir>/__tests__/forms-test.tsx'],
    testPathIgnorePatterns: [
        './node_modules/',
        '/node_modules/',
        '/lib/',
        '<rootDir>/lib/',
        '<rootDir>/node_modules/',
    ],
    transformIgnorePatterns: ['./node_modules/(?!(@react-native-community|react-native))'],
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0,
        },
    },
    setupFiles: ['./scripts/setup.ts'],
    timers: 'fake',
};
