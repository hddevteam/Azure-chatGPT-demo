const path = require("path");
const Dotenv = require("dotenv-webpack");

module.exports = {
    mode: "development",
    entry: {
        main: "./public/index.js",
        profileManager: "./public/profile-manager.js"
    },
    output: {
        filename: "[name].bundle.js", // This will create main.bundle.js and profileManager.bundle.js
        path: path.resolve(__dirname, "./public/dist"),
    },
    // 添加plugins字段，并实例化Dotenv
    plugins: [
        new Dotenv()
    ]
};
