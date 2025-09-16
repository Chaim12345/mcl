/**
 * Comment Composer Component
 * Handles comment creation with mention support, file attachments, and rich text editing
 */

import { Component } from '../base/Component.js';
import { commentService } from '../../services/comment.js';
import { userService } from '../../services/user.js';
import { eventBus } from '../../utils/events.js';

export class CommentComposer extends Component {
    constructor(container, options = {}) {
        super(container, options);
        
        this.state = {
            content: '',
            attachments: [],
            isSubmitting: false,
            showMentions: false,
            mentionQuery: '',
            mentionSuggestions: [],
            mentionPosition: { x: 0, y: 0 },
            selectedMentionIndex: -1,
            errors: {},
            isDragOver: false,
            uploadProgress: {}
        };
        
        this.itemId = options.itemId;
        this.boardId = options.boardId;
        this.placeholder = options.placeholder || 'Write a comment...';
        this.allowAttachments = options.allowAttachments !== false;
        this.allowMentions = options.allowMentions !== false;
        this.maxAttachmentSize = options.maxAttachmentSize || 10 * 1024 * 1024; // 10MB
        this.allowedFileTypes = options.allowedFileTypes || ['image/*', '.pdf', '.doc', '.docx', '.txt'];
        
        this.textareaRef = null;
        this.mentionDropdownRef = null;
        this.fileInputRef = null;
        
        this.init();
    }
    
    init() {
        this.render();
        this.bindEvents();
        this.setupMentionSupport();
        this.setupDragAndDrop();
    }
    
    render() {
        const { 
            content, 
            attachments, 
            isSubmitting, 
            errors, 
            isDragOver,
            uploadProgress 
        } = this.state;
        
        this.container.innerHTML = `
            <div class="comment-composer ${isDragOver ? 'comment-composer--drag-over' : ''}">
                ${errors.submit ? `
                    <div class="comment-error">
                        <svg class="error-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                            <circle cx="12" cy="12" r="10"></circle>
                            <line x1="15" y1="9" x2="9" y2="15"></line>
                            <line x1="9" y1="9" x2="15" y2="15"></line>
                        </svg>
                        <span>${errors.submit}</span>
                    </div>
                ` : ''}
                
                <div class="comment-composer-header">
                    <div class="composer-avatar">
                        ${this.getCurrentUserAvatar()}
                    </div>
                    <div class="composer-title">Add a comment</div>
                </div>
                
                <div class="comment-composer-body">
                    <div class="composer-input-wrapper">
                        <textarea 
                            class="composer-textarea"
                            placeholder="${this.placeholder}"
                            rows="3"
                            ${isSubmitting ? 'disabled' : ''}
                        >${this.escapeHtml(content)}</textarea>
                        
                        <div class="composer-mentions-dropdown" style="display: none;">
                            <!-- Mentions dropdown will be populated dynamically -->
                        </div>
                        
                        <div class="composer-drag-overlay">
                            <div class="drag-overlay-content">
                                <svg class="drag-icon" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                </svg>
                                <p class="drag-text">Drop files here to attach</p>
                            </div>
                        </div>
                    </div>
                    
                    ${attachments.length ? `
                        <div class="composer-attachments">
                            <div class="attachments-label">Attachments:</div>
                            <div class="attachments-list">
                                ${attachments.map((attachment, index) => this.renderAttachment(attachment, index)).join('')}
                            </div>
                        </div>
                    ` : ''}
                    
                    ${Object.keys(uploadProgress).length ? `
                        <div class="composer-upload-progress">
                            ${Object.entries(uploadProgress).map(([fileName, progress]) => `
                                <div class="upload-progress-item">
                                    <span class="upload-filename">${this.escapeHtml(fileName)}</span>
                                    <div class="upload-progress-bar">
                                        <div class="upload-progress-fill" style="width: ${progress}%"></div>
                                    </div>
                                    <span class="upload-percentage">${progress}%</span>
                                </div>
                            `).join('')}
                        </div>
                    ` : ''}
                </div>
                
                <div class="comment-composer-footer">
                    <div class="composer-tools">
                        ${this.allowMentions ? `
                            <button type="button" class="composer-tool-btn" data-action="mention" title="Mention someone (@)">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <circle cx="12" cy="12" r="4"></circle>
                                    <path d="M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-3.92 7.94"></path>
                                </svg>
                            </button>
                        ` : ''}
                        
                        ${this.allowAttachments ? `
                            <button type="button" class="composer-tool-btn" data-action="attach" title="Attach files">
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                    <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48"></path>
                                </svg>
                            </button>
                            
                            <input 
                                type="file" 
                                class="composer-file-input" 
                                multiple 
                                accept="${this.allowedFileTypes.join(',')}"
                                style="display: none;"
                            />
                        ` : ''}
                    </div>
                    
                    <div class="composer-actions">
                        <div class="composer-hints">
                            <span class="hint">Use @ to mention someone</span>
                            <span class="hint">Ctrl+Enter to submit</span>
                        </div>
                        
                        <button 
                            type="button" 
                            class="btn btn--primary composer-submit-btn" 
                            data-action="submit"
                            ${!content.trim() || isSubmitting ? 'disabled' : ''}
                        >
                            ${isSubmitting ? `
                                <svg class="loading-spinner" width="16" height="16" viewBox="0 0 24 24">
                                    <circle class="spinner-circle" cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/>
                                </svg>
                                Posting...
                            ` : 'Post Comment'}
                        </button>
                    </div>
                </div>
            </div>
        `;
        
        this.cacheReferences();
        this.restoreTextareaState();
    }
    
    renderAttachment(attachment, index) {
        return `
            <div class="attachment-item" data-index="${index}">
                <div class="attachment-preview">
                    ${this.getAttachmentPreview(attachment)}
                </div>
                <div class="attachment-info">
                    <div class="attachment-name" title="${this.escapeHtml(attachment.name)}">
                        ${this.escapeHtml(attachment.name)}
                    </div>
                    <div class="attachment-size">
                        ${this.formatFileSize(attachment.size)}
                    </div>
                </div>
                <button type="button" class="attachment-remove-btn" data-action="remove-attachment" data-index="${index}">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <line x1="18" y1="6" x2="6" y2="18"></line>
                        <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                </button>
            </div>
        `;
    }
    
    getAttachmentPreview(attachment) {
        if (attachment.type.startsWith('image/')) {
            return `<img src="${attachment.url || URL.createObjectURL(attachment.file)}" alt="${attachment.name}" class="attachment-image-preview" />`;
        } else if (attachment.type === 'application/pdf') {
            return `
                <svg class="attachment-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                    <line x1="16" y1="13" x2="8" y2="13"></line>
                    <line x1="16" y1="17" x2="8" y2="17"></line>
                    <polyline points="10,9 9,9 8,9"></polyline>
                </svg>
            `;
        } else {
            return `
                <svg class="attachment-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                    <polyline points="14,2 14,8 20,8"></polyline>
                </svg>
            `;
        }
    }
    
    cacheReferences() {
        this.textareaRef = this.container.querySelector('.composer-textarea');
        this.mentionDropdownRef = this.container.querySelector('.composer-mentions-dropdown');
        this.fileInputRef = this.container.querySelector('.composer-file-input');
    }
    
    restoreTextareaState() {
        if (this.textareaRef) {
            this.textareaRef.value = this.state.content;
            this.adjustTextareaHeight();
        }
    }
    
    bindEvents() {
        this.container.addEventListener('click', this.handleClick.bind(this));
        this.container.addEventListener('input', this.handleInput.bind(this));
        this.container.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.container.addEventListener('paste', this.handlePaste.bind(this));
        
        // File input change
        if (this.fileInputRef) {
            this.fileInputRef.addEventListener('change', this.handleFileSelect.bind(this));
        }
    }
    
    setupMentionSupport() {
        if (!this.allowMentions) return;
        
        // Listen for @ symbol typing
        if (this.textareaRef) {
            this.textareaRef.addEventListener('input', this.handleMentionInput.bind(this));
            this.textareaRef.addEventListener('keydown', this.handleMentionNavigation.bind(this));
        }
    }
    
    setupDragAndDrop() {
        if (!this.allowAttachments) return;
        
        this.container.addEventListener('dragover', this.handleDragOver.bind(this));
        this.container.addEventListener('dragleave', this.handleDragLeave.bind(this));
        this.container.addEventListener('drop', this.handleDrop.bind(this));
    }
    
    handleClick(e) {
        const action = e.target.closest('[data-action]')?.dataset.action;
        
        switch (action) {
            case 'submit':
                this.submitComment();
                break;
            case 'mention':
                this.insertMentionSymbol();
                break;
            case 'attach':
                this.openFileDialog();
                break;
            case 'remove-attachment':
                this.removeAttachment(parseInt(e.target.closest('[data-index]').dataset.index));
                break;
            case 'select-mention':
                this.selectMention(parseInt(e.target.closest('[data-index]').dataset.index));
                break;
        }
    }
    
    handleInput(e) {
        if (e.target === this.textareaRef) {
            this.setState({ content: e.target.value });
            this.adjustTextareaHeight();
            this.updateSubmitButton();
        }
    }
    
    handleKeyDown(e) {
        if (e.target === this.textareaRef) {
            // Handle mention navigation
            if (this.state.showMentions) {
                this.handleMentionNavigation(e);
                return;
            }
            
            // Handle submit shortcut
            if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                e.preventDefault();
                this.submitComment();
            }
            
            // Handle tab for accessibility
            if (e.key === 'Tab' && !e.shiftKey) {
                const tools = this.container.querySelectorAll('.composer-tool-btn');
                if (tools.length > 0) {
                    e.preventDefault();
                    tools[0].focus();
                }
            }
        }
    }
    
    async handlePaste(e) {
        const items = e.clipboardData?.items;
        if (!items || !this.allowAttachments) return;
        
        for (let item of items) {
            if (item.type.startsWith('image/')) {
                e.preventDefault();
                const file = item.getAsFile();
                if (file) {
                    await this.addAttachment(file);
                }
            }
        }
    }
    
    handleMentionInput(e) {
        const value = e.target.value;
        const cursorPosition = e.target.selectionStart;
        
        // Find @ symbol before cursor
        const textBeforeCursor = value.substring(0, cursorPosition);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
        
        if (mentionMatch) {
            const query = mentionMatch[1];
            this.showMentionDropdown(query, cursorPosition);
        } else {
            this.hideMentionDropdown();
        }
    }
    
    handleMentionNavigation(e) {
        if (!this.state.showMentions) return;
        
        const { mentionSuggestions, selectedMentionIndex } = this.state;
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.setState({
                    selectedMentionIndex: Math.min(selectedMentionIndex + 1, mentionSuggestions.length - 1)
                });
                this.updateMentionSelection();
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.setState({
                    selectedMentionIndex: Math.max(selectedMentionIndex - 1, 0)
                });
                this.updateMentionSelection();
                break;
                
            case 'Enter':
            case 'Tab':
                e.preventDefault();
                if (selectedMentionIndex >= 0) {
                    this.selectMention(selectedMentionIndex);
                }
                break;
                
            case 'Escape':
                e.preventDefault();
                this.hideMentionDropdown();
                break;
        }
    }
    
    async showMentionDropdown(query, cursorPosition) {
        try {
            // Get cursor position relative to textarea
            const rect = this.textareaRef.getBoundingClientRect();
            const position = this.getCaretPosition(cursorPosition);
            
            // Search for users
            const users = await this.searchUsers(query);
            
            this.setState({
                showMentions: true,
                mentionQuery: query,
                mentionSuggestions: users,
                selectedMentionIndex: 0,
                mentionPosition: {
                    x: position.x,
                    y: position.y + 20
                }
            });
            
            this.renderMentionDropdown();
        } catch (error) {
            console.error('Error loading mention suggestions:', error);
        }
    }
    
    hideMentionDropdown() {
        this.setState({
            showMentions: false,
            mentionQuery: '',
            mentionSuggestions: [],
            selectedMentionIndex: -1
        });
        
        if (this.mentionDropdownRef) {
            this.mentionDropdownRef.style.display = 'none';
        }
    }
    
    renderMentionDropdown() {
        if (!this.mentionDropdownRef || !this.state.showMentions) return;
        
        const { mentionSuggestions, selectedMentionIndex, mentionPosition } = this.state;
        
        this.mentionDropdownRef.style.left = mentionPosition.x + 'px';
        this.mentionDropdownRef.style.top = mentionPosition.y + 'px';
        this.mentionDropdownRef.style.display = 'block';
        
        this.mentionDropdownRef.innerHTML = `
            <div class="mentions-list">
                ${mentionSuggestions.map((user, index) => `
                    <div class="mention-item ${index === selectedMentionIndex ? 'mention-item--selected' : ''}" 
                         data-action="select-mention" 
                         data-index="${index}">
                        <div class="mention-avatar">
                            ${user.avatar ? 
                                `<img src="${user.avatar}" alt="${user.name}" />` :
                                `<div class="mention-avatar-initials">${this.getInitials(user.name)}</div>`
                            }
                        </div>
                        <div class="mention-info">
                            <div class="mention-name">${this.escapeHtml(user.name)}</div>
                            <div class="mention-email">${this.escapeHtml(user.email)}</div>
                        </div>
                    </div>
                `).join('')}
                
                ${mentionSuggestions.length === 0 ? `
                    <div class="mention-empty">No users found</div>
                ` : ''}
            </div>
        `;
    }
    
    updateMentionSelection() {
        const items = this.mentionDropdownRef?.querySelectorAll('.mention-item');
        if (!items) return;
        
        items.forEach((item, index) => {
            item.classList.toggle('mention-item--selected', index === this.state.selectedMentionIndex);
        });
    }
    
    selectMention(index) {
        const user = this.state.mentionSuggestions[index];
        if (!user) return;
        
        const value = this.textareaRef.value;
        const cursorPosition = this.textareaRef.selectionStart;
        
        // Find the @ symbol and replace the mention
        const textBeforeCursor = value.substring(0, cursorPosition);
        const mentionMatch = textBeforeCursor.match(/@(\w*)$/);
        
        if (mentionMatch) {
            const startPos = cursorPosition - mentionMatch[0].length;
            const newValue = 
                value.substring(0, startPos) + 
                `@${user.name} ` + 
                value.substring(cursorPosition);
            
            this.textareaRef.value = newValue;
            this.setState({ content: newValue });
            
            // Move cursor after the mention
            const newCursorPos = startPos + `@${user.name} `.length;
            this.textareaRef.setSelectionRange(newCursorPos, newCursorPos);
            this.textareaRef.focus();
        }
        
        this.hideMentionDropdown();
        this.updateSubmitButton();
    }
    
    async searchUsers(query) {
        try {
            const response = await userService.searchUsers({
                query,
                boardId: this.boardId,
                limit: 10
            });
            
            return response.success ? response.data : [];
        } catch (error) {
            console.error('Error searching users:', error);
            return [];
        }
    }
    
    getCaretPosition(textPosition) {
        // Create a temporary div to measure text position
        const div = document.createElement('div');
        const style = window.getComputedStyle(this.textareaRef);
        
        // Copy textarea styles
        for (let prop of style) {
            div.style[prop] = style[prop];
        }
        
        div.style.position = 'absolute';
        div.style.visibility = 'hidden';
        div.style.height = 'auto';
        div.style.width = this.textareaRef.offsetWidth + 'px';
        div.style.whiteSpace = 'pre-wrap';
        div.style.wordWrap = 'break-word';
        
        document.body.appendChild(div);
        
        const textBeforeCaret = this.textareaRef.value.substring(0, textPosition);
        div.textContent = textBeforeCaret;
        
        const span = document.createElement('span');
        span.textContent = '|';
        div.appendChild(span);
        
        const spanRect = span.getBoundingClientRect();
        const textareaRect = this.textareaRef.getBoundingClientRect();
        
        document.body.removeChild(div);
        
        return {
            x: spanRect.left - textareaRect.left,
            y: spanRect.top - textareaRect.top
        };
    }
    
    insertMentionSymbol() {
        const cursorPos = this.textareaRef.selectionStart;
        const value = this.textareaRef.value;
        const newValue = value.substring(0, cursorPos) + '@' + value.substring(cursorPos);
        
        this.textareaRef.value = newValue;
        this.setState({ content: newValue });
        this.textareaRef.setSelectionRange(cursorPos + 1, cursorPos + 1);
        this.textareaRef.focus();
    }
    
    openFileDialog() {
        if (this.fileInputRef) {
            this.fileInputRef.click();
        }
    }
    
    async handleFileSelect(e) {
        const files = Array.from(e.target.files);
        
        for (let file of files) {
            await this.addAttachment(file);
        }
        
        // Clear input for next selection
        e.target.value = '';
    }
    
    async addAttachment(file) {
        // Validate file size
        if (file.size > this.maxAttachmentSize) {
            this.showError(`File "${file.name}" is too large. Maximum size is ${this.formatFileSize(this.maxAttachmentSize)}.`);
            return;
        }
        
        // Validate file type
        const isAllowed = this.allowedFileTypes.some(type => {
            if (type.includes('*')) {
                return file.type.startsWith(type.replace('*', ''));
            }
            return file.type === type || file.name.toLowerCase().endsWith(type);
        });
        
        if (!isAllowed) {
            this.showError(`File type "${file.type}" is not allowed.`);
            return;
        }
        
        try {
            // Start upload progress
            this.setState({
                uploadProgress: {
                    ...this.state.uploadProgress,
                    [file.name]: 0
                }
            });
            this.render();
            
            // Upload file
            const uploadResult = await this.uploadFile(file);
            
            // Add to attachments
            const attachment = {
                id: uploadResult.id,
                name: file.name,
                size: file.size,
                type: file.type,
                url: uploadResult.url,
                file: file
            };
            
            this.setState({
                attachments: [...this.state.attachments, attachment],
                uploadProgress: { ...this.state.uploadProgress }
            });
            
            // Remove from upload progress
            delete this.state.uploadProgress[file.name];
            
            this.render();
        } catch (error) {
            this.showError(`Failed to upload "${file.name}": ${error.message}`);
            
            // Remove from upload progress
            const uploadProgress = { ...this.state.uploadProgress };
            delete uploadProgress[file.name];
            this.setState({ uploadProgress });
            this.render();
        }
    }
    
    async uploadFile(file) {
        return new Promise((resolve, reject) => {
            const formData = new FormData();
            formData.append('file', file);
            formData.append('itemId', this.itemId);
            
            const xhr = new XMLHttpRequest();
            
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) {
                    const progress = Math.round((e.loaded / e.total) * 100);
                    this.setState({
                        uploadProgress: {
                            ...this.state.uploadProgress,
                            [file.name]: progress
                        }
                    });
                    this.updateUploadProgress(file.name, progress);
                }
            });
            
            xhr.addEventListener('load', () => {
                if (xhr.status === 200) {
                    try {
                        const response = JSON.parse(xhr.responseText);
                        if (response.success) {
                            resolve(response.data);
                        } else {
                            reject(new Error(response.error?.message || 'Upload failed'));
                        }
                    } catch (error) {
                        reject(new Error('Invalid response from server'));
                    }
                } else {
                    reject(new Error(`Upload failed with status ${xhr.status}`));
                }
            });
            
            xhr.addEventListener('error', () => {
                reject(new Error('Network error during upload'));
            });
            
            xhr.open('POST', '/api/attachments/upload');
            xhr.send(formData);
        });
    }
    
    updateUploadProgress(fileName, progress) {
        const progressEl = this.container.querySelector(`[data-filename="${fileName}"] .upload-progress-fill`);
        const percentageEl = this.container.querySelector(`[data-filename="${fileName}"] .upload-percentage`);
        
        if (progressEl) {
            progressEl.style.width = progress + '%';
        }
        if (percentageEl) {
            percentageEl.textContent = progress + '%';
        }
    }
    
    removeAttachment(index) {
        const attachments = [...this.state.attachments];
        attachments.splice(index, 1);
        this.setState({ attachments });
        this.render();
    }
    
    handleDragOver(e) {
        if (!this.allowAttachments) return;
        
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
        
        if (!this.state.isDragOver) {
            this.setState({ isDragOver: true });
            this.container.classList.add('comment-composer--drag-over');
        }
    }
    
    handleDragLeave(e) {
        if (!this.allowAttachments) return;
        
        // Only hide overlay if leaving the composer entirely
        if (!this.container.contains(e.relatedTarget)) {
            this.setState({ isDragOver: false });
            this.container.classList.remove('comment-composer--drag-over');
        }
    }
    
    async handleDrop(e) {
        if (!this.allowAttachments) return;
        
        e.preventDefault();
        this.setState({ isDragOver: false });
        this.container.classList.remove('comment-composer--drag-over');
        
        const files = Array.from(e.dataTransfer.files);
        for (let file of files) {
            await this.addAttachment(file);
        }
    }
    
    async submitComment() {
        const content = this.state.content.trim();
        
        if (!content) {
            this.showError('Comment cannot be empty');
            return;
        }
        
        this.setState({ isSubmitting: true, errors: {} });
        this.render();
        
        try {
            const response = await commentService.createComment({
                itemId: this.itemId,
                content,
                attachments: this.state.attachments.map(att => ({ id: att.id }))
            });
            
            if (response.success) {
                // Clear form
                this.setState({
                    content: '',
                    attachments: [],
                    isSubmitting: false
                });
                this.render();
                
                // Emit event
                eventBus.emit('comment:created', response.data);
                
                // Focus textarea for next comment
                setTimeout(() => {
                    if (this.textareaRef) {
                        this.textareaRef.focus();
                    }
                }, 100);
            } else {
                throw new Error(response.error?.message || 'Failed to create comment');
            }
        } catch (error) {
            this.setState({
                isSubmitting: false,
                errors: { submit: error.message }
            });
            this.render();
        }
    }
    
    adjustTextareaHeight() {
        if (!this.textareaRef) return;
        
        this.textareaRef.style.height = 'auto';
        const newHeight = Math.min(this.textareaRef.scrollHeight, 200); // Max 200px
        this.textareaRef.style.height = newHeight + 'px';
    }
    
    updateSubmitButton() {
        const submitBtn = this.container.querySelector('.composer-submit-btn');
        if (submitBtn) {
            const hasContent = this.state.content.trim().length > 0;
            submitBtn.disabled = !hasContent || this.state.isSubmitting;
        }
    }
    
    getCurrentUserAvatar() {
        const user = this.currentUser;
        if (!user) return '<div class="composer-avatar-placeholder"></div>';
        
        return user.avatar ?
            `<img src="${user.avatar}" alt="${user.name}" class="composer-avatar-image" />` :
            `<div class="composer-avatar-initials">${this.getInitials(user.name)}</div>`;
    }
    
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    getInitials(name) {
        return name.split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    }
    
    showError(message) {
        this.setState({
            errors: { ...this.state.errors, submit: message }
        });
        this.render();
        
        // Clear error after 5 seconds
        setTimeout(() => {
            this.setState({
                errors: { ...this.state.errors, submit: null }
            });
            this.render();
        }, 5000);
    }
    
    // Public methods
    focus() {
        if (this.textareaRef) {
            this.textareaRef.focus();
        }
    }
    
    clear() {
        this.setState({
            content: '',
            attachments: [],
            errors: {}
        });
        this.render();
    }
    
    setContent(content) {
        this.setState({ content });
        this.render();
    }
    
    destroy() {
        // Clean up any object URLs
        this.state.attachments.forEach(attachment => {
            if (attachment.file && attachment.url?.startsWith('blob:')) {
                URL.revokeObjectURL(attachment.url);
            }
        });
        
        super.destroy();
    }
} 