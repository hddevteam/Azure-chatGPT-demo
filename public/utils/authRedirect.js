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
        console.log("no user signed in, redirecting to login...");
        myMSALObj.loginRedirect();
        return null;  // Return null indicates no logged in user
    } else {
        return accounts[0].username;  // Return username of logged in user
    }
}



// Improved getToken function
async function getToken() {
    const accounts = myMSALObj.getAllAccounts();
    if (accounts.length > 0) {
    
        const response = await myMSALObj.acquireTokenSilent({
            account: accounts[0],
            scopes: msalConfig.auth.scopes
        });
        console.log("Silent token acquisition successful");
        return response.accessToken;
        
    } else {
        console.log("no account detected, sign in...");
        // If silent acquisition fails, guide user to login
        await signIn(); // Wait for login
        // After successful login, try silent token acquisition again
        const accountsAfterSignIn = myMSALObj.getAllAccounts();
        if (accountsAfterSignIn.length > 0) {
            const responseAfterSignIn = await myMSALObj.acquireTokenSilent({
                account: accountsAfterSignIn[0], // Assume account exists after login
                scopes: msalConfig.auth.scopes
            });
            console.log("Token acquisition after login successful");
            return responseAfterSignIn.accessToken;
        } else {
            console.error("No account found after login");
            throw new Error("No account found after login");
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


let userId = "";  // Define a global variable to store user ID

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

        // Get userId from account information
        userId = currentAccounts[0].homeAccountId;
        console.log("userId: ", userId);
    }
}

// Export a function to get userId
function getUserId() {
    selectAccount();
    return userId;
}

function getUserName() {
    selectAccount();
    return username;
}   

export { signIn, signOut, getTokenPopup, selectAccount, myMSALObj, getToken, getUserId, getUserName };
