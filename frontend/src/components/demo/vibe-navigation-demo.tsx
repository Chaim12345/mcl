import React, { useState } from 'react';
import VibeDropdownNext, { VibeDropdownOption } from '@/components/vibe/vibe-dropdown-next';
import VibeAvatar from '@/components/vibe/vibe-avatar';
import VibeMenuButton from '@/components/vibe/vibe-menu-button';
import { VibeMenu, VibeMenuItem, VibeMenuDivider, VibeMenuTitle } from '@/components/vibe/vibe-menu';
import VibeBox from '@/components/vibe/vibe-box';
import VibeFlex from '@/components/vibe/vibe-flex';
import { VibeButton } from '@/components/vibe/vibe-button';
import { Heading, Text } from '@vibe/core';
import { 
  User, 
  Settings, 
  LogOut, 
  Check, 
  ChevronsUpDown,
  PlusCircle,
  Star,
  Home,
  FileText,
  Calendar,
  Users
} from 'lucide-react';

export function VibeNavigationDemo() {
  const [selectedWorkspace, setSelectedWorkspace] = useState<VibeDropdownOption | null>(null);
  const [selectedProject, setSelectedProject] = useState<VibeDropdownOption | null>(null);

  // Mock workspace options
  const workspaceOptions: VibeDropdownOption[] = [
    { id: '1', label: 'Personal Workspace', value: 'personal' },
    { id: '2', label: 'Team Project', value: 'team' },
    { id: '3', label: 'Marketing Department', value: 'marketing' },
    { id: '4', label: 'Development Team', value: 'dev' },
  ];

  // Mock project options
  const projectOptions: VibeDropdownOption[] = [
    { id: '1', label: 'Website Redesign', value: 'website' },
    { id: '2', label: 'Mobile App', value: 'mobile' },
    { id: '3', label: 'Marketing Campaign', value: 'campaign' },
    { id: '4', label: 'Product Launch', value: 'launch' },
  ];

  // Mock user data
  const mockUser = {
    name: 'John Doe',
    email: 'john.doe@company.com',
    avatar: null,
    initials: 'JD',
  };

  const handleWorkspaceSelect = (option: VibeDropdownOption | VibeDropdownOption[]) => {
    if (Array.isArray(option)) {
      setSelectedWorkspace(option[0] || null);
    } else {
      setSelectedWorkspace(option);
    }
  };

  const handleProjectSelect = (option: VibeDropdownOption | VibeDropdownOption[]) => {
    if (Array.isArray(option)) {
      setSelectedProject(option[0] || null);
    } else {
      setSelectedProject(option);
    }
  };

  // Custom option renderer with icons
  const workspaceOptionRenderer = (option: VibeDropdownOption) => (
    <div className="flex items-center">
      <Check
        className={`mr-2 h-4 w-4 ${
          selectedWorkspace?.id === option.id ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {option.label}
    </div>
  );

  const workspaceValueRenderer = (option: VibeDropdownOption) => (
    <div className="flex items-center justify-between w-full">
      <span>{option.label}</span>
      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
    </div>
  );

  return (
    <div className="space-y-8 p-6">
      <div className="space-y-4">
        <Heading type="h2">Vibe Navigation Components Demo</Heading>
        <Text type="text1" color="secondary">
          Demonstration of enhanced navigation components using Vibe Design System
        </Text>
      </div>

      {/* Dropdown Components */}
      <div className="space-y-4">
        <Heading type="h3">Enhanced Dropdown Components</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
            <Text type="text2" weight="medium" className="mb-4">Workspace Selector</Text>
            <div className="space-y-4">
              <VibeDropdownNext
                options={workspaceOptions}
                value={selectedWorkspace || undefined}
                placeholder="Select workspace"
                searchable
                size="medium"
                className="w-full"
                optionRenderer={workspaceOptionRenderer}
                valueRenderer={workspaceValueRenderer}
                onChange={handleWorkspaceSelect}
                ariaLabel="Workspace selector"
              />
              {selectedWorkspace && (
                <Text type="text2" color="secondary">
                  Selected: {selectedWorkspace.label}
                </Text>
              )}
            </div>
          </VibeBox>

          <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
            <Text type="text2" weight="medium" className="mb-4">Project Selector</Text>
            <div className="space-y-4">
              <VibeDropdownNext
                options={projectOptions}
                value={selectedProject || undefined}
                placeholder="Choose a project"
                searchable
                clearable
                size="medium"
                className="w-full"
                onChange={handleProjectSelect}
                ariaLabel="Project selector"
                helperText="Select a project to work on"
              />
              {selectedProject && (
                <Text type="text2" color="secondary">
                  Selected: {selectedProject.label}
                </Text>
              )}
            </div>
          </VibeBox>
        </div>
      </div>

      {/* Avatar Components */}
      <div className="space-y-4">
        <Heading type="h3">Avatar Components</Heading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
            <Text type="text2" weight="medium" className="mb-4">Text Avatars</Text>
            <VibeFlex direction="row" gap="medium" align="center">
              <VibeAvatar text="JD" size="xs" backgroundColor="primary" />
              <VibeAvatar text="AB" size="small" backgroundColor="positive" />
              <VibeAvatar text="CD" size="medium" backgroundColor="negative" />
              <VibeAvatar text="EF" size="large" backgroundColor="warning" />
            </VibeFlex>
          </VibeBox>

          <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
            <Text type="text2" weight="medium" className="mb-4">Icon Avatars</Text>
            <VibeFlex direction="row" gap="medium" align="center">
              <VibeAvatar icon={<User />} size="xs" backgroundColor="chili-blue" />
              <VibeAvatar icon={<Settings />} size="small" backgroundColor="purple" />
              <VibeAvatar icon={<Star />} size="medium" backgroundColor="done-green" />
              <VibeAvatar icon={<Home />} size="large" backgroundColor="working_orange" />
            </VibeFlex>
          </VibeBox>

          <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
            <Text type="text2" weight="medium" className="mb-4">Square Avatars</Text>
            <VibeFlex direction="row" gap="medium" align="center">
              <VibeAvatar text="SQ" size="small" square backgroundColor="berry" />
              <VibeAvatar icon={<FileText />} size="medium" square backgroundColor="royal" />
              <VibeAvatar text="XY" size="large" square backgroundColor="teal" />
            </VibeFlex>
          </VibeBox>
        </div>
      </div>

      {/* Menu Button Components */}
      <div className="space-y-4">
        <Heading type="h3">Menu Button Components</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
            <Text type="text2" weight="medium" className="mb-4">User Menu</Text>
            <VibeFlex direction="row" gap="medium" align="center">
              <VibeMenuButton
                component={
                  <VibeAvatar
                    text={mockUser.initials}
                    size="small"
                    backgroundColor="primary"
                    ariaLabel={mockUser.name}
                  />
                }
                size="small"
                ariaLabel="User menu"
                dialogPosition="bottom-start"
                tooltipContent="User menu"
                closeMenuOnItemClick
              >
                <VibeMenu size="medium" className="w-56">
                  <VibeMenuTitle>
                    <div className="flex flex-col space-y-1 px-2 py-2">
                      <Text type="text2" weight="medium">
                        {mockUser.name}
                      </Text>
                      <Text type="text2" color="secondary">
                        {mockUser.email}
                      </Text>
                    </div>
                  </VibeMenuTitle>
                  
                  <VibeMenuDivider />
                  
                  <VibeMenuItem
                    title="Profile"
                    icon={<User className="h-4 w-4" />}
                    onClick={() => console.log('Profile clicked')}
                  />
                  
                  <VibeMenuItem
                    title="Settings"
                    icon={<Settings className="h-4 w-4" />}
                    onClick={() => console.log('Settings clicked')}
                  />
                  
                  <VibeMenuDivider />
                  
                  <VibeMenuItem
                    title="Log out"
                    icon={<LogOut className="h-4 w-4" />}
                    onClick={() => console.log('Logout clicked')}
                  />
                </VibeMenu>
              </VibeMenuButton>

              <Text type="text2" color="secondary">
                Click the avatar to open the user menu
              </Text>
            </VibeFlex>
          </VibeBox>

          <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
            <Text type="text2" weight="medium" className="mb-4">Action Menu</Text>
            <VibeFlex direction="row" gap="medium" align="center">
              <VibeMenuButton
                component={<PlusCircle className="h-4 w-4" />}
                text="Add New"
                size="medium"
                ariaLabel="Add new item"
                dialogPosition="bottom-start"
                tooltipContent="Add new item"
                closeMenuOnItemClick
              >
                <VibeMenu size="medium">
                  <VibeMenuItem
                    title="New Project"
                    icon={<FileText className="h-4 w-4" />}
                    onClick={() => console.log('New project')}
                  />
                  
                  <VibeMenuItem
                    title="New Task"
                    icon={<Calendar className="h-4 w-4" />}
                    onClick={() => console.log('New task')}
                  />
                  
                  <VibeMenuItem
                    title="New Team"
                    icon={<Users className="h-4 w-4" />}
                    onClick={() => console.log('New team')}
                  />
                </VibeMenu>
              </VibeMenuButton>

              <Text type="text2" color="secondary">
                Click to see action options
              </Text>
            </VibeFlex>
          </VibeBox>
        </div>
      </div>

      {/* Complex Navigation Example */}
      <div className="space-y-4">
        <Heading type="h3">Complete Navigation Bar Example</Heading>
        <VibeBox
          border
          borderColor="layoutBorderColor"
          rounded="medium"
          backgroundColor="primaryBackgroundColor"
          padding="medium"
        >
          <VibeFlex direction="row" align="center" justify="space-between">
            {/* Left side */}
            <VibeFlex align="center" gap="medium">
              <Heading type="h3" color="primary">
                PMP
              </Heading>
              
              <VibeDropdownNext
                options={workspaceOptions}
                value={selectedWorkspace || undefined}
                placeholder="Select workspace"
                searchable
                size="medium"
                className="w-[200px]"
                optionRenderer={workspaceOptionRenderer}
                valueRenderer={workspaceValueRenderer}
                onChange={handleWorkspaceSelect}
                ariaLabel="Workspace selector"
              />
            </VibeFlex>

            {/* Right side */}
            <VibeFlex align="center" gap="medium">
              <VibeButton kind="secondary" size="small">
                Search
              </VibeButton>
              
              <VibeMenuButton
                component={
                  <VibeAvatar
                    text={mockUser.initials}
                    size="small"
                    backgroundColor="primary"
                    ariaLabel={mockUser.name}
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
                        {mockUser.name}
                      </Text>
                      <Text type="text2" color="secondary">
                        {mockUser.email}
                      </Text>
                    </div>
                  </VibeMenuTitle>
                  
                  <VibeMenuDivider />
                  
                  <VibeMenuItem
                    title="Profile"
                    icon={<User className="h-4 w-4" />}
                    onClick={() => console.log('Profile clicked')}
                  />
                  
                  <VibeMenuItem
                    title="Settings"
                    icon={<Settings className="h-4 w-4" />}
                    onClick={() => console.log('Settings clicked')}
                  />
                  
                  <VibeMenuDivider />
                  
                  <VibeMenuItem
                    title="Log out"
                    icon={<LogOut className="h-4 w-4" />}
                    onClick={() => console.log('Logout clicked')}
                  />
                </VibeMenu>
              </VibeMenuButton>
            </VibeFlex>
          </VibeFlex>
        </VibeBox>
      </div>
    </div>
  );
}