module.exports = {
  testEnvironment: 'jest-environment-jsdom',
  setupFilesAfterEnv: ['@testing-library/jest-dom'],
  moduleNameMapper: {
    '\\.(css|less)$_': '<rootDir>/__mocks__/styleMock.js',
    '\\.(gif|ttf|eot|svg)$_': '<rootDir>/__mocks__/fileMock.js',
  },
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
  },
};
