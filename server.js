const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.API_KEY;
const apiUrl = process.env.API_URL;
// 获取PROMPT_REPO_URLS环境变量
const promptRepo = JSON.parse(process.env.PROMPT_REPO_URLS);
var profiles = require('./public/prompts.json');

// if promptRepo is not set, use local prompts.json
if (!promptRepo) {
  let username = "guest";
  app.get('/api/prompt_repo', (req, res) => {
    res.send({username, profiles});
  });
} else {
  // when client request /api/prompt return json object from promptRepo
  app.get('/api/prompt_repo', async (req, res) => {
    try {
      let username;
      // from query string get username
      if (req.query.username) {
        username = req.query.username;
      }
      // 如果用户名在promptRepoUrls对象中，则返回对应的prompt_repo_url
      if (promptRepo[username]) {
        repoUrl = promptRepo[username];
      } else {
        username = "guest"
        repoUrl = promptRepo[username];
      }
      const response = await axios.get(repoUrl);
      profiles = response.data;
      //return json object data and username in json object
      const responseObj = { username, profiles};
      // console.log(username)
      res.send(responseObj);
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

