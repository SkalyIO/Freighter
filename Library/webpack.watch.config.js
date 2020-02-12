const path = require('path');
var devConfig = require("./webpack.dev.config.js");
Object.assign(devConfig, {
    watch: true
})
module.exports = devConfig