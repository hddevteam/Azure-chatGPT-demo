//public/utils/audioModal.js
import { uploadAudiofile, fetchUploadedAudioFiles, fetchTranscriptionStatus, submitTranscriptionJob, fetchTranscriptText, deleteAudioFile } from "../utils/api.js";
import swal from "sweetalert";
import ClipboardJS from "clipboard";

const audioModal = (() => {
    const modal = document.getElementById("audio-processing-modal");
    const closeModalBtn = document.getElementById("close-audio-modal-btn");
    let pollingTasks = {};

    // 在 audioModal.js 文件中定义 showTranscriptionResult 函数
    const showTranscriptionResult = async (transcriptText) => {
        swal({
            title: "Transcription Result",
            content: {
                element: "div",
                attributes: {
                    innerHTML: `
                    <textarea id="transcription-result-text" readonly style="width: 100%; height: 300px;">${transcriptText}</textarea>
                `
                },
            },
            buttons: {
                copy: {
                    text: "Copy",
                    value: "copy",
                    className: "copy-button",
                },
                close: "Close",
            },
        }).then(
            (value) => {
                console.log("用户点击了按钮: ", value);
                if (value === "copy") {
                    const clipboard = new ClipboardJS(".copy-button", {
                        text: function () {
                            return transcriptText;
                        },
                    });
                    clipboard.on("success", function () {
                        swal("Copied!", "The transcript has been copied to the clipboard.", "success", { buttons: false, timer: 1000 });
                    });
                    clipboard.on("error", function () {
                        swal("Error!", "Failed to copy the transcript to the clipboard.", "error");
                    });
                }
            }
        );
    };


    // 显示模态框
    const showModal = () => {
        modal.style.display = "block";
        fetchAndDisplayUploadedAudioFiles();
    };

    // 隐藏模态框
    const hideModal = () => {
        modal.style.display = "none";
    };

    async function fetchAndDisplayUploadedAudioFiles() {
        console.log("fetchAndDisplayUploadedAudioFiles");
        try {
            // 调用API获取已上传音频文件列表
            const result = await fetchUploadedAudioFiles();
            if (result.success && result.data) {
                let audioFiles = result.data;
                audioFiles = audioFiles.sort((a, b) => new Date(b.lastModified) - new Date(a.lastModified));
                const uploadedFilesList = document.getElementById("uploaded-audio-files-list");
            
                // 清空现有列表
                uploadedFilesList.innerHTML = "";
                if (audioFiles.length === 0) {
                    // 如果没有文件，展示提示信息
                    uploadedFilesList.innerHTML = "<p>No audio files uploaded yet.</p>";
                } else {
                    // 动态生成文件信息和识别按钮，将其添加到列表中
                    audioFiles.forEach(file => {
                        const fileElem = document.createElement("div");
                        fileElem.classList.add("uploaded-file-item");
                        let buttonHTML = "";
                        switch(file.transcriptionStatus) {
                        case "Succeeded":
                            buttonHTML = `<button class="view-result-btn" data-transcription-url="${file.transcriptionUrl}">View Transcript</button>`;
                            break;
                        case "Running":
                            buttonHTML = `<button class="recognize-btn" data-audio-url="${file.url} disabled> Recognizing...</button>`;
                            break;
                        case "Failed":
                            buttonHTML = "<p>Recognition failed. Please try again.</p>";
                            break;
                        default:
                            buttonHTML = `<button class="recognize-btn" data-audio-url="${file.url}">Recognize</button>`;
                        }
                        buttonHTML += `<button class="delete-audio-btn" data-audio-url="${file.url}" data-blob-name="${file.name}"><i class="fas fa-trash"/></button>`;
                        fileElem.innerHTML = ` <p> ${file.name}, ${(file.size / 1024).toFixed(2)}KB</p>${buttonHTML}`;
                        uploadedFilesList.appendChild(fileElem);
                    });
                    
                    audioFiles.forEach(file => {
                        if (file.transcriptionStatus === "Running" && !pollingTasks[file.name]) {
                            const buttonElement = document.querySelector(`button[data-audio-url='${file.url}']`);
                            if(buttonElement) {
                                pollingTasks[file.name] = { active: true };
                                pollForTranscriptResults(file.transcriptionId, file.name, buttonElement);
                            }
                        }
                    });
                    
                }
            } else {
            // 如果API调用失败，显示错误信息
                swal("错误", result.message || "无法获取已上传的音频文件列表。", "error");
            }
        } catch (error) {
            console.error("获取已上传音频文件列表失败：", error);
            swal("错误", "无法获取已上传的音频文件列表。", "error");
        }
    }
    function bindEvents() {
        document.getElementById("uploaded-audio-files-list").addEventListener("click", async (event) => {
            let target = event.target;
    
            // 辅助函数：寻找具有指定类名的祖先元素（包括自身）
            function findAncestor(el, cls) {
                while (el && !el.classList.contains(cls)) {
                    el = el.parentElement;
                }
                return el;
            }
    
            const recognizeBtn = findAncestor(target, "recognize-btn");
            const viewResultBtn = findAncestor(target, "view-result-btn");
            const deleteAudioBtn = findAncestor(target, "delete-audio-btn");
    
            if (recognizeBtn) {
                const audioUrl = recognizeBtn.getAttribute("data-audio-url");
                await recognizeAudioFile(audioUrl, recognizeBtn); // 假设recognizeAudioFile函数存在
            } else if (viewResultBtn) {
                const transcriptionUrl = viewResultBtn.getAttribute("data-transcription-url");
                swal({
                    text: "Fetching transcription result...",
                    button: false,
                    closeOnClickOutside: false,
                    closeOnEsc: false,
                    icon: "info",
                });
                try {
                    const transcriptText = await fetchTranscriptText(transcriptionUrl); // 假设fetchTranscriptText函数存在
                    await showTranscriptionResult(transcriptText); // 展示转录结果，假设showTranscriptionResult函数存在
                } catch (error) {
                    console.error("查看识别结果失败: ", error);
                    swal.close();
                    swal("错误", "无法查看识别结果。", "error");
                }
            } else if (deleteAudioBtn) {
                const blobName = deleteAudioBtn.getAttribute("data-blob-name");
                swal({
                    text: "Deleted audio files cannot be recovered. Are you sure you want to delete this file?",
                    icon: "warning",
                    buttons: true,
                    dangerMode: true,
                }).then(async (willDelete) => {
                    if (willDelete) {
                        await deleteAudioFile(blobName); 
                        fetchAndDisplayUploadedAudioFiles(); 
                        swal("The audio file has been deleted.", { icon: "success", timer: 2000 });
                    }
                });
            }
        });
    }
    

    const recognizeAudioFile = async (audioUrl, buttonElement) => {
        try {
            // 更改按钮状态为正在提交
            buttonElement.textContent = "Submitting job";
            buttonElement.disabled = true;
    
            const languages = Array.from(document.getElementById("language-options").selectedOptions).map(option => option.value);
            const maxSpeakers = document.getElementById("max-speakers").value;
            const identifySpeakers = maxSpeakers > 1;
    
            const { transcriptionId, audioName } = await submitTranscriptionJob(audioUrl, { languages, identifySpeakers, maxSpeakers });
    
            // 开始轮询识别结果
            await pollForTranscriptResults(transcriptionId, audioName, buttonElement);
        } catch (error) {
            console.error("识别音频文件失败: ", error);
            swal("识别失败", "无法识别音频文件。", "error");
            // 恢复按钮状态以允许用户重试
            buttonElement.textContent = "Recognize";
            buttonElement.disabled = false;
        }
    };
    

    async function pollForTranscriptResults(transcriptionId, audioName, buttonElement) {
        let attempts = 20; // 最大尝试次数
        let pollInterval = 5000; // 轮询间隔，初始为5秒
    
        const poll = async () => {
            if (attempts-- === 0) {
                swal("识别失败", "获取转录结果超时，请稍后再试。", "error");
                buttonElement.textContent = "Recognize";
                buttonElement.disabled = false;
                delete pollingTasks[audioName]; // 清理轮询任务的标记
                return;
            }
            try {
                const result = await fetchTranscriptionStatus(transcriptionId, audioName);
                if (result.status === "Succeeded") {
                    // 转录成功，更新按钮以反映可以查看结果，并停止轮询
                    const newButton = document.createElement("button");
                    newButton.className = "view-result-btn"; // 设置新按钮的class
                    newButton.setAttribute("data-transcription-url", result.transcriptionUrl);
                    newButton.textContent = "View Transcript";
                    buttonElement.parentNode.replaceChild(newButton, buttonElement);
                    swal("The transcription is ready.", { icon: "success", timer: 2000 });
                    delete pollingTasks[audioName]; // 清理轮询任务的标记
                } else if (result.status === "Running" || result.status === "NotStarted") {
                    // 如果任务仍在进行中，继续轮询
                    buttonElement.textContent = "Recognizing...";
                    setTimeout(poll, pollInterval);
                    pollInterval = Math.min(pollInterval * 2, 30000); // 逐渐增加轮询间隔，但不超过30秒
                } else {
                    // 转录失败或遇到未预期状态，停止轮询并显示错误消息
                    swal("识别失败", "转录任务失败或状态未知。", "error");
                    buttonElement.textContent = "Recognize";
                    buttonElement.disabled = false;
                    delete pollingTasks[audioName]; // 清理轮询任务的标记
                }
            } catch (error) {
                console.error("轮询识别状态时发生错误：", error);
                swal("识别失败", "轮询过程中发生错误，请稍后再试。", "error");
                buttonElement.textContent = "Recognize";
                buttonElement.disabled = false;
                delete pollingTasks[audioName]; // 清理轮询任务的标记
            }
        };
        poll(); // 启动轮询
    }
    
    // 初始化函数，绑定事件监听器
    const init = () => {
        // 绑定关闭按钮事件
        closeModalBtn.addEventListener("click", hideModal);

        const uploadBtn = document.getElementById("upload-audio-btn");
        const fileInput = document.getElementById("audio-upload-input");

        // 修改uploadBtn点击事件，使其触发file input点击事件
        uploadBtn.addEventListener("click", () => {
            fileInput.click(); // 触发file input的点击事件
        });

        fileInput.addEventListener("change", () => {
            const file = fileInput.files[0];
            if(file) {
                uploadBtn.textContent = "Uploading..."; // 更改按钮文本
                uploadBtn.disabled = true; // 禁用按钮

                uploadAudiofile(file, file.name)
                    .then(() => {
                        fetchAndDisplayUploadedAudioFiles(); // 刷新已上传音频文件列表
                        swal("Upload Success", { icon: "success", timer: 2000});
                    })
                    .catch(error => {
                        console.error("上传音频文件失败：", error);
                        swal("上传失败", "无法上传音频文件。", "error");
                    })
                    .finally(() => {
                        uploadBtn.textContent = "Upload Audio"; 
                        uploadBtn.disabled = false; 
                        fileInput.value = ""; 
                    });
            }
        });

        // 点击模态框外区域也可以关闭模态框
        window.addEventListener("click", (event) => {
            if (event.target === modal) {
                hideModal();
            }
        });

        // 在这里调用 bindEvents 方法以设置事件监听
        bindEvents();
    };


    // 公开 showModal 和 hideModal 方法
    return {
        showModal,
        hideModal,
        init,
    };
})();

export default audioModal;
