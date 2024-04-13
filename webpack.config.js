const path = require("path");
const webpack = require("webpack");
const Dotenv = require("dotenv-webpack");

// 检查是否在CI/CD环境中
const isCICD = process.env.CI; // CI环境变量通常由CI/CD服务提供，例如GitHub Actions

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
        // 根据是否在CI/CD环境中使用不同的插件配置
        ...(isCICD ? [
            new webpack.DefinePlugin({
                "process.env.CLOUD_INSTANCE": JSON.stringify(process.env.CLOUD_INSTANCE),
                "process.env.TENANT_ID": JSON.stringify(process.env.TENANT_ID),
                "process.env.CLIENT_ID": JSON.stringify(process.env.CLIENT_ID),
                // 为其他需要的环境变量添加更多字段
            }),
        ] : [
            new Dotenv()
        ])
    ]
};
