//public/utils/authRedirect.js

import * as msal from "@azure/msal-browser";
import { msalConfig } from "./authConfig.js";

const myMSALObj = new msal.PublicClientApplication(msalConfig);
await myMSALObj.initialize();


let username = "";
console.log("msalConfig auth scopes: ", msalConfig.auth.scopes);

async function signIn() {
    await myMSALObj.handleRedirectPromise();
    const accounts = myMSALObj.getAllAccounts();
    if (accounts.length === 0) {
        // No user signed in
        console.log("no user signed in, redirecting to login...");
        myMSALObj.loginRedirect();
    }
}


// getToken函数改进
async function getToken() {
    const accounts = myMSALObj.getAllAccounts();
    if (accounts.length > 0) {
    
        const response = await myMSALObj.acquireTokenSilent({
            account: accounts[0],
            scopes: msalConfig.auth.scopes
        });
        console.log("静默获取Token成功");
        return response.accessToken;
        
    } else {
        console.log("no account detected, sign in...");
        // 如果静默获取失败，引导用户登录
        await signIn(); // 等待登录
        // 登录成功后再次尝试静默获取Token
        const accountsAfterSignIn = myMSALObj.getAllAccounts();
        if (accountsAfterSignIn.length > 0) {
            const responseAfterSignIn = await myMSALObj.acquireTokenSilent({
                account: accountsAfterSignIn[0], // 假定登录后存在账户
                scopes: msalConfig.auth.scopes
            });
            console.log("登录后获取Token成功");
            return responseAfterSignIn.accessToken;
        } else {
            console.error("登录后未找到账户");
            throw new Error("登录后未找到账户");
        }
    }
}

function signOut() {

    /**
     * You can pass a custom request object below. This will override the initial configuration. For more information, visit:
     * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/request-response-object.md#request
     */

    const logoutRequest = {
        account: myMSALObj.getAccountByUsername(username),
        postLogoutRedirectUri: msalConfig.auth.redirectUri,
    };

    myMSALObj.logoutRedirect(logoutRequest);
    
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


let userId = "";  // 定义一个全局变量来存储用户ID

function selectAccount() {
    const currentAccounts = myMSALObj.getAllAccounts();
    if (currentAccounts.length === 0) {
        return;
    } else if (currentAccounts.length > 1) {
        // Add choose account code here or handle multiple accounts according to your need
        console.warn("Multiple accounts detected.");
    } else if (currentAccounts.length === 1) {
        username = currentAccounts[0].username;
        console.log("logged in as: " + username);

        // 从账户信息中获取userId
        userId = currentAccounts[0].homeAccountId;
        console.log("userId: ", userId);
    }
}

// 导出一个函数来获取userId
function getUserId() {
    selectAccount();
    return userId;
}

function getUserName() {
    selectAccount();
    return username;
}   

export { signIn, signOut, getTokenPopup, selectAccount, myMSALObj, getToken, getUserId, getUserName };
