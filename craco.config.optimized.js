// craco.config.js - Bundle optimization configuration
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // Optimize bundle splitting for better caching and performance
      webpackConfig.optimization.splitChunks = {
        chunks: 'all',
        minSize: 20000,
        maxSize: 244000,
        cacheGroups: {
          // Separate Monaco Editor into its own chunk
          monaco: {
            test: /[\\/]node_modules[\\/](@monaco-editor|monaco-editor)[\\/]/,
            name: 'monaco',
            chunks: 'all',
            priority: 30,
            reuseExistingChunk: true,
          },
          // Separate MUI into its own chunk
          mui: {
            test: /[\\/]node_modules[\\/](@mui|@emotion)[\\/]/,
            name: 'mui',
            chunks: 'all', 
            priority: 20,
            reuseExistingChunk: true,
          },
          // React and core libraries
          react: {
            test: /[\\/]node_modules[\\/](react|react-dom)[\\/]/,
            name: 'react',
            chunks: 'all',
            priority: 25,
            reuseExistingChunk: true,
          },
          // Default vendor chunk for other dependencies
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendor',
            chunks: 'all',
            priority: 10,
            reuseExistingChunk: true,
          },
          // Common chunks for frequently shared code
          common: {
            name: 'common',
            minChunks: 2,
            chunks: 'all',
            priority: 5,
            reuseExistingChunk: true,
          },
        },
      };

      // Add bundle analysis in development
      if (process.env.NODE_ENV === 'development') {
        const BundleAnalyzerPlugin = require('webpack-bundle-analyzer').BundleAnalyzerPlugin;
        webpackConfig.plugins.push(
          new BundleAnalyzerPlugin({
            analyzerMode: 'static',
            openAnalyzer: false,
            reportFilename: 'bundle-report.html',
          })
        );
      }

      return webpackConfig;
    },
  },
  babel: {
    plugins: [
      // Optimize MUI imports for better tree shaking
      [
        'import',
        {
          libraryName: '@mui/material',
          libraryDirectory: '',
          camel2DashComponentName: false,
        },
        'core',
      ],
      [
        'import',
        {
          libraryName: '@mui/icons-material',
          libraryDirectory: '',
          camel2DashComponentName: false,
        },
        'icons',
      ],
    ],
  },
};