'use strict';

var path = require('path');
var webpack = require('webpack');

module.exports = {
  entry: {
    main: path.join(__dirname, './src/main.js')
  },
  output: {
    filename: '[name].bundle.js',
    path: path.join(__dirname, './')
  },
  resolveLoader: {
    root: path.join(__dirname, 'node_modules')
  },
  plugins: [
     new webpack.ProvidePlugin({
         d3: 'd3',
         c3: 'c3'
     })
  ],
  module: {
    loaders: [
      {
        test: /\.json$/,
        loader: "json"
      }
    ]
  },
  bail: false
};
