//controller/audioFileController.js
const { uploadFileToBlob, listBlobsByUser, uploadTextToBlob, updateBlobMetadata, getTextContentFromBlob, deleteBlob, checkBlobExists} = require("../services/azureBlobStorage");

const axios = require("axios");
require("dotenv").config();
const containerName = "audiofiles"; // Attachments are stored in this container

exports.uploadAudiofile = async (req, res) => {
    const fileContent = req.file.buffer; // File binary content
    const originalFileName = req.body.originalFileName || req.file.originalname;
    const username = req.body.username; // Get username from request

    try {
        // Pass username as a parameter to uploadFileToBlob
        const audioFile = await uploadFileToBlob(containerName, originalFileName, fileContent, username);
        console.log("audioFile", audioFile);
        res.status(201).json(audioFile.url);
    } catch (error) {
        console.error(`Failed to upload audio file: ${error.message}`);
        res.status(500).send(error.message);
    }
};

exports.listAudioFiles = async (req, res) => {
    console.log("listAudioFiles");
    try {
        const username = req.query.username;
        console.log("username", username);
        const blobs = await listBlobsByUser(username);
        console.log("blobs", blobs);
        const filesList = blobs.map(blob => ({
            name: blob.name,
            size: blob.contentLength,
            url: blob.url,
            transcriptionStatus: blob.transcriptionStatus,
            transcriptionUrl: blob.transcriptionUrl,
            transcriptionId: blob.transcriptionId,
            lastModified: blob.lastModified 
        }));
        console.log("filesList", filesList);
        res.json(filesList);
    } catch (error) {
        console.error("Error listing audio files: ", error);
        res.status(500).send("Unable to list audio files.");
    }
};


const azureTTS = JSON.parse(process.env.AZURE_TTS);
const subscriptionKey = azureTTS.subscriptionKey;
const endpoint = process.env.AZURE_BATCH_TRANSCRIPTION_ENDPOINT;
// const endpoint = "https://eastus.api.cognitive.microsoft.com/speechtotext/v3.1/transcriptions";


exports.submitTranscriptionJob = async (req, res) => {
    const { audioUrl, audioName } = req.body;
    const languages = req.body.languages || ["zh-cn"]; // Default to Chinese Simplified
    const identifySpeakers = req.body.identifySpeakers || false;
    const maxSpeakers = req.body.maxSpeakers || 2;

    const transcriptionDisplayName = `Transcription_${audioName}_${new Date().toISOString()}`;

    // Build basic request data structure
    const data = {
        contentUrls: [audioUrl],
        locale: languages[0], // Use the first selected language as primary language
        displayName: transcriptionDisplayName,
        properties: {
            punctuationMode: "DictatedAndAutomatic",
            profanityFilterMode: "Masked"
        }
    };

    // Dynamically add diarization property based on conditions
    if (identifySpeakers) {
        data.properties.diarizationEnabled = true;
        data.properties.diarization = {
            speakers: {
                minCount: 1,
                maxCount: parseInt(maxSpeakers, 10)
            }
        };
    }

    // If languages array contains multiple values, add languageIdentification property
    if (languages.length > 1) {
        data.properties.languageIdentification = {
            candidateLocales: languages
        };
    }

    const config = {
        headers: {
            "Ocp-Apim-Subscription-Key": subscriptionKey,
            "Content-Type": "application/json"
        },
        timeout: 10000,
    };

    console.log("Submitting transcription job with data: ", data);
    console.log("Endpoint: ", endpoint);
    
    try {
        const response = await axios.post(endpoint, data, config);
        console.log("Transcription job submitted successfully: ", response.data);
        const transcriptionId = response.data.self.split("/").pop(); 
        res.status(200).json({ transcriptionId, audioName });
    } catch (error) {
        console.error("Error submitting transcription job", error);
        res.status(500).send("Failed to submit transcription job.");
    }
};

exports.getTranscriptionStatus = async (req, res) => {
    const { transcriptionId, blobName } = req.query;
    console.log("Getting transcription status for transcription ID: ", transcriptionId, "Blob name: ", blobName);
    const statusEndpoint = `${endpoint}/${transcriptionId}`;
    const config = {
        headers: { "Ocp-Apim-Subscription-Key": subscriptionKey }
    };

    try {
        const response = await axios.get(statusEndpoint, config);
        let status = response.data.status;

        let transcriptionUrl = null;

        if (status === "Succeeded") {
            const updateResult = await saveTranscriptionResultToBlobAndUpdateMetadata(transcriptionId, blobName);
            transcriptionUrl = updateResult.transcriptionUrl;
        } else {
            await updateBlobMetadata(containerName, blobName, { transcriptionStatus: status, transcriptionId });
        }

        console.log("Transcription job status: ", status, "Transcription URL: ", transcriptionUrl);
        res.json({ status, transcriptionUrl }); // Return status and transcription result URL
    } catch (error) {
        console.error("Error fetching transcription job status", error);
        res.status(500).send("Failed to fetch transcription job status.");
    }
};

async function saveTranscriptionResultToBlobAndUpdateMetadata(transcriptionId, audioName) {
    console.log("Saving transcription result to blob and updating metadata: ", transcriptionId, audioName);
    const resultsEndpoint = `${endpoint}/${transcriptionId}/files`;
    const config = {
        headers: { "Ocp-Apim-Subscription-Key": subscriptionKey }
    };

    try {
        const response = await axios.get(resultsEndpoint, config);
        let transcriptResultsUrl = null;
        for (const file of response.data.values) {
            if (file.kind === "Transcription") {
                transcriptResultsUrl = file.links.contentUrl;
                break;
            }
        }
        if (transcriptResultsUrl) {
            // Assuming you already have logic for transcription text content
            const transcriptionResult = await axios.get(transcriptResultsUrl);
            const transcriptionText = transcriptionResult.data;
            // Extract filename part from audioName, excluding extension, and add .json suffix
            const blobUrl = `${audioName.split(".")[0]}.json`;
            await uploadTextToBlob("transcriptions", blobUrl, JSON.stringify(transcriptionText));
            await updateBlobMetadata("audiofiles", audioName, {
                transcriptionUrl: blobUrl,
                transcriptionStatus: "Succeeded"
            });

            return { transcriptionUrl: blobUrl };
        } else {
            throw new Error("Transcription result file not found.");
        }
    } catch (error) {
        console.error("Error saving transcription result to Blob and updating Metadata", error);
    }
}


exports.getTranscriptTextFromBlob = async (req, res) => {
    const { transcriptionBlobName } = req.query;
    try {
        const transcriptText = await getTextContentFromBlob("transcriptions", transcriptionBlobName);

        // parseAndDisplayResults function logic needs to be implemented here, assuming it converts JSON to readable text
        const readableText = parseAndDisplayResults(JSON.parse(transcriptText));
        res.json({ success: true, transcriptText: readableText });

    } catch (error) {
        console.error("Error getting transcription text from Blob", error);
        res.status(500).send("Unable to get transcription text from Blob.");
    }
};


// Parse transcription results
function parseAndDisplayResults(resultsJson) {
    let resultText = "";
    for (const phrase of resultsJson.recognizedPhrases) {
        const speaker = phrase.speaker || "";
        const offset = convertDurationInTicksToMMSS(phrase.offsetInTicks);
        const bestN = phrase.nBest[0];
        const displayText = bestN.display;
        const currentText = `${offset} [Speaker ${speaker}]:\n${displayText}\n`;
        resultText += currentText;
    }
    return resultText;
}

// Convert duration to MM:SS format
function convertDurationInTicksToMMSS(durationInTicks) {
    // Duration ticks are in 100-nanosecond units, so convert to seconds first
    const durationInSeconds = durationInTicks / 10000000;
    
    const minutes = Math.floor(durationInSeconds / 60).toString().padStart(2, "0");
    const seconds = Math.floor(durationInSeconds % 60).toString().padStart(2, "0");

    return `${minutes}:${seconds}`;
}


exports.deleteAudioFile = async (req, res) => {
    const { blobName } = req.body;
    
    try {
        // Delete audio file
        await deleteBlob(containerName, blobName);
        const transcriptionBlobName = blobName.replace(/\.[^.]+$/, ".json");
        
        // Check if transcription file exists
        const exists = await checkBlobExists("transcriptions", transcriptionBlobName);
        if (exists) {
            // If transcription file exists, try to delete it
            await deleteBlob("transcriptions", transcriptionBlobName);
        }
        
        res.status(200).send("Files deleted successfully");
    } catch (error) {
        console.error("Error deleting audio and transcription files:", error);
        res.status(500).send("Error deleting audio and transcription files:", error);
    }
};


