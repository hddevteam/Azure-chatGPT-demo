# chatGPTdemo
This is a demo chatGPT website build with nodejs and Azure OpenAI gpt-35-turbo (version 0301) model.
You may use this code to learn how to use Azure OpenAI API to develop your chatGPT client using Javascript.

# How to run.
## Install nodejs
## Clone this project
## Create your .env file
- You need to create the .env file in the root folder inside this project.
- Get your api-key and endpoint from Azure OpenAI portal.
- Put the your api-key and endpoint in the .env file like following format.

API_KEY=yourapikey

API_URL=https://yourendpoint/openai/deployments/gpt35turbo/completions?api-version=2022-12-01

## Run command in the terminal
    npm install
    node server.js

## Open your browser and go to http://localhost:3000

Here you go. Now you will see the chatGPT demo website like following image.
![chatGPTdemo](./demo.png)

