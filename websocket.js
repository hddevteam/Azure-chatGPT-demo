// websocket.js
const WebSocket = require("ws");
const url = require("url"); 
const wss = new WebSocket.Server({ noServer: true });
const eventBus = require("./eventbus");

// Added: Store state information for each WebSocket client
const clients = new Map();

wss.on("connection", function connection(ws, request) {
    const params = url.parse(request.url, true).query;
    const userId = params.userId;
    console.log("New connection with userId:", userId);

    ws.userId = userId; // Store userId

    clients.set(userId, ws); // Added: Save this WebSocket client information

    ws.on("close", () => {
        console.log(`Disconnected: [userId: ${userId}]`);
        clients.delete(userId); // Remove client information when disconnected
    });
});

// Added: Define a function to send data using userId, ensuring each connection sends only once
function sendDataToClient(userId, data) {
    const ws = clients.get(userId);
    if (ws && ws.readyState === WebSocket.OPEN) {
        console.log(`Sending data to client [userId: ${userId}]: `, data);
        ws.send(data);
    }
}

// Modified eventBus usage to use the new send function
eventBus.on("sendToClient", ({ userId, data }) => {
    sendDataToClient(userId, data);
});

module.exports = { wss, sendDataToClient }; 