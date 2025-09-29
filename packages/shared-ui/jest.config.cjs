// Jest config scoped to @fractal-mcp/shared-ui only
module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx)$': [
      'ts-jest',
      {
        useESM: true,
        tsconfig: '../../tsconfig.jest.json',
        diagnostics: true,
      },
    ],
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: [
    '<rootDir>/tests/**/*.(test|spec).ts',
    '<rootDir>/?(*.)+(test|spec).ts',
  ],
  setupFiles: ['<rootDir>/tests/setup.ts'],
  moduleNameMapper: {
    '^@fractal-mcp/protocol$': '<rootDir>/../protocol/src/index.ts',
    '^@fractal-mcp/shared-ui$': '<rootDir>/src/index.ts',
  },
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
  ],
};
