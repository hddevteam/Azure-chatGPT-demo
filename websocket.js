const WebSocket = require("ws");
const url = require("url"); // 引入URL模块解析
const wss = new WebSocket.Server({ noServer: true });
const eventBus = require("./eventbus");

wss.on("connection", function connection(ws, request) {
    // 解析连接请求的URL以获取userId
    const params = url.parse(request.url, true).query;
    const userId = params.userId;
    console.log("New connection with userId:", userId);

    ws.userId = userId; // 将userId存储到WebSocket连接对象上

    // 定义发送数据函数
    const sendDataToClient = (data, targetUserId) => {
        // 只向目标userId的客户端发送数据
        if (ws.readyState === WebSocket.OPEN && ws.userId === targetUserId) {
            console.log(`Sending data to client [userId: ${userId}]: `, data);
            ws.send(data);
        }
    };

    // 监听发送数据事件
    eventBus.on("sendToClient", ({ userId: targetUserId, data }) => {
        sendDataToClient(data, targetUserId);
    });

    // 断开连接时的处理
    ws.on("close", () => {
        console.log(`Disconnected: [userId: ${userId}]`);
        // 移除事件监听
        eventBus.removeListener("sendToClient", sendDataToClient);
    });
});

module.exports = wss;
