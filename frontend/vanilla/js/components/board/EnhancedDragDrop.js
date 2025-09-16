/**
 * Enhanced Drag & Drop System for Monday.com-style Board
 * Supports row reordering, column reordering, and Kanban card movement
 */

export class EnhancedDragDrop {
    constructor(board) {
        this.board = board;
        this.draggedElement = null;
        this.draggedData = null;
        this.dropZone = null;
        this.dragPreview = null;
        this.scrollSpeed = 0;
        this.scrollDirection = 0;
        
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.createDragPreview();
    }

    setupEventListeners() {
        document.addEventListener('dragstart', this.handleDragStart.bind(this));
        document.addEventListener('dragend', this.handleDragEnd.bind(this));
        document.addEventListener('dragover', this.handleDragOver.bind(this));
        document.addEventListener('drop', this.handleDrop.bind(this));
        document.addEventListener('dragenter', this.handleDragEnter.bind(this));
        document.addEventListener('dragleave', this.handleDragLeave.bind(this));
    }

    createDragPreview() {
        this.dragPreview = document.createElement('div');
        this.dragPreview.className = 'drag-preview';
        this.dragPreview.style.cssText = `
            position: fixed;
            z-index: 1000;
            pointer-events: none;
            background: white;
            border: 2px solid #0073ea;
            border-radius: 6px;
            padding: 8px 12px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            transform: rotate(-2deg);
            font-size: 14px;
            color: #323338;
            display: none;
            max-width: 300px;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        `;
        document.body.appendChild(this.dragPreview);
    }

    makeDraggable(element, type, data) {
        element.draggable = true;
        element.dataset.dragType = type;
        element.dataset.dragData = JSON.stringify(data);
        
        // Add visual indicators
        element.style.cursor = 'grab';
        
        element.addEventListener('mouseenter', () => {
            if (!this.draggedElement) {
                element.style.transform = 'scale(1.02)';
                element.style.transition = 'transform 0.2s ease';
            }
        });
        
        element.addEventListener('mouseleave', () => {
            if (!this.draggedElement) {
                element.style.transform = 'scale(1)';
            }
        });
    }

    handleDragStart(e) {
        this.draggedElement = e.target.closest('[draggable="true"]');
        if (!this.draggedElement) return;

        const dragType = this.draggedElement.dataset.dragType;
        const dragData = JSON.parse(this.draggedElement.dataset.dragData || '{}');
        
        this.draggedData = { type: dragType, data: dragData, element: this.draggedElement };
        
        // Set drag effect
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData('text/plain', ''); // For Firefox compatibility
        
        // Style the dragged element
        this.draggedElement.style.opacity = '0.5';
        this.draggedElement.style.cursor = 'grabbing';
        
        // Show drag preview
        this.showDragPreview(e, dragType, dragData);
        
        // Add drag class to body
        document.body.classList.add('dragging');
        
        // Start auto-scroll if needed
        this.startAutoScroll(e);
        
        console.log('Drag started:', dragType, dragData);
    }

    handleDragEnd(e) {
        if (!this.draggedElement) return;
        
        // Reset styles
        this.draggedElement.style.opacity = '';
        this.draggedElement.style.cursor = 'grab';
        this.draggedElement.style.transform = '';
        
        // Hide drag preview
        this.hideDragPreview();
        
        // Remove drag class from body
        document.body.classList.remove('dragging');
        
        // Stop auto-scroll
        this.stopAutoScroll();
        
        // Clear drag data
        this.draggedElement = null;
        this.draggedData = null;
        this.dropZone = null;
        
        console.log('Drag ended');
    }

    handleDragOver(e) {
        e.preventDefault();
        
        if (!this.draggedData) return;
        
        // Update drag preview position
        this.updateDragPreview(e);
        
        // Handle auto-scroll
        this.handleAutoScroll(e);
        
        // Find drop zone
        const dropZone = this.findDropZone(e.target, this.draggedData.type);
        if (dropZone !== this.dropZone) {
            this.updateDropZone(dropZone);
        }
        
        // Show drop indicator
        this.showDropIndicator(e, dropZone);
    }

    handleDragEnter(e) {
        e.preventDefault();
    }

    handleDragLeave(e) {
        // Remove drop indicators when leaving drop zones
        const dropIndicators = document.querySelectorAll('.drop-indicator');
        dropIndicators.forEach(indicator => {
            if (!e.relatedTarget || !indicator.contains(e.relatedTarget)) {
                indicator.remove();
            }
        });
    }

    handleDrop(e) {
        e.preventDefault();
        
        if (!this.draggedData || !this.dropZone) return;
        
        const dropType = this.dropZone.dataset.dropType;
        const dropData = JSON.parse(this.dropZone.dataset.dropData || '{}');
        
        console.log('Drop:', this.draggedData, 'onto', dropType, dropData);
        
        // Handle different drop scenarios
        this.handleDropAction(this.draggedData, { type: dropType, data: dropData, element: this.dropZone });
        
        // Clean up drop indicators
        document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    }

    handleDropAction(dragData, dropData) {
        const { type: dragType, data: dragItem } = dragData;
        const { type: dropType, data: dropItem } = dropData;
        
        switch (dragType) {
            case 'table-row':
                this.handleRowDrop(dragItem, dropItem, dropType);
                break;
            case 'kanban-card':
                this.handleCardDrop(dragItem, dropItem, dropType);
                break;
            case 'column-header':
                this.handleColumnDrop(dragItem, dropItem, dropType);
                break;
        }
    }

    handleRowDrop(dragItem, dropItem, dropType) {
        if (dropType === 'table-row' || dropType === 'table-body') {
            // Reorder rows
            const dragIndex = this.board.items.findIndex(item => item.id === dragItem.id);
            const dropIndex = dropType === 'table-row' 
                ? this.board.items.findIndex(item => item.id === dropItem.id)
                : this.board.items.length;
                
            if (dragIndex !== -1 && dragIndex !== dropIndex) {
                // Move item in array
                const [movedItem] = this.board.items.splice(dragIndex, 1);
                this.board.items.splice(dropIndex, 0, movedItem);
                
                // Re-render table
                this.board.render();
                
                // Notify of change
                this.board.onItemMoved?.(movedItem, dragIndex, dropIndex);
            }
        }
    }

    handleCardDrop(dragItem, dropItem, dropType) {
        if (dropType === 'kanban-column') {
            // Move card to different status
            const newStatus = dropItem.status;
            const oldStatus = dragItem.status;
            
            if (newStatus !== oldStatus) {
                // Update item status
                const item = this.board.items.find(i => i.id === dragItem.id);
                if (item) {
                    item.status = newStatus;
                    
                    // Re-render kanban view
                    this.board.render();
                    
                    // Notify of change
                    this.board.onStatusChanged?.(item, oldStatus, newStatus);
                }
            }
        }
    }

    handleColumnDrop(dragItem, dropItem, dropType) {
        if (dropType === 'column-header') {
            // Reorder columns
            const dragIndex = this.board.columns.findIndex(col => col.id === dragItem.id);
            const dropIndex = this.board.columns.findIndex(col => col.id === dropItem.id);
            
            if (dragIndex !== -1 && dropIndex !== -1 && dragIndex !== dropIndex) {
                // Move column in array
                const [movedColumn] = this.board.columns.splice(dragIndex, 1);
                this.board.columns.splice(dropIndex, 0, movedColumn);
                
                // Re-render board
                this.board.render();
                
                // Notify of change
                this.board.onColumnMoved?.(movedColumn, dragIndex, dropIndex);
            }
        }
    }

    findDropZone(element, dragType) {
        // Look for valid drop zones based on drag type
        const dropSelectors = {
            'table-row': '[data-drop-type="table-row"], [data-drop-type="table-body"]',
            'kanban-card': '[data-drop-type="kanban-column"]',
            'column-header': '[data-drop-type="column-header"]'
        };
        
        const selector = dropSelectors[dragType];
        if (!selector) return null;
        
        return element.closest(selector);
    }

    updateDropZone(newDropZone) {
        // Remove old drop zone styling
        if (this.dropZone) {
            this.dropZone.classList.remove('drag-over');
        }
        
        // Add new drop zone styling
        this.dropZone = newDropZone;
        if (this.dropZone) {
            this.dropZone.classList.add('drag-over');
        }
    }

    showDropIndicator(e, dropZone) {
        if (!dropZone) return;
        
        // Remove existing indicators
        document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
        
        // Create new indicator
        const indicator = document.createElement('div');
        indicator.className = 'drop-indicator';
        indicator.style.cssText = `
            position: absolute;
            background: #0073ea;
            border-radius: 2px;
            z-index: 999;
            pointer-events: none;
        `;
        
        const rect = dropZone.getBoundingClientRect();
        const mouseY = e.clientY - rect.top;
        const isTop = mouseY < rect.height / 2;
        
        if (dropZone.dataset.dropType === 'table-row') {
            // Horizontal line indicator for table rows
            indicator.style.width = '100%';
            indicator.style.height = '2px';
            indicator.style.left = '0';
            indicator.style.top = isTop ? '-1px' : '100%';
        } else if (dropZone.dataset.dropType === 'kanban-column') {
            // Vertical line or box indicator for kanban columns
            indicator.style.width = '100%';
            indicator.style.height = '2px';
            indicator.style.left = '0';
            indicator.style.bottom = '0';
        }
        
        dropZone.style.position = 'relative';
        dropZone.appendChild(indicator);
    }

    showDragPreview(e, dragType, dragData) {
        let previewText = '';
        
        switch (dragType) {
            case 'table-row':
                previewText = `📝 ${dragData.item || 'Table Row'}`;
                break;
            case 'kanban-card':
                previewText = `🃏 ${dragData.item || 'Kanban Card'}`;
                break;
            case 'column-header':
                previewText = `📊 ${dragData.name || 'Column'}`;
                break;
            default:
                previewText = '📦 Item';
        }
        
        this.dragPreview.textContent = previewText;
        this.dragPreview.style.display = 'block';
        this.updateDragPreview(e);
    }

    updateDragPreview(e) {
        if (!this.dragPreview || this.dragPreview.style.display === 'none') return;
        
        this.dragPreview.style.left = (e.clientX + 10) + 'px';
        this.dragPreview.style.top = (e.clientY - 10) + 'px';
    }

    hideDragPreview() {
        this.dragPreview.style.display = 'none';
    }

    startAutoScroll(e) {
        this.handleAutoScroll(e);
    }

    handleAutoScroll(e) {
        const scrollZone = 50; // pixels from edge to start scrolling
        const maxScrollSpeed = 10;
        
        const viewport = {
            top: 0,
            left: 0,
            bottom: window.innerHeight,
            right: window.innerWidth
        };
        
        let scrollX = 0, scrollY = 0;
        
        // Vertical scrolling
        if (e.clientY < scrollZone) {
            scrollY = -maxScrollSpeed * ((scrollZone - e.clientY) / scrollZone);
        } else if (e.clientY > viewport.bottom - scrollZone) {
            scrollY = maxScrollSpeed * ((e.clientY - (viewport.bottom - scrollZone)) / scrollZone);
        }
        
        // Horizontal scrolling
        if (e.clientX < scrollZone) {
            scrollX = -maxScrollSpeed * ((scrollZone - e.clientX) / scrollZone);
        } else if (e.clientX > viewport.right - scrollZone) {
            scrollX = maxScrollSpeed * ((e.clientX - (viewport.right - scrollZone)) / scrollZone);
        }
        
        if (scrollX !== 0 || scrollY !== 0) {
            window.scrollBy(scrollX, scrollY);
        }
    }

    stopAutoScroll() {
        this.scrollSpeed = 0;
        this.scrollDirection = 0;
    }

    // Public methods for board integration
    enableTableRowDrag(row, item) {
        this.makeDraggable(row, 'table-row', item);
        row.dataset.dropType = 'table-row';
        row.dataset.dropData = JSON.stringify(item);
    }

    enableKanbanCardDrag(card, item) {
        this.makeDraggable(card, 'kanban-card', item);
    }

    enableColumnDrag(header, column) {
        this.makeDraggable(header, 'column-header', column);
        header.dataset.dropType = 'column-header';
        header.dataset.dropData = JSON.stringify(column);
    }

    enableKanbanColumnDrop(column, status) {
        column.dataset.dropType = 'kanban-column';
        column.dataset.dropData = JSON.stringify({ status });
    }

    enableTableBodyDrop(tbody) {
        tbody.dataset.dropType = 'table-body';
        tbody.dataset.dropData = JSON.stringify({});
    }
}

// Add global drag styles
const dragStyles = document.createElement('style');
dragStyles.textContent = `
    .dragging {
        cursor: grabbing !important;
    }
    
    .dragging * {
        cursor: grabbing !important;
    }
    
    .drag-over {
        background-color: rgba(0, 115, 234, 0.1) !important;
        border: 2px dashed #0073ea !important;
    }
    
    [draggable="true"]:hover {
        box-shadow: 0 2px 8px rgba(0,0,0,0.15);
    }
    
    .drop-indicator {
        animation: pulse 1s infinite;
    }
    
    @keyframes pulse {
        0% { opacity: 0.6; }
        50% { opacity: 1; }
        100% { opacity: 0.6; }
    }
`;
document.head.appendChild(dragStyles);
