const apiKey = process.env.API_KEY;
const apiUrl = process.env.API_URL;

exports.generateResponse = async (req, res) => {
    const prompt = JSON.parse(req.body.prompt);

    // Check for valid prompt
    if (!prompt || !prompt.length) {
        console.error("Invalid prompt");
        return res.status(400).send("Invalid prompt");
    }

    const axios = require("axios");

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": apiKey,
        },
        data: {
            messages: prompt,
            temperature: 0.8,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0,
            max_tokens: 800,
            stop: null,
        },
    };

    try {
        // Send request to API endpoint
        const response = await axios(apiUrl, options);
        const { data } = response;

        // Get message content and total tokens from response
        const message = data.choices[0].message.content;
        console.log(data.usage);
        const totalTokens = data.usage.total_tokens;

        // Create response object
        const responseObj = { message, totalTokens };
        console.log(responseObj);

        // Send response
        res.send(responseObj);
    } catch (error) {
        console.error(error);
        res.status(500).send("Internal Server Error");
    }
};