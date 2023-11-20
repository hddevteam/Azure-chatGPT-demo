// services/azureTableStorage.js
require("dotenv").config();
const { TableServiceClient, AzureNamedKeyCredential, TableClient } = require("@azure/data-tables");


// 从环境变量中读取 Azure Storage 设置
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

const cred = new AzureNamedKeyCredential(accountName, accountKey);
const client = new TableServiceClient(`https://${accountName}.table.core.windows.net`, cred);

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
    return new TableClient(`https://${accountName}.table.core.windows.net`, tableName, cred);
}

module.exports = {
    createTable,
    getTableClient
};
