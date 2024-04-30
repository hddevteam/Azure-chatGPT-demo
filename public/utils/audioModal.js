//public/utils/audioModal.js

import { uploadAudiofile, fetchUploadedAudioFiles, fetchTranscriptionStatus, submitTranscriptionJob, fetchTranscriptText, deleteAudioFile } from "../utils/api.js";
import swal from "sweetalert";

const audioModal = (() => {
    const modal = document.getElementById("audio-processing-modal");
    const closeModalBtn = document.getElementById("close-audio-modal-btn");

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
                const audioFiles = result.data;
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
                        fileElem.classList.add("uploaded-file-item"); // 添加样式类，以便于样式设定
                        let buttonHTML = "";
                        switch(file.transcriptionStatus) {
                        case "Succeeded":
                            buttonHTML = `<button class="view-result-btn" data-transcription-url="${file.transcriptionUrl}">View Transcript
                            </button>`;
                            break;
                        case "Running":
                        case "NotStarted":
                            buttonHTML = "<button class=\"recognize-btn\" disabled> Recognizing...</button>";
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
    const bindEvents = () => {
        document.getElementById("uploaded-audio-files-list").addEventListener("click", async (event) => {
            const target = event.target;
    
            // 检查点击事件的目标是否是识别按钮
            if (target.className.includes("recognize-btn")) {
                const audioUrl = target.getAttribute("data-audio-url"); // 获取音频URL
                await recognizeAudioFile(audioUrl, target); // 调用识别函数
            } else if (target.className.includes("view-result-btn")) {
                const transcriptionUrl = target.getAttribute("data-transcription-url");
                try {
                    const transcriptText = await fetchTranscriptText(transcriptionUrl); // 假设这个函数能从给定的URL获取转录文本
                    swal("识别结果", transcriptText, "info");
                } catch (error) {
                    console.error("查看识别结果失败: ", error);
                    swal("错误", "无法查看识别结果。", "error");
                }
            } else if (target.className.includes("delete-audio-btn")) {
                const blobName = target.getAttribute("data-blob-name"); // 获取文件名
                swal({
                    text: "Deleted files cannot be recovered. Are you sure you want to delete this file?",
                    icon: "warning",
                    buttons: true,
                    dangerMode: true,
                }).then(async (willDelete) => {
                    if (willDelete) {
                        await deleteAudioFile(blobName); // 调用删除函数
                        fetchAndDisplayUploadedAudioFiles(); // 刷新已上传音频文件列表
                        swal("Your file has been deleted.", { icon: "success", timer: 2000 });
                    } 
                });
            }
        });
    };

    const recognizeAudioFile = async (audioUrl, buttonElement) => {
        try {
            // 更改按钮状态为正在提交
            buttonElement.textContent = "Submit Job";
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
        let attempts = 10; // 可以根据需要调整尝试次数
        let pollInterval = 5000; // 初始轮询间隔5秒
    
        const poll = async () => {
            if (attempts-- === 0) {
                swal("识别失败", "获取转录结果超时。请稍后再试。", "error");
                // 恢复按钮状态以允许用户重试
                buttonElement.textContent = "Recognize";
                buttonElement.disabled = false;
                return;
            }
            try {
                const result = await fetchTranscriptionStatus(transcriptionId, audioName);
                if(result.status === "Succeeded") {
                    buttonElement.outerHTML = `<button class="view-result-btn" data-transcription-url="${result.transcriptionUrl}">View Transcript</button>`;
                    swal("The transcription is ready.", { icon: "success", timer: 2000 });
                } else if (result.status === "Running" || result.status === "NotStarted") {
                    // 任务仍在进行中，更新按钮文本
                    buttonElement.textContent = "Recognizing";
                    setTimeout(poll, pollInterval);
                    pollInterval *= 2; // 指数退避策略
                } else {
                    swal("识别失败", "转录任务失败。", "error");
                    // 恢复按钮状态以允许用户重试
                    buttonElement.textContent = "Recognize";
                    buttonElement.disabled = false;
                }
            } catch(error) {
                console.error("轮询识别状态时发生错误：", error);
                swal("识别失败", "无法获取转录状态。请稍后再试。", "error");
                // 恢复按钮状态以允许用户重试
                buttonElement.textContent = "Recognize";
                buttonElement.disabled = false;
            }
        };
        poll();
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
