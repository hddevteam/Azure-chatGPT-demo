
// Based off of https://github.com/pwa-builder/PWABuilder/blob/main/docs/sw.js

/*
      Welcome to our basic Service Worker! This Service Worker offers a basic offline experience
      while also being easily customizeable. You can add in your own code to implement the capabilities
      listed below, or change anything else you would like.


      Need an introduction to Service Workers? Check our docs here: https://docs.pwabuilder.com/#/home/sw-intro
      Want to learn more about how our Service Worker generation works? Check our docs here: https://docs.pwabuilder.com/#/studio/existing-app?id=add-a-service-worker

      Did you know that Service Workers offer many more capabilities than just offline? 
        - Background Sync: https://microsoft.github.io/win-student-devs/#/30DaysOfPWA/advanced-capabilities/06
        - Periodic Background Sync: https://web.dev/periodic-background-sync/
        - Push Notifications: https://microsoft.github.io/win-student-devs/#/30DaysOfPWA/advanced-capabilities/07?id=push-notifications-on-the-web
        - Badges: https://microsoft.github.io/win-student-devs/#/30DaysOfPWA/advanced-capabilities/07?id=application-badges
    */

const HOSTNAME_WHITELIST = [
    self.location.hostname,
    "fonts.gstatic.com",
    "fonts.googleapis.com",
    "cdn.jsdelivr.net"
];

const CACHE_NAME = "pwa-cache-v3";

self.addEventListener("install", function(event) {
    // console.log("Service Worker installing.");
    // 调用 skipWaiting() 让这个 Service Worker 立即激活
    event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.filter((cacheName) => {
                    // 返回所有不匹配当前版本的缓存名称
                    return cacheName !== CACHE_NAME;
                }).map((cacheName) => {
                    // 删除旧缓存
                    return caches.delete(cacheName);
                })
            );
        }).then(() => {
            console.log("Service worker activated and old caches cleared.");
            return self.clients.claim(); // 更新所有客户端上的Service Worker
        })
    );
});

// The Util Function to hack URLs of intercepted requests
const getFixedUrl = (req) => {
    var now = Date.now();
    var url = new URL(req.url);

    // 1. fixed http URL
    // Just keep syncing with location.protocol
    // fetch(httpURL) belongs to active mixed content.
    // And fetch(httpRequest) is not supported yet.
    url.protocol = self.location.protocol;

    // 2. add query for caching-busting.
    // Github Pages served with Cache-Control: max-age=600
    // max-age on mutable content is error-prone, with SW life of bugs can even extend.
    // Until cache mode of Fetch API landed, we have to workaround cache-busting with query string.
    // Cache-Control-Bug: https://bugs.chromium.org/p/chromium/issues/detail?id=453190
    if (url.hostname === self.location.hostname) {
        url.search += (url.search ? "&" : "?") + "cache-bust=" + now;
    }
    return url.href;
};


/**
 *  @Functional Fetch
 *  All network requests are being intercepted here.
 *
 *  void respondWith(Promise<Response> r)
 */
self.addEventListener("fetch", event => {

    const url = new URL(event.request.url);

    // const urls= [
    //     "logincdn.msftauth.net",
    //     "login.live.com",
    //     "go.microsoft.com",
    //     "sc.imp.live.com",
    //     "acctcdn.msftauth.net",
    //     "signup.live.com",
    //     "account.live.com",
    //     "login.microsoft.com",
    //     "acctcdnvzeuno.azureedge.net",
    //     "github.com",
    //     "lgincdnvzeuno.azureedge.net",
    //     "logincdn.msauth.net",
    //     "lgincdnmsftuswe2.azureedge.net",
    //     "acctcdn.msauth.net",
    //     "acctcdnmsftuswe2.azureedge.net",
    //     "login.windows.net"
    // ];

    const authUrlPattern = /logincdn\.msftauth\.net|login\.live\.com|go\.microsoft\.com|sc\.imp\.live\.com|acctcdn\.msftauth\.net|signup\.live\.com|account\.live\.com|login\.microsoft\.com|acctcdnvzeuno\.azureedge\.net|github\.com|lgincdnvzeuno\.azureedge\.net|logincdn\.msauth\.net|lgincdnmsftuswe2\.azureedge\.net|acctcdn\.msauth\.net|acctcdnmsftuswe2\.azureedge\.net|login\.windows\.net/;

    if (authUrlPattern.test(url.hostname)) {
        console.log("Authentication request detected, skip cache.");
        // 直接跳过Service Worker处理，让请求直接通过
        return;
    }

    // 检查请求是否针对API
    if (url.pathname.startsWith("/api/")) {
        console.log("API request detected, skip cache.", url.href);
        // API 请求直接通过，不进行缓存处理
        return;
    }

    console.warn("Unhandled fetch event for", url.href);
    
    // Skip some of cross-origin requests, like those for Google Analytics.
    if (HOSTNAME_WHITELIST.indexOf(new URL(event.request.url).hostname) > -1) {
        // Stale-while-revalidate
        // similar to HTTP's stale-while-revalidate: https://www.mnot.net/blog/2007/12/12/stale
        // Upgrade from Jake's to Surma's: https://gist.github.com/surma/eb441223daaedf880801ad80006389f1
        const cached = caches.match(event.request);
        const fixedUrl = getFixedUrl(event.request);
        const fetched = fetch(fixedUrl, { cache: "no-store" });
        const fetchedCopy = fetched.then(resp => resp.clone());

        // Call respondWith() with whatever we get first.
        // If the fetch fails (e.g disconnected), wait for the cache.
        // If there’s nothing in cache, wait for the fetch.
        // If neither yields a response, return offline pages.
        event.respondWith(
            Promise.race([fetched.catch(_ => cached), cached])
                .then(resp => resp || fetched)
                .catch(_ => { /* eat any errors */ })
        );

        // Update the cache with the version we fetched (only for ok status)
        event.waitUntil(
            Promise.all([fetchedCopy, caches.open(CACHE_NAME)])
                .then(([response, cache]) => response.ok && cache.put(event.request, response))
                .catch(_ => { /* eat any errors */ })
        );
    }
});
