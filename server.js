// server.js
const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const { msalConfig } = require("./authConfig"); // 引入 MSAL 配置
const { ConfidentialClientApplication } = require("@azure/msal-node");
const passport = require("passport"); // 引入passport
const { BearerStrategy } = require("passport-azure-ad"); // 引入passport-azure-ad的BearerStrategy

const app = express();
// 加载环境变量中的配置
const TENANT_ID = process.env.TENANT_ID;
const CLIENT_ID = process.env.CLIENT_ID;

const apiRouter = require("./api");

// 配置Bearer Strategy
const bearerStrategy = new BearerStrategy({
    identityMetadata: `${process.env.CLOUD_INSTANCE}${TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: CLIENT_ID,
    audience: CLIENT_ID,  // 如果API有自己的identifier，则使用那个值
    validateIssuer: true,
    issuer: [`${process.env.CLOUD_INSTANCE}${TENANT_ID}/v2.0`],
    passReqToCallback: false
}, (token, done) => {
    // token是已解析的JWT Token
    // 可以在此执行一些额外的验证
    // 如果验证成功，调用done(null, user)
    console.log("Validated claims: ", token);
    done(null, {}, token);
});

// 使用passport和Azure AD策略初始化passport
passport.use(bearerStrategy);

app.use(bodyParser.json({ limit: "1000kb" }));
app.use(express.static("public"));
app.use(passport.initialize()); // 启用passport中间件

// 使用passport身份验证保护API路由
// app.use("/api", passport.authenticate("oauth-bearer", { session: false }), apiRouter);
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
