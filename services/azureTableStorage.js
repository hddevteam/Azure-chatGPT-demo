// services/azureTableStorage.js
require("dotenv").config();
const { TableServiceClient, TableClient } = require("@azure/data-tables");

// 从环境变量中读取 Azure Storage 设置
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const client = TableServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

async function createTable(tableName) {
    try {
        const tables = client.listTables();

        for await (const table of tables) {
            // 表已经存在，直接返回
            if (table.name === tableName) {
                console.log(`Table ${tableName} already exists.`);
                return;
            }
        }

        // 创建表
        await client.createTable(tableName);
        console.log(`Table ${tableName} created.`);
    } catch (error) {
        console.error(`Failed to create table ${tableName}: `, error.message);
    }
}

function getTableClient(tableName) {
    return TableClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING, tableName);
}

module.exports = {
    createTable,
    getTableClient
};
