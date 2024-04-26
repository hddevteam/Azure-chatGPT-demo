//controller/audioFileController.js
const { uploadFileToBlob, listBlobsByUser, uploadTextToBlob, updateBlobMetadata } = require("../services/azureBlobStorage");

const axios = require("axios");
require("dotenv").config();

exports.uploadAudiofile = async (req, res) => {
    const fileContent = req.file.buffer; // 文件的二进制内容
    const originalFileName = req.body.originalFileName || req.file.originalname;
    const username = req.body.username; // 从请求中获取username
    const containerName = "audiofiles"; // 附件存储在这个容器中

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
            url: blob.url 
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
        locale: "zh-CN",
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
        const transcriptionId = response.data.self.split("/").pop(); 
        res.status(200).json({ transcriptionId, audioName });
    } catch (error) {
        console.error("Error submitting transcription job", error);
        res.status(500).send("Failed to submit transcription job.");
    }
};

// 取转录结果，处理并上传到Blob
exports.pollForTranscriptResults = async (req, res) => {
    console.log("pollForTranscriptResults");
    const { transcriptionId, audioName } = req.body;
    const statusEndpoint = `${endpoint}/${transcriptionId}`;
    console.log("statusEndpoint", statusEndpoint);
    const config = {
        headers: { "Ocp-Apim-Subscription-Key": subscriptionKey }
    };

    try {
        // 轮询检查转录状态
        let transcriptResult = null;
        let retries = 20;
        do {
            const statusResponse = await axios.get(statusEndpoint, config);
            const status = statusResponse.data.status;

            if (status === "Succeeded") {
                const filesUrl = statusResponse.data.links.files;
                const resultsResponse = await axios.get(filesUrl, config);
                const results = resultsResponse.data;
                
                for (const fileInfo of results.values) {
                    if (fileInfo.kind === "Transcription") {
                        const resultsUrl = fileInfo.links.contentUrl;
                        const finalResultsResponse = await axios.get(resultsUrl);
                        const finalResults = finalResultsResponse.data;
                        transcriptResult = parseAndDisplayResults(finalResults);
                        break; // 退出循环
                    }
                }

                if (transcriptResult) {
                    // 处理和上传转录结果
                    await uploadTextToBlob("transcriptions", `${audioName}.txt`, transcriptResult);
                    break; // 跳出轮询循环
                }
            } else if (status === "Failed") {
                console.log("Transcription failed", statusResponse.data);
                throw new Error("Transcription failed", statusResponse.data);
            }

            retries--;
            await new Promise(resolve => setTimeout(resolve, 10000)); 
        } while (!transcriptResult && retries > 0);

        if (transcriptResult) {
            res.json({ success: true, transcriptResult });
        } else {
            throw new Error("Transcription results processing failed or max retries exceeded.");
        }
    } catch (error) {
        console.error("Error fetching and processing transcription results", error);
        res.status(500).send("Failed to fetch and process transcription results.");
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

exports.updateBlobMetadata = async (req, res) => {
    const { containerName, blobName, metadata } = req.body;
    try {
        await updateBlobMetadata(containerName, blobName, metadata);
        res.json({ success: true });
    } catch (error) {
        console.error("更新metadata失败：", error);
        res.status(500).send("无法更新metadata。");
    }
};

