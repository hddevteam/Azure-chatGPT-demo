const path = require("path");
const webpack = require("webpack");
const Dotenv = require("dotenv-webpack");

// 检查是否在CI/CD环境中
const isCICD = process.env.CI;

console.log("isCICD:", isCICD);

let pluginsConfig;

if (isCICD) {
    console.log("Using webpack.DefinePlugin with environment variables");
    pluginsConfig = [
        new webpack.DefinePlugin({
            "process.env.CLOUD_INSTANCE": JSON.stringify(process.env.CLOUD_INSTANCE),
            "process.env.TENANT_ID": JSON.stringify(process.env.TENANT_ID),
            "process.env.CLIENT_ID": JSON.stringify(process.env.CLIENT_ID),
            "process.env.REDIRECT_URI": JSON.stringify(process.env.REDIRECT_URI),
            "process.env.SCOPES": JSON.stringify(process.env.SCOPES),
        }),
    ];
} else {
    console.log("Using Dotenv for environment variables");
    pluginsConfig = [new Dotenv()];
}

module.exports = {
    mode: "development",
    entry: {
        main: "./public/index.js",
        profileManager: "./public/profile-manager.js"
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "./public/dist"),
    },
    plugins: [...pluginsConfig]
};
