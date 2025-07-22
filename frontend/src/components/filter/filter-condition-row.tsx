import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { FilterCondition, FilterOperator } from '@/types/filter';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FilterConditionRowProps {
  condition: FilterCondition;
  onUpdate: (condition: FilterCondition) => void;
  onRemove: () => void;
}

export function FilterConditionRow({ condition, onUpdate, onRemove }: FilterConditionRowProps) {
  const [fields] = useState([
    { id: 'title', name: 'Title', type: 'text' },
    { id: 'description', name: 'Description', type: 'text' },
    { id: 'status', name: 'Status', type: 'status', options: [
      { label: 'To Do', value: 'todo' },
      { label: 'In Progress', value: 'in_progress' },
      { label: 'Done', value: 'done' },
    ]},
    { id: 'priority', name: 'Priority', type: 'status', options: [
      { label: 'Low', value: 'low' },
      { label: 'Medium', value: 'medium' },
      { label: 'High', value: 'high' },
    ]},
    { id: 'assignee', name: 'Assignee', type: 'people' },
    { id: 'dueDate', name: 'Due Date', type: 'date' },
    { id: 'createdAt', name: 'Created At', type: 'date' },
    { id: 'updatedAt', name: 'Updated At', type: 'date' },
  ]);
  
  const [selectedField, setSelectedField] = useState(
    fields.find(f => f.id === condition.field) || fields[0]
  );
  
  // Update the field when condition changes
  useEffect(() => {
    const field = fields.find(f => f.id === condition.field) || fields[0];
    setSelectedField(field);
  }, [condition.field, fields]);
  
  const getOperatorsForFieldType = (type: string) => {
    switch (type) {
      case 'text':
        return [
          { value: FilterOperator.CONTAINS, label: 'Contains' },
          { value: FilterOperator.EQUALS, label: 'Equals' },
          { value: FilterOperator.NOT_EQUALS, label: 'Does not equal' },
        ];
      case 'status':
      case 'people':
        return [
          { value: FilterOperator.EQUALS, label: 'Is' },
          { value: FilterOperator.NOT_EQUALS, label: 'Is not' },
          { value: FilterOperator.IN, label: 'Is one of' },
        ];
      case 'date':
        return [
          { value: FilterOperator.EQUALS, label: 'Is' },
          { value: FilterOperator.NOT_EQUALS, label: 'Is not' },
          { value: FilterOperator.GREATER_THAN, label: 'Is after' },
          { value: FilterOperator.LESS_THAN, label: 'Is before' },
          { value: FilterOperator.BETWEEN, label: 'Is between' },
        ];
      case 'number':
        return [
          { value: FilterOperator.EQUALS, label: 'Equals' },
          { value: FilterOperator.NOT_EQUALS, label: 'Does not equal' },
          { value: FilterOperator.GREATER_THAN, label: 'Greater than' },
          { value: FilterOperator.LESS_THAN, label: 'Less than' },
          { value: FilterOperator.GREATER_THAN_EQUALS, label: 'Greater than or equal' },
          { value: FilterOperator.LESS_THAN_EQUALS, label: 'Less than or equal' },
          { value: FilterOperator.BETWEEN, label: 'Between' },
        ];
      default:
        return [
          { value: FilterOperator.EQUALS, label: 'Equals' },
          { value: FilterOperator.NOT_EQUALS, label: 'Does not equal' },
        ];
    }
  };
  
  const operators = getOperatorsForFieldType(selectedField.type);
  
  const handleFieldChange = (fieldId: string) => {
    const field = fields.find(f => f.id === fieldId) || fields[0];
    setSelectedField(field);
    
    // Reset operator and value when field type changes
    const newOperators = getOperatorsForFieldType(field.type);
    const newOperator = newOperators[0].value;
    
    let newValue: any = '';
    if (field.type === 'status' && field.options) {
      newValue = field.options[0].value;
    } else if (field.type === 'date') {
      newValue = new Date().toISOString().split('T')[0];
    }
    
    onUpdate({
      field: fieldId,
      operator: newOperator,
      value: newValue,
      valueEnd: field.type === 'date' && newOperator === FilterOperator.BETWEEN 
        ? new Date().toISOString().split('T')[0] 
        : undefined
    });
  };
  
  const handleOperatorChange = (operator: FilterOperator) => {
    let valueEnd;
    if (operator === FilterOperator.BETWEEN) {
      valueEnd = condition.valueEnd || new Date().toISOString().split('T')[0];
    }
    
    onUpdate({
      ...condition,
      operator,
      valueEnd
    });
  };
  
  const handleValueChange = (value: any) => {
    onUpdate({
      ...condition,
      value
    });
  };
  
  const handleValueEndChange = (valueEnd: any) => {
    onUpdate({
      ...condition,
      valueEnd
    });
  };
  
  const renderValueInput = () => {
    switch (selectedField.type) {
      case 'text':
        return (
          <Input
            value={condition.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter value"
            className="w-full"
          />
        );
      
      case 'status':
        if (selectedField.options) {
          if (condition.operator === FilterOperator.IN) {
            // Multi-select would go here
            return (
              <Input
                value={Array.isArray(condition.value) ? condition.value.join(', ') : condition.value || ''}
                onChange={(e) => handleValueChange(e.target.value.split(',').map(v => v.trim()))}
                placeholder="Enter comma-separated values"
                className="w-full"
              />
            );
          }
          
          return (
            <Select
              value={condition.value || ''}
              onValueChange={handleValueChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select value" />
              </SelectTrigger>
              <SelectContent>
                {selectedField.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          );
        }
        return null;
      
      case 'date':
        return (
          <div className="flex gap-2 items-center">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "w-full justify-start text-left font-normal",
                    !condition.value && "text-muted-foreground"
                  )}
                >
                  {condition.value ? format(new Date(condition.value), "PPP") : "Pick a date"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={condition.value ? new Date(condition.value) : undefined}
                  onSelect={(date) => handleValueChange(date?.toISOString().split('T')[0])}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
            
            {condition.operator === FilterOperator.BETWEEN && (
              <>
                <span>to</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !condition.valueEnd && "text-muted-foreground"
                      )}
                    >
                      {condition.valueEnd ? format(new Date(condition.valueEnd), "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={condition.valueEnd ? new Date(condition.valueEnd) : undefined}
                      onSelect={(date) => handleValueEndChange(date?.toISOString().split('T')[0])}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </>
            )}
          </div>
        );
      
      case 'people':
        // In a real app, this would be a user picker component
        return (
          <Select
            value={condition.value || 'current_user'}
            onValueChange={handleValueChange}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select user" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="current_user">Current User</SelectItem>
              <SelectItem value="unassigned">Unassigned</SelectItem>
            </SelectContent>
          </Select>
        );
      
      default:
        return (
          <Input
            value={condition.value || ''}
            onChange={(e) => handleValueChange(e.target.value)}
            placeholder="Enter value"
            className="w-full"
          />
        );
    }
  };
  
  return (
    <div className="flex items-center gap-2">
      <Select
        value={condition.field}
        onValueChange={handleFieldChange}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select field" />
        </SelectTrigger>
        <SelectContent>
          {fields.map((field) => (
            <SelectItem key={field.id} value={field.id}>
              {field.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <Select
        value={condition.operator}
        onValueChange={(value) => handleOperatorChange(value as FilterOperator)}
      >
        <SelectTrigger className="w-[180px]">
          <SelectValue placeholder="Select operator" />
        </SelectTrigger>
        <SelectContent>
          {operators.map((op) => (
            <SelectItem key={op.value} value={op.value}>
              {op.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      
      <div className="flex-1">
        {renderValueInput()}
      </div>
      
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onRemove}
      >
        <Trash2 className="h-4 w-4" />
        <span className="sr-only">Remove condition</span>
      </Button>
    </div>
  );
}