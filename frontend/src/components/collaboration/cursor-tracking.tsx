import { useEffect, useState, useRef } from 'react';
import { useSocket } from '@/hooks/use-socket';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';

interface CursorTrackingProps {
  boardId: string;
  containerRef: React.RefObject<HTMLElement>;
  enabled?: boolean;
}

interface CursorPosition {
  userId: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  x: number;
  y: number;
  timestamp: string;
}

export function CursorTracking({ boardId, containerRef, enabled = true }: CursorTrackingProps) {
  const { cursorPositions, sendCursorPosition } = useSocket();
  const [localCursors, setLocalCursors] = useState<Record<string, CursorPosition>>({});
  const throttleRef = useRef<NodeJS.Timeout | null>(null);
  
  // Track mouse movement
  useEffect(() => {
    if (!enabled || !containerRef.current) return;
    
    const container = containerRef.current;
    
    const handleMouseMove = (e: MouseEvent) => {
      // Throttle updates to avoid flooding the socket
      if (throttleRef.current) return;
      
      // Get relative position within container
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 100; // percentage
      const y = ((e.clientY - rect.top) / rect.height) * 100; // percentage
      
      // Send position to server
      sendCursorPosition(boardId, x, y);
      
      // Set throttle
      throttleRef.current = setTimeout(() => {
        throttleRef.current = null;
      }, 100); // 10 updates per second max
    };
    
    container.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      container.removeEventListener('mousemove', handleMouseMove);
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
      }
    };
  }, [boardId, containerRef, enabled, sendCursorPosition]);
  
  // Process incoming cursor positions
  useEffect(() => {
    const positions: Record<string, CursorPosition> = {};
    
    Object.values(cursorPositions).forEach(data => {
      if (data.boardId === boardId) {
        positions[data.user.id] = {
          userId: data.user.id,
          firstName: data.user.firstName,
          lastName: data.user.lastName,
          avatar: data.user.avatar,
          x: data.x,
          y: data.y,
          timestamp: data.timestamp,
        };
      }
    });
    
    setLocalCursors(positions);
  }, [cursorPositions, boardId]);
  
  if (!enabled || !containerRef.current || Object.keys(localCursors).length === 0) {
    return null;
  }

  return (
    <>
      <AnimatePresence>
        {Object.values(localCursors).map((cursor) => (
          <motion.div
            key={cursor.userId}
            className="absolute pointer-events-none z-50"
            initial={{ opacity: 0 }}
            animate={{ 
              opacity: 1,
              left: `${cursor.x}%`,
              top: `${cursor.y}%`,
            }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <div className="relative">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="text-primary"
              >
                <path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z" />
              </svg>
              
              <div className="absolute -right-1 -bottom-1">
                <Avatar className="h-6 w-6 border-2 border-background">
                  <AvatarImage src={cursor.avatar} />
                  <AvatarFallback className="text-xs">
                    {cursor.firstName?.[0]}{cursor.lastName?.[0]}
                  </AvatarFallback>
                </Avatar>
              </div>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </>
  );
}