const createProfileManager = require("../services/profileService.js");
const userNames = Object.keys(JSON.parse(process.env.PROMPT_REPO_URLS));
const profileManagers = userNames.reduce((managers, username) => {
    managers[username] = createProfileManager(`../.data/${username}.json`);
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
        profileManagers[username] = createProfileManager(`../.data/${username}.json`);
    }

    return profileManagers[username];
}

function handleApiError(res, error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
}

exports.getPromptRepo = async (req, res) => {
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
    try {
        const username = sanitizeUsername(req.query.username || "guest");
        const profileManager = await getProfileManager(username);
        const profiles = await profileManager.readProfiles();

        res.json(profiles);
    } catch (error) {
        handleApiError(res, error);
    }
};

exports.createProfile = async (req, res) => {
    try {
        const username = sanitizeUsername(req.query.username || "guest");

        if (isGuestUser(username)) {
            return res.status(403).send("Guest user cannot modify profiles");
        }

        const profileManager = await getProfileManager(username);
        const newProfile = req.body;
        const profiles = await profileManager.readProfiles();
        profiles.push(newProfile);
        await profileManager.writeProfiles(profiles);
        res.status(201).json(newProfile);
    } catch (error) {
        handleApiError(res, error);
    }
};

exports.updateProfile = async (req, res) => {
    try {
        const username = sanitizeUsername(req.query.username || "guest");

        if (isGuestUser(username)) {
            return res.status(403).send("Guest user cannot modify profiles");
        }

        const profileManager = await getProfileManager(username);
        const updatedProfile = req.body;
        const profiles = await profileManager.readProfiles();
        const index = profiles.findIndex((p) => p.name === req.params.name);

        if (index === -1) {
            res.status(404).send("Profile not found");
        } else {
            profiles[index] = updatedProfile;
            await profileManager.writeProfiles(profiles);
            res.status(200).json(updatedProfile);
        }
    } catch (error) {
        handleApiError(res, error);
    }
};

exports.deleteProfile = async (req, res) => {
    try {
        const username = sanitizeUsername(req.query.username || "guest");

        if (isGuestUser(username)) {
            return res.status(403).send("Guest user cannot modify profiles");
        }

        const profileManager = await getProfileManager(username);
        const profiles = await profileManager.readProfiles();
        const index = profiles.findIndex((p) => p.name === req.params.name);

        if (index === -1) {
            res.status(404).send("Profile not found");
        } else {
            const deletedProfile = profiles.splice(index, 1);
            await profileManager.writeProfiles(profiles);
            res.status(200).json(deletedProfile);
        }
    } catch (error) {
        handleApiError(res, error);
    }
};