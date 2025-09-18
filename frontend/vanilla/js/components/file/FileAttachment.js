/**
 * File Attachment System for Monday.com Clone
 * Handles file uploads, previews, and management
 */

export class FileAttachment {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            maxFileSize: options.maxFileSize || 10 * 1024 * 1024, // 10MB
            allowedTypes: options.allowedTypes || [
                'image/jpeg', 'image/png', 'image/gif', 'image/webp',
                'application/pdf', 'text/plain', 'application/msword',
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                'application/vnd.ms-excel',
                'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
                'application/zip', 'application/x-rar-compressed'
            ],
            onFileUpload: options.onFileUpload || (() => {}),
            onFileDelete: options.onFileDelete || (() => {}),
            ...options
        };
        
        this.files = [];
        this.uploadQueue = [];
        this.isUploading = false;
        
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        this.container.innerHTML = `
            <div class="file-attachment-container">
                <div class="file-upload-area">
                    <div class="file-drop-zone" id="file-drop-zone">
                        <div class="file-drop-content">
                            <div class="file-drop-icon">📎</div>
                            <p class="file-drop-text">Drag & drop files here or <button type="button" class="file-browse-btn">browse</button></p>
                            <p class="file-drop-hint">Max file size: ${this.formatFileSize(this.options.maxFileSize)}</p>
                        </div>
                        <input type="file" 
                               id="file-input" 
                               multiple 
                               accept="${this.options.allowedTypes.join(',')}"
                               style="display: none;">
                    </div>
                </div>
                
                <div class="file-list" id="file-list">
                    ${this.renderFileList()}
                </div>
                
                <div class="file-upload-progress" id="upload-progress" style="display: none;">
                    <div class="progress-bar">
                        <div class="progress-fill" id="progress-fill"></div>
                    </div>
                    <div class="progress-text" id="progress-text">Uploading...</div>
                </div>
            </div>
        `;
    }
    
    renderFileList() {
        if (this.files.length === 0) {
            return '<div class="file-list-empty">No files attached</div>';
        }
        
        return this.files.map(file => this.renderFileItem(file)).join('');
    }
    
    renderFileItem(file) {
        const fileIcon = this.getFileIcon(file.type);
        const fileSize = this.formatFileSize(file.size);
        const uploadDate = new Date(file.uploadDate || Date.now()).toLocaleDateString();
        
        return `
            <div class="file-item" data-file-id="${file.id}">
                <div class="file-icon">${fileIcon}</div>
                <div class="file-info">
                    <div class="file-name" title="${file.name}">${file.name}</div>
                    <div class="file-meta">
                        <span class="file-size">${fileSize}</span>
                        <span class="file-date">${uploadDate}</span>
                    </div>
                </div>
                <div class="file-actions">
                    <button class="file-action-btn" data-action="preview" data-file-id="${file.id}" title="Preview">
                        👁️
                    </button>
                    <button class="file-action-btn" data-action="download" data-file-id="${file.id}" title="Download">
                        ⬇️
                    </button>
                    <button class="file-action-btn" data-action="delete" data-file-id="${file.id}" title="Delete">
                        🗑️
                    </button>
                </div>
            </div>
        `;
    }
    
    attachEventListeners() {
        const dropZone = this.container.querySelector('#file-drop-zone');
        const fileInput = this.container.querySelector('#file-input');
        const browseBtn = this.container.querySelector('.file-browse-btn');
        
        // File input change
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileSelect(e.target.files);
            });
        }
        
        // Browse button
        if (browseBtn) {
            browseBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }
        
        // Drag and drop
        if (dropZone) {
            dropZone.addEventListener('dragover', (e) => {
                e.preventDefault();
                dropZone.classList.add('drag-over');
            });
            
            dropZone.addEventListener('dragleave', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
            });
            
            dropZone.addEventListener('drop', (e) => {
                e.preventDefault();
                dropZone.classList.remove('drag-over');
                this.handleFileSelect(e.dataTransfer.files);
            });
        }
        
        // File actions
        this.container.addEventListener('click', (e) => {
            const actionBtn = e.target.closest('.file-action-btn');
            if (actionBtn) {
                const action = actionBtn.dataset.action;
                const fileId = actionBtn.dataset.fileId;
                this.handleFileAction(action, fileId);
            }
        });
    }
    
    handleFileSelect(files) {
        const validFiles = Array.from(files).filter(file => this.validateFile(file));
        
        if (validFiles.length === 0) {
            this.showError('No valid files selected');
            return;
        }
        
        if (validFiles.length !== files.length) {
            this.showError(`${files.length - validFiles.length} files were skipped due to size or type restrictions`);
        }
        
        this.uploadFiles(validFiles);
    }
    
    validateFile(file) {
        // Check file size
        if (file.size > this.options.maxFileSize) {
            console.warn(`File ${file.name} is too large`);
            return false;
        }
        
        // Check file type
        if (!this.options.allowedTypes.includes(file.type)) {
            console.warn(`File ${file.name} has unsupported type: ${file.type}`);
            return false;
        }
        
        return true;
    }
    
    async uploadFiles(files) {
        this.isUploading = true;
        this.showUploadProgress();
        
        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            await this.uploadFile(file, i + 1, files.length);
        }
        
        this.isUploading = false;
        this.hideUploadProgress();
        this.options.onFileUpload(this.files);
    }
    
    async uploadFile(file, current, total) {
        return new Promise((resolve, reject) => {
            const fileId = this.generateFileId();
            const fileObj = {
                id: fileId,
                name: file.name,
                type: file.type,
                size: file.size,
                uploadDate: new Date().toISOString(),
                status: 'uploading'
            };
            
            this.files.push(fileObj);
            this.updateFileList();
            
            // Simulate upload progress
            const progress = this.container.querySelector('#progress-fill');
            const progressText = this.container.querySelector('#progress-text');
            
            let uploadProgress = 0;
            const uploadInterval = setInterval(() => {
                uploadProgress += Math.random() * 20;
                if (uploadProgress >= 100) {
                    uploadProgress = 100;
                    clearInterval(uploadInterval);
                    
                    fileObj.status = 'uploaded';
                    fileObj.url = URL.createObjectURL(file); // In real app, this would be server URL
                    this.updateFileList();
                    resolve(fileObj);
                }
                
                const overallProgress = ((current - 1) * 100 + uploadProgress) / total;
                if (progress) {
                    progress.style.width = `${overallProgress}%`;
                }
                if (progressText) {
                    progressText.textContent = `Uploading ${file.name} (${current}/${total})`;
                }
            }, 100);
        });
    }
    
    handleFileAction(action, fileId) {
        const file = this.files.find(f => f.id === fileId);
        if (!file) return;
        
        switch (action) {
            case 'preview':
                this.previewFile(file);
                break;
            case 'download':
                this.downloadFile(file);
                break;
            case 'delete':
                this.deleteFile(fileId);
                break;
        }
    }
    
    previewFile(file) {
        if (file.type.startsWith('image/')) {
            this.showImagePreview(file);
        } else if (file.type === 'application/pdf') {
            this.showPdfPreview(file);
        } else {
            this.showGenericPreview(file);
        }
    }
    
    showImagePreview(file) {
        const modal = this.createPreviewModal();
        modal.innerHTML = `
            <div class="preview-modal-content">
                <div class="preview-header">
                    <h3>${file.name}</h3>
                    <button class="preview-close">×</button>
                </div>
                <div class="preview-body">
                    <img src="${file.url}" alt="${file.name}" class="preview-image">
                </div>
            </div>
        `;
        
        this.showModal(modal);
    }
    
    showPdfPreview(file) {
        const modal = this.createPreviewModal();
        modal.innerHTML = `
            <div class="preview-modal-content">
                <div class="preview-header">
                    <h3>${file.name}</h3>
                    <button class="preview-close">×</button>
                </div>
                <div class="preview-body">
                    <iframe src="${file.url}" class="preview-pdf"></iframe>
                </div>
            </div>
        `;
        
        this.showModal(modal);
    }
    
    showGenericPreview(file) {
        const modal = this.createPreviewModal();
        modal.innerHTML = `
            <div class="preview-modal-content">
                <div class="preview-header">
                    <h3>${file.name}</h3>
                    <button class="preview-close">×</button>
                </div>
                <div class="preview-body">
                    <div class="preview-generic">
                        <div class="preview-icon">${this.getFileIcon(file.type)}</div>
                        <p>Preview not available for this file type</p>
                        <button class="btn btn-primary" onclick="this.downloadFile('${file.id}')">Download File</button>
                    </div>
                </div>
            </div>
        `;
        
        this.showModal(modal);
    }
    
    createPreviewModal() {
        const modal = document.createElement('div');
        modal.className = 'file-preview-modal';
        return modal;
    }
    
    showModal(modal) {
        document.body.appendChild(modal);
        
        const closeBtn = modal.querySelector('.preview-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.hideModal(modal);
            });
        }
        
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                this.hideModal(modal);
            }
        });
    }
    
    hideModal(modal) {
        modal.remove();
    }
    
    downloadFile(file) {
        const link = document.createElement('a');
        link.href = file.url;
        link.download = file.name;
        link.click();
    }
    
    deleteFile(fileId) {
        if (confirm('Are you sure you want to delete this file?')) {
            this.files = this.files.filter(f => f.id !== fileId);
            this.updateFileList();
            this.options.onFileDelete(fileId);
        }
    }
    
    updateFileList() {
        const fileList = this.container.querySelector('#file-list');
        if (fileList) {
            fileList.innerHTML = this.renderFileList();
        }
    }
    
    showUploadProgress() {
        const progress = this.container.querySelector('#upload-progress');
        if (progress) {
            progress.style.display = 'block';
        }
    }
    
    hideUploadProgress() {
        const progress = this.container.querySelector('#upload-progress');
        if (progress) {
            progress.style.display = 'none';
        }
    }
    
    showError(message) {
        // Create a temporary error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'file-error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--error-color);
            color: white;
            padding: 12px 16px;
            border-radius: 6px;
            z-index: 10000;
            animation: slideInRight 0.3s ease;
        `;
        
        document.body.appendChild(errorDiv);
        
        setTimeout(() => {
            errorDiv.remove();
        }, 5000);
    }
    
    getFileIcon(type) {
        if (type.startsWith('image/')) return '🖼️';
        if (type === 'application/pdf') return '📄';
        if (type.includes('word')) return '📝';
        if (type.includes('excel') || type.includes('spreadsheet')) return '📊';
        if (type.includes('zip') || type.includes('rar')) return '📦';
        if (type.startsWith('text/')) return '📄';
        return '📎';
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    generateFileId() {
        return 'file_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
    
    getFiles() {
        return this.files;
    }
    
    setFiles(files) {
        this.files = files || [];
        this.updateFileList();
    }
}
