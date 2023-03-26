const express = require('express');
const bodyParser = require('body-parser');
const app = express();

// Use body-parser middleware to parse request body
app.use(bodyParser.json());

app.use(express.static('public'));

const port = process.env.PORT || 3000;

app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});

const axios = require('axios');
require('dotenv').config();

app.post('/api/gpt', async (req, res) => {

    const prompt = JSON.parse(req.body.prompt);
    console.log('prompt', prompt);
    const apiKey = process.env.API_KEY;
    const apiUrl = process.env.API_URL;

    // Check for valid prompt
    if (!prompt || !prompt.length) {
        console.error('Invalid prompt');
        res.status(400).send('Invalid prompt');
        return;
    }

    const options = {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "api-key": apiKey
        },
        data: {
            "messages": prompt,
            "temperature": 0.7,
            "top_p": 0.95,
            "frequency_penalty": 0,
            "presence_penalty": 0,
            "max_tokens": 800,
            "stop": null
        }
    };

    try {
        console.log('sending request');
        console.log(options.data);
        const response = await axios(apiUrl, options);
        const { data } = response;
        // console.log(data);
        res.send(data.choices[0].message.content);
    } catch (error) {
        console.error(error);
        res.status(500).send('Internal Server Error');
    }
});
