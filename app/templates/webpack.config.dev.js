var path = require('path');
var webpack = require('webpack');
var HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = {
  devtool: 'eval',
  entry: [
    'webpack-dev-server/client?http://0.0.0.0:<%= port %>',
    'webpack/hot/only-dev-server',
    './src/index'
  ],
  output: {
    path: path.join(__dirname, 'dist'),
    filename: 'bundle.js',
    publicPath: '/'
  },
  resolve: {
    alias: {
      '_styleVariables.less': path.resolve('./src/constants/styleVariables.less')
    }
  },
  plugins: [
    new HtmlWebpackPlugin({
      inject: true,
      template: './index.html'
    }),
    new webpack.HotModuleReplacementPlugin()
  ],
  module: {
    loaders: [{
      test: /\.js$/,
      loaders: ['react-hot', 'babel'],
      include: path.join(__dirname, 'src')
    },
    {
      test: /\.(jpg|png|gif|eot|svg|ttf|woff|woff2)(\?.*)?$/,
      include: [path.join(__dirname, 'src')],
      loader: 'file',
      query: {name: 'images/[name].[ext]'}
    },
    {
      test: /\.(mp4|webm|pdf)(\?.*)?$/,
      include: path.join(__dirname, 'src'),
      loader: 'url',
      query: {
        limit: 10000,
        name: 'media/[name].[ext]'
      }
    },
    {
      test: /\.less$/,
      loader: 'style-loader!css-loader!postcss-loader!less-loader',
      include: path.join(__dirname, 'src')
    }],
    postcss: function () {
      return [require('autoprefixer')];
    }
  }
};
