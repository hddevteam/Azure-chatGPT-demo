const {
    initProfilesTable,
    saveProfile,
    getProfile,
    listProfiles,
    deleteProfile
} = require("../services/profileTableService.js");

// Table client singleton
let tableClient = null;

// Initialize the table client
async function getTableClient() {
    if (!tableClient) {
        tableClient = await initProfilesTable();
    }
    return tableClient;
}

function handleApiError(res, error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
}

function handleMissingUsername(res) {
    res.status(401).send("Authentication required: Please log in.");
}

// Updated to use Azure Table Storage
exports.getPromptRepo = async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return handleMissingUsername(res);
    }
    try {
        const client = await getTableClient();
        const profiles = await listProfiles(client, username);
        res.send({ username, profiles });
    } catch (error) {
        handleApiError(res, error);
    }
};

exports.getProfiles = async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return handleMissingUsername(res);
    }
    try {
        const client = await getTableClient();
        const profiles = await listProfiles(client, username);
        res.json(profiles);
    } catch (error) {
        handleApiError(res, error);
    }
};

exports.createProfile = async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return handleMissingUsername(res);
    }
    try {
        const client = await getTableClient();
        const newProfile = req.body;
        
        // Update sortedIndex if not provided
        if (!newProfile.sortedIndex) {
            const profiles = await listProfiles(client, username);
            const maxIndex = profiles.reduce((max, p) => {
                const index = p.sortedIndex ? parseInt(p.sortedIndex) : 0;
                return index > max ? index : max;
            }, 0);
            newProfile.sortedIndex = (maxIndex + 1).toString();
        }
        
        await saveProfile(client, username, newProfile);
        res.status(201).json(newProfile);
    } catch (error) {
        handleApiError(res, error);
    }
};

exports.updateProfile = async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return handleMissingUsername(res);
    }
    try {
        const client = await getTableClient();
        const updatedProfile = req.body;
        
        // Check if profile exists
        const existingProfile = await getProfile(client, username, req.params.name);
        if (!existingProfile) {
            return res.status(404).send("Profile not found");
        }
        
        await saveProfile(client, username, updatedProfile);
        res.status(200).json(updatedProfile);
    } catch (error) {
        handleApiError(res, error);
    }
};

exports.deleteProfile = async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return handleMissingUsername(res);
    }
    try {
        const client = await getTableClient();
        
        // Check if profile exists
        const existingProfile = await getProfile(client, username, req.params.name);
        if (!existingProfile) {
            return res.status(404).send("Profile not found");
        }
        
        await deleteProfile(client, username, req.params.name);
        res.status(200).json(existingProfile);
    } catch (error) {
        handleApiError(res, error);
    }
};
