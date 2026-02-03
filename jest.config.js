export default {
  testEnvironment: 'jsdom',
  extensionsToTreatAsEsm: ['.js', '.jsx'],
  transform: {
    '^.+\\.(js|jsx)$': ['babel-jest', {
      presets: [
        ['@babel/preset-env', { targets: { node: 'current' } }],
        ['@babel/preset-react', { runtime: 'automatic' }]
      ]
    }]
  },
  moduleNameMapper: {
    '^jsonwebtoken$': '<rootDir>/src/__mocks__/jsonwebtoken.js'
  }
};
