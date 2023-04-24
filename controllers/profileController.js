const createProfileManager = require("./services/profileService.js");
const userNames = Object.keys(JSON.parse(process.env.PROMPT_REPO_URLS));
const profileManagers = userNames.reduce((managers, username) => {
    managers[username] = createProfileManager(`.data/${username}.json`);
    return managers;
}, {});

function sanitizeUsername(username) {
    const sanitizedUsername = username.replace(/[^\w.-]/g, "_").substring(0, 100);
    return sanitizedUsername;
}

function isGuestUser(username) {
    return username === "guest";
}

async function getProfileManager(username) {
    if (!profileManagers[username]) {
        profileManagers[username] = createProfileManager(`.data/${username}.json`);
    }

    return profileManagers[username];
}

function handleApiError(res, error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
}

exports.getPromptRepo = async (req, res) => {
    // Your existing getPromptRepo logic
    try {
        let username = req.query.username || "guest";

        if (!userNames.includes(username)) {
            username = "guest";
        }

        const profileManager = await getProfileManager(username);
        const profiles = await profileManager.readProfiles();

        const responseObj = { username, profiles: profiles };
        res.send(responseObj);
    } catch (error) {
        handleApiError(res, error);
    }
};

exports.getProfiles = async (req, res) => {
    // Your existing getProfiles logic
};

exports.createProfile = async (req, res) => {
    // Your existing createProfile logic
};

exports.updateProfile = async (req, res) => {
    // Your existing updateProfile logic
};

exports.deleteProfile = async (req, res) => {
    // Your existing deleteProfile logic
};