/**
 * File Attachment Cell Component for Board Table
 * Displays file count and allows adding/removing files
 */

export class FileAttachmentCell {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            itemId: options.itemId,
            files: options.files || [],
            onFilesChange: options.onFilesChange || (() => {}),
            ...options
        };
        
        this.files = [...this.options.files];
        this.isExpanded = false;
        
        this.init();
    }
    
    init() {
        this.render();
        this.attachEventListeners();
    }
    
    render() {
        const fileCount = this.files.length;
        const hasFiles = fileCount > 0;
        
        this.container.innerHTML = `
            <div class="file-cell-container">
                <div class="file-cell-display">
                    ${hasFiles ? `
                        <div class="file-count-badge">
                            <span class="file-count">${fileCount}</span>
                            <span class="file-icon">📎</span>
                        </div>
                    ` : `
                        <button class="file-add-btn" type="button" title="Add files">
                            <span class="file-add-icon">+</span>
                        </button>
                    `}
                </div>
                
                <div class="file-cell-expanded ${this.isExpanded ? 'open' : ''}">
                    <div class="file-cell-header">
                        <span class="file-cell-title">Files (${fileCount})</span>
                        <button class="file-cell-close" type="button">×</button>
                    </div>
                    <div class="file-cell-content">
                        <div class="file-attachment-container" id="file-attachment-${this.options.itemId}"></div>
                    </div>
                </div>
            </div>
        `;
        
        // Initialize file attachment component if expanded
        if (this.isExpanded) {
            this.initializeFileAttachment();
        }
    }
    
    initializeFileAttachment() {
        const attachmentContainer = this.container.querySelector(`#file-attachment-${this.options.itemId}`);
        if (!attachmentContainer) return;
        
        // Import and initialize FileAttachment component
        import('./FileAttachment.js').then(({ FileAttachment }) => {
            const fileAttachment = new FileAttachment(attachmentContainer, {
                maxFileSize: 5 * 1024 * 1024, // 5MB for cell view
                onFileUpload: (files) => {
                    this.files = files;
                    this.options.onFilesChange(this.files);
                    this.render();
                },
                onFileDelete: (fileId) => {
                    this.files = this.files.filter(f => f.id !== fileId);
                    this.options.onFilesChange(this.files);
                    this.render();
                }
            });
            
            fileAttachment.setFiles(this.files);
        });
    }
    
    attachEventListeners() {
        // File count badge click
        const fileCountBadge = this.container.querySelector('.file-count-badge');
        if (fileCountBadge) {
            fileCountBadge.addEventListener('click', () => {
                this.toggleExpanded();
            });
        }
        
        // Add file button
        const addBtn = this.container.querySelector('.file-add-btn');
        if (addBtn) {
            addBtn.addEventListener('click', () => {
                this.toggleExpanded();
            });
        }
        
        // Close button
        const closeBtn = this.container.querySelector('.file-cell-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                this.collapse();
            });
        }
        
        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target) && this.isExpanded) {
                this.collapse();
            }
        });
    }
    
    toggleExpanded() {
        this.isExpanded = !this.isExpanded;
        this.render();
        
        if (this.isExpanded) {
            // Add a small delay to ensure DOM is updated
            setTimeout(() => {
                this.initializeFileAttachment();
            }, 100);
        }
    }
    
    expand() {
        if (!this.isExpanded) {
            this.toggleExpanded();
        }
    }
    
    collapse() {
        if (this.isExpanded) {
            this.toggleExpanded();
        }
    }
    
    setFiles(files) {
        this.files = [...files];
        this.render();
    }
    
    getFiles() {
        return this.files;
    }
    
    addFile(file) {
        this.files.push(file);
        this.options.onFilesChange(this.files);
        this.render();
    }
    
    removeFile(fileId) {
        this.files = this.files.filter(f => f.id !== fileId);
        this.options.onFilesChange(this.files);
        this.render();
    }
}
