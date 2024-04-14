//authConfig.js
/**
 * Configuration object to be passed to MSAL instance on creation. 
 * For a full list of MSAL.js configuration parameters, visit:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/configuration.md 
 */
import * as msal from "@azure/msal-browser";

const cloudInstance = process.env.CLOUD_INSTANCE;
const tenantId = process.env.TENANT_ID;
const scopes = process.env.SCOPES;
const clientId = process.env.CLIENT_ID;
const redirectUri = process.env.REDIRECT_URI;
const authority = `${cloudInstance}${tenantId}`;

// 动态拼接得到authority
console.log("authority: ", authority);

  
const msalConfig = {
    auth: {
        clientId: clientId,
        authority: authority,
        redirectUri: redirectUri,
        scopes: scopes ? scopes.split(",") : [],
    },
    cache: {
        cacheLocation: "sessionStorage", // This configures where your cache will be stored
        storeAuthStateInCookie: false, // Set this to "true" if you are having issues on IE11 or Edge
    },
    system: {	
        loggerOptions: {	
            loggerCallback: (level, message, containsPii) => {	
                if (containsPii) {		
                    return;		
                }		
                switch (level) {		
                case msal.LogLevel.Error:		
                    console.error(message);		
                    return;		
                case msal.LogLevel.Info:		
                    console.info(message);		
                    return;		
                case msal.LogLevel.Verbose:		
                    console.debug(message);		
                    return;		
                case msal.LogLevel.Warning:		
                    console.warn(message);		
                    return;		
                }	
            }	
        }	
    }
};

/**
 * Scopes you add here will be prompted for user consent during sign-in.
 * By default, MSAL.js will add OIDC scopes (openid, profile, email) to any login request.
 * For more information about OIDC scopes, visit: 
 * https://docs.microsoft.com/en-us/azure/active-directory/develop/v2-permissions-and-consent#openid-connect-scopes
 */
const loginRequest = {
    scopes: ["User.Read"]
};

/**
 * Add here the scopes to request when obtaining an access token for MS Graph API. For more information, see:
 * https://github.com/AzureAD/microsoft-authentication-library-for-js/blob/dev/lib/msal-browser/docs/resources-and-scopes.md
 */
const tokenRequest = {
    scopes: ["User.Read"],
    forceRefresh: false // Set this to "true" to skip a cached token and go to the server to get a new token
};

export { msalConfig, loginRequest, tokenRequest };
