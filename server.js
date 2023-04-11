const express = require('express');
const bodyParser = require('body-parser');
require('dotenv').config();

const app = express();
const apiKey = process.env.API_KEY;
const apiUrl = process.env.API_URL;

app.use(bodyParser.json());
app.use(express.static('public'));

var azureTTS = null;

// check if AZURE_TTS is set in .env file
if (process.env.AZURE_TTS) {
  azureTTS = JSON.parse(process.env.AZURE_TTS);
}

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

  const axios = require('axios');

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

const createProfileManager = require('./profile.js');
const userNames = Object.keys(JSON.parse(process.env.PROMPT_REPO_URLS));
const profileManagers = userNames.reduce((managers, username) => {
  managers[username] = createProfileManager(`.data/${username}.json`);
  return managers;
}, {});

function sanitizeUsername(username) {
  const sanitizedUsername = username.replace(/[^\w.-]/g, '_').substring(0, 100);
  return sanitizedUsername;
}

function isGuestUser(username) {
  return username === 'guest';
}

async function getProfileManager(username) {
  if (!profileManagers[username]) {
    profileManagers[username] = createProfileManager(`.data/${username}.json`);
  }

  return profileManagers[username];
}

function handleApiError(res, error) {
  console.error(error);
  res.status(500).send('Internal Server Error');
}

app.get('/api/prompt_repo', async (req, res) => {
  try {
    let username = req.query.username || "guest";

    if (!userNames.includes(username)) {
      username = "guest";
    }

    const profileManager = await getProfileManager(username);
    const profiles = await profileManager.readProfiles();
    const responseObj = { username, profiles };
    res.send(responseObj);
  } catch (error) {
    handleApiError(res, error);
  }
});

app.get('/profiles', async (req, res) => {
  try {
    const username = sanitizeUsername(req.query.username || "guest");
    const profileManager = await getProfileManager(username);
    const profiles = await profileManager.readProfiles();
    res.json(profiles);
  } catch (error) {
    handleApiError(res, error);
  }
});

app.post('/profiles', async (req, res) => {
  try {
    const username = sanitizeUsername(req.query.username || "guest");

    if (isGuestUser(username)) {
      return res.status(403).send('Guest user cannot modify profiles');
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
});

app.put('/profiles/:name', async (req, res) => {
  try {
    const username = sanitizeUsername(req.query.username || "guest");

    if (isGuestUser(username)) {
      return res.status(403).send('Guest user cannot modify profiles');
    }

    const profileManager = await getProfileManager(username);
    const updatedProfile = req.body;
    const profiles = await profileManager.readProfiles();
    const index = profiles.findIndex((p) => p.name === req.params.name);

    if (index === -1) {
      res.status(404).send('Profile not found');
    } else {
      profiles[index] = updatedProfile;
      await profileManager.writeProfiles(profiles);
      res.status(200).json(updatedProfile);
    }
  } catch (error) {
    handleApiError(res, error);
  }
});

app.delete('/profiles/:name', async (req, res) => {
  try {
    const username = sanitizeUsername(req.query.username || "guest");

    if (isGuestUser(username)) {
      return res.status(403).send('Guest user cannot modify profiles');
    }

    const profileManager = await getProfileManager(username);
    const profiles = await profileManager.readProfiles();
    const index = profiles.findIndex((p) => p.name === req.params.name);

    if (index === -1) {
      res.status(404).send('Profile not found');
    } else {
      const deletedProfile = profiles.splice(index, 1);
      await profileManager.writeProfiles(profiles);
      res.status(200).json(deletedProfile);
    }
  } catch (error) {
    handleApiError(res, error);
  }
});

const server = app.listen(3000, () => console.log('Server is running'));

const close = () => server.close();

module.exports = { app, close };