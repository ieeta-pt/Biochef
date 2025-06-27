const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    publicPath: process.env.NODE_ENV === 'production' ? '/gto-wasm-app/' : '/',
    webassemblyModuleFilename: 'wasm/[hash].wasm',
  },
  module: {
    noParse: /public\/wasm\/.*\.js$/, // Exclude Emscripten JS files from parsing
    rules: [
      {
        test: /\.js$/,
        exclude: /node_modules|public\/wasm/,
        use: {
          loader: 'babel-loader',
          options: {
            presets: ['@babel/preset-env', '@babel/preset-react'],
          },
        },
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.wasm$/,
        type: 'webassembly/async',
      },
      {
        test: /\.svg$/,
        use: ['@svgr/webpack'],
      },
      {
        test: /\.m?js/,
        resolve: {
          fullySpecified: false
        }
      },
    ],
  },
  plugins: [
    new HtmlWebpackPlugin({
      template: './public/index.html',
    }),
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
      process: 'process/browser',
    }),
    new CopyWebpackPlugin({
      patterns: [
        {
          from: 'public/wasm',
          to: 'public/wasm',
        },
        {
          from: 'public/img',
          to: 'public/img',
        },
        {
          from: 'gto',
          to: 'gto',
        },
      ],
    }),
  ],
  resolve: {
    fallback: {
      crypto: require.resolve('crypto-browserify'),
      stream: require.resolve('stream-browserify'),
      buffer: require.resolve('buffer/'),
      path: require.resolve('path-browserify'),
      fs: false,
      vm: require.resolve('vm-browserify'),
    },
    alias: {
      wasm: path.resolve(__dirname, 'public/wasm'),
    },
    extensions: ['.js', '.jsx', '.wasm'], // Ensure .wasm files are resolved
  },
  experiments: {
    asyncWebAssembly: true,
    topLevelAwait: true,
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    host: '0.0.0.0',       // Added this line to specify the host
    port: 8082,            // Changed the port to 8082
    historyApiFallback: true,
    open: true,
  },
  optimization: {
    splitChunks: {
      chunks: 'all',
    },
  },
  performance: {
    maxAssetSize: 5000000, // 5 MB
    maxEntrypointSize: 5000000, // 5 MB
  },
};