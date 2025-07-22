import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { useWorkspaceStore } from '@/stores/workspace-store';
import { useAuthStore } from '@/stores/auth-store';
import { workspaceService } from '@/services/workspace-service';
import { AuthGuard } from '@/components/auth/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { RecentBoards } from '@/components/board/recent-boards';
import { FavoriteBoards } from '@/components/board/favorite-boards';
import { CreateBoardDialog } from '@/components/board/create-board-dialog';
import { useState } from 'react';

export function DashboardPage() {
  const { setWorkspaces, currentWorkspace, setCurrentWorkspace } = useWorkspaceStore();
  const [isCreateBoardDialogOpen, setIsCreateBoardDialogOpen] = useState(false);
  
  // Fetch workspaces
  const { data: workspaces, isLoading, error } = useQuery({
    queryKey: ['workspaces'],
    queryFn: workspaceService.getWorkspaces,
    retry: false, // Don't retry on error for debugging
  });

  // Update store when workspaces data changes
  useEffect(() => {
    if (workspaces) {
      setWorkspaces(workspaces);
      // Set current workspace if not already set
      if (!currentWorkspace && workspaces.length > 0) {
        setCurrentWorkspace(workspaces[0]);
      }
    }
  }, [workspaces, setWorkspaces, currentWorkspace, setCurrentWorkspace]);
  
  // Mock data for dashboard
  const stats = [
    { title: 'Total Boards', value: '12' },
    { title: 'Active Tasks', value: '48' },
    { title: 'Completed Tasks', value: '32' },
    { title: 'Team Members', value: '8' },
  ];
  
  // Debug logging
  const { user, token, isAuthenticated } = useAuthStore();
  console.log('Dashboard render:', { 
    workspaces, 
    isLoading, 
    error, 
    currentWorkspace,
    authState: { user: user?.firstName, hasToken: !!token, isAuthenticated }
  });

  if (isLoading) {
    return (
      <AuthGuard>
        <MainLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Loading dashboard...</p>
            </div>
          </div>
        </MainLayout>
      </AuthGuard>
    );
  }

  if (error) {
    return (
      <AuthGuard>
        <MainLayout>
          <div className="flex items-center justify-center min-h-[400px]">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Error Loading Dashboard</h2>
              <p className="text-muted-foreground mb-4">
                {error instanceof Error ? error.message : 'Failed to load workspace data'}
              </p>
              <Button onClick={() => window.location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        </MainLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
              <p className="text-muted-foreground">
                Welcome back! Here's an overview of your workspace.
                {!currentWorkspace && workspaces && workspaces.length === 0 && (
                  <span className="block text-yellow-600 mt-1">No workspaces found. Create one to get started.</span>
                )}
              </p>
            </div>
            <Button onClick={() => setIsCreateBoardDialogOpen(true)}>
              <PlusCircle className="mr-2 h-4 w-4" />
              New Board
            </Button>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {stats.map((stat) => (
              <Card key={stat.title}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    {stat.title}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stat.value}</div>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-2">
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>
                  Your team's activity in the past 7 days
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[300px] flex items-center justify-center border rounded-md">
                  <p className="text-muted-foreground">Activity chart will be displayed here</p>
                </div>
              </CardContent>
            </Card>
            
            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Recent Boards</CardTitle>
                  <CardDescription>
                    Your recently accessed boards
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentBoards />
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle>Favorite Boards</CardTitle>
                  <CardDescription>
                    Your starred boards for quick access
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <FavoriteBoards />
                </CardContent>
                <CardFooter className="pt-0">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="w-full"
                    onClick={() => setIsCreateBoardDialogOpen(true)}
                  >
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Create New Board
                  </Button>
                </CardFooter>
              </Card>
            </div>
          </div>
          
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card className="col-span-full">
              <CardHeader>
                <CardTitle>All Boards</CardTitle>
                <CardDescription>
                  Browse all boards in your current workspace
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <p className="text-muted-foreground mb-4">
                      View all your boards in one place
                    </p>
                    <Button asChild>
                      <Link to={`/workspaces/${currentWorkspace?.id || ''}`}>
                        Browse All Boards
                      </Link>
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {currentWorkspace && (
          <CreateBoardDialog
            open={isCreateBoardDialogOpen}
            onOpenChange={setIsCreateBoardDialogOpen}
            workspaceId={currentWorkspace.id}
          />
        )}
      </MainLayout>
    </AuthGuard>
  );
}