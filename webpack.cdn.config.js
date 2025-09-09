const path = require('path');
const TerserPlugin = require('terser-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  mode: 'production',
  entry: './src/cdn-entry.js',
  output: {
    path: path.resolve(__dirname, 'dist-cdn'),
    filename: 'realcaptcha-widget.min.js',
    library: 'RealCaptcha',
    libraryTarget: 'umd',
    globalObject: 'this',
    clean: true
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js', '.jsx'],
    fallback: {
      "process": require.resolve("process/browser"),
      "buffer": require.resolve("buffer"),
      "util": require.resolve("util"),
      "stream": require.resolve("stream-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "path": require.resolve("path-browserify"),
      "os": require.resolve("os-browserify/browser"),
      "fs": false,
      "net": false,
      "tls": false
    }
  },
  module: {
    rules: [
      {
        test: /\.(ts|tsx|js|jsx)$/,
        use: 'ts-loader',
        exclude: /node_modules/
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader']
      },
      {
        test: /\.(png|jpg|jpeg|gif|svg)$/,
        type: 'asset/inline'
      }
    ]
  },
  plugins: [
    // Node.js 전역 변수들을 브라우저 환경에 맞게 처리
    new webpack.DefinePlugin({
      'process.env': JSON.stringify({
        NODE_ENV: 'production',
        REACT_APP_TEST_MODE: 'false',
        REACT_APP_API_BASE_URL: 'https://api.realcatcha.com',
        REACT_APP_CDN_BASE_URL: 'https://1df60f5faf3b4f2f992ced2edbae22ad.kakaoiedge.com',
        REACT_APP_SUCCESS_REDIRECT_URL: ''
      }),
      'process.env.NODE_ENV': JSON.stringify('production')
    }),
    // Node.js 전역 변수들을 브라우저에서 사용할 수 있도록 폴리필 제공
    new webpack.ProvidePlugin({
      process: 'process/browser'
    })
  ],
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            drop_console: true,
            drop_debugger: true
          },
          format: {
            comments: false
          }
        },
        extractComments: false
      })
    ]
  },
  externals: {
    // React와 ReactDOM을 외부 의존성으로 처리 (CDN에서 로드)
    react: {
      commonjs: 'react',
      commonjs2: 'react',
      amd: 'React',
      root: 'React'
    },
    'react-dom': {
      commonjs: 'react-dom',
      commonjs2: 'react-dom',
      amd: 'ReactDOM',
      root: 'ReactDOM'
    }
  }
};