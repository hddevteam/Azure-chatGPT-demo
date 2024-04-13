/* eslint-disable no-undef */
// purpose: to setup the voice input and handle it on the chat page
import { getStt } from "./api.js";


// It uses the OpusMediaRecorder library to record audio from the user's microphone
// It then sends the audio to the server to be processed by the auto-speech-to-text API
export function setupVoiceInput(uiManager) {
    const voiceInputButton = document.querySelector("#voice-input-button");

    const workerOptions = {
        OggOpusEncoderWasmPath: "./third_party/OggOpusEncoder.wasm",
        WebMOpusEncoderWasmPath: "./third_party/WebMOpusEncoder.wasm"
    };

    let recorder;
    let dataChunks = [];

    async function startRecording() {
        uiManager.showToast("Device is warming up... please wait.");
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

        const sampleRate = 16000;
        let options = {
            audioBitsPerSecond: sampleRate * 16, // 16 bits per sample
            mimeType: "audio/wav"
        };

        window.MediaRecorder = OpusMediaRecorder;
        recorder = new MediaRecorder(stream, options, workerOptions);

        recorder.onstart = () => {
            console.log("Recorder started");
            uiManager.showToast("Recording started....");
            dataChunks = [];
            voiceInputButton.classList.add("voice-input-active");
        };

        recorder.ondataavailable = (e) => {
            console.log("Recorder data available");
            dataChunks.push(e.data);
        };

        recorder.onstop = async () => {
            console.log("Recorder stopped");
            // Stop all audio tracks to release the resources
            stream.getAudioTracks().forEach((track) => track.stop());

            uiManager.showToast("Processing audio... please wait.");

            voiceInputButton.classList.remove("voice-input-active");

            let audioBlob = new Blob(dataChunks, { type: recorder.mimeType });
            dataChunks = [];

            try {
                const response = await getStt(audioBlob);
                // 由于getStt已经返回了处理好的数据，这里直接使用response变量
                const text = response;
            
                const messageInput = document.querySelector("#message-input");
                messageInput.value += text; // 假设返回的是纯文本数据
            } catch (error) {
                // 错误处理逻辑
                console.error(error);
                uiManager.showToast(`Error: ${error.message}`);
            }            

            // Add click event listener to start recording again
            voiceInputButton.addEventListener("click", startRecording, { once: true });
        };

        recorder.onerror = (e) => {
            console.log("Recorder encounters error:" + e.message);
        };

        recorder.start();
        // Add click event listener to stop recording
        voiceInputButton.addEventListener("click", stopRecording, { once: true });
    }

    async function stopRecording() {
        recorder.stop();
        // Remove click event listener for stop recording
        voiceInputButton.removeEventListener("click", stopRecording);
    }

    voiceInputButton.addEventListener("click", startRecording, { once: true });
}