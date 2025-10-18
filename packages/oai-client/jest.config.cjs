module.exports = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  extensionsToTreatAsEsm: ['.ts'],
  moduleFileExtensions: ['ts', 'tsx', 'js'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { useESM: true }]
  },
  rootDir: './',
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)']
};
