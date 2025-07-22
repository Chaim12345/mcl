import React, { useEffect } from 'react';
import { useNotificationStore } from '@/stores/notification-store';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';

export function NotificationPreferences() {
  const { 
    preferences, 
    isPreferencesLoading, 
    fetchPreferences, 
    updatePreferences 
  } = useNotificationStore();
  
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);
  
  const handleToggle = (key: string, value: boolean) => {
    updatePreferences({ [key]: value });
  };
  
  if (isPreferencesLoading) {
    return (
      <div className="flex items-center justify-center p-6">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }
  
  if (!preferences) {
    return (
      <div className="flex items-center justify-center p-6 text-center">
        <p className="text-sm text-muted-foreground">
          Failed to load notification preferences
        </p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4 p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="email-notifications">Email notifications</Label>
          <p className="text-xs text-muted-foreground">
            Receive notifications via email
          </p>
        </div>
        <Switch
          id="email-notifications"
          checked={preferences.emailNotifications}
          onCheckedChange={(checked) => handleToggle('emailNotifications', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="push-notifications">Push notifications</Label>
          <p className="text-xs text-muted-foreground">
            Receive push notifications in browser
          </p>
        </div>
        <Switch
          id="push-notifications"
          checked={preferences.pushNotifications}
          onCheckedChange={(checked) => handleToggle('pushNotifications', checked)}
        />
      </div>
      
      <div className="h-px bg-border my-4" />
      
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="mention-notifications">Mentions</Label>
          <p className="text-xs text-muted-foreground">
            When someone mentions you in a comment
          </p>
        </div>
        <Switch
          id="mention-notifications"
          checked={preferences.mentionNotifications}
          onCheckedChange={(checked) => handleToggle('mentionNotifications', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="assignment-notifications">Assignments</Label>
          <p className="text-xs text-muted-foreground">
            When you are assigned to an item
          </p>
        </div>
        <Switch
          id="assignment-notifications"
          checked={preferences.assignmentNotifications}
          onCheckedChange={(checked) => handleToggle('assignmentNotifications', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="comment-notifications">Comments</Label>
          <p className="text-xs text-muted-foreground">
            When someone comments on your items
          </p>
        </div>
        <Switch
          id="comment-notifications"
          checked={preferences.commentNotifications}
          onCheckedChange={(checked) => handleToggle('commentNotifications', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="due-date-reminders">Due date reminders</Label>
          <p className="text-xs text-muted-foreground">
            Reminders for upcoming due dates
          </p>
        </div>
        <Switch
          id="due-date-reminders"
          checked={preferences.dueDateReminders}
          onCheckedChange={(checked) => handleToggle('dueDateReminders', checked)}
        />
      </div>
      
      <div className="flex items-center justify-between">
        <div className="space-y-0.5">
          <Label htmlFor="workspace-invitations">Workspace invitations</Label>
          <p className="text-xs text-muted-foreground">
            When you are invited to a workspace
          </p>
        </div>
        <Switch
          id="workspace-invitations"
          checked={preferences.workspaceInvitations}
          onCheckedChange={(checked) => handleToggle('workspaceInvitations', checked)}
        />
      </div>
    </div>
  );
}