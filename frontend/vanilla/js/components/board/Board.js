/**
 * Board Component - Kanban Board Implementation
 * Implements drag-and-drop functionality, task management, and Monday.com-like UI
 */

class Board {
  constructor(containerId, boardData) {
    this.container = document.getElementById(containerId);
    this.boardData = boardData;
    this.draggedTask = null;
    this.init();
  }

  init() {
    this.render();
    this.attachEventListeners();
  }

  render() {
    const boardHtml = `
      <div class="board-container">
        <div class="board-header">
          <h2>${this.boardData.name}</h2>
          <button class="add-column-btn">+ Add Column</button>
        </div>
        <div class="columns-container" id="columns-${this.boardData.id}">
          ${this.renderColumns()}
        </div>
      </div>
    `;
    
    this.container.innerHTML = boardHtml;
  }

  renderColumns() {
    return this.boardData.columns.map(column => `
      <div class="column" data-column-id="${column.id}">
        <div class="column-header">
          <h3>${column.name}</h3>
          <span class="task-count">${column.tasks.length} tasks</span>
          <button class="add-task-btn" data-column-id="${column.id}">+</button>
        </div>
        <div class="tasks-container" data-column-id="${column.id}">
          ${this.renderTasks(column.tasks)}
        </div>
      </div>
    `).join('');
  }

  renderTasks(tasks) {
    return tasks.map(task => `
      <div class="task-card" draggable="true" data-task-id="${task.id}">
        <div class="task-header">
          <h4>${task.title}</h4>
        </div>
        <div class="task-content">
          <p>${task.description || ''}</p>
        </div>
        <div class="task-footer">
          <div class="task-priority priority-${task.priority || 'low'}">
            ${task.priority || 'Low'}
          </div>
          <div class="task-assignee">
            ${task.assignee ? `<img src="${task.assignee.avatar}" alt="${task.assignee.name}">` : ''}
          </div>
        </div>
      </div>
    `).join('');
  }

  attachEventListeners() {
    // Add column button
    const addColumnBtn = this.container.querySelector('.add-column-btn');
    if (addColumnBtn) {
      addColumnBtn.addEventListener('click', () => this.addColumn());
    }

    // Add task buttons
    const addTaskButtons = this.container.querySelectorAll('.add-task-btn');
    addTaskButtons.forEach(button => {
      button.addEventListener('click', (e) => {
        const columnId = e.target.getAttribute('data-column-id');
        this.addTask(columnId);
      });
    });

    // Drag and drop events
    this.setupDragAndDrop();
  }

  setupDragAndDrop() {
    const taskCards = this.container.querySelectorAll('.task-card');
    const columns = this.container.querySelectorAll('.tasks-container');

    taskCards.forEach(card => {
      card.addEventListener('dragstart', (e) => {
        this.draggedTask = card;
        setTimeout(() => card.classList.add('dragging'), 0);
      });

      card.addEventListener('dragend', () => {
        card.classList.remove('dragging');
        this.draggedTask = null;
      });
    });

    columns.forEach(column => {
      column.addEventListener('dragover', (e) => {
        e.preventDefault();
        column.classList.add('drag-over');
      });

      column.addEventListener('dragleave', () => {
        column.classList.remove('drag-over');
      });

      column.addEventListener('drop', (e) => {
        e.preventDefault();
        column.classList.remove('drag-over');
        
        if (this.draggedTask) {
          const taskId = this.draggedTask.getAttribute('data-task-id');
          const newColumnId = column.getAttribute('data-column-id');
          
          // Move task to new column
          this.moveTask(taskId, newColumnId);
          
          // Append dragged task to new column
          column.appendChild(this.draggedTask);
        }
      });
    });
  }

  addColumn() {
    const columnName = prompt('Enter column name:');
    if (columnName) {
      const newColumn = {
        id: `col-${Date.now()}`,
        name: columnName,
        tasks: []
      };
      
      this.boardData.columns.push(newColumn);
      this.render();
      this.attachEventListeners();
    }
  }

  addTask(columnId) {
    const taskTitle = prompt('Enter task title:');
    if (taskTitle) {
      const newTask = {
        id: `task-${Date.now()}`,
        title: taskTitle,
        description: '',
        priority: 'low',
        assignee: null
      };

      const column = this.boardData.columns.find(col => col.id === columnId);
      if (column) {
        column.tasks.push(newTask);
        this.render();
        this.attachEventListeners();
      }
    }
  }

  moveTask(taskId, newColumnId) {
    // Find the task and its current column
    let taskToMove = null;
    let sourceColumn = null;

    for (const column of this.boardData.columns) {
      const taskIndex = column.tasks.findIndex(task => task.id === taskId);
      if (taskIndex !== -1) {
        taskToMove = column.tasks.splice(taskIndex, 1)[0];
        sourceColumn = column;
        break;
      }
    }

    // Add task to new column
    if (taskToMove && sourceColumn) {
      const targetColumn = this.boardData.columns.find(col => col.id === newColumnId);
      if (targetColumn) {
        targetColumn.tasks.push(taskToMove);
        // In a real app, you would update the backend here
        console.log(`Moved task ${taskId} from ${sourceColumn.id} to ${newColumnId}`);
      }
    }
  }

  // Method to update task details
  updateTask(taskId, updates) {
    for (const column of this.boardData.columns) {
      const task = column.tasks.find(t => t.id === taskId);
      if (task) {
        Object.assign(task, updates);
        this.render();
        this.attachEventListeners();
        return true;
      }
    }
    return false;
  }

  // Method to delete a task
  deleteTask(taskId) {
    for (const column of this.boardData.columns) {
      const taskIndex = column.tasks.findIndex(t => t.id === taskId);
      if (taskIndex !== -1) {
        column.tasks.splice(taskIndex, 1);
        this.render();
        this.attachEventListeners();
        return true;
      }
    }
    return false;
  }
}

export default Board;