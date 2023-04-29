/* eslint-disable no-unused-vars */

const fs = require("fs-extra");
fs.ensureDirSync("./failed_audio");
var azureTTS = null;
const axios = require("axios");

// check if AZURE_TTS is set in .env file
if (process.env.AZURE_TTS) {
    azureTTS = JSON.parse(process.env.AZURE_TTS);
}


const multer = require("multer");
const storage = multer.diskStorage({
    destination: function (_req, _file, cb) {
        cb(null, "./failed_audio");
    },
    filename: function (_req, _file, cb) {
        cb(null, `audio_${Date.now()}.wav`);
    },
});
const upload = multer({ storage: storage });
const SpeechSDK = require("microsoft-cognitiveservices-speech-sdk");
exports.uploadMiddleware = upload.single("file");
exports.getTextToSpeech = async (req, res) => {
    //get message from client then send to azure tts api send back the buffer to client
    const message = req.query.message;
    const subscriptionKey = azureTTS.subscriptionKey;
    const endpoint = azureTTS.endpoint;

    const url = `${endpoint}/cognitiveservices/v1`;

    const headers = new Headers({
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
        "Ocp-Apim-Subscription-Key": subscriptionKey
    });

    const body = `<speak version='1.0' xml:lang='en-US'>
                  <voice xml:lang='en-US' xml:gender='Female' name='en-US-JennyNeural' style='friendly'>
                      ${message}
                  </voice>
                </speak>`;
    fetch(url, {
        method: "POST",
        headers: headers,
        body: body
    })
        .then(response => response.arrayBuffer()) // convert response to ArrayBuffer
        .then(arrayBuffer => { // send ArrayBuffer as response
            res.set({
                "Content-Type": "audio/mpeg",
                "Content-Length": arrayBuffer.byteLength
            });
            res.send(Buffer.from(arrayBuffer)); // convert ArrayBuffer to Buffer
        })
        .catch(error => {
            console.error(error);
        });

};

function getVoiceAttributes(language) {
    if (language === "en-US") {
        return {
            name: "en-US-JennyNeural",
            gender: "Female",
            style: "friendly"
        };
    } else if (language === "zh-CN") {
        return {
            name: "zh-CN-XiaoxuanNeural",
            gender: "Female",
            style: "friendly"
        };
    } else {
        return {
            name: "en-US-JennyNeural",
            gender: "Female",
            style: "friendly"
        };
    }
}

const { detectFirstLanguage } = require("../services/languageDetection");
exports.getMultiLangTextToSpeech = async (req, res) => {
    // Get message from client then send to Azure TTS API and send back the buffer to client
    const message = req.query.message;

    // Detect the first language in the message
    const language = await detectFirstLanguage(message);
    const voiceAttributes = getVoiceAttributes(language);

    // Generate SSML with a single voice element based on the detected language
    const ssml = `<speak version='1.0' xml:lang='${language}'>
                   <voice xml:lang='${language}' xml:gender='${voiceAttributes.gender}' name='${voiceAttributes.name}' style='${voiceAttributes.style}'>
                     ${message}
                   </voice>
               </speak>`;

    const subscriptionKey = azureTTS.subscriptionKey;
    const endpoint = azureTTS.endpoint;
    const url = `${endpoint}/cognitiveservices/v1`;

    const headers = {
        "Content-Type": "application/ssml+xml",
        "X-Microsoft-OutputFormat": "audio-16khz-128kbitrate-mono-mp3",
        "Ocp-Apim-Subscription-Key": subscriptionKey
    };

    try {
        const response = await axios.post(url, ssml, { headers, responseType: "arraybuffer" });
        res.set({
            "Content-Type": "audio/mpeg",
            "Content-Length": response.data.byteLength
        });
        console.log("Sending audio response");
        res.send(Buffer.from(response.data));
    } catch (error) {
        console.error(error);
    }

};

exports.autoSpeechToText = async (req, res) => {
    const subscriptionKey = azureTTS.subscriptionKey;
    const serviceRegion = "eastus"; // You can change this to match your region
    const filePath = req.file.path;
    const audioConfig = SpeechSDK.AudioConfig.fromWavFileInput(fs.readFileSync(filePath));
    const speechConfig = SpeechSDK.SpeechConfig.fromSubscription(subscriptionKey, serviceRegion);

    const autoDetectSourceLanguageConfig = SpeechSDK.AutoDetectSourceLanguageConfig.fromLanguages(["en-US", "zh-CN"]);

    var speechRecognizer = SpeechSDK.SpeechRecognizer.FromConfig(speechConfig, autoDetectSourceLanguageConfig, audioConfig);

    let recognizedText = "";

    // Add event listeners
    speechRecognizer.recognizing = (_sender, event) => {
        console.log(`Recognizing: ${event.result.text}`);
    };

    speechRecognizer.recognized = (_sender, event) => {
        if (event.result.reason === SpeechSDK.ResultReason.RecognizedSpeech) {
            recognizedText += event.result.text;
        }
    };

    speechRecognizer.canceled = (_sender, event) => {
        if (event.errorCode !== 0) {
            console.error(`Canceled: ${JSON.stringify(event)}`);
            res.status(400).send("Speech recognition failed");
        } else {
            console.log("Reached the end of input data");
        }
        fs.unlinkSync(filePath);
        speechRecognizer.close();
    };

    speechRecognizer.sessionStopped = (_sender, _event) => {
        console.log("Session stopped");
        res.send(recognizedText);
        fs.unlinkSync(filePath);
        speechRecognizer.close();
    };

    // Start continuous recognition
    speechRecognizer.startContinuousRecognitionAsync(
        () => {
            console.log("Recognition started");
        },
        (error) => {
            console.error("Error:", error);
            res.status(500).send("Internal server error");
            fs.unlinkSync(filePath);
        }
    );
};

exports.speechToText = async (req, res) => {
    // Your existing speechToText logic
    const subscriptionKey = azureTTS.subscriptionKey;
    const filePath = req.file.path;

    // Read the uploaded file
    const buffer = fs.readFileSync(filePath);

    try {
        const speechResponse = await fetch("https://eastus.stt.speech.microsoft.com/speech/recognition/conversation/cognitiveservices/v1?language=en-US", {
            method: "POST",
            headers: {
                "Accept": "application/json",
                "Ocp-Apim-Subscription-Key": subscriptionKey,
                "Content-Type": "audio/wav;"
            },
            body: buffer
        });

        const speechResult = await speechResponse.json();
        console.log(speechResult);
        if (speechResult.RecognitionStatus === "Success") {
            const text = speechResult.DisplayText;
            res.send(text);
            fs.unlinkSync(filePath);
        } else {
            res.status(400).send("Speech recognition failed");
        }
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send("Internal server error");
    }
};