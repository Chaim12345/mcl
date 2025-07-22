import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { PlusCircle, Settings, Users } from 'lucide-react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { workspaceService } from '@/services/workspace-service';
import { Workspace } from '@/types';
import { WorkspaceMembers } from '@/components/workspace/workspace-members';
import { WorkspaceSettings } from '@/components/workspace/workspace-settings';
import { CreateWorkspaceDialog } from '@/components/workspace/create-workspace-dialog';
import { BoardList } from '@/components/board/board-list';

export function WorkspacePage() {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { workspaces, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  
  // Fetch workspace details if ID is provided
  const { data: workspace, isLoading: isWorkspaceLoading } = useQuery({
    queryKey: ['workspace', workspaceId],
    queryFn: () => workspaceId ? workspaceService.getWorkspace(workspaceId) : null,
    enabled: !!workspaceId,
  });

  // Update store when workspace data changes
  useEffect(() => {
    if (workspace) {
      setCurrentWorkspace(workspace);
    }
  }, [workspace, setCurrentWorkspace]);
  
  // Fetch workspaces if not already loaded
  const { data: fetchedWorkspaces, isLoading: isWorkspacesLoading } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceService.getWorkspaces,
    enabled: workspaces.length === 0,
  });

  // Update store when workspaces data changes
  useEffect(() => {
    if (fetchedWorkspaces && fetchedWorkspaces.length > 0 && !currentWorkspace) {
      setCurrentWorkspace(fetchedWorkspaces[0]);
    }
  }, [fetchedWorkspaces, currentWorkspace, setCurrentWorkspace]);
  
  // Set current workspace if not set and workspaces are available
  useEffect(() => {
    if (!currentWorkspace && workspaces.length > 0) {
      setCurrentWorkspace(workspaces[0]);
    }
  }, [currentWorkspace, workspaces, setCurrentWorkspace]);
  
  const displayWorkspace = workspace || currentWorkspace;
  const isLoading = isWorkspaceLoading || isWorkspacesLoading;
  
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Workspaces</h1>
              <p className="text-muted-foreground">
                Manage your workspaces and team members
              </p>
            </div>
            <Button onClick={() => setIsCreateDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Workspace
            </Button>
          </div>
          
          {isLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-muted-foreground">Loading workspace...</p>
            </div>
          ) : displayWorkspace ? (
            <Tabs defaultValue="boards" className="space-y-4">
              <TabsList>
                <TabsTrigger value="boards">Boards</TabsTrigger>
                <TabsTrigger value="members">Members</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>
              
              <TabsContent value="boards" className="space-y-4">
                <BoardList workspaceId={displayWorkspace?.id || ''} />
              </TabsContent>
              
              <TabsContent value="members" className="space-y-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>
                        Invite and manage team members for this workspace
                      </CardDescription>
                    </div>
                    <Button variant="outline" size="sm">
                      <Users className="mr-2 h-4 w-4" />
                      Invite Members
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <WorkspaceMembers workspaceId={displayWorkspace?.id || ''} />
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="settings" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Workspace Settings</CardTitle>
                    <CardDescription>
                      Manage workspace details and preferences
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <WorkspaceSettings workspace={displayWorkspace as Workspace} />
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <p className="text-muted-foreground">No workspaces found</p>
              <Button onClick={() => setIsCreateDialogOpen(true)}>
                Create Your First Workspace
              </Button>
            </div>
          )}
        </div>
        
        <CreateWorkspaceDialog 
          open={isCreateDialogOpen} 
          onOpenChange={setIsCreateDialogOpen} 
        />
      </MainLayout>
    </AuthGuard>
  );
}