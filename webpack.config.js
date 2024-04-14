//webpack.config.js

const path = require("path");
const webpack = require("webpack");
const Dotenv = require("dotenv-webpack");

// 检查是否在CI/CD环境中
const isCICD = process.env.CI; // CI环境变量通常由CI/CD服务提供，例如GitHub Actions

console.log("isCICD: ", isCICD);
console.log("process.env.CLOUD_INSTANCE: ", process.env.CLOUD_INSTANCE);

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
    plugins: [
        ...(isCICD ? [
            new webpack.DefinePlugin({
                "process.env.CLOUD_INSTANCE": JSON.stringify(process.env.CLOUD_INSTANCE),
                "process.env.TENANT_ID": JSON.stringify(process.env.TENANT_ID),
                "process.env.CLIENT_ID": JSON.stringify(process.env.CLIENT_ID),
            }),
        ] : [
            new Dotenv()
        ])
    ]
};
