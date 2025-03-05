// scripts/runMigration.js
require("dotenv").config();
const { initProfileMigration } = require("../services/profileMigrationInit");

/**
 * Command-line script to explicitly run profile migration
 * 
 * Usage:
 *   node scripts/runMigration.js <username>
 * 
 * Example:
 *   node scripts/runMigration.js user@example.com
 */

async function main() {
    const args = process.argv.slice(2);
  
    if (args.length !== 1) {
        console.error("Error: Please provide exactly one argument - the username to migrate.");
        console.log("\nUsage:");
        console.log("  node scripts/runMigration.js <username>");
        console.log("\nExample:");
        console.log("  node scripts/runMigration.js user@example.com");
        process.exit(1);
    }

    const username = args[0];
  
    console.log(`Starting migration for user: ${username}`);
  
    try {
        const success = await initProfileMigration(username);
    
        if (success) {
            console.log(`Migration completed successfully for ${username}`);
        } else {
            console.log(`Migration was not needed or could not be completed for ${username}`);
        }
    
        process.exit(success ? 0 : 1);
    } catch (error) {
        console.error("Error during migration:", error);
        process.exit(1);
    }
}

// Run the migration
main();