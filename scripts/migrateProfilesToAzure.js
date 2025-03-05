// scripts/migrateProfilesToAzure.js
require("dotenv").config();
const fs = require("fs-extra");
const path = require("path");
const { initProfilesTable, saveProfile } = require("../services/profileTableService");

/**
 * Migration script to import profiles from JSON files to Azure Table Storage
 * 
 * Usage:
 * 1. For a specific user: node scripts/migrateProfilesToAzure.js mengmengxiao@msn.com
 * 2. For all users: node scripts/migrateProfilesToAzure.js --all
 */

async function migrateUserProfiles(username) {
    console.log(`Starting migration for user: ${username}`);
    
    // Initialize the table client
    const tableClient = await initProfilesTable();
    
    // Path to the user's profile JSON file
    const profilePath = path.join(__dirname, "..", ".data", `${username}.json`);
    
    try {
        // Check if the file exists
        if (!await fs.pathExists(profilePath)) {
            console.error(`Profile file not found: ${profilePath}`);
            return false;
        }
        
        // Read the profiles from the JSON file
        const data = await fs.readFile(profilePath, "utf-8");
        const profiles = JSON.parse(data);
        
        console.log(`Found ${profiles.length} profiles for ${username}`);
        
        // Save each profile to Azure Table Storage
        for (const profile of profiles) {
            console.log(`Migrating profile: ${profile.name}`);
            await saveProfile(tableClient, username, profile);
        }
        
        console.log(`Migration completed for user ${username}. ${profiles.length} profiles migrated.`);
        return true;
    } catch (error) {
        console.error(`Error migrating profiles for ${username}:`, error);
        return false;
    }
}

async function migrateAllUsers() {
    try {
        // Get all JSON files in the .data directory
        const dataDir = path.join(__dirname, "..", ".data");
        const files = await fs.readdir(dataDir);
        
        // Filter for JSON files
        const jsonFiles = files.filter(file => file.endsWith(".json"));
        
        console.log(`Found ${jsonFiles.length} profile files to migrate`);
        
        // Migrate each user's profiles
        for (const file of jsonFiles) {
            const username = file.replace(".json", "");
            await migrateUserProfiles(username);
        }
        
        console.log("All profiles migrated successfully!");
    } catch (error) {
        console.error("Error during migration:", error);
    }
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.error("Please provide a username or --all flag");
        console.log("Usage:");
        console.log("  node scripts/migrateProfilesToAzure.js <username>");
        console.log("  node scripts/migrateProfilesToAzure.js --all");
        process.exit(1);
    }
    
    if (args[0] === "--all") {
        await migrateAllUsers();
    } else {
        const username = args[0];
        await migrateUserProfiles(username);
    }
}

// Run the migration
main().then(() => {
    console.log("Migration script completed");
    process.exit(0);
}).catch(error => {
    console.error("Migration failed:", error);
    process.exit(1);
});