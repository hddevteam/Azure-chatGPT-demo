// controllers/applicationController.js

exports.getAppName = async (_req, res) => {
    //return app name from .env file, if not set, return "Azure chatGPT Demo"
    if (!process.env.APP_NAME) {
        res.send("Azure chatGPT Demo");
    } else {
        res.send(process.env.APP_NAME);
    }
};