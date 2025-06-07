// services/azureTableStorage.js
require("dotenv").config();
const { TableServiceClient, TableClient } = require("@azure/data-tables");

// Read Azure Storage settings from environment variables
const AZURE_STORAGE_CONNECTION_STRING = process.env.AZURE_STORAGE_CONNECTION_STRING;
const client = TableServiceClient.fromConnectionString(AZURE_STORAGE_CONNECTION_STRING);

async function createTable(tableName) {
    try {
        const tables = client.listTables();

        for await (const table of tables) {
            // Table already exists, return directly
            if (table.name === tableName) {
                console.log(`Table ${tableName} already exists.`);
                return;
            }
        }

        // Create table
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
