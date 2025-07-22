import { useState, useRef } from 'react';
import { Comment } from '@/types';
import { CommentItem } from './comment-item';
import { CommentComposer } from './comment-composer';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { boardService } from '@/services/board-service';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { RealTimeComments, TypingIndicator } from '@/components/collaboration';

interface CommentThreadProps {
  itemId: string;
}

export function CommentThread({ itemId }: CommentThreadProps) {
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // Fetch comments for the item
  const { data: comments, isLoading } = useQuery({
    queryKey: ['comments', itemId],
    queryFn: () => boardService.getItemComments(itemId),
    enabled: !!itemId,
  });

  // Create comment mutation
  const createCommentMutation = useMutation({
    mutationFn: boardService.createComment,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['comments', itemId] });
      setReplyingTo(null);
      toast({
        title: "Comment added",
        description: "Your comment has been added successfully",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add comment",
        variant: "destructive",
      });
    }
  });

  // Handle new comment submission
  const handleNewComment = (content: string, mentions: string[]) => {
    createCommentMutation.mutate({
      content,
      itemId,
      mentions,
    });
  };

  // Handle reply submission
  const handleReply = (content: string, mentions: string[]) => {
    if (!replyingTo) return;
    
    createCommentMutation.mutate({
      content,
      itemId,
      parentId: replyingTo,
      mentions,
    });
  };

  // Start replying to a comment
  const handleStartReply = (commentId: string) => {
    setReplyingTo(commentId);
  };

  // Cancel replying
  const handleCancelReply = () => {
    setReplyingTo(null);
  };

  // Handle new real-time comment
  const handleRealTimeComment = (comment: Comment) => {
    // Scroll to bottom when new comment arrives
    if (scrollAreaRef.current) {
      setTimeout(() => {
        scrollAreaRef.current?.scrollTo({
          top: scrollAreaRef.current.scrollHeight,
          behavior: 'smooth'
        });
      }, 100);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <ScrollArea className="flex-1 pr-4" ref={scrollAreaRef}>
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : comments && comments.length > 0 ? (
          <div className="space-y-4">
            {comments.map((comment) => (
              <CommentItem 
                key={comment.id} 
                comment={comment} 
                onReply={handleStartReply}
                isReplying={replyingTo === comment.id}
                onCancelReply={handleCancelReply}
                onSubmitReply={handleReply}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            No comments yet. Be the first to comment!
          </div>
        )}
      </ScrollArea>
      
      <div className="h-6 my-1">
        <TypingIndicator boardId={itemId} itemId={itemId} />
      </div>
      
      <div className="pt-2 border-t">
        <CommentComposer 
          onSubmit={handleNewComment}
          placeholder="Add a comment..."
          buttonText="Comment"
        />
      </div>
      
      {/* Real-time comment updates */}
      <RealTimeComments 
        boardId={itemId.split('-')[0]} // Assuming boardId is the first part of itemId
        itemId={itemId}
        onNewComment={handleRealTimeComment}
      />
    </div>
  );
}