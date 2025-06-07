// server.js
const express = require("express");
const bodyParser = require("body-parser");
require("dotenv").config();
const { msalConfig } = require("./authConfig"); // Import MSAL configuration
const { ConfidentialClientApplication } = require("@azure/msal-node");
const passport = require("passport"); // Import passport
const { BearerStrategy } = require("passport-azure-ad"); // Import BearerStrategy from passport-azure-ad

const app = express();
// Load configuration from environment variables
const TENANT_ID = process.env.TENANT_ID;
const CLIENT_ID = process.env.CLIENT_ID;

const apiRouter = require("./apiRoutes");
console.log(`${process.env.CLOUD_INSTANCE}${TENANT_ID}/v2.0/.well-known/openid-configuration`);
// Configure Bearer Strategy 
const bearerStrategy = new BearerStrategy({
    identityMetadata: `${process.env.CLOUD_INSTANCE}${TENANT_ID}/v2.0/.well-known/openid-configuration`,
    clientID: CLIENT_ID,
    audience: `api://${CLIENT_ID}`,  // Match with API application ID URI
    validateIssuer: true,
    // loggingLevel: "info",
    issuer: `https://sts.windows.net/${TENANT_ID}/`, // Match with tenant ID
    passReqToCallback: false
}, (token, done) => {
    // console.log("Validated claims: ", token);
    done(null, {}, token);
});

// Initialize passport with Azure AD strategy
passport.use(bearerStrategy);

app.use(bodyParser.json({ limit: "1000kb" }));
app.use(express.static("public"));
app.use(passport.initialize()); // Enable passport middleware

// Protect API routes using passport authentication
// Temporarily disable authentication for testing convenience
app.use("/api", (req, res, next) => {
    // Add mock user information
    req.user = {
        oid: "test-user",
        name: "Test User"
    };
    next();
}, apiRouter);


// MSAL configuration instance
const msalCca = new ConfidentialClientApplication(msalConfig);

app.get("/signin", (req, res) => {
    const authCodeUrlParameters = {
        scopes: ["user.read"],
        redirectUri: msalConfig.REDIRECT_URI,
    };

    // Get login URL
    msalCca.getAuthCodeUrl(authCodeUrlParameters).then((url)=>{
        res.redirect(url);
    }).catch((error) => console.log(JSON.stringify(error)));
});

// Callback route for handling authentication response
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

const { wss } = require("./websocket"); // Import the WebSocket server defined above

server.on("upgrade", (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, socket => {
        wss.emit("connection", socket, request);
    });
});


const close = () => server.close();
module.exports = { app, close };
