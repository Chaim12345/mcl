import React, { useState, useEffect } from 'react';
import moment from 'moment';
import { VibeModal, VibeButton, VibeTextField, VibeSelect, VibeBox, VibeFlex, VibeAvatar } from '@/components/vibe';

// Temporary Badge component replacement
const VibeBadge = ({ text, color, type, ...props }: any) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    color === 'positive' ? 'bg-green-100 text-green-800' : 
    color === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
    color === 'negative' ? 'bg-red-100 text-red-800' :
    'bg-gray-100 text-gray-800'
  }`} {...props}>
    {text}
  </span>
);
import { Text, Heading, TextArea, DatePicker } from '@vibe/core';
import { BoardItem } from './vibe-board-table';
import { 
  Calendar, 
  User, 
  Flag, 
  Tag, 
  DollarSign, 
  FileText,
  Plus,
  X,
  Trash2
} from 'lucide-react';

export interface VibeBoardItemEditorProps {
  // State
  isOpen: boolean;
  onClose: () => void;
  
  // Data
  item?: BoardItem | null;
  isEditing?: boolean;
  
  // Options
  statusOptions?: Array<{ value: string; label: string; color?: string }>;
  priorityOptions?: Array<{ value: string; label: string; color?: string }>;
  assigneeOptions?: Array<{ value: string; label: string; avatar?: string }>;
  tagOptions?: string[];
  
  // Handlers
  onSave: (item: Partial<BoardItem>) => Promise<void>;
  onDelete?: (itemId: string) => Promise<void>;
  
  // Loading states
  saving?: boolean;
  deleting?: boolean;
  
  // Board context
  boardId?: string;
  workspaceId?: string;
}

export function VibeBoardItemEditor({
  isOpen,
  onClose,
  item,
  isEditing = false,
  statusOptions = [
    { value: 'To Do', label: 'To Do', color: 'primary' },
    { value: 'In Progress', label: 'In Progress', color: 'warning' },
    { value: 'Completed', label: 'Completed', color: 'positive' },
    { value: 'Blocked', label: 'Blocked', color: 'negative' }
  ],
  priorityOptions = [
    { value: 'Low', label: 'Low', color: 'dark' },
    { value: 'Medium', label: 'Medium', color: 'primary' },
    { value: 'High', label: 'High', color: 'warning' },
    { value: 'Critical', label: 'Critical', color: 'negative' }
  ],
  assigneeOptions = [],
  tagOptions = [],
  onSave,
  onDelete,
  saving = false,
  deleting = false,
  boardId,
  workspaceId
}: VibeBoardItemEditorProps) {
  // Form state
  const [formData, setFormData] = useState<Partial<BoardItem>>({
    name: '',
    description: '',
    status: 'To Do',
    priority: 'Medium',
    assignee: undefined,
    dueDate: undefined,
    tags: [],
    progress: 0,
    budget: undefined
  });
  
  const [newTag, setNewTag] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Initialize form data when item changes
  useEffect(() => {
    if (item) {
      setFormData({
        ...item,
        tags: item.tags || []
      });
    } else {
      setFormData({
        name: '',
        description: '',
        status: 'To Do',
        priority: 'Medium',
        assignee: undefined,
        dueDate: undefined,
        tags: [],
        progress: 0,
        budget: undefined
      });
    }
  }, [item]);

  const handleInputChange = (field: keyof BoardItem, value: any) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleAddTag = () => {
    if (newTag.trim() && !formData.tags?.includes(newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...(prev.tags || []), newTag.trim()]
      }));
      setNewTag('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags?.filter(tag => tag !== tagToRemove) || []
    }));
  };

  const handleSave = async () => {
    if (!formData.name?.trim()) {
      return;
    }

    try {
      await onSave({
        ...formData,
        id: item?.id,
        updatedAt: new Date().toISOString(),
        createdAt: item?.createdAt || new Date().toISOString()
      });
      onClose();
    } catch (error) {
      console.error('Failed to save item:', error);
    }
  };

  const handleDelete = async () => {
    if (!item?.id || !onDelete) return;
    
    try {
      await onDelete(item.id);
      onClose();
    } catch (error) {
      console.error('Failed to delete item:', error);
    }
  };

  const getStatusColor = (status: string) => {
    const option = statusOptions.find(opt => opt.value === status);
    return option?.color || 'primary';
  };

  const getPriorityColor = (priority: string) => {
    const option = priorityOptions.find(opt => opt.value === priority);
    return option?.color || 'primary';
  };

  return (
    <VibeModal
      open={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Item' : 'Create New Item'}
      size="large"
    >
      <div className="space-y-6">
        {/* Basic Information */}
        <VibeBox>
          <div className="space-y-4">
            <div>
              <Text type="text2" weight="medium" className="mb-2">Item Name *</Text>
              <VibeTextField
                value={formData.name || ''}
                onChange={(value: string) => handleInputChange('name', value)}
                placeholder="Enter item name..."
                required
                autoFocus
              />
            </div>

            <div>
              <Text type="text2" weight="medium" className="mb-2">Description</Text>
              <TextArea
                value={formData.description || ''}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Enter item description..."
                rows={3}
                className="w-full"
              />
            </div>
          </div>
        </VibeBox>

        {/* Status and Priority */}
        <VibeBox>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text type="text2" weight="medium" className="mb-2">Status</Text>
              <VibeSelect
                value={formData.status || 'To Do'}
                onValueChange={(value: string | number | (string | number)[]) => {
                  const singleValue = Array.isArray(value) ? value[0] : value;
                  handleInputChange('status', singleValue);
                }}
                options={statusOptions.map(opt => ({
                  value: opt.value,
                  label: opt.label
                }))}
                placeholder="Select status..."
              />
              {formData.status && (
                <div className="mt-2">
                  <VibeBadge 
                    type="indicator" 
                    color={getStatusColor(formData.status)} 
                    text={formData.status} 
                  />
                </div>
              )}
            </div>

            <div>
              <Text type="text2" weight="medium" className="mb-2">Priority</Text>
              <VibeSelect
                value={formData.priority || 'Medium'}
                onValueChange={(value: string | number | (string | number)[]) => {
                  const singleValue = Array.isArray(value) ? value[0] : value;
                  handleInputChange('priority', singleValue);
                }}
                options={priorityOptions.map(opt => ({
                  value: opt.value,
                  label: opt.label
                }))}
                placeholder="Select priority..."
              />
              {formData.priority && (
                <div className="mt-2">
                  <VibeBadge 
                    type="indicator" 
                    color={getPriorityColor(formData.priority)} 
                    text={formData.priority} 
                  />
                </div>
              )}
            </div>
          </div>
        </VibeBox>

        {/* Assignment and Due Date */}
        <VibeBox>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text type="text2" weight="medium" className="mb-2">Assignee</Text>
              <VibeSelect
                value={formData.assignee?.id || ''}
                onValueChange={(value: string | number | (string | number)[]) => {
                  const assignee = assigneeOptions.find(opt => opt.value === value);
                  handleInputChange('assignee', assignee ? {
                    id: assignee.value,
                    name: assignee.label,
                    avatar: assignee.avatar
                  } : undefined);
                }}
                options={[
                  { value: '', label: 'Unassigned' },
                  ...assigneeOptions.map(opt => ({
                    value: opt.value,
                    label: opt.label
                  }))
                ]}
                placeholder="Select assignee..."
              />
              {formData.assignee && (
                <div className="mt-2">
                  <VibeFlex align="center" gap="small">
                    <VibeAvatar 
                      type={formData.assignee.avatar ? 'img' : 'text'}
                      src={formData.assignee.avatar}
                      text={formData.assignee.name.split(' ').map(n => n[0]).join('')}
                      size="small"
                    />
                    <Text type="text2">{formData.assignee.name}</Text>
                  </VibeFlex>
                </div>
              )}
            </div>

            <div>
              <Text type="text2" weight="medium" className="mb-2">Due Date</Text>
              <DatePicker
                date={formData.dueDate ? moment(formData.dueDate) : undefined}
                onPickDate={(date: any) => handleInputChange('dueDate', date?.toISOString())}
                className="w-full"
              />
            </div>
          </div>
        </VibeBox>

        {/* Progress and Budget */}
        <VibeBox>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Text type="text2" weight="medium" className="mb-2">Progress (%)</Text>
              <VibeTextField
                type="number"
                value={formData.progress?.toString() || '0'}
                onChange={(value: string) => handleInputChange('progress', parseInt(value) || 0)}
                placeholder="0"
                min="0"
                max="100"
              />
              {formData.progress !== undefined && (
                <div className="mt-2">
                  <VibeFlex align="center" gap="small">
                    <div className="w-24 h-2 bg-gray-200 rounded-full">
                      <div 
                        className="h-2 bg-blue-500 rounded-full" 
                        style={{ width: `${formData.progress}%` }}
                      />
                    </div>
                    <Text type="text2" color="secondary">{formData.progress}%</Text>
                  </VibeFlex>
                </div>
              )}
            </div>

            <div>
              <Text type="text2" weight="medium" className="mb-2">Budget ($)</Text>
              <VibeTextField
                type="number"
                value={formData.budget?.toString() || ''}
                onChange={(value: string) => handleInputChange('budget', value ? parseFloat(value) : undefined)}
                placeholder="0.00"
                iconName="dollar-sign"
              />
            </div>
          </div>
        </VibeBox>

        {/* Tags */}
        <VibeBox>
          <div>
            <Text type="text2" weight="medium" className="mb-2">Tags</Text>
            
            {/* Add new tag */}
            <VibeFlex align="center" gap="small" className="mb-3">
              <VibeTextField
                value={newTag}
                onChange={setNewTag}
                placeholder="Add a tag..."
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAddTag();
                  }
                }}
                className="flex-1"
              />
              <VibeButton 
                kind="secondary" 
                size="small" 
                onClick={handleAddTag}
                disabled={!newTag.trim()}
              >
                <Plus className="h-4 w-4" />
              </VibeButton>
            </VibeFlex>

            {/* Existing tags */}
            {formData.tags && formData.tags.length > 0 && (
              <VibeFlex gap="small" className="flex-wrap">
                {formData.tags.map((tag, index) => (
                  <VibeBadge
                    key={index}
                    type="indicator"
                    color="dark"
                    text={tag}
                    allowRemove
                    onRemove={() => handleRemoveTag(tag)}
                  />
                ))}
              </VibeFlex>
            )}

            {/* Suggested tags */}
            {tagOptions.length > 0 && (
              <div className="mt-3">
                <Text type="text2" color="secondary" className="mb-2">Suggested tags:</Text>
                <VibeFlex gap="small" className="flex-wrap">
                  {tagOptions
                    .filter(tag => !formData.tags?.includes(tag))
                    .slice(0, 5)
                    .map((tag, index) => (
                      <VibeButton
                        key={index}
                        kind="tertiary"
                        size="small"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            tags: [...(prev.tags || []), tag]
                          }));
                        }}
                      >
                        <Plus className="h-3 w-3 mr-1" />
                        {tag}
                      </VibeButton>
                    ))}
                </VibeFlex>
              </div>
            )}
          </div>
        </VibeBox>

        {/* Actions */}
        <VibeFlex align="center" justify="space-between" className="pt-4 border-t">
          <div>
            {isEditing && onDelete && (
              <VibeButton
                kind="secondary"
                color="negative"
                onClick={() => setShowDeleteConfirm(true)}
                loading={deleting}
                disabled={saving}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Item
              </VibeButton>
            )}
          </div>

          <VibeFlex gap="medium">
            <VibeButton
              kind="tertiary"
              onClick={onClose}
              disabled={saving || deleting}
            >
              Cancel
            </VibeButton>
            <VibeButton
              kind="primary"
              onClick={handleSave}
              loading={saving}
              disabled={!formData.name?.trim() || deleting}
            >
              {isEditing ? 'Save Changes' : 'Create Item'}
            </VibeButton>
          </VibeFlex>
        </VibeFlex>
      </div>

      {/* Delete Confirmation Modal */}
      <VibeModal
        open={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        title="Delete Item"
        size="small"
      >
        <div className="space-y-4">
          <Text type="text1">
            Are you sure you want to delete "{item?.name}"? This action cannot be undone.
          </Text>
          
          <VibeFlex align="center" justify="end" gap="medium">
            <VibeButton
              kind="tertiary"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={deleting}
            >
              Cancel
            </VibeButton>
            <VibeButton
              kind="primary"
              color="negative"
              onClick={handleDelete}
              loading={deleting}
            >
              Delete Item
            </VibeButton>
          </VibeFlex>
        </div>
      </VibeModal>
    </VibeModal>
  );
}