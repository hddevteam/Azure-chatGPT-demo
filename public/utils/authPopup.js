//public/utils/authPopup.js

// Create the main myMSALObj instance
// configuration parameters are located at authConfig.js
import * as msal from "@azure/msal-browser";
import { msalConfig, loginRequest } from "./authConfig.js";

const myMSALObj = new msal.PublicClientApplication(msalConfig);
await myMSALObj.initialize();

let username = "";
console.log("msalConfig auth scopes: ", msalConfig.auth.scopes);

function selectAccount() {

    /**
     * See here for more info on account retrieval: 
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
     */

    const currentAccounts = myMSALObj.getAllAccounts();
    if (currentAccounts.length === 0) {
        return;
    } else if (currentAccounts.length > 1) {
        // Add choose account code here
        console.warn("Multiple accounts detected.");
    } else if (currentAccounts.length === 1) {
        username = currentAccounts[0].username;
        console.log("logged in as: " + username);
    }
}

async function getToken() {
    // 确保有用户登录
    const accounts = myMSALObj.getAllAccounts();
    if (accounts.length > 0) {
        try {
            const response = await myMSALObj.acquireTokenSilent({
                account: accounts[0],
                scopes: msalConfig.auth.scopes
            });
            return response.accessToken;
        } catch (error) {
            console.error("获取Token出错:", error);
            // 如果静默获取失败，则尝试使用弹窗获取
            const response = await myMSALObj.acquireTokenPopup({
                ...loginRequest,
                account: accounts[0]
            });
            return response.accessToken;
        }
    } else {
        throw new Error("未登录用户");
    }
}

function handleResponse(response) {

    /**
     * To see the full list of response object properties, visit:
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#response
     */

    if (response !== null) {
        username = response.account.username;
        console.log("logged in as: " + username);
        
    } else {
        selectAccount();
    }
}

function signIn() {

    /**
     * You can pass a custom request object below. This will override the initial configuration. For more information, visit:
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#request
     */

    myMSALObj.loginPopup(loginRequest)
        .then(handleResponse)
        .catch(error => {
            console.error(error);
        });
}

function signOut() {

    /**
     * You can pass a custom request object below. This will override the initial configuration. For more information, visit:
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#request
     */

    const logoutRequest = {
        account: myMSALObj.getAccountByUsername(username),
        postLogoutRedirectUri: msalConfig.auth.redirectUri,
        mainWindowRedirectUri: msalConfig.auth.redirectUri
    };

    myMSALObj.logoutPopup(logoutRequest);
}

function getTokenPopup(request) {

    /**
     * See here for more info on account retrieval: 
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-common/docs/Accounts.md
     */
    request.account = myMSALObj.getAccountByUsername(username);
    
    return myMSALObj.acquireTokenSilent(request)
        .catch(error => {
            console.warn("silent token acquisition fails. acquiring token using popup");
            if (error instanceof msal.InteractionRequiredAuthError) {
                // fallback to interaction when silent call fails
                return myMSALObj.acquireTokenPopup(request)
                    .then(tokenResponse => {
                        console.log(tokenResponse);
                        return tokenResponse;
                    }).catch(error => {
                        console.error(error);
                    });
            } else {
                console.warn(error);   
            }
        });
}

export { signIn, signOut, getTokenPopup, selectAccount, myMSALObj, getToken};
