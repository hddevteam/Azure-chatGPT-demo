// webpack.config.js
const path = require("path");

module.exports = {
    mode: "development",
    entry: {
        main: "./public/index.js",
        profileManager: "./public/profile-manager.js"
    },
    output: {
        filename: "[name].bundle.js", // This will create main.bundle.js and profileManager.bundle.js
        path: path.resolve(__dirname, "./public/dist"),
    }
};
