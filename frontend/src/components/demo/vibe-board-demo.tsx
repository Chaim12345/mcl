import React, { useState } from 'react';
import { VibeBoardTable, type BoardItem } from '@/components/board/vibe-board-table';
import { VibeBoardItemEditor } from '@/components/board/vibe-board-item-editor';
import { VibeBoardFilters, type BoardFilter } from '@/components/board/vibe-board-filters';
import { type VibeTableColumn } from '@/components/vibe/vibe-table';
import { VibeBox, VibeFlex, VibeButton } from '@/components/vibe';
import { Heading, Text } from '@vibe/core';
import { Plus, Settings, Download, Upload } from 'lucide-react';

// Sample board data
const sampleBoardItems: BoardItem[] = [
  {
    id: '1',
    name: 'Design new homepage layout',
    description: 'Create a modern, responsive homepage design that showcases our key features and improves user engagement.',
    status: 'In Progress',
    priority: 'High',
    assignee: {
      id: 'user1',
      name: 'Alice Johnson',
      avatar: undefined
    },
    dueDate: '2024-02-20',
    tags: ['Design', 'Frontend', 'UI/UX'],
    progress: 65,
    budget: 5000,
    createdAt: '2024-01-15T10:00:00Z',
    updatedAt: '2024-02-01T14:30:00Z'
  },
  {
    id: '2',
    name: 'Implement user authentication',
    description: 'Set up secure user authentication system with JWT tokens, password reset, and email verification.',
    status: 'To Do',
    priority: 'Critical',
    assignee: {
      id: 'user2',
      name: 'Bob Smith',
      avatar: undefined
    },
    dueDate: '2024-02-15',
    tags: ['Backend', 'Security', 'Authentication'],
    progress: 0,
    budget: 8000,
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2024-01-25T16:45:00Z'
  },
  {
    id: '3',
    name: 'Write API documentation',
    description: 'Create comprehensive API documentation with examples, error codes, and integration guides.',
    status: 'Completed',
    priority: 'Medium',
    assignee: {
      id: 'user3',
      name: 'Carol Davis',
      avatar: undefined
    },
    dueDate: '2024-01-30',
    tags: ['Documentation', 'API'],
    progress: 100,
    budget: 2000,
    createdAt: '2024-01-10T11:00:00Z',
    updatedAt: '2024-01-28T13:20:00Z'
  },
  {
    id: '4',
    name: 'Set up CI/CD pipeline',
    description: 'Configure automated testing, building, and deployment pipeline using GitHub Actions.',
    status: 'In Progress',
    priority: 'High',
    assignee: {
      id: 'user4',
      name: 'David Wilson',
      avatar: undefined
    },
    dueDate: '2024-02-25',
    tags: ['DevOps', 'CI/CD', 'Automation'],
    progress: 40,
    budget: 3000,
    createdAt: '2024-01-25T08:30:00Z',
    updatedAt: '2024-02-02T10:15:00Z'
  },
  {
    id: '5',
    name: 'Mobile app testing',
    description: 'Comprehensive testing of mobile application across different devices and operating systems.',
    status: 'Blocked',
    priority: 'Medium',
    assignee: {
      id: 'user5',
      name: 'Eva Brown',
      avatar: undefined
    },
    dueDate: '2024-03-01',
    tags: ['Testing', 'Mobile', 'QA'],
    progress: 20,
    budget: 4000,
    createdAt: '2024-01-30T12:00:00Z',
    updatedAt: '2024-02-03T09:45:00Z'
  }
];

// Board configuration
const boardColumns: VibeTableColumn[] = [
  {
    id: 'name',
    title: 'Task Name',
    sortable: true,
    width: '25%'
  },
  {
    id: 'status',
    title: 'Status',
    sortable: true,
    width: '12%'
  },
  {
    id: 'priority',
    title: 'Priority',
    sortable: true,
    width: '10%'
  },
  {
    id: 'assignee',
    title: 'Assignee',
    width: '15%'
  },
  {
    id: 'dueDate',
    title: 'Due Date',
    sortable: true,
    width: '12%'
  },
  {
    id: 'progress',
    title: 'Progress',
    sortable: true,
    width: '12%'
  },
  {
    id: 'budget',
    title: 'Budget',
    sortable: true,
    width: '10%'
  },
  {
    id: 'tags',
    title: 'Tags',
    width: '14%'
  }
];

const statusOptions = [
  { value: 'To Do', label: 'To Do', color: 'primary' },
  { value: 'In Progress', label: 'In Progress', color: 'warning' },
  { value: 'Completed', label: 'Completed', color: 'positive' },
  { value: 'Blocked', label: 'Blocked', color: 'negative' }
];

const priorityOptions = [
  { value: 'Low', label: 'Low', color: 'dark' },
  { value: 'Medium', label: 'Medium', color: 'primary' },
  { value: 'High', label: 'High', color: 'warning' },
  { value: 'Critical', label: 'Critical', color: 'negative' }
];

const assigneeOptions = [
  { value: 'user1', label: 'Alice Johnson' },
  { value: 'user2', label: 'Bob Smith' },
  { value: 'user3', label: 'Carol Davis' },
  { value: 'user4', label: 'David Wilson' },
  { value: 'user5', label: 'Eva Brown' }
];

const tagOptions = [
  'Design', 'Frontend', 'Backend', 'UI/UX', 'Security', 'Authentication',
  'Documentation', 'API', 'DevOps', 'CI/CD', 'Automation', 'Testing',
  'Mobile', 'QA', 'Database', 'Performance'
];

export function VibeBoardDemo() {
  const [items, setItems] = useState<BoardItem[]>(sampleBoardItems);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<BoardFilter>({});
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  
  // Modal states
  const [showItemEditor, setShowItemEditor] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [editingItem, setEditingItem] = useState<BoardItem | null>(null);
  
  // Loading states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleItemClick = (item: BoardItem) => {
    setEditingItem(item);
    setShowItemEditor(true);
  };

  const handleItemEdit = (item: BoardItem) => {
    setEditingItem(item);
    setShowItemEditor(true);
  };

  const handleItemDelete = async (item: BoardItem) => {
    if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
      setItems(prev => prev.filter(i => i.id !== item.id));
      setSelectedItems(prev => prev.filter(id => id !== item.id));
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setShowItemEditor(true);
  };

  const handleSaveItem = async (itemData: Partial<BoardItem>) => {
    setSaving(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      if (editingItem) {
        // Update existing item
        setItems(prev => prev.map(item => 
          item.id === editingItem.id 
            ? { ...item, ...itemData, updatedAt: new Date().toISOString() }
            : item
        ));
      } else {
        // Create new item
        const newItem: BoardItem = {
          id: Date.now().toString(),
          name: itemData.name || '',
          description: itemData.description || '',
          status: itemData.status || 'To Do',
          priority: itemData.priority || 'Medium',
          assignee: itemData.assignee,
          dueDate: itemData.dueDate,
          tags: itemData.tags || [],
          progress: itemData.progress || 0,
          budget: itemData.budget,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        setItems(prev => [newItem, ...prev]);
      }
    } catch (error) {
      console.error('Failed to save item:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      setItems(prev => prev.filter(item => item.id !== itemId));
      setSelectedItems(prev => prev.filter(id => id !== itemId));
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const handleSort = (columnId: string, direction: 'asc' | 'desc') => {
    setSortBy(columnId);
    setSortDirection(direction);
  };

  const handleBulkAction = (action: string) => {
    console.log(`Bulk action: ${action} on items:`, selectedItems);
    // Implement bulk actions here
  };

  const handleExport = () => {
    console.log('Exporting board data...');
    // Implement export functionality
  };

  const handleImport = () => {
    console.log('Importing board data...');
    // Implement import functionality
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-4">
        <Heading type="h2">Vibe Board Management Demo</Heading>
        <Text type="text1" color="secondary">
          Comprehensive demonstration of board management with Vibe Table components, including item editing, filtering, and bulk operations
        </Text>
      </div>

      {/* Board Header */}
      <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
        <VibeFlex align="center" justify="space-between" className="flex-wrap gap-4">
          <div>
            <Heading type="h3">Project Tasks Board</Heading>
            <Text type="text2" color="secondary">
              {items.length} total items • {selectedItems.length} selected
            </Text>
          </div>
          
          <VibeFlex gap="small" className="flex-wrap">
            <VibeButton 
              kind="tertiary" 
              size="medium"
              onClick={handleImport}
            >
              <Upload className="h-4 w-4 mr-2" />
              Import
            </VibeButton>
            <VibeButton 
              kind="tertiary" 
              size="medium"
              onClick={handleExport}
            >
              <Download className="h-4 w-4 mr-2" />
              Export
            </VibeButton>
            <VibeButton 
              kind="secondary" 
              size="medium"
              onClick={() => setShowFilters(true)}
            >
              <Settings className="h-4 w-4 mr-2" />
              Board Settings
            </VibeButton>
          </VibeFlex>
        </VibeFlex>
      </VibeBox>

      {/* Board Table */}
      <VibeBox border borderColor="uiBorderColor" rounded="medium">
        <VibeBoardTable
          items={items}
          columns={boardColumns}
          loading={loading}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          filters={filters}
          onFiltersChange={setFilters}
          sortBy={sortBy}
          sortDirection={sortDirection}
          onSort={handleSort}
          selectedItems={selectedItems}
          onSelectionChange={setSelectedItems}
          onItemClick={handleItemClick}
          onItemEdit={handleItemEdit}
          onItemDelete={handleItemDelete}
          onAddItem={handleAddItem}
          showSearch={true}
          showFilters={true}
          showAddButton={true}
          emptyMessage="No tasks found. Create your first task to get started!"
          boardId="demo-board"
          workspaceId="demo-workspace"
        />
      </VibeBox>

      {/* Bulk Actions */}
      {selectedItems.length > 0 && (
        <VibeBox 
          backgroundColor="primaryBackgroundColor" 
          border 
          borderColor="uiBorderColor" 
          rounded="medium" 
          padding="medium"
        >
          <VibeFlex align="center" justify="space-between">
            <Text type="text2" weight="medium">
              {selectedItems.length} item{selectedItems.length !== 1 ? 's' : ''} selected
            </Text>
            <VibeFlex gap="small">
              <VibeButton 
                kind="secondary" 
                size="small"
                onClick={() => handleBulkAction('update-status')}
              >
                Update Status
              </VibeButton>
              <VibeButton 
                kind="secondary" 
                size="small"
                onClick={() => handleBulkAction('assign')}
              >
                Assign
              </VibeButton>
              <VibeButton 
                kind="secondary" 
                size="small"
                onClick={() => handleBulkAction('add-tags')}
              >
                Add Tags
              </VibeButton>
              <VibeButton 
                kind="secondary" 
                size="small"
                color="negative"
                onClick={() => handleBulkAction('delete')}
              >
                Delete
              </VibeButton>
            </VibeFlex>
          </VibeFlex>
        </VibeBox>
      )}

      {/* Item Editor Modal */}
      <VibeBoardItemEditor
        isOpen={showItemEditor}
        onClose={() => {
          setShowItemEditor(false);
          setEditingItem(null);
        }}
        item={editingItem}
        isEditing={!!editingItem}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        assigneeOptions={assigneeOptions}
        tagOptions={tagOptions}
        onSave={handleSaveItem}
        onDelete={handleDeleteItem}
        saving={saving}
        boardId="demo-board"
        workspaceId="demo-workspace"
      />

      {/* Filters Modal */}
      <VibeBoardFilters
        isOpen={showFilters}
        onClose={() => setShowFilters(false)}
        filters={filters}
        onFiltersChange={setFilters}
        statusOptions={statusOptions}
        priorityOptions={priorityOptions}
        assigneeOptions={assigneeOptions}
        tagOptions={tagOptions}
        boardId="demo-board"
        workspaceId="demo-workspace"
      />

      {/* Statistics */}
      <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <Text type="text1" weight="bold" className="block">
              {items.filter(item => item.status === 'To Do').length}
            </Text>
            <Text type="text2" color="secondary">To Do</Text>
          </div>
          <div className="text-center">
            <Text type="text1" weight="bold" className="block">
              {items.filter(item => item.status === 'In Progress').length}
            </Text>
            <Text type="text2" color="secondary">In Progress</Text>
          </div>
          <div className="text-center">
            <Text type="text1" weight="bold" className="block">
              {items.filter(item => item.status === 'Completed').length}
            </Text>
            <Text type="text2" color="secondary">Completed</Text>
          </div>
          <div className="text-center">
            <Text type="text1" weight="bold" className="block">
              {items.filter(item => item.priority === 'Critical' || item.priority === 'High').length}
            </Text>
            <Text type="text2" color="secondary">High Priority</Text>
          </div>
        </div>
      </VibeBox>
    </div>
  );
}