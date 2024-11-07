// public/utils/input-audio.js
/* eslint-disable no-undef */
import { sendAudioBlob } from "./api.js"; 
import { initWebSocket } from "./websocket.js"; 
import swal from "sweetalert";

// 用于设置语音输入并处理聊天页面上的操作
export function setupVoiceInput(uiManager) {
    const voiceInputButton = document.querySelector("#voice-input-button");

    const workerOptions = {
        OggOpusEncoderWasmPath: "./third_party/OggOpusEncoder.wasm",
        WebMOpusEncoderWasmPath: "./third_party/WebMOpusEncoder.wasm"
    };

    let recorder;
    let dataChunks = [];

    async function startRecording(event) {
        event.preventDefault(); // 阻止默认行为，以避免长按菜单

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
            uiManager.showToast("Processing audio... please wait.");
            stream.getAudioTracks().forEach((track) => track.stop());
            voiceInputButton.classList.remove("voice-input-active");

            let audioBlob = new Blob(dataChunks, { type: recorder.mimeType });
            dataChunks = [];

            try {
                initWebSocket();
                await sendAudioBlob(audioBlob);
                uiManager.showToast("Audio has been sent for processing.");
            } catch (error) {
                console.error(error);
                swal("Error", `Failed to send audio: ${error.message}`, "error");
            }       
        };

        recorder.onerror = (e) => {
            console.log("Recorder encounters error:" + e.message);
        };

        recorder.start();
    }

    async function stopRecording() {
        if (recorder && recorder.state === "recording") {
            recorder.stop();
        }
    }

    // 使用pointer事件来处理触摸和鼠标输入
    voiceInputButton.addEventListener("pointerdown", startRecording);
    voiceInputButton.addEventListener("pointerup", stopRecording);
    voiceInputButton.addEventListener("pointerleave", stopRecording); // 防止在按钮外松开
}
