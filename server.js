// server.js
const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const { msalConfig } = require("./authConfig"); // 引入 MSAL 配置
const { ConfidentialClientApplication } = require("@azure/msal-node");

const app = express();
const apiRouter = require("./api");

app.use(bodyParser.json({ limit: "1000kb" }));
app.use(express.static("public"));
app.use("/api", apiRouter);

// MSAL 配置实例
const msalCca = new ConfidentialClientApplication(msalConfig);

app.get("/signin", (req, res) => {
    const authCodeUrlParameters = {
        scopes: ["user.read"],
        redirectUri: msalConfig.REDIRECT_URI,
    };

    // 获取登录 URL
    msalCca.getAuthCodeUrl(authCodeUrlParameters).then((url)=>{
        res.redirect(url);
    }).catch((error) => console.log(JSON.stringify(error)));
});

// 回调路由，用于处理认证响应
app.get("/redirect", (req, res) => {
    const tokenRequest = {
        code: req.query.code,
        scopes: ["user.read"],
        redirectUri: msalConfig.REDIRECT_URI,
    };

    msalCca.acquireTokenByCode(tokenRequest).then((response) => {
        console.log("\nResponse: \n:", response);
        res.status(200).json(response);
    }).catch((error) => {
        console.error(error);
        res.status(500).json({error: "Error acquiring the token"});
    });
});

const server = app.listen(process.env.PORT || 3000, () => console.log("Server is running"));
const close = () => server.close();
module.exports = { app, close };
