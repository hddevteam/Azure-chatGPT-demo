const voiceInputButton = document.querySelector('#voice-input-button');

const workerOptions = {
    OggOpusEncoderWasmPath: 'OggOpusEncoder.wasm',
    WebMOpusEncoderWasmPath: 'WebMOpusEncoder.wasm'
};

let recorder;
let dataChunks = [];

async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });

    const sampleRate = 16000;
    let options = {
        audioBitsPerSecond: sampleRate * 16, // 16 bits per sample
        mimeType: 'audio/wav'
    };

    window.MediaRecorder = OpusMediaRecorder;
    recorder = new MediaRecorder(stream, options, workerOptions);

    recorder.onstart = () => {
        console.log('Recorder started');
        showToast('Recording started... please limit your message to 60 seconds.')
        dataChunks = [];
        voiceInputButton.classList.add("voice-input-active");
    };

    recorder.ondataavailable = (e) => {
        console.log('Recorder data available');
        dataChunks.push(e.data);
    };

    recorder.onstop = async () => {
        console.log('Recorder stopped');
        // Stop all audio tracks to release the resources
        stream.getAudioTracks().forEach((track) => track.stop());

        showToast('Processing audio... please wait.')

        voiceInputButton.classList.remove("voice-input-active");

        let audioBlob = new Blob(dataChunks, { type: recorder.mimeType });
        dataChunks = [];

        const formData = new FormData();
        formData.append('file', audioBlob);

        const response = await fetch('/speech-to-text', {
            method: 'POST',
            body: formData,
        });

        const text = await response.text();
        //check response status, if not 200, show error message
        if (!response.ok) {
            showToast('Error: ' + text);
        }
        else {
            const messageInput = document.querySelector('#message-input');
            messageInput.value = text;
        }

        // Add click event listener to start recording again
        voiceInputButton.addEventListener("click", startRecording, { once: true });
    };

    recorder.onerror = (e) => {
        console.log('Recorder encounters error:' + e.message);
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