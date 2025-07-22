import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { 
  ArrowLeft, 
  MoreHorizontal, 
  Pencil, 
  Star, 
  Trash2, 
  Users, 
  Download, 
  Upload, 
  Copy, 
  Settings, 
  Share2, 
  UserPlus,
  Filter,
  SlidersHorizontal,
  Eye,
  PlusCircle
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { boardService } from '@/services/board-service';
import { useBoardStore } from '@/stores/board-store';
import { useAuthStore } from '@/stores/auth-store';
import { Board } from '@/types';
import { BoardShareDialog } from '@/components/board/board-share-dialog';
import { BoardSettingsDialog } from '@/components/board/board-settings-dialog';
import { FilterBar } from '@/components/filter';
import { ViewSelector } from '@/components/view';

interface BoardHeaderProps {
  board: Board;
}

export function BoardHeader({ board }: BoardHeaderProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { updateBoard, removeBoard } = useBoardStore();
  const [isEditing, setIsEditing] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false); // This would come from API in real implementation
  const [name, setName] = useState(board.name);
  const [description, setDescription] = useState(board.description || '');
  const [activeView, setActiveView] = useState('table');
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  
  // Mock board members
  const boardMembers = [
    {
      id: '1',
      name: 'John Doe',
      email: 'john@example.com',
      avatarUrl: '',
      role: 'admin',
    },
    {
      id: '2',
      name: 'Jane Smith',
      email: 'jane@example.com',
      avatarUrl: '',
      role: 'member',
    },
    {
      id: '3',
      name: 'Alex Johnson',
      email: 'alex@example.com',
      avatarUrl: '',
      role: 'member',
    },
  ];
  
  const updateBoardMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) => 
      boardService.updateBoard(board.id, data),
    onSuccess: (updatedBoard) => {
      updateBoard(updatedBoard);
      queryClient.invalidateQueries({ queryKey: ['board', board.id] });
      toast({
        title: 'Board updated',
        description: 'Board details have been updated successfully.',
      });
      setIsEditing(false);
    },
    onError: () => {
      toast({
        title: 'Failed to update board',
        description: 'There was an error updating the board. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  const deleteBoardMutation = useMutation({
    mutationFn: () => boardService.deleteBoard(board.id),
    onSuccess: () => {
      removeBoard(board.id);
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toast({
        title: 'Board deleted',
        description: 'The board has been deleted successfully.',
      });
      navigate('/dashboard');
    },
    onError: () => {
      toast({
        title: 'Failed to delete board',
        description: 'There was an error deleting the board. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  const toggleFavoriteMutation = useMutation({
    mutationFn: () => 
      isFavorite 
        ? boardService.removeFavorite(board.id) 
        : boardService.addFavorite(board.id),
    onSuccess: () => {
      setIsFavorite(!isFavorite);
      queryClient.invalidateQueries({ queryKey: ['boards', 'favorites'] });
      toast({
        title: isFavorite ? 'Removed from favorites' : 'Added to favorites',
      });
    },
    onError: () => {
      toast({
        title: 'Failed to update favorites',
        description: 'There was an error updating your favorites. Please try again.',
        variant: 'destructive',
      });
    },
  });
  
  const handleSave = () => {
    if (name.trim().length < 3) {
      toast({
        title: 'Invalid board name',
        description: 'Board name must be at least 3 characters.',
        variant: 'destructive',
      });
      return;
    }
    
    updateBoardMutation.mutate({
      name: name.trim(),
      description: description.trim() || undefined,
    });
  };
  
  const handleCancel = () => {
    setName(board.name);
    setDescription(board.description || '');
    setIsEditing(false);
  };
  
  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this board? This action cannot be undone.')) {
      deleteBoardMutation.mutate();
    }
  };
  
  const handleExport = () => {
    toast({
      title: 'Exporting board',
      description: 'Your board is being exported as JSON.',
    });
    
    // Mock export functionality
    const boardData = {
      ...board,
      exportedAt: new Date().toISOString(),
    };
    
    const dataStr = JSON.stringify(boardData, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    
    const exportFileDefaultName = `${board.name.toLowerCase().replace(/\s+/g, '-')}-export.json`;
    
    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  };
  
  const handleDuplicate = () => {
    toast({
      title: 'Board duplicated',
      description: 'A copy of this board has been created.',
    });
    // In a real implementation, this would call an API to duplicate the board
  };
  
  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-8 w-8 p-0"
            onClick={() => navigate('/dashboard')}
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="sr-only">Back</span>
          </Button>
          
          {isEditing ? (
            <div className="flex-1 space-y-2">
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="text-xl font-bold h-10"
                placeholder="Board name"
              />
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="resize-none"
                placeholder="Add a description (optional)"
                rows={2}
              />
              <div className="flex gap-2">
                <Button onClick={handleSave} size="sm">Save</Button>
                <Button onClick={handleCancel} variant="outline" size="sm">Cancel</Button>
              </div>
            </div>
          ) : (
            <div className="flex-1">
              <h1 className="text-2xl font-bold">{board.name}</h1>
              {board.description && (
                <p className="text-muted-foreground mt-1">{board.description}</p>
              )}
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="icon"
              className={isFavorite ? 'text-yellow-500 hover:text-yellow-600' : ''}
              onClick={() => toggleFavoriteMutation.mutate()}
            >
              <Star className="h-4 w-4" fill={isFavorite ? 'currentColor' : 'none'} />
              <span className="sr-only">{isFavorite ? 'Remove from favorites' : 'Add to favorites'}</span>
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsShareDialogOpen(true)}
            >
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Board Options</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit Board
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setIsSettingsDialogOpen(true)}>
                    <Settings className="mr-2 h-4 w-4" />
                    Board Settings
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuItem onClick={handleDuplicate}>
                    <Copy className="mr-2 h-4 w-4" />
                    Duplicate Board
                  </DropdownMenuItem>
                  <DropdownMenuSub>
                    <DropdownMenuSubTrigger>
                      <Download className="mr-2 h-4 w-4" />
                      Export
                    </DropdownMenuSubTrigger>
                    <DropdownMenuPortal>
                      <DropdownMenuSubContent>
                        <DropdownMenuItem onClick={handleExport}>
                          Export as JSON
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Export as CSV
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          Export as Excel
                        </DropdownMenuItem>
                      </DropdownMenuSubContent>
                    </DropdownMenuPortal>
                  </DropdownMenuSub>
                  <DropdownMenuItem>
                    <Upload className="mr-2 h-4 w-4" />
                    Import Data
                  </DropdownMenuItem>
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuItem 
                  onClick={handleDelete} 
                  className="text-destructive focus:text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete Board
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Tabs defaultValue="table" value={activeView} onValueChange={setActiveView}>
              <TabsList>
                <TabsTrigger value="table">Table</TabsTrigger>
                <TabsTrigger value="kanban">Kanban</TabsTrigger>
                <TabsTrigger value="calendar">Calendar</TabsTrigger>
                <TabsTrigger value="gantt">Gantt</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <ViewSelector boardId={board.id} />
          </div>
          
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="h-4 w-4 mr-2" />
              Customize
            </Button>
            
            <div className="flex -space-x-2">
              {boardMembers.slice(0, 3).map((member) => (
                <Avatar key={member.id} className="h-8 w-8 border-2 border-background">
                  <AvatarImage src={member.avatarUrl} alt={member.name} />
                  <AvatarFallback>
                    {member.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
              ))}
              {boardMembers.length > 3 && (
                <div className="h-8 w-8 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                  +{boardMembers.length - 3}
                </div>
              )}
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8 rounded-full ml-1"
                onClick={() => setIsShareDialogOpen(true)}
              >
                <UserPlus className="h-4 w-4" />
                <span className="sr-only">Add members</span>
              </Button>
            </div>
          </div>
        </div>
      </div>
      
      <div 
        className="h-1 rounded-full" 
        style={{ backgroundColor: board.color }}
      />
      
      <BoardShareDialog 
        open={isShareDialogOpen} 
        onOpenChange={setIsShareDialogOpen}
        boardId={board.id}
        boardName={board.name}
      />
      
      <BoardSettingsDialog
        open={isSettingsDialogOpen}
        onOpenChange={setIsSettingsDialogOpen}
        board={board}
      />
    </div>
  );
}