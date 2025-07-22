import React, { useEffect, useState } from 'react';
import { Wifi, WifiOff, AlertCircle } from 'lucide-react';
import { socketService } from '@/services/socket-service';
import { cn } from '@/lib/utils';

type ConnectionStatus = 'connected' | 'disconnected' | 'reconnecting' | 'failed';

interface ConnectionStatusProps {
  className?: string;
  showLabel?: boolean;
}

export function ConnectionStatus({ className, showLabel = true }: ConnectionStatusProps) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [attempt, setAttempt] = useState(0);
  
  useEffect(() => {
    // Initialize socket if not already connected
    if (!socketService.isConnected()) {
      socketService.initialize();
    }
    
    // Set initial status
    setStatus(socketService.isConnected() ? 'connected' : 'disconnected');
    
    // Listen for connection status changes
    const unsubscribe = socketService.on('connection-status', (data: { 
      status: ConnectionStatus;
      attempt?: number;
    }) => {
      setStatus(data.status);
      if (data.attempt !== undefined) {
        setAttempt(data.attempt);
      }
    });
    
    return unsubscribe;
  }, []);
  
  const getStatusIcon = () => {
    switch (status) {
      case 'connected':
        return <Wifi className="h-4 w-4 text-green-500" />;
      case 'disconnected':
        return <WifiOff className="h-4 w-4 text-yellow-500" />;
      case 'reconnecting':
        return <Wifi className="h-4 w-4 text-yellow-500 animate-pulse" />;
      case 'failed':
        return <AlertCircle className="h-4 w-4 text-destructive" />;
    }
  };
  
  const getStatusLabel = () => {
    switch (status) {
      case 'connected':
        return 'Connected';
      case 'disconnected':
        return 'Disconnected';
      case 'reconnecting':
        return `Reconnecting (${attempt})`;
      case 'failed':
        return 'Connection failed';
    }
  };
  
  return (
    <div 
      className={cn(
        "flex items-center gap-1.5 text-xs",
        className
      )}
    >
      {getStatusIcon()}
      {showLabel && <span>{getStatusLabel()}</span>}
    </div>
  );
}