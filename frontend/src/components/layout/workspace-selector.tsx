import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Check, ChevronsUpDown, PlusCircle, Settings } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { workspaceService } from '@/services/workspace-service';
import { CreateWorkspaceDialog } from '@/components/workspace/create-workspace-dialog';
import { Workspace } from '@/types';

export function WorkspaceSelector() {
  const [open, setOpen] = useState(false);
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
  
  const handleWorkspaceSelect = (workspace: Workspace) => {
    setCurrentWorkspace(workspace);
    setOpen(false);
  };
  
  const handleManageWorkspaces = () => {
    setOpen(false);
    navigate('/workspaces');
  };
  
  const handleCreateWorkspace = () => {
    setOpen(false);
    setIsCreateDialogOpen(true);
  };
  
  return (
    <>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            role="combobox"
            aria-expanded={open}
            className="w-[200px] justify-between"
          >
            {displayCurrentWorkspace?.name || "Select workspace"}
            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[200px] p-0">
          <Command>
            <CommandInput placeholder="Search workspace..." />
            <CommandList>
              <CommandEmpty>No workspace found.</CommandEmpty>
              <CommandGroup heading="Workspaces">
                {displayWorkspaces.map((workspace) => (
                  <CommandItem
                    key={workspace.id}
                    value={workspace.id}
                    onSelect={() => handleWorkspaceSelect(workspace)}
                  >
                    <Check
                      className={cn(
                        "mr-2 h-4 w-4",
                        displayCurrentWorkspace?.id === workspace.id
                          ? "opacity-100"
                          : "opacity-0"
                      )}
                    />
                    {workspace.name}
                  </CommandItem>
                ))}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem onSelect={handleCreateWorkspace}>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Create Workspace
                </CommandItem>
                <CommandItem onSelect={handleManageWorkspaces}>
                  <Settings className="mr-2 h-4 w-4" />
                  Manage Workspaces
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      
      <CreateWorkspaceDialog 
        open={isCreateDialogOpen} 
        onOpenChange={setIsCreateDialogOpen} 
      />
    </>
  );
}