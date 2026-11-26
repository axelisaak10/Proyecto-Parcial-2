import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['<rootDir>/tests/**/*.test.ts'],
  transform: {
    '^.+\\.ts$': [
      'ts-jest',
      {
        tsconfig: '<rootDir>/tsconfig.test.json',
      },
    ],
  },
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/server.ts',
  ],
  coverageReporters: ['text', 'text-summary', 'lcov', 'json-summary'],
  coverageDirectory: '<rootDir>/coverage',
};

export default config;
