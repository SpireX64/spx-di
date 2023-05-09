/** @type {import('ts-jest').JestConfigWithTsJest} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: "./",
  collectCoverage: true,
  testPathIgnorePatterns: ['<rootDir>/node_modules/', '<rootDir>/dist/'],
  coveragePathIgnorePatterns: ['<rootDir>/test/'],
  transform: {
    "\\.[jt]sx?$": ["ts-jest", {
      isolatedModules: true,
      tsconfig: './test/tsconfig.json',
    }]
  },
}
