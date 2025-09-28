module.exports = {
  // 为不同类型的测试设置不同的环境
  projects: [
    {
      displayName: 'main-process',
      testEnvironment: 'node',
      testMatch: [
        '<rootDir>/src/main/**/__tests__/**/*.(js|jsx)',
        '<rootDir>/src/main/**/*.(test|spec).(js|jsx)'
      ],
      transform: {
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
    },
    {
      displayName: 'renderer-process',
      testEnvironment: 'jsdom',
      setupFilesAfterEnv: ['<rootDir>/src/setupTests.js'],
      moduleNameMapper: {
        '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
      },
      transform: {
        '^.+\\.(js|jsx)$': 'babel-jest',
      },
      testMatch: [
        '<rootDir>/src/**/__tests__/**/*.(js|jsx)',
        '<rootDir>/src/**/*.(test|spec).(js|jsx)',
        '!<rootDir>/src/main/**/__tests__/**/*.(js|jsx)',
        '!<rootDir>/src/main/**/*.(test|spec).(js|jsx)'
      ],
    }
  ],
  collectCoverageFrom: [
    'src/**/*.(js|jsx)',
    '!src/**/*.test.(js|jsx)',
    '!src/setupTests.js'
  ]
}
