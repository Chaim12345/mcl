/**
 * User Search Component
 * Autocomplete search for users with role-based filtering
 */

import { userManagementService } from '../../services/userManagement.js';
import { EventEmitter } from '../../utils/eventEmitter.js';
import { debounce } from '../../utils/debounce.js';

export class UserSearch extends EventEmitter {
  constructor(input, options = {}) {
    super();
    this.input = input;
    this.options = {
      placeholder: 'Search users...',
      includeRoles: true,
      includeAvatars: true,
      maxResults: 10,
      filterByWorkspace: null,
      ...options
    };
    
    this.suggestions = [];
    this.selectedIndex = -1;
    this.isOpen = false;
    
    this.init();
  }

  init() {
    this.setupInput();
    this.createDropdown();
    this.attachEventListeners();
  }

  setupInput() {
    this.input.setAttribute('placeholder', this.options.placeholder);
    this.input.setAttribute('autocomplete', 'off');
  }

  createDropdown() {
    this.dropdown = document.createElement('div');
    this.dropdown.className = 'user-search-dropdown';
    this.dropdown.style.display = 'none';
    this.dropdown.innerHTML = `
      <div class="search-results"></div>
      <div class="search-no-results" style="display: none;">
        <p>No users found</p>
      </div>
    `;
    
    document.body.appendChild(this.dropdown);
    this.resultsContainer = this.dropdown.querySelector('.search-results');
  }

  attachEventListeners() {
    // Input events
    this.input.addEventListener('input', debounce((e) => {
      this.handleInput(e.target.value);
    }, 300));
    
    this.input.addEventListener('keydown', (e) => {
      this.handleKeydown(e);
    });
    
    this.input.addEventListener('focus', () => {
      if (this.input.value.trim()) {
        this.handleInput(this.input.value.trim());
      }
    });
    
    // Document click to close dropdown
    document.addEventListener('click', (e) => {
      if (!this.dropdown.contains(e.target) && e.target !== this.input) {
        this.closeDropdown();
      }
    });
    
    // Dropdown events
    this.dropdown.addEventListener('click', (e) => {
      const suggestion = e.target.closest('.user-suggestion');
      if (suggestion) {
        this.selectUser(suggestion.dataset.userId);
      }
    });
  }

  async handleInput(query) {
    if (!query.trim()) {
      this.closeDropdown();
      return;
    }

    try {
      const results = await userManagementService.searchUsers(query, {
        limit: this.options.maxResults,
        workspaceId: this.options.filterByWorkspace
      });
      
      this.suggestions = results.users || [];
      this.updateDropdown();
    } catch (error) {
      console.error('Error searching users:', error);
    }
  }

  updateDropdown() {
    if (this.suggestions.length === 0) {
      this.showNoResults();
      return;
    }

    this.resultsContainer.innerHTML = this.suggestions
      .map((user, index) => this.renderUserSuggestion(user, index))
      .join('');
    
    this.selectedIndex = -1;
    this.showDropdown();
  }

  renderUserSuggestion(user, index) {
    const isSelected = index === this.selectedIndex;
    
    return `
      <div class="user-suggestion ${isSelected ? 'selected' : ''}" 
           data-user-id="${user.id}"
           data-index="${index}">
        ${this.options.includeAvatars ? `
          <img src="${user.avatarUrl || '/assets/default-avatar.png'}" 
               alt="${user.name}" 
               class="user-avatar-small">
        ` : ''}
        <div class="user-info">
          <div class="user-name">${user.name}</div>
          ${this.options.includeRoles ? `
            <div class="user-role">${user.role || 'member'}</div>
          ` : ''}
          <div class="user-email">${user.email}</div>
        </div>
      </div>
    `;
  }

  showNoResults() {
    this.resultsContainer.innerHTML = '';
    this.dropdown.querySelector('.search-no-results').style.display = 'block';
    this.showDropdown();
  }

  showDropdown() {
    if (!this.isOpen) {
      const rect = this.input.getBoundingClientRect();
      
      this.dropdown.style.position = 'absolute';
      this.dropdown.style.top = `${rect.bottom + window.scrollY}px`;
      this.dropdown.style.left = `${rect.left + window.scrollX}px`;
      this.dropdown.style.width = `${rect.width}px`;
      this.dropdown.style.display = 'block';
      
      this.isOpen = true;
      this.emit('dropdownOpened');
    }
  }

  closeDropdown() {
    if (this.isOpen) {
      this.dropdown.style.display = 'none';
      this.isOpen = false;
      this.selectedIndex = -1;
      this.emit('dropdownClosed');
    }
  }

  handleKeydown(e) {
    if (!this.isOpen) return;
    
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        this.selectNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.selectPrevious();
        break;
      case 'Enter':
        e.preventDefault();
        if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
          this.selectUser(this.suggestions[this.selectedIndex].id);
        }
        break;
      case 'Escape':
        e.preventDefault();
        this.closeDropdown();
        break;
    }
  }

  selectNext() {
    this.selectedIndex = Math.min(this.selectedIndex + 1, this.suggestions.length - 1);
    this.updateSelection();
  }

  selectPrevious() {
    this.selectedIndex = Math.max(this.selectedIndex - 1, -1);
    this.updateSelection();
  }

  updateSelection() {
    const suggestions = this.dropdown.querySelectorAll('.user-suggestion');
    suggestions.forEach((suggestion, index) => {
      suggestion.classList.toggle('selected', index === this.selectedIndex);
    });
  }

  selectUser(userId) {
    const user = this.suggestions.find(u => u.id === userId);
    if (user) {
      this.input.value = user.name;
      this.closeDropdown();
      this.emit('userSelected', user);
    }
  }

  getSelectedUser() {
    if (this.selectedIndex >= 0 && this.selectedIndex < this.suggestions.length) {
      return this.suggestions[this.selectedIndex];
    }
    return null;
  }

  clear() {
    this.input.value = '';
    this.suggestions = [];
    this.selectedIndex = -1;
    this.closeDropdown();
  }

  setValue(user) {
    if (user) {
      this.input.value = user.name;
      this.emit('userSelected', user);
    }
  }

  destroy() {
    if (this.dropdown && this.dropdown.parentNode) {
      this.dropdown.parentNode.removeChild(this.dropdown);
    }
    this.removeAllListeners();
  }
}