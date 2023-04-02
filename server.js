const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.API_KEY;
const apiUrl = process.env.API_URL;
const promptRepo = process.env.PROMPT_REPO_URL;

// if promptRepo is not set, use local prompts.json
if (!promptRepo) {
  const prompts = require('./public/prompts.json');
  app.get('/api/prompt_repo', (req, res) => {
    res.send(prompts);
  });
} else {
  // when client request /api/prompt return json object from promptRepo
  app.get('/api/prompt_repo', async (req, res) => {
    try {
      const response = await axios.get(promptRepo);
      const { data } = response;
      res.send(data);
    } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
    }
  });
}

app.use(bodyParser.json());
app.use(express.static('public'));

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});

app.post('/api/gpt', async (req, res) => {
  const prompt = JSON.parse(req.body.prompt);

  // Check for valid prompt
  if (!prompt || !prompt.length) {
    console.error('Invalid prompt');
    return res.status(400).send('Invalid prompt');
  }

  const options = {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'api-key': apiKey,
    },
    data: {
      messages: prompt,
      temperature: 0.7,
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
    console.log(data.usage)
    const totalTokens = data.usage.total_tokens;

    // Create response object
    const responseObj = { message, totalTokens };
    console.log(responseObj);

    // Send response
    res.send(responseObj);
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
});

