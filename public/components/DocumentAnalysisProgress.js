// public/components/DocumentAnalysisProgress.js
class DocumentAnalysisProgress {
    constructor() {
        this.progressElement = null;
        this.createProgressElement();
    }

    createProgressElement() {
        const progressElement = document.createElement('div');
        progressElement.id = 'document-analysis-progress';
        progressElement.className = 'document-analysis-progress hidden';
        progressElement.innerHTML = `
            <div class="progress-container">
                <h3>Processing Documents</h3>
                <div class="file-progress-list"></div>
            </div>
        `;
        document.body.appendChild(progressElement);
        this.progressElement = progressElement;
    }

    show() {
        if (this.progressElement) {
            this.progressElement.classList.remove('hidden');
            this.clearProgress();
        }
    }

    hide() {
        if (this.progressElement) {
            setTimeout(() => {
                this.progressElement.classList.add('hidden');
                this.clearProgress();
            }, 1000);
        }
    }

    clearProgress() {
        if (this.progressElement) {
            const listElement = this.progressElement.querySelector('.file-progress-list');
            listElement.innerHTML = '';
        }
    }

    updateProgress(fileName, status, message = '') {
        if (!this.progressElement) return;

        const listElement = this.progressElement.querySelector('.file-progress-list');
        let progressItem = listElement.querySelector(`[data-file="${fileName}"]`);

        if (!progressItem) {
            progressItem = document.createElement('div');
            progressItem.className = 'file-progress-item';
            progressItem.setAttribute('data-file', fileName);
            listElement.appendChild(progressItem);
        }

        let statusClass = '';
        let statusIcon = '';
        switch (status) {
            case 'processing':
                statusClass = 'processing';
                statusIcon = '<i class="fas fa-spinner fa-spin"></i>';
                break;
            case 'complete':
                statusClass = 'complete';
                statusIcon = '<i class="fas fa-check"></i>';
                break;
            case 'error':
                statusClass = 'error';
                statusIcon = '<i class="fas fa-exclamation-circle"></i>';
                break;
        }

        progressItem.className = `file-progress-item ${statusClass}`;
        progressItem.innerHTML = `
            ${statusIcon}
            <span class="file-name">${fileName}</span>
            ${message ? `<span class="status-message">${message}</span>` : ''}
        `;
    }
}

export default DocumentAnalysisProgress;