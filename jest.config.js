//const { defaults: tsjPreset } = require("ts-jest/presets");

module.exports = {
    transform: {
        '.*': '<rootDir>/scripts/jest/preprocessor.js',
    },
    verbose: true,

    globals: {
        __DEV__: true,
    },

    moduleFileExtensions: ['ts', 'tsx', 'js', 'json'],
    testURL: 'http://localhost',
    testEnvironment: 'node',
    timers: 'fake',

    testMatch: ['<rootDir>/__tests__/**/*-test.js'],

    transformIgnorePatterns: ['<rootDir>/node_modules/(?!(relay-runtime))'],
    modulePathIgnorePatterns: [
        '<rootDir>/lib/',
        '<rootDir>/node_modules/(?!(fbjs/lib/|react/lib/|fbjs-scripts/jest))',
    ],
    testPathIgnorePatterns: [
        '/node_modules/',
        '/lib/',
        '<rootDir>/lib/',
        '<rootDir>/node_modules/',
    ],
    roots: [
        '<rootDir>/',
        '<rootDir>/node_modules/fbjs/lib/',
        '<rootDir>/node_modules/fbjs-scripts/jest',
    ],
    setupFiles: [
        '<rootDir>/node_modules/fbjs-scripts/jest/environment.js',
        '<rootDir>/scripts/jest/environment.js',
    ],
    coverageThreshold: {
        global: {
            branches: 0,
            functions: 0,
            lines: 0,
            statements: 0,
        },
    },
};
