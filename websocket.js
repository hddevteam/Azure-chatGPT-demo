// websocket.js
const WebSocket = require("ws");
const url = require("url"); 
const wss = new WebSocket.Server({ noServer: true });
const eventBus = require("./eventbus");

// 新增：用于存储每个WebSocket客户端的状态信息
const clients = new Map();

wss.on("connection", function connection(ws, request) {
    const params = url.parse(request.url, true).query;
    const userId = params.userId;
    console.log("New connection with userId:", userId);

    ws.userId = userId; // 储存userId

    clients.set(userId, ws); // 新增：保存此WebSocket客户端信息

    ws.on("close", () => {
        console.log(`Disconnected: [userId: ${userId}]`);
        clients.delete(userId); // 断开连接时移除客户端信息
    });
});

// 新增：定义一个函数使用userId来发送数据，确保一条连接只发送一次
function sendDataToClient(userId, data) {
    const ws = clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log(`Sending data to client [userId: ${userId}]: `, data);
        ws.send(data);
    }
}

// 修改eventBus的使用方式，以使用新的发送函数
eventBus.on("sendToClient", ({ userId, data }) => {
    sendDataToClient(userId, data);
});

module.exports = { wss, sendDataToClient }; 