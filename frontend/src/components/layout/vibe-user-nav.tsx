import { useNavigate } from 'react-router-dom';
import {
  LogOut,
  Settings,
  User,
  Palette,
} from 'lucide-react';

import { VibeAvatar, VibeMenuButton, VibeMenu, VibeMenuItem, VibeMenuDivider, VibeMenuTitle, VibeThemeSwitcher } from '@/components/vibe';
import { Text } from '@vibe/core';
import { useAuthStore } from '@/stores/auth-store';
import { authService } from '@/services/auth-service';
import { useVibeToast } from '@/hooks/use-vibe-toast';

export function VibeUserNav() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { toast } = useVibeToast();
  
  const handleLogout = async () => {
    try {
      await authService.logout();
      logout();
      toast.success('Logged out successfully');
      navigate('/login');
    } catch (error) {
      toast.error('Error logging out');
    }
  };
  
  const userInitials = user 
    ? `${user.firstName.charAt(0)}${user.lastName.charAt(0)}` 
    : 'U';
  
  const userDisplayName = user 
    ? `${user.firstName} ${user.lastName}`
    : 'User';

  return (
    <VibeMenuButton
      component={
        <VibeAvatar
          src={user?.avatarUrl}
          text={userInitials}
          size="small"
          ariaLabel={userDisplayName}
          className="h-8 w-8"
        />
      }
      size="small"
      ariaLabel="User menu"
      dialogPosition="bottom-end"
      tooltipContent="User menu"
      closeMenuOnItemClick
    >
      <VibeMenu size="medium" className="w-56">
        <VibeMenuTitle>
          <div className="flex flex-col space-y-1 px-2 py-2">
            <Text type="text2" weight="medium">
              {userDisplayName}
            </Text>
            <Text type="text2" color="secondary">
              {user?.email}
            </Text>
          </div>
        </VibeMenuTitle>
        
        <VibeMenuDivider />
        
        <VibeMenuItem
          title="Profile"
          icon={<User className="h-4 w-4" />}
          onClick={() => navigate('/profile')}
          tooltipContent="⇧⌘P"
        />
        
        <VibeMenuItem
          title="Settings"
          icon={<Settings className="h-4 w-4" />}
          onClick={() => navigate('/settings')}
          tooltipContent="⌘S"
        />
        
        <VibeMenuItem
          title={
            <div className="flex items-center justify-between w-full">
              <span>Theme</span>
              <VibeThemeSwitcher variant="button" size="small" />
            </div>
          }
          icon={<Palette className="h-4 w-4" />}
        />
        
        <VibeMenuDivider />
        
        <VibeMenuItem
          title="Log out"
          icon={<LogOut className="h-4 w-4" />}
          onClick={handleLogout}
          tooltipContent="⇧⌘Q"
        />
      </VibeMenu>
    </VibeMenuButton>
  );
}