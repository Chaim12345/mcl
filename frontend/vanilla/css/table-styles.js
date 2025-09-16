/**
 * Production-Ready Table Styles
 * Enhanced Monday.com-style table with advanced features
 */

const tableStyles = `
/* Enhanced Table Styles */
.table-view {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
  overflow: hidden;
  margin: var(--space-4);
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-bottom: 1px solid var(--gray-200);
  background: var(--gray-50);
  gap: var(--space-4);
}

.toolbar-left,
.toolbar-center,
.toolbar-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.toolbar-center {
  flex: 1;
  justify-content: center;
  max-width: 400px;
}

.search-container {
  position: relative;
  width: 100%;
  max-width: 300px;
}

.search-input {
  width: 100%;
  padding: var(--space-2) var(--space-3) var(--space-2) var(--space-10);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-md);
  font-size: var(--font-size-sm);
  background: white;
  transition: all var(--transition-fast);
}

.search-input:focus {
  outline: none;
  border-color: var(--primary-500);
  box-shadow: 0 0 0 3px rgba(14, 165, 233, 0.1);
}

.search-clear {
  position: absolute;
  right: var(--space-2);
  top: 50%;
  transform: translateY(-50%);
  background: none;
  border: none;
  color: var(--gray-400);
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-lg);
  line-height: 1;
}

.search-clear:hover {
  background: var(--gray-100);
  color: var(--gray-600);
}

.bulk-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-fast);
}

.bulk-actions.visible {
  opacity: 1;
  visibility: visible;
}

.bulk-count {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  font-weight: var(--font-weight-medium);
}

.table-controls {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.filter-btn.active {
  background: var(--primary-100);
  color: var(--primary-700);
  border-color: var(--primary-300);
}

.filter-count {
  background: var(--primary-500);
  color: white;
  font-size: var(--font-size-xs);
  padding: 2px 6px;
  border-radius: var(--radius-full);
  margin-left: var(--space-1);
}

.table-container {
  overflow: auto;
  max-height: 70vh;
}

.table-scroll {
  min-width: 100%;
}

.monday-table {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--font-size-sm);
}

.monday-table th {
  background: var(--gray-50);
  border-bottom: 2px solid var(--gray-200);
  padding: var(--space-3) var(--space-4);
  text-align: left;
  font-weight: var(--font-weight-semibold);
  color: var(--gray-700);
  position: sticky;
  top: 0;
  z-index: 10;
}

.monday-table td {
  border-bottom: 1px solid var(--gray-200);
  padding: var(--space-3) var(--space-4);
  vertical-align: top;
}

.monday-table tr:hover {
  background: var(--gray-50);
}

.monday-table tr.selected {
  background: var(--primary-50);
}

.monday-table tr.selected:hover {
  background: var(--primary-100);
}

.column-header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
}

.column-sort-btn {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  transition: all var(--transition-fast);
  flex: 1;
}

.column-sort-btn:hover {
  background: var(--gray-100);
}

.sortable-header.sorted .column-sort-btn {
  background: var(--primary-100);
  color: var(--primary-700);
}

.sort-indicator {
  font-size: var(--font-size-sm);
  opacity: 0.6;
}

.sortable-header.sorted .sort-indicator {
  opacity: 1;
}

.column-menu-btn {
  background: none;
  border: none;
  cursor: pointer;
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  color: var(--gray-400);
  transition: all var(--transition-fast);
}

.column-menu-btn:hover {
  background: var(--gray-100);
  color: var(--gray-600);
}

.row-selector {
  width: 60px;
  padding: var(--space-2) !important;
}

.row-selector-header {
  width: 60px;
  padding: var(--space-2) !important;
}

.row-checkbox {
  margin: 0;
  cursor: pointer;
}

.row-drag-handle {
  background: none;
  border: none;
  cursor: grab;
  padding: var(--space-1);
  color: var(--gray-400);
  font-size: var(--font-size-sm);
  margin-left: var(--space-2);
}

.row-drag-handle:hover {
  color: var(--gray-600);
}

.row-drag-handle:active {
  cursor: grabbing;
}

.editable-cell {
  cursor: pointer;
  transition: all var(--transition-fast);
}

.editable-cell:hover {
  background: var(--gray-50);
}

.editable-cell.editing {
  background: white;
  box-shadow: inset 0 0 0 2px var(--primary-500);
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--gray-200);
  background: var(--gray-50);
  gap: var(--space-4);
}

.footer-left,
.footer-center,
.footer-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.item-count {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
}

.pagination {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.pagination-info {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
  white-space: nowrap;
}

.page-size-selector {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.page-size-selector label {
  font-size: var(--font-size-sm);
  color: var(--gray-600);
}

.page-size-select {
  padding: var(--space-1) var(--space-2);
  border: 1px solid var(--gray-300);
  border-radius: var(--radius-sm);
  font-size: var(--font-size-sm);
  background: white;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .table-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: var(--space-3);
  }
  
  .toolbar-left,
  .toolbar-center,
  .toolbar-right {
    justify-content: center;
  }
  
  .toolbar-center {
    max-width: none;
  }
  
  .search-container {
    max-width: none;
  }
  
  .table-controls {
    flex-wrap: wrap;
    justify-content: center;
  }
  
  .table-footer {
    flex-direction: column;
    gap: var(--space-3);
  }
  
  .footer-left,
  .footer-center,
  .footer-right {
    justify-content: center;
  }
  
  .monday-table {
    font-size: var(--font-size-xs);
  }
  
  .monday-table th,
  .monday-table td {
    padding: var(--space-2);
  }
  
  .column-header-content {
    flex-direction: column;
    gap: var(--space-1);
  }
  
  .column-sort-btn {
    flex-direction: column;
    text-align: center;
  }
}

/* Touch Interactions */
@media (hover: none) and (pointer: coarse) {
  .editable-cell {
    min-height: 44px;
    display: flex;
    align-items: center;
  }
  
  .column-sort-btn,
  .column-menu-btn,
  .row-drag-handle {
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  
  .search-clear {
    min-height: 44px;
    min-width: 44px;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

/* Loading States */
.table-loading {
  position: relative;
}

.table-loading::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
}

.table-loading::before {
  content: 'Loading...';
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 101;
  font-size: var(--font-size-sm);
  color: var(--gray-600);
}

/* Empty State */
.table-empty {
  text-align: center;
  padding: var(--space-16) var(--space-8);
  color: var(--gray-500);
}

.table-empty-icon {
  font-size: var(--font-size-4xl);
  margin-bottom: var(--space-4);
  opacity: 0.5;
}

.table-empty-title {
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  margin-bottom: var(--space-2);
  color: var(--gray-700);
}

.table-empty-description {
  font-size: var(--font-size-sm);
  margin-bottom: var(--space-6);
}

/* Animations */
@keyframes tableRowSlideIn {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.monday-table tbody tr {
  animation: tableRowSlideIn 0.3s ease;
}

.monday-table tbody tr:nth-child(even) {
  animation-delay: 0.05s;
}

.monday-table tbody tr:nth-child(odd) {
  animation-delay: 0.1s;
}

/* Focus Management */
.monday-table th:focus,
.monday-table td:focus {
  outline: 2px solid var(--primary-500);
  outline-offset: -2px;
}

/* High Contrast Mode */
@media (prefers-contrast: high) {
  .monday-table th,
  .monday-table td {
    border-width: 2px;
  }
  
  .table-toolbar,
  .table-footer {
    border-width: 2px;
  }
  
  .search-input,
  .page-size-select {
    border-width: 2px;
  }
}

/* Reduced Motion */
@media (prefers-reduced-motion: reduce) {
  .monday-table tbody tr {
    animation: none;
  }
  
  * {
    transition-duration: 0.01ms !important;
  }
}
`;

// Inject the table styles
const tableStyleSheet = document.createElement('style');
tableStyleSheet.textContent = tableStyles;
document.head.appendChild(tableStyleSheet);
