import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, PlusCircle, Settings } from 'lucide-react';

import { VibeDropdownNext, VibeButton, type VibeDropdownNextOption } from '@/components/vibe';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { workspaceService } from '@/services/workspace-service';
import { CreateWorkspaceDialog } from '@/components/workspace/create-workspace-dialog';
import { Workspace } from '@/types';

export function VibeWorkspaceSelector() {
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const navigate = useNavigate();
  const { workspaces, currentWorkspace, setWorkspaces, setCurrentWorkspace } = useWorkspaceStore();
  
  // Fetch workspaces if not already loaded
  const { data: fetchedWorkspaces, isLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceService.getWorkspaces,
    enabled: workspaces.length === 0,
  });

  // Update store when data changes
  useEffect(() => {
    if (fetchedWorkspaces) {
      setWorkspaces(fetchedWorkspaces);
      if (fetchedWorkspaces.length > 0 && !currentWorkspace) {
        setCurrentWorkspace(fetchedWorkspaces[0]);
      }
    }
  }, [fetchedWorkspaces, setWorkspaces, setCurrentWorkspace, currentWorkspace]);
  
  // Fallback to mock data if no workspaces are loaded yet
  const mockWorkspaces: Workspace[] = [
    {
      id: '1',
      name: 'Personal Workspace',
      ownerId: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '2',
      name: 'Team Project',
      ownerId: '1',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      id: '3',
      name: 'Marketing',
      ownerId: '2',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];
  
  const displayWorkspaces = workspaces.length > 0 ? workspaces : mockWorkspaces;
  const displayCurrentWorkspace = currentWorkspace || displayWorkspaces[0];
  
  // Transform workspaces to dropdown options
  const workspaceOptions: VibeDropdownNextOption[] = displayWorkspaces.map(workspace => ({
    id: workspace.id,
    label: workspace.name,
    value: workspace,
    selected: workspace.id === displayCurrentWorkspace?.id,
  }));

  // Add action options
  const actionOptions: VibeDropdownNextOption[] = [
    {
      id: 'create-workspace',
      label: 'Create Workspace',
      value: 'create',
    },
    {
      id: 'manage-workspaces',
      label: 'Manage Workspaces',
      value: 'manage',
    },
  ];

  const allOptions = [
    ...workspaceOptions,
    ...actionOptions,
  ];

  const handleWorkspaceSelect = (option: VibeDropdownNextOption | VibeDropdownNextOption[]) => {
    const selectedOption = Array.isArray(option) ? option[0] : option;
    if (!selectedOption) return;
    if (selectedOption.value === 'create') {
      setIsCreateDialogOpen(true);
    } else if (selectedOption.value === 'manage') {
      navigate('/workspaces');
    } else if (selectedOption.value && typeof selectedOption.value === 'object') {
      setCurrentWorkspace(selectedOption.value as Workspace);
    }
  };

  // Custom option renderer to show icons and separators
  const optionRenderer = (option: VibeDropdownNextOption) => {
    if (option.value === 'create') {
      return (
        <div className="flex items-center">
          <PlusCircle className="mr-2 h-4 w-4" />
          {option.label}
        </div>
      );
    } else if (option.value === 'manage') {
      return (
        <div className="flex items-center">
          <Settings className="mr-2 h-4 w-4" />
          {option.label}
        </div>
      );
    } else {
      return (
        <div className="flex items-center">
          <Check
            className={`mr-2 h-4 w-4 ${
              option.selected ? 'opacity-100' : 'opacity-0'
            }`}
          />
          {option.label}
        </div>
      );
    }
  };

  // Custom value renderer for the selected workspace
  const valueRenderer = (option: VibeDropdownNextOption) => {
    return (
      <div className="flex items-center justify-between w-full">
        <span>{option.label}</span>
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </div>
    );
  };

  return (
    <>
      <VibeDropdownNext
        options={allOptions}
        value={workspaceOptions.find(opt => opt.selected)}
        placeholder="Select workspace"
        searchable
        size="medium"
        className="w-[200px]"
        optionRenderer={optionRenderer}
        valueRenderer={valueRenderer}
        onChange={handleWorkspaceSelect}
        onOptionSelect={handleWorkspaceSelect}
        ariaLabel="Workspace selector"
        noOptionsMessage="No workspace found."
      />
      
      <CreateWorkspaceDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </>
  );
}