//controller/audioFileController.js
const { uploadFileToBlob, listBlobsByUser, uploadTextToBlob, updateBlobMetadata, getTextContentFromBlob} = require("../services/azureBlobStorage");

const axios = require("axios");
require("dotenv").config();
const containerName = "audiofiles"; // 附件存储在这个容器中

exports.uploadAudiofile = async (req, res) => {
    const fileContent = req.file.buffer; // 文件的二进制内容
    const originalFileName = req.body.originalFileName || req.file.originalname;
    const username = req.body.username; // 从请求中获取username

    try {
        // 将username作为一个参数传递给uploadFileToBlob
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
            transcriptionStatus: blob.transcriptionStatus, // 加入转录状态
            transcriptionUrl: blob.transcriptionUrl, // 加入转录结果URL，也就是在transcriptions容器中的文件名
            transcriptionId: blob.transcriptionId // 加入转录ID
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
const endpoint = "https://eastus.api.cognitive.microsoft.com/speechtotext/v3.2-preview.2/transcriptions";

exports.submitTranscriptionJob = async (req, res) => {
    const { audioUrl, audioName } = req.body;
    const transcriptionDisplayName = `Transcription_${audioName}_${new Date().toISOString()}`;
    
    const config = {
        headers: {
            "Ocp-Apim-Subscription-Key": subscriptionKey,
            "Content-Type": "application/json"
        },
        timeout: 10000, // 增加超时设置
    };
    
    const data = {
        contentUrls: [audioUrl],
        locale: "zh-cn",
        displayName: transcriptionDisplayName,
        properties: {
            wordLevelTimestampsEnabled: false,
            displayFormWordLevelTimestampsEnabled: true,
            diarizationEnabled: true,
            languageIdentification: {
                candidateLocales: ["zh-cn", "en-us"]
            },
            diarization: {
                speakers: {
                    minCount: 1,
                    maxCount: 2
                }
            },
            punctuationMode: "DictatedAndAutomatic",
            profanityFilterMode: "Masked"
        }
    };

    console.log("Submitting transcription job with data: ", data);
    console.log("Endpoint: ", endpoint);
    console.log("Config: ", config);
    
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
        }

        // 更新元数据可能需要调整此处的调用，以确保 metadata 已经更新
        // 确保 saveTranscriptionResultToBlobAndUpdateMetadata 返回所需要的信息，如 transcriptionUrl
        console.log("Transcription job status: ", status, "Transcription URL: ", transcriptionUrl);
        res.json({ status, transcriptionUrl }); // 返回状态和转录结果URL
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
            // 假设您已经有转录文本内容的逻辑
            const transcriptionResult = await axios.get(transcriptResultsUrl);
            const transcriptionText = transcriptionResult.data;
            // 取audioName中的文件名部分，不包括扩展名，加上.json后缀
            const blobUrl = `${audioName.split(".")[0]}.json`;
            await uploadTextToBlob("transcriptions", blobUrl, JSON.stringify(transcriptionText));

            await updateBlobMetadata("audiofiles", audioName, {
                transcriptionUrl: blobUrl,
                transcriptionStatus: "Succeeded"
            });

            return { transcriptionUrl: blobUrl };
        } else {
            throw new Error("未找到转录结果文件。");
        }
    } catch (error) {
        console.error("保存转录结果到Blob并更新Metadata时发生错误", error);
    }
}


exports.getTranscriptTextFromBlob = async (req, res) => {
    const { transcriptionBlobName } = req.query;
    try {
        const transcriptText = await getTextContentFromBlob("transcriptions", transcriptionBlobName);

        // parseAndDisplayResults 函数的逻辑此处需要实现，并假定其将JSON转换为易读文本
        const readableText = parseAndDisplayResults(JSON.parse(transcriptText));
        res.json({ success: true, transcriptText: readableText });

    } catch (error) {
        console.error("从Blob获取转录文本时发生错误", error);
        res.status(500).send("无法从Blob获取转录文本。");
    }
};


// 解析转录结果
function parseAndDisplayResults(resultsJson) {
    let resultText = "";
    for (const phrase of resultsJson.recognizedPhrases) {
        const speaker = phrase.speaker || "unknown";
        const offset = convertDurationInTicksToMMSS(phrase.offsetInTicks);
        const bestN = phrase.nBest[0];
        const displayText = bestN.display;
        const currentText = `${offset} [Speaker${speaker}]:\n${displayText}\n`;
        resultText += currentText;
    }
    return resultText;
}

// 转换持续时间为 MM:SS 格式
function convertDurationInTicksToMMSS(durationInTicks) {
    // 持续时间的刻度为100纳秒，所以这里先转换为秒
    const durationInSeconds = durationInTicks / 10000000;
    
    const minutes = Math.floor(durationInSeconds / 60).toString().padStart(2, "0");
    const seconds = Math.floor(durationInSeconds % 60).toString().padStart(2, "0");

    return `${minutes}:${seconds}`;
}


