import swal from "sweetalert";
import ClipboardJS from "clipboard";
class MarkdownManager {
    constructor() {
        this.contentType = "text/markdown;charset=utf-8;";
        this.filename = "messages.md";
        this.area = document.createElement("textarea");
        this.a = document.createElement("a");
        const activeMessages = document.querySelectorAll(".message.active");
        let mdContent = "";
        activeMessages.forEach(message => {
            const dataSender = message.getAttribute("data-sender");
            const dataMessage = message.getAttribute("data-message");
            mdContent += `### ${dataSender}\n\n${dataMessage}\n\n`;
        });
        this.area.value = mdContent;
    }

    generateSummary(conversation) {
        return fetch("/api/generate-summary", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ conversation }),
        })
            .then(response => response.json());
    }

    downloadMarkdown(content) {
        const blob = new Blob([content], { type: this.contentType });
        this.a.href = URL.createObjectURL(blob);
        this.a.download = this.filename;
        this.a.style.display = "none";
        document.body.appendChild(this.a);
        this.a.click();
        document.body.removeChild(this.a);
    }

    copyMarkdown(content) {
        const clipboard = new ClipboardJS(".md-copy-button", {
            text: function () {
                return content;
            },
        });

        clipboard.on("success", function () {
            swal("Copied!", "The content of the textarea has been copied to the clipboard.", "success", { buttons: false, timer: 1000 });
        });

        clipboard.on("error", function () {
            swal("Error!", "Failed to copy the content of the textarea to the clipboard.", "error");
        });
    }

    processMarkdown() {
        swal({
            title: "Generate Markdown File",
            content: this.area,
            buttons: {
                generate: {
                    text: "Generate Title and Summary",
                    value: "generate",
                    closeModal: false,
                },
                download: {
                    text: "Download",
                    value: "download",
                },
                copy: {
                    text: "Copy",
                    value: "copy",
                    className: "md-copy-button",
                },
                cancel: "Close"
            },
            className: "markdown-modal",
            closeOnClickOutside: false,
        })
            .then((value) => {
                switch (value) {
                case "generate":
                    this.generateSummary(this.area.value)
                        .then(data => {
                            this.area.value = "# Title" + "\n\n" + data.title + "\n\n" + "## Summary" + "\n\n" + data.summary + "\n\n" + this.area.value;
                            swal.stopLoading();
                            this.processMarkdown();
                        });
                    break;
                case "download":
                    this.downloadMarkdown(this.area.value);
                    swal.stopLoading();
                    this.processMarkdown();
                    break;
                case "copy":
                    this.copyMarkdown(this.area.value);
                    break;
                }
            });
    }
}

export default MarkdownManager;