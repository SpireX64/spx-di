/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: "./test",
  collectCoverage: true,
  collectCoverageFrom: ['./src/**/*.ts'],
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  transform: {
    "": ["ts-jest", {
      isolatedModules: true,
      tsconfig: './test/tsconfig.json',
    }]
  },
};