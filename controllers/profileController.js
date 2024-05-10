const createProfileManager = require("../services/profileService.js");
async function getProfileManager(username) {
    const profileManagers = {};
    if (!profileManagers[username]) {
        profileManagers[username] = createProfileManager(`../.data/${username}.json`);
    }
    return profileManagers[username];
}

function handleApiError(res, error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
}

function handleMissingUsername(res) {
    res.status(401).send("Authentication required: Please log in.");
}

exports.getPromptRepo = async (req, res) => {
    const username = req.query.username;
    if (!username) {
        return handleMissingUsername(res);
    }

    try {
        const profileManager = await getProfileManager(username);
        const profiles = await profileManager.readProfiles();
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
        const profileManager = await getProfileManager(username);
        const profiles = await profileManager.readProfiles();
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
    const username = req.query.username;
    if (!username) {
        return handleMissingUsername(res);
    }

    try {
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
    const username = req.query.username;
    if (!username) {
        return handleMissingUsername(res);
    }

    try {
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
