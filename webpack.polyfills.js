const webpack = require('webpack');
const path = require('path');

module.exports = {
  resolve: {
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
    },
  },
  plugins: [
    new webpack.ProvidePlugin({
      process: require.resolve('process/browser.js'),
      Buffer: ['buffer', 'Buffer'],
    }),
  ],
};
