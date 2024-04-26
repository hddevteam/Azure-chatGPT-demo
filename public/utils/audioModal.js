//public/utils/audioModal.js

import { uploadAudiofile, fetchUploadedAudioFiles, pollForTranscriptResults, submitTranscriptionJob } from "../utils/api.js";
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
                    uploadedFilesList.innerHTML = "<p>没有上传过的音频文件。</p>";
                } else {
                    // 动态生成文件信息和识别按钮，将其添加到列表中
                    audioFiles.forEach(file => {
                        const fileElem = document.createElement("div");
                        fileElem.classList.add("uploaded-file-item"); // 添加样式类，以便于样式设定
                        fileElem.innerHTML = `
                                                <p>文件名: ${file.name}, 大小: ${(file.size / 1024).toFixed(2)}KB</p>
                                                <button class="recognize-btn" data-audio-url="${file.url}">识别</button>
                                            `;
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
                await recognizeAudioFile(audioUrl); // 调用识别函数
            }
        });
    };

    async function recognizeAudioFile(audioUrl) {
        try {
            const { transcriptionId, audioName } = await submitTranscriptionJob(audioUrl);
            const transcriptResult = await pollForTranscriptResults(transcriptionId, audioName);
        
            swal("识别成功!", "音频文件识别完成", "success");
            // 在此处可以更新UI以显示转录结果，例如更新 uploadedFilesList 的内容
            updateTranscriptResultInUI(audioName, transcriptResult);
        } catch (error) {
            console.error("识别音频文件失败: ", error);
            swal("识别失败", "无法识别音频文件。", "error");
        }
    }

    // 更新UI函数, 这里只是个示例实现, 具体实现可能会有所不同
    function updateTranscriptResultInUI(audioName, transcriptResult) {
        const uploadedFilesList = document.getElementById("uploaded-audio-files-list");
        // 查找当前音频文件的元素，并更新其内容以显示转录结果
        const fileElems = uploadedFilesList.getElementsByClassName("uploaded-file-item");
        Array.from(fileElems).forEach((elem) => {
            if (elem.textContent.includes(audioName)) {
                elem.innerHTML += `<p>识别结果: ${transcriptResult}</p>`;
            }
        });
    }


    // 初始化函数，绑定事件监听器
    const init = () => {
    // 绑定关闭按钮事件
        closeModalBtn.addEventListener("click", hideModal);

        // 在 audioModal 的 init 函数中添加事件监听器
        const uploadBtn = document.getElementById("upload-audio-btn");
        const fileInput = document.getElementById("audio-upload-input");

        uploadBtn.addEventListener("click", () => {
            const file = fileInput.files[0];
            if (!file) {
                swal("错误", "请先选择一个音频文件。", "error");
                return;
            }

            uploadAudiofile(file, file.name)
                .then(() => {
                    swal("上传成功", "您的音频文件已上传。", "success");
                    fetchAndDisplayUploadedAudioFiles(); // 可能需要重新绑定事件
                })
                .catch(error => {
                    console.error("上传音频文件失败：", error);
                    swal("上传失败", "无法上传音频文件。", "error");
                });
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
