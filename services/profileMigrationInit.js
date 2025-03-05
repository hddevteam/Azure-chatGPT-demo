// services/profileMigrationInit.js
const fs = require("fs-extra");
const path = require("path");
const { initProfilesTable, saveProfile } = require("./profileTableService");

// Flag to track if migration has run
let migrationCompleted = false;

/**
 * Initialize the profile migration
 * This will check if a migration is needed and run it once during server startup
 * 
 * @param {string} targetUsername - Username to migrate (required)
 * @returns {Promise<boolean>} True if migration was successful or not needed
 */
async function initProfileMigration(targetUsername) {
    // Skip if migration has already run
    if (migrationCompleted) {
        return true;
    }

    // Require an explicit username
    if (!targetUsername) {
        console.log("No username specified for migration. Skipping migration.");
        return false;
    }

    console.log(`Checking for profile migration needs for user: ${targetUsername}...`);
    
    try {
        const dataPath = path.join(__dirname, "..", ".data", `${targetUsername}.json`);
        
        // Check if the JSON file exists
        if (!await fs.pathExists(dataPath)) {
            console.log(`No profile file found for ${targetUsername}. Skipping migration.`);
            migrationCompleted = true;
            return true;
        }
        
        console.log(`Found profile file for ${targetUsername}. Starting migration...`);
        
        // Initialize the table client
        const tableClient = await initProfilesTable();
        
        // Read the profiles from the JSON file
        const data = await fs.readFile(dataPath, "utf-8");
        const profiles = JSON.parse(data);
        
        console.log(`Migrating ${profiles.length} profiles for ${targetUsername} to Azure Table Storage...`);
        
        // Save each profile to Azure Table Storage
        for (const profile of profiles) {
            await saveProfile(tableClient, targetUsername, profile);
        }
        
        console.log("Profile migration completed successfully!");
        migrationCompleted = true;
        return true;
    } catch (error) {
        console.error("Error during profile migration:", error);
        return false;
    }
}

module.exports = { initProfileMigration };