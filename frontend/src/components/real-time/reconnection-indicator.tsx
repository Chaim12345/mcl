import React, { useEffect, useState } from 'react';
import { Loader2, WifiOff } from 'lucide-react';
import { socketService } from '@/services/socket-service';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface ReconnectionIndicatorProps {
  className?: string;
}

export function ReconnectionIndicator({ className }: ReconnectionIndicatorProps) {
  const [status, setStatus] = useState<'connected' | 'disconnected' | 'reconnecting' | 'failed'>('connected');
  const [attempt, setAttempt] = useState(0);
  const [visible, setVisible] = useState(false);
  
  useEffect(() => {
    // Listen for connection status changes
    const unsubscribe = socketService.on('connection-status', (data: { 
      status: 'connected' | 'disconnected' | 'reconnecting' | 'failed';
      attempt?: number;
    }) => {
      setStatus(data.status);
      
      if (data.attempt !== undefined) {
        setAttempt(data.attempt);
      }
      
      // Show indicator when disconnected or reconnecting
      setVisible(data.status === 'disconnected' || data.status === 'reconnecting' || data.status === 'failed');
    });
    
    return unsubscribe;
  }, []);
  
  const handleReconnect = () => {
    // Disconnect and reinitialize socket
    socketService.disconnect();
    socketService.initialize();
  };
  
  if (!visible) {
    return null;
  }
  
  return (
    <div 
      className={cn(
        "fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-md border bg-background p-3 shadow-md",
        className
      )}
    >
      {status === 'reconnecting' ? (
        <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
      ) : (
        <WifiOff className="h-4 w-4 text-destructive" />
      )}
      
      <div className="text-sm">
        {status === 'disconnected' && (
          <span>Connection lost. Attempting to reconnect...</span>
        )}
        {status === 'reconnecting' && (
          <span>Reconnecting... (Attempt {attempt})</span>
        )}
        {status === 'failed' && (
          <span>Connection failed. Please try again.</span>
        )}
      </div>
      
      {status === 'failed' && (
        <Button size="sm" onClick={handleReconnect}>
          Reconnect
        </Button>
      )}
    </div>
  );
}