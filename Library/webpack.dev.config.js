var JavaScriptObfuscator = require("webpack-obfuscator");
const path = require("path");

module.exports = {
  entry: {
    Freighter: "./src/Freighter.js",
    FreighterCrypto: "./src/FreighterCrypto.js",
    FreighterPolling: "./src/FreighterPolling.js",
    FreighterPrivateChannel: "./src/FreighterPrivateChannel.js"
  },
  plugins: [],
  module: {
    rules: [
      {
        test: /\.js$/,
        exclude: /(node_modules|bower_components)/,
        use: {
          loader: "babel-loader",
          options: {
            plugins: [
              "@babel/plugin-proposal-private-methods",
              "@babel/plugin-proposal-class-properties"
            ]
          }
        }
      }
    ]
  },
  optimization: {
    // We no not want to minimize our code.
    minimize: false
  },
  output: {
    path: path.resolve(__dirname, "dev"),
    filename: '[name].js',
    library: "[name]",
    libraryTarget: "umd",
    globalObject: "this"
  }
};
