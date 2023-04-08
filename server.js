const express = require('express');
const bodyParser = require('body-parser');
const axios = require('axios');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 3000;
const apiKey = process.env.API_KEY;
const apiUrl = process.env.API_URL;
var promptRepo = null;
var azureTTS = null;

// check if PROMPT_REPO_URLS is set in .env file
if (process.env.PROMPT_REPO_URLS) {
  promptRepo = JSON.parse(process.env.PROMPT_REPO_URLS);
}

// check if AZURE_TTS is set in .env file
if (process.env.AZURE_TTS) {
  azureTTS = JSON.parse(process.env.AZURE_TTS);
}

var profiles = require('./public/prompts.json');

// if promptRepo is not set, use local prompts.json
if (!promptRepo) {
  let username = "guest";
  app.get('/api/prompt_repo', (req, res) => {
    res.send({ username, profiles });
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
      const responseObj = { username, profiles };
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

//return app name from .env file, if not set, return "Azure chatGPT Demo"
app.get('/api/app_name', (req, res) => {
  if (!process.env.APP_NAME) {
    res.send("Azure chatGPT Demo");
  } else {
    res.send(process.env.APP_NAME);
  }
});


//get message from client then send to azure tts api send back the buffer to client
app.get('/api/tts', (req, res) => {
  const message = req.query.message;
  const subscriptionKey = azureTTS.subscriptionKey;
  const endpoint = azureTTS.endpoint;

  const url = `${endpoint}/cognitiveservices/v1`;

  const headers = new Headers({
    'Content-Type': 'application/ssml+xml',
    'X-Microsoft-OutputFormat': 'audio-16khz-128kbitrate-mono-mp3',
    'Ocp-Apim-Subscription-Key': subscriptionKey
  });

  const body = `<speak version='1.0' xml:lang='en-US'>
                  <voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural' style='friendly'>
                      ${message}
                  </voice>
                </speak>`;
  fetch(url, {
    method: 'POST',
    headers: headers,
    body: body
  })
    .then(response => response.arrayBuffer()) // convert response to ArrayBuffer
    .then(arrayBuffer => { // send ArrayBuffer as response
      res.set({
        'Content-Type': 'audio/mpeg',
        'Content-Length': arrayBuffer.byteLength
      });
      res.send(Buffer.from(arrayBuffer)); // convert ArrayBuffer to Buffer
    })
    .catch(error => {
      console.error(error);
    });
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

