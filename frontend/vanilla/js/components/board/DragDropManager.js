/**
 * Drag and Drop Manager for Board Items
 * Handles item reordering and movement between columns
 */

import { eventBus } from '../../utils/events.js';

export class DragDropManager {
    constructor(boardView, options = {}) {
        this.boardView = boardView;
        this.options = {
            dragDelay: 150,
            scrollSpeed: 10,
            scrollThreshold: 50,
            ...options
        };
        
        this.state = {
            isDragging: false,
            draggedItem: null,
            draggedElement: null,
            dropZones: [],
            currentDropZone: null,
            dragStartPos: null,
            dragOffset: { x: 0, y: 0 },
            scrollTimer: null,
            dragPreview: null
        };
        
        this.init();
    }
    
    init() {
        this.bindEvents();
        this.createDropIndicator();
    }
    
    bindEvents() {
        // Use delegation for dynamic content
        this.boardView.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.boardView.container.addEventListener('dragstart', this.handleDragStart.bind(this));
        this.boardView.container.addEventListener('dragend', this.handleDragEnd.bind(this));
        this.boardView.container.addEventListener('dragover', this.handleDragOver.bind(this));
        this.boardView.container.addEventListener('drop', this.handleDrop.bind(this));
        this.boardView.container.addEventListener('dragenter', this.handleDragEnter.bind(this));
        this.boardView.container.addEventListener('dragleave', this.handleDragLeave.bind(this));
        
        document.addEventListener('mousemove', this.handleMouseMove.bind(this));
        document.addEventListener('mouseup', this.handleMouseUp.bind(this));
    }
    
    createDropIndicator() {
        this.dropIndicator = document.createElement('div');
        this.dropIndicator.className = 'drop-indicator';
        this.dropIndicator.innerHTML = `
            <div class="drop-indicator-line"></div>
            <div class="drop-indicator-text">Drop here</div>
        `;
        this.dropIndicator.style.display = 'none';
        document.body.appendChild(this.dropIndicator);
    }
    
    handleMouseDown(e) {
        const itemElement = e.target.closest('[data-item-id]');
        if (!itemElement || !this.isDraggableItem(itemElement)) return;
        
        // Prevent default text selection
        e.preventDefault();
        
        const rect = itemElement.getBoundingClientRect();
        this.state.dragStartPos = { x: e.clientX, y: e.clientY };
        this.state.dragOffset = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
        
        // Set a delay before enabling drag
        this.state.dragTimer = setTimeout(() => {
            this.enableDrag(itemElement);
        }, this.options.dragDelay);
    }
    
    handleMouseMove(e) {
        if (!this.state.dragStartPos) return;
        
        const distance = Math.sqrt(
            Math.pow(e.clientX - this.state.dragStartPos.x, 2) +
            Math.pow(e.clientY - this.state.dragStartPos.y, 2)
        );
        
        // If mouse moved significantly, cancel drag delay
        if (distance > 5 && this.state.dragTimer) {
            clearTimeout(this.state.dragTimer);
            this.state.dragTimer = null;
        }
    }
    
    handleMouseUp(e) {
        if (this.state.dragTimer) {
            clearTimeout(this.state.dragTimer);
            this.state.dragTimer = null;
        }
        this.state.dragStartPos = null;
    }
    
    enableDrag(itemElement) {
        if (!itemElement) return;
        
        itemElement.setAttribute('draggable', 'true');
        itemElement.classList.add('draggable-enabled');
        
        // Visual feedback
        itemElement.style.cursor = 'grab';
    }
    
    isDraggableItem(element) {
        return element.hasAttribute('data-item-id') && 
               this.boardView.canManageBoard() &&
               !element.closest('.cell-editor');
    }
    
    handleDragStart(e) {
        const itemElement = e.target.closest('[data-item-id]');
        if (!itemElement || !this.isDraggableItem(itemElement)) {
            e.preventDefault();
            return;
        }
        
        this.state.isDragging = true;
        this.state.draggedElement = itemElement;
        this.state.draggedItem = this.getItemData(itemElement);
        
        // Create drag preview
        this.createDragPreview(itemElement);
        
        // Set drag effect
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/html', itemElement.outerHTML);
        e.dataTransfer.setData('application/json', JSON.stringify(this.state.draggedItem));
        
        // Custom drag image
        if (this.state.dragPreview) {
            e.dataTransfer.setDragImage(this.state.dragPreview, this.state.dragOffset.x, this.state.dragOffset.y);
        }
        
        // Add dragging class
        itemElement.classList.add('dragging');
        
        // Find all drop zones
        this.updateDropZones();
        
        // Show drop zones
        this.showDropZones();
        
        // Auto-scroll setup
        this.setupAutoScroll();
        
        eventBus.emit('drag:start', { item: this.state.draggedItem, element: itemElement });
    }
    
    createDragPreview(itemElement) {
        const preview = itemElement.cloneNode(true);
        preview.style.position = 'absolute';
        preview.style.top = '-1000px';
        preview.style.left = '-1000px';
        preview.style.width = itemElement.offsetWidth + 'px';
        preview.style.height = itemElement.offsetHeight + 'px';
        preview.style.opacity = '0.8';
        preview.style.transform = 'rotate(3deg)';
        preview.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.3)';
        preview.style.borderRadius = '8px';
        preview.style.zIndex = '1000';
        preview.classList.add('drag-preview');
        
        document.body.appendChild(preview);
        this.state.dragPreview = preview;
    }
    
    getItemData(itemElement) {
        const itemId = itemElement.dataset.itemId;
        return this.boardView.state.items.find(item => item.id === itemId);
    }
    
    updateDropZones() {
        this.state.dropZones = [];
        
        // Add table rows for reordering
        const tableRows = this.boardView.container.querySelectorAll('.board-table-row[data-item-id]');
        tableRows.forEach(row => {
            if (row !== this.state.draggedElement) {
                this.state.dropZones.push({
                    element: row,
                    type: 'reorder',
                    position: 'before',
                    targetItemId: row.dataset.itemId
                });
                
                this.state.dropZones.push({
                    element: row,
                    type: 'reorder',
                    position: 'after',
                    targetItemId: row.dataset.itemId
                });
            }
        });
        
        // Add kanban columns for status change
        const kanbanColumns = this.boardView.container.querySelectorAll('.kanban-column-content[data-column-id]');
        kanbanColumns.forEach(column => {
            this.state.dropZones.push({
                element: column,
                type: 'status-change',
                columnId: column.dataset.columnId
            });
        });
        
        // Add empty areas
        const tableContainer = this.boardView.container.querySelector('.board-table tbody');
        if (tableContainer) {
            this.state.dropZones.push({
                element: tableContainer,
                type: 'append',
                position: 'end'
            });
        }
    }
    
    showDropZones() {
        this.state.dropZones.forEach(zone => {
            zone.element.classList.add('drop-zone-active');
        });
    }
    
    hideDropZones() {
        this.state.dropZones.forEach(zone => {
            zone.element.classList.remove('drop-zone-active', 'drop-zone-hover');
        });
    }
    
    setupAutoScroll() {
        this.state.scrollTimer = setInterval(() => {
            if (!this.state.isDragging) return;
            
            const container = this.getScrollContainer();
            if (!container) return;
            
            const rect = container.getBoundingClientRect();
            const mouseY = this.state.lastMouseY || 0;
            
            if (mouseY < rect.top + this.options.scrollThreshold) {
                container.scrollTop -= this.options.scrollSpeed;
            } else if (mouseY > rect.bottom - this.options.scrollThreshold) {
                container.scrollTop += this.options.scrollSpeed;
            }
        }, 16); // ~60fps
    }
    
    getScrollContainer() {
        return this.boardView.container.querySelector('.board-content') || window;
    }
    
    handleDragOver(e) {
        if (!this.state.isDragging) return;
        
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        
        this.state.lastMouseY = e.clientY;
        
        const dropZone = this.getDropZoneFromPoint(e.clientX, e.clientY);
        
        if (dropZone !== this.state.currentDropZone) {
            this.updateDropIndicator(dropZone, e);
            this.state.currentDropZone = dropZone;
        }
    }
    
    getDropZoneFromPoint(x, y) {
        const element = document.elementFromPoint(x, y);
        if (!element) return null;
        
        // Find the closest drop zone
        for (const zone of this.state.dropZones) {
            if (zone.element.contains(element) || zone.element === element) {
                return zone;
            }
        }
        
        return null;
    }
    
    updateDropIndicator(dropZone, event) {
        if (!dropZone) {
            this.hideDropIndicator();
            return;
        }
        
        const rect = dropZone.element.getBoundingClientRect();
        
        if (dropZone.type === 'reorder') {
            // Show line indicator for reordering
            this.showReorderIndicator(dropZone, rect, event);
        } else if (dropZone.type === 'status-change') {
            // Highlight column for status change
            this.showColumnHighlight(dropZone);
        } else if (dropZone.type === 'append') {
            // Show indicator at the end
            this.showAppendIndicator(dropZone, rect);
        }
    }
    
    showReorderIndicator(dropZone, rect, event) {
        const isAfter = dropZone.position === 'after';
        const y = isAfter ? rect.bottom : rect.top;
        
        this.dropIndicator.style.display = 'block';
        this.dropIndicator.style.left = rect.left + 'px';
        this.dropIndicator.style.top = (y - 2) + 'px';
        this.dropIndicator.style.width = rect.width + 'px';
        this.dropIndicator.style.height = '4px';
        
        this.dropIndicator.className = 'drop-indicator drop-indicator--line';
    }
    
    showColumnHighlight(dropZone) {
        this.hideDropIndicator();
        
        // Remove previous highlights
        this.boardView.container.querySelectorAll('.drop-zone-hover').forEach(el => {
            el.classList.remove('drop-zone-hover');
        });
        
        // Add highlight to current column
        dropZone.element.classList.add('drop-zone-hover');
    }
    
    showAppendIndicator(dropZone, rect) {
        this.dropIndicator.style.display = 'block';
        this.dropIndicator.style.left = rect.left + 'px';
        this.dropIndicator.style.top = rect.bottom + 'px';
        this.dropIndicator.style.width = rect.width + 'px';
        this.dropIndicator.style.height = '40px';
        
        this.dropIndicator.className = 'drop-indicator drop-indicator--append';
        this.dropIndicator.innerHTML = `
            <div class="drop-indicator-content">
                <svg class="drop-indicator-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="10"></circle>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                </svg>
                <span class="drop-indicator-text">Drop to add at end</span>
            </div>
        `;
    }
    
    hideDropIndicator() {
        this.dropIndicator.style.display = 'none';
        
        // Remove column highlights
        this.boardView.container.querySelectorAll('.drop-zone-hover').forEach(el => {
            el.classList.remove('drop-zone-hover');
        });
    }
    
    handleDragEnter(e) {
        if (!this.state.isDragging) return;
        e.preventDefault();
    }
    
    handleDragLeave(e) {
        if (!this.state.isDragging) return;
        
        // Only hide if leaving the board container entirely
        if (!this.boardView.container.contains(e.relatedTarget)) {
            this.hideDropIndicator();
            this.state.currentDropZone = null;
        }
    }
    
    async handleDrop(e) {
        if (!this.state.isDragging) return;
        
        e.preventDefault();
        
        const dropZone = this.state.currentDropZone;
        if (!dropZone) {
            this.cancelDrag();
            return;
        }
        
        try {
            await this.performDrop(dropZone);
            this.completeDrag();
        } catch (error) {
            console.error('Drop operation failed:', error);
            this.cancelDrag();
            
            // Show error message
            eventBus.emit('notification:show', {
                type: 'error',
                message: 'Failed to move item: ' + error.message
            });
        }
    }
    
    async performDrop(dropZone) {
        const draggedItem = this.state.draggedItem;
        
        switch (dropZone.type) {
            case 'reorder':
                await this.handleReorder(draggedItem, dropZone);
                break;
            case 'status-change':
                await this.handleStatusChange(draggedItem, dropZone);
                break;
            case 'append':
                await this.handleAppend(draggedItem);
                break;
            default:
                throw new Error('Unknown drop zone type: ' + dropZone.type);
        }
    }
    
    async handleReorder(draggedItem, dropZone) {
        const targetItem = this.boardView.state.items.find(item => item.id === dropZone.targetItemId);
        if (!targetItem) throw new Error('Target item not found');
        
        const newPosition = dropZone.position === 'before' ? 
            targetItem.position - 0.5 : 
            targetItem.position + 0.5;
        
        // Call API to update position
        const response = await this.boardView.boardService.makeRequest(`/items/${draggedItem.id}/position`, {
            method: 'PUT',
            body: JSON.stringify({ position: newPosition }),
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.success) {
            throw new Error(response.error?.message || 'Failed to update position');
        }
        
        // Update local state
        draggedItem.position = newPosition;
        
        eventBus.emit('item:moved', { item: draggedItem, type: 'reorder' });
    }
    
    async handleStatusChange(draggedItem, dropZone) {
        const column = this.boardView.state.columns.find(col => col.id === dropZone.columnId);
        if (!column || column.type !== 'status') {
            throw new Error('Invalid status column');
        }
        
        // Find the status field value
        const statusField = draggedItem.fieldValues?.find(fv => fv.columnId === column.id);
        const newStatus = column.id; // Assuming column ID represents the status value
        
        // Call API to update status
        const response = await this.boardView.boardService.makeRequest(`/items/${draggedItem.id}/fields/${column.id}`, {
            method: 'PUT',
            body: JSON.stringify({ value: newStatus }),
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.success) {
            throw new Error(response.error?.message || 'Failed to update status');
        }
        
        // Update local state
        if (statusField) {
            statusField.value = newStatus;
        } else {
            if (!draggedItem.fieldValues) draggedItem.fieldValues = [];
            draggedItem.fieldValues.push({
                id: `field-${draggedItem.id}-${column.id}`,
                itemId: draggedItem.id,
                columnId: column.id,
                value: newStatus
            });
        }
        
        eventBus.emit('item:moved', { item: draggedItem, type: 'status-change', column });
    }
    
    async handleAppend(draggedItem) {
        // Move to end of list
        const maxPosition = Math.max(...this.boardView.state.items.map(item => item.position || 0));
        const newPosition = maxPosition + 1;
        
        // Call API to update position
        const response = await this.boardView.boardService.makeRequest(`/items/${draggedItem.id}/position`, {
            method: 'PUT',
            body: JSON.stringify({ position: newPosition }),
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (!response.success) {
            throw new Error(response.error?.message || 'Failed to update position');
        }
        
        // Update local state
        draggedItem.position = newPosition;
        
        eventBus.emit('item:moved', { item: draggedItem, type: 'append' });
    }
    
    handleDragEnd(e) {
        if (!this.state.isDragging) return;
        
        this.completeDrag();
    }
    
    completeDrag() {
        this.cleanup();
        
        eventBus.emit('drag:end', { 
            item: this.state.draggedItem, 
            success: true 
        });
        
        // Refresh the board view
        this.boardView.loadItems();
    }
    
    cancelDrag() {
        this.cleanup();
        
        eventBus.emit('drag:end', { 
            item: this.state.draggedItem, 
            success: false 
        });
    }
    
    cleanup() {
        // Clear drag state
        this.state.isDragging = false;
        this.state.draggedItem = null;
        this.state.currentDropZone = null;
        
        // Remove drag preview
        if (this.state.dragPreview) {
            document.body.removeChild(this.state.dragPreview);
            this.state.dragPreview = null;
        }
        
        // Clear dragging class
        if (this.state.draggedElement) {
            this.state.draggedElement.classList.remove('dragging', 'draggable-enabled');
            this.state.draggedElement.removeAttribute('draggable');
            this.state.draggedElement.style.cursor = '';
            this.state.draggedElement = null;
        }
        
        // Hide drop zones and indicators
        this.hideDropZones();
        this.hideDropIndicator();
        
        // Clear auto-scroll
        if (this.state.scrollTimer) {
            clearInterval(this.state.scrollTimer);
            this.state.scrollTimer = null;
        }
        
        // Clear any pending timers
        if (this.state.dragTimer) {
            clearTimeout(this.state.dragTimer);
            this.state.dragTimer = null;
        }
    }
    
    destroy() {
        this.cleanup();
        
        // Remove drop indicator
        if (this.dropIndicator && this.dropIndicator.parentNode) {
            this.dropIndicator.parentNode.removeChild(this.dropIndicator);
        }
        
        // Remove event listeners would happen in parent component
    }
}

// Touch support for mobile devices
export class TouchDragDropManager extends DragDropManager {
    constructor(boardView, options = {}) {
        super(boardView, {
            ...options,
            dragDelay: 500 // Longer delay for touch
        });
        
        this.touchState = {
            startTouch: null,
            currentTouch: null,
            touchStartTime: 0
        };
    }
    
    bindEvents() {
        super.bindEvents();
        
        // Touch events
        this.boardView.container.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
        this.boardView.container.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
        this.boardView.container.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
    
    handleTouchStart(e) {
        const itemElement = e.target.closest('[data-item-id]');
        if (!itemElement || !this.isDraggableItem(itemElement)) return;
        
        const touch = e.touches[0];
        this.touchState.startTouch = { x: touch.clientX, y: touch.clientY };
        this.touchState.touchStartTime = Date.now();
        
        // Prevent scrolling during potential drag
        e.preventDefault();
        
        // Start drag delay timer
        this.state.dragTimer = setTimeout(() => {
            this.startTouchDrag(itemElement, touch);
        }, this.options.dragDelay);
    }
    
    handleTouchMove(e) {
        if (!this.touchState.startTouch) return;
        
        const touch = e.touches[0];
        this.touchState.currentTouch = { x: touch.clientX, y: touch.clientY };
        
        if (this.state.isDragging) {
            e.preventDefault();
            this.updateTouchDrag(touch);
        } else {
            // Check if touch moved too much, cancel drag
            const distance = Math.sqrt(
                Math.pow(touch.clientX - this.touchState.startTouch.x, 2) +
                Math.pow(touch.clientY - this.touchState.startTouch.y, 2)
            );
            
            if (distance > 10 && this.state.dragTimer) {
                clearTimeout(this.state.dragTimer);
                this.state.dragTimer = null;
            }
        }
    }
    
    handleTouchEnd(e) {
        if (this.state.dragTimer) {
            clearTimeout(this.state.dragTimer);
            this.state.dragTimer = null;
        }
        
        if (this.state.isDragging) {
            this.endTouchDrag(e);
        }
        
        this.touchState.startTouch = null;
        this.touchState.currentTouch = null;
    }
    
    startTouchDrag(itemElement, touch) {
        this.state.isDragging = true;
        this.state.draggedElement = itemElement;
        this.state.draggedItem = this.getItemData(itemElement);
        
        // Add visual feedback
        itemElement.classList.add('touch-dragging');
        
        // Create floating element for touch feedback
        this.createTouchPreview(itemElement, touch);
        
        // Setup drop zones
        this.updateDropZones();
        this.showDropZones();
        
        eventBus.emit('drag:start', { item: this.state.draggedItem, element: itemElement });
    }
    
    createTouchPreview(itemElement, touch) {
        const preview = itemElement.cloneNode(true);
        preview.style.position = 'fixed';
        preview.style.left = (touch.clientX - this.state.dragOffset.x) + 'px';
        preview.style.top = (touch.clientY - this.state.dragOffset.y) + 'px';
        preview.style.width = itemElement.offsetWidth + 'px';
        preview.style.opacity = '0.8';
        preview.style.transform = 'scale(1.05) rotate(3deg)';
        preview.style.boxShadow = '0 8px 32px rgba(0, 0, 0, 0.4)';
        preview.style.borderRadius = '8px';
        preview.style.zIndex = '1000';
        preview.style.pointerEvents = 'none';
        preview.classList.add('touch-drag-preview');
        
        document.body.appendChild(preview);
        this.state.dragPreview = preview;
    }
    
    updateTouchDrag(touch) {
        if (!this.state.dragPreview) return;
        
        // Update preview position
        this.state.dragPreview.style.left = (touch.clientX - this.state.dragOffset.x) + 'px';
        this.state.dragPreview.style.top = (touch.clientY - this.state.dragOffset.y) + 'px';
        
        // Find drop zone
        const dropZone = this.getDropZoneFromPoint(touch.clientX, touch.clientY);
        if (dropZone !== this.state.currentDropZone) {
            this.updateDropIndicator(dropZone, { clientX: touch.clientX, clientY: touch.clientY });
            this.state.currentDropZone = dropZone;
        }
    }
    
    async endTouchDrag(e) {
        const dropZone = this.state.currentDropZone;
        
        if (dropZone) {
            try {
                await this.performDrop(dropZone);
                this.completeTouchDrag();
            } catch (error) {
                console.error('Touch drop failed:', error);
                this.cancelTouchDrag();
            }
        } else {
            this.cancelTouchDrag();
        }
    }
    
    completeTouchDrag() {
        this.state.draggedElement?.classList.remove('touch-dragging');
        this.cleanup();
        
        eventBus.emit('drag:end', { 
            item: this.state.draggedItem, 
            success: true 
        });
        
        this.boardView.loadItems();
    }
    
    cancelTouchDrag() {
        this.state.draggedElement?.classList.remove('touch-dragging');
        this.cleanup();
        
        eventBus.emit('drag:end', { 
            item: this.state.draggedItem, 
            success: false 
        });
    }
} 