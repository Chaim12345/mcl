import { useEffect, useState } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { Comment } from '@/types';
import { useQueryClient } from '@tanstack/react-query';
import { TypingIndicator } from './typing-indicator';

interface RealTimeCommentsProps {
  boardId: string;
  itemId: string;
  onNewComment?: (comment: Comment) => void;
}

export function RealTimeComments({ boardId, itemId, onNewComment }: RealTimeCommentsProps) {
  const { onCommentAdded, sendTypingIndicator } = useSocket();
  const queryClient = useQueryClient();
  const [isTyping, setIsTyping] = useState(false);
  const [typingTimeout, setTypingTimeout] = useState<NodeJS.Timeout | null>(null);
  
  // Listen for new comments
  useEffect(() => {
    const unsubscribe = onCommentAdded((data) => {
      if (data.itemId === itemId) {
        // Update comments in cache
        queryClient.invalidateQueries({ queryKey: ['comments', itemId] });
        
        // Notify parent component
        if (onNewComment) {
          onNewComment(data.comment);
        }
      }
    });
    
    return () => {
      unsubscribe();
    };
  }, [itemId, onCommentAdded, queryClient, onNewComment]);
  
  // Handle typing in comment box
  const handleTyping = () => {
    if (!isTyping) {
      setIsTyping(true);
      sendTypingIndicator(boardId, itemId, true);
    }
    
    // Clear existing timeout
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    
    // Set new timeout to stop typing indicator after 2 seconds
    const timeout = setTimeout(() => {
      setIsTyping(false);
      sendTypingIndicator(boardId, itemId, false);
    }, 2000);
    
    setTypingTimeout(timeout);
  };
  
  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Ensure typing indicator is turned off when component unmounts
      if (isTyping) {
        sendTypingIndicator(boardId, itemId, false);
      }
    };
  }, [typingTimeout, isTyping, boardId, itemId, sendTypingIndicator]);
  
  // Handle conflict resolution
  const handleConflictResolve = (useRemote: boolean, mergedContent?: string) => {
    // Implementation would depend on how comments are stored and managed
    console.log('Conflict resolved:', { useRemote, mergedContent });
  };

  return (
    <div>
      <TypingIndicator boardId={boardId} itemId={itemId} />
      
      {/* This component doesn't render anything visible by itself,
          it just provides real-time functionality to the comment system */}
    </div>
  );
}