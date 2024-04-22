// public/websocket.js
import {getUserId} from "./authRedirect.js";
let websocket;
export function initWebSocket() {
    const userId = getUserId();
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsHost = window.location.host;
    const websocketURL = `${protocol}//${wsHost}/ws?userId=${userId}`;
    let lastPartialText = "";

    if ("WebSocket" in window) {
        websocket = new WebSocket(websocketURL);
        websocket.onmessage = function(event) {
            console.log("Received data from server: ", event.data);
            console.log("Current lastPartialText: ", lastPartialText);
            console.log("Current messageInput value: ", document.querySelector("#message-input").value);
            const data = JSON.parse(event.data);
            const messageInput = document.querySelector("#message-input");
            
            if (data.text) {
                if (data.type && data.type === "partial") {
                    // 如果是部分识别结果，首先移除上一次部分识别的内容
                    messageInput.value = messageInput.value.replace(lastPartialText, "");
                    // 然后添加新的部分识别结果
                    messageInput.value += data.text;
                    // 更新lastPartialText备用于下一次的替换
                    lastPartialText = data.text;
                } else if (data.type && data.type === "final") {
                    // 如果是最终识别结果，也移除上一次部分识别结果（因为最终包含了全部部分）
                    messageInput.value = messageInput.value.replace(lastPartialText, "");
                    // 添加最终的识别结果，并重置lastPartialText
                    messageInput.value += data.text;
                    lastPartialText = "";
                }
            }
        };
        websocket.onerror = function() {
            console.error("websocket连接发生错误");
        };
        websocket.onclose = function() {
            console.log("WebSocket连接已关闭");
        };
    } else {
        console.error("您的浏览器不支持 WebSocket");
    }
}

