import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';

export default [
    {
        files: ['**/*.ts', '**/*.tsx'],
        languageOptions: {
            parser: tsparser,
            parserOptions: {
                ecmaVersion: 2022,
                sourceType: 'module',
            },
        },
        plugins: {
            '@typescript-eslint': tseslint,
        },
        rules: {
            // TypeScript rules - warnings only, mostly auto-fixable
            '@typescript-eslint/no-explicit-any': 'off', // Too strict for existing code
            '@typescript-eslint/no-unused-vars': ['warn', { 
                argsIgnorePattern: '^_',
                varsIgnorePattern: '^_' 
            }],
            
            // General rules - auto-fixable formatting/style
            'no-console': 'off', // Allow console statements
            'semi': ['warn', 'always'], // Auto-fixable
            'quotes': ['warn', 'single', { avoidEscape: true }], // Auto-fixable
            'comma-dangle': ['warn', 'always-multiline'], // Auto-fixable
            'indent': 'off', // Too noisy for existing code
            'no-trailing-spaces': 'warn', // Auto-fixable
            'eol-last': ['warn', 'always'], // Auto-fixable
            'no-multiple-empty-lines': ['warn', { max: 2 }], // Auto-fixable
        },
    },
    {
        ignores: [
            'node_modules/**',
            'dist/**',
            'build/**',
            '*.config.js',
            '*.config.ts',
            'jest.config.js',
            'jest.config.cjs',
            'coverage/**',
            '.turbo/**',
        ],
    },
];

