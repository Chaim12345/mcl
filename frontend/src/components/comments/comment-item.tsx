import { useState } from 'react';
import { Comment } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { 
  MoreHorizontal, 
  Reply, 
  Pencil, 
  Trash2, 
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { CommentComposer } from './comment-composer';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { boardService } from '@/services/board-service';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { processMentions } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface CommentItemProps {
  comment: Comment;
  onReply: (commentId: string) => void;
  isReplying: boolean;
  onCancelReply: () => void;
  onSubmitReply: (content: string, mentions: string[]) => void;
}

export function CommentItem({ 
  comment, 
  onReply, 
  isReplying, 
  onCancelReply, 
  onSubmitReply 
}: CommentItemProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();
  
  const isAuthor = user?.id === comment.user.id;
  
  // Format the comment date
  const formattedDate = formatDistanceToNow(new Date(comment.createdAt), { 
    addSuffix: true 
  });
  
  // Update comment mutation
  const updateCommentMutation = useMutation({
    mutationFn: ({ content, mentions }: { content: string; mentions: string[] }) => 
      boardService.updateComment(comment.id, { content, mentions }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', comment.itemId] });
      setIsEditing(false);
      toast({
        title: "Comment updated",
        description: "Your comment has been updated successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update comment",
        variant: "destructive",
      });
    }
  });
  
  // Delete comment mutation
  const deleteCommentMutation = useMutation({
    mutationFn: () => boardService.deleteComment(comment.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', comment.itemId] });
      toast({
        title: "Comment deleted",
        description: "Your comment has been deleted successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete comment",
        variant: "destructive",
      });
    }
  });
  
  // Handle edit submission
  const handleEditSubmit = (content: string, mentions: string[]) => {
    updateCommentMutation.mutate({ content, mentions });
  };
  
  // Handle delete confirmation
  const handleDelete = () => {
    deleteCommentMutation.mutate();
    setIsDeleteDialogOpen(false);
  };
  
  // Process comment content to highlight mentions
  const processContent = (content: string) => {
    return processMentions(content);
  };

  return (
    <div className="flex gap-3">
      <Avatar className="h-8 w-8">
        <AvatarImage src={comment.user.avatar || undefined} />
        <AvatarFallback>
          {comment.user.firstName?.[0]}{comment.user.lastName?.[0]}
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1">
        <div className="bg-muted/50 rounded-lg p-3">
          <div className="flex justify-between items-start">
            <div className="font-medium">
              {comment.user.firstName} {comment.user.lastName}
            </div>
            
            {isAuthor && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => setIsDeleteDialogOpen(true)}
                    className="text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            )}
          </div>
          
          {isEditing ? (
            <CommentComposer
              initialContent={comment.content}
              onSubmit={handleEditSubmit}
              onCancel={() => setIsEditing(false)}
              buttonText="Save"
            />
          ) : (
            <div 
              className="mt-1 text-sm"
              dangerouslySetInnerHTML={{ __html: processContent(comment.content) }}
            />
          )}
        </div>
        
        <div className="flex items-center gap-4 text-xs text-muted-foreground pl-1">
          <div className="flex items-center">
            <Clock className="h-3 w-3 mr-1" />
            {formattedDate}
            {comment.isEdited && <span className="ml-1">(edited)</span>}
          </div>
          
          <Button 
            variant="ghost" 
            size="sm" 
            className="h-6 px-2 text-xs"
            onClick={() => onReply(comment.id)}
          >
            <Reply className="h-3 w-3 mr-1" />
            Reply
          </Button>
        </div>
        
        {isReplying && (
          <div className="mt-2">
            <CommentComposer
              onSubmit={onSubmitReply}
              onCancel={onCancelReply}
              placeholder="Write a reply..."
              buttonText="Reply"
            />
          </div>
        )}
        
        {comment.replies && comment.replies.length > 0 && (
          <div className="mt-3 space-y-3 pl-4 border-l-2 border-muted">
            {comment.replies.map((reply) => (
              <CommentItem
                key={reply.id}
                comment={reply}
                onReply={onReply}
                isReplying={false}
                onCancelReply={onCancelReply}
                onSubmitReply={onSubmitReply}
              />
            ))}
          </div>
        )}
      </div>
      
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure you want to delete this comment?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete your comment
              and remove it from the conversation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDelete}
              className="bg-destructive hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}