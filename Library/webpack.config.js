const path = require('path');
var devConfig = require("./webpack.dev.config.js");

Object.assign(devConfig, {
    optimization: {
        minimize: true
    },
    output: {
        path: path.resolve(__dirname, "dist")
    }
})

module.exports = devConfig