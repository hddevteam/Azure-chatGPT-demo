const path = require("path");
const webpack = require("webpack");
const Dotenv = require("dotenv-webpack");

// Check if running in CI/CD environment
const isCICD = process.env.CI;

console.log("isCICD:", isCICD);

let pluginsConfig;

if (isCICD) {
    console.log("Using webpack.DefinePlugin with environment variables");
    console.log("process.env.CLOUD_INSTANCE:", process.env.CLOUD_INSTANCE);
    console.log("process.env.TENANT_ID:", process.env.TENANT_ID);
    console.log("process.env.CLIENT_ID:", process.env.CLIENT_ID);
    console.log("process.env.REDIRECT_URI:", process.env.REDIRECT_URI);
    console.log("process.env.SCOPES:", process.env.SCOPES);
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
        main: "./public/index.js"
    },
    output: {
        filename: "[name].bundle.js",
        path: path.resolve(__dirname, "./public/dist"),
    },
    plugins: [...pluginsConfig]
};
