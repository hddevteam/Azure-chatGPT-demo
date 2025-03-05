// services/profileTableService.js
const { createTable, getTableClient } = require("./azureTableStorage");

// Table name for profiles
const PROFILE_TABLE_NAME = "AIProfiles";

/**
 * Initialize the profiles table
 */
async function initProfilesTable() {
    await createTable(PROFILE_TABLE_NAME);
    return getTableClient(PROFILE_TABLE_NAME);
}

/**
 * Save a profile to Azure Table Storage
 * 
 * @param {object} tableClient - The Azure Table client 
 * @param {string} username - The user's username (partition key)
 * @param {object} profile - The profile to save
 * @returns {Promise<object>} The saved profile
 */
async function saveProfile(tableClient, username, profile) {
    // Prepare the entity for table storage
    // The rowKey is the profile name
    const entity = {
        partitionKey: username,
        rowKey: profile.name,
        // Store the full profile as JSON in a property
        profileData: JSON.stringify(profile),
        timestamp: new Date().toISOString()
    };
    
    // Add some common properties directly for filtering/sorting
    if (profile.sortedIndex) {
        entity.sortedIndex = profile.sortedIndex;
    }
    
    if (profile.model) {
        entity.model = profile.model;
    }
    
    if (profile.description) {
        entity.description = profile.description;
    }
    
    await tableClient.upsertEntity(entity);
    return entity;
}

/**
 * Get a specific profile
 */
async function getProfile(tableClient, username, profileName) {
    try {
        const entity = await tableClient.getEntity(username, profileName);
        // Parse the profile data from JSON
        return {
            ...entity,
            ...JSON.parse(entity.profileData)
        };
    } catch (error) {
        if (error.statusCode === 404) {
            return null;
        }
        throw error;
    }
}

/**
 * List all profiles for a user
 */
async function listProfiles(tableClient, username) {
    const profiles = [];
    const query = tableClient.listEntities({
        queryOptions: {
            filter: `PartitionKey eq '${username}'`
        }
    });

    for await (const entity of query) {
        // Parse the profile data from JSON
        const profileData = JSON.parse(entity.profileData);
        // Combine the entity with the profile data
        profiles.push({
            ...entity,
            ...profileData
        });
    }
    
    // Sort profiles by sortedIndex if available
    profiles.sort((a, b) => {
        const indexA = a.sortedIndex ? parseInt(a.sortedIndex) : Number.MAX_SAFE_INTEGER;
        const indexB = b.sortedIndex ? parseInt(b.sortedIndex) : Number.MAX_SAFE_INTEGER;
        return indexA - indexB;
    });
    
    return profiles;
}

/**
 * Delete a profile
 */
async function deleteProfile(tableClient, username, profileName) {
    await tableClient.deleteEntity(username, profileName);
}

module.exports = {
    PROFILE_TABLE_NAME,
    initProfilesTable,
    saveProfile,
    getProfile,
    listProfiles,
    deleteProfile
};