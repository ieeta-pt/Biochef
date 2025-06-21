const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const webpack = require('webpack');

module.exports = {
  entry: './src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: '[name].[contenthash].js',
    publicPath: '/',
    webassemblyModuleFilename: 'wasm/[hash].wasm',
  },
  module: {
    noParse: /public\/wasm\/gto_.*\.js$/, // Exclude Emscripten JS files from parsing
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
      // Remove the 'file-loader' rule for Emscripten JS files
      {
        test: /gto_.*\.js$/,
        include: path.resolve(__dirname, 'public/wasm'),
        type: 'asset/resource', // Treat these files as resources to be emitted to the output directory
        generator: {
          filename: 'wasm/[name][ext]',
        },
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