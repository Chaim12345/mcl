import { useEffect } from 'react';
import { useSocket } from '@/hooks/use-socket';

interface TypingIndicatorProps {
  boardId: string;
  itemId?: string;
  onTyping?: (isTyping: boolean, userId: string) => void;
}

export function TypingIndicator({ boardId, itemId, onTyping }: TypingIndicatorProps) {
  const { typingUsers } = useSocket();
  
  // Filter typing users for this item or board
  const relevantTypingUsers = Object.values(typingUsers).filter(data => {
    if (itemId) {
      return data.boardId === boardId && data.itemId === itemId;
    }
    return data.boardId === boardId;
  });
  
  // Notify parent component when typing status changes
  useEffect(() => {
    if (onTyping && relevantTypingUsers.length > 0) {
      relevantTypingUsers.forEach(user => {
        onTyping(true, user.user.id);
      });
    }
    
    return () => {
      if (onTyping && relevantTypingUsers.length > 0) {
        relevantTypingUsers.forEach(user => {
          onTyping(false, user.user.id);
        });
      }
    };
  }, [relevantTypingUsers, onTyping]);
  
  if (relevantTypingUsers.length === 0) {
    return null;
  }

  // Format typing message
  const formatTypingMessage = () => {
    if (relevantTypingUsers.length === 1) {
      const user = relevantTypingUsers[0].user;
      return `${user.firstName} ${user.lastName} is typing...`;
    } else if (relevantTypingUsers.length === 2) {
      const user1 = relevantTypingUsers[0].user;
      const user2 = relevantTypingUsers[1].user;
      return `${user1.firstName} and ${user2.firstName} are typing...`;
    } else {
      return `${relevantTypingUsers.length} people are typing...`;
    }
  };

  return (
    <div className="text-xs text-muted-foreground italic flex items-center">
      <span className="typing-dots mr-1">
        <span className="dot"></span>
        <span className="dot"></span>
        <span className="dot"></span>
      </span>
      {formatTypingMessage()}
      
      <style>{`
        .typing-dots {
          display: inline-flex;
          align-items: center;
        }
        
        .dot {
          width: 4px;
          height: 4px;
          margin: 0 1px;
          background-color: currentColor;
          border-radius: 50%;
          opacity: 0.6;
          animation: pulse 1.5s infinite ease-in-out;
        }
        
        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        
        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        
        @keyframes pulse {
          0%, 100% {
            transform: scale(1);
            opacity: 0.6;
          }
          50% {
            transform: scale(1.5);
            opacity: 1;
          }
        }
      `}</style>
    </div>
  );
}