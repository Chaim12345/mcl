import React, { useState } from 'react';
import VibeBox from '@/components/vibe/vibe-box';
import VibeFlex from '@/components/vibe/vibe-flex';
import { VibeMenu, VibeMenuItem, VibeMenuDivider, VibeMenuTitle } from '@/components/vibe/vibe-menu';
import { VibeButton } from '@/components/vibe/vibe-button';
import { Heading, Text, Divider } from '@vibe/core';
import { 
  LayoutDashboard, 
  Users, 
  Settings, 
  Home, 
  FileText, 
  Calendar,
  Star,
  Plus
} from 'lucide-react';

export function VibeLayoutDemo() {
  const [selectedItem, setSelectedItem] = useState('dashboard');

  const menuItems = [
    { id: 'dashboard', title: 'Dashboard', icon: <LayoutDashboard className="h-4 w-4" /> },
    { id: 'projects', title: 'Projects', icon: <FileText className="h-4 w-4" /> },
    { id: 'calendar', title: 'Calendar', icon: <Calendar className="h-4 w-4" /> },
    { id: 'team', title: 'Team', icon: <Users className="h-4 w-4" /> },
    { id: 'settings', title: 'Settings', icon: <Settings className="h-4 w-4" /> },
  ];

  const favoriteItems = [
    { id: 'home', title: 'Home', icon: <Home className="h-4 w-4" /> },
    { id: 'starred', title: 'Starred Items', icon: <Star className="h-4 w-4" /> },
  ];

  return (
    <div className="space-y-8 p-6">
      <div className="space-y-4">
        <Heading type="h2">Vibe Layout Components Demo</Heading>
        <Text type="text1" color="secondary">
          Demonstration of Vibe Design System layout and navigation components
        </Text>
      </div>

      {/* Box Component Demo */}
      <div className="space-y-4">
        <Heading type="h3">VibeBox Component</Heading>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <VibeBox
            border
            borderColor="uiBorderColor"
            rounded="medium"
            padding="medium"
            backgroundColor="secondaryBackgroundColor"
          >
            <Text type="text2" weight="medium">Basic Box</Text>
            <Text type="text2" color="secondary">
              A simple box with border and padding
            </Text>
          </VibeBox>

          <VibeBox
            shadow="medium"
            rounded="big"
            padding="large"
            backgroundColor="primaryBackgroundColor"
          >
            <Text type="text2" weight="medium">Shadow Box</Text>
            <Text type="text2" color="secondary">
              Box with shadow and large padding
            </Text>
          </VibeBox>

          <VibeBox
            border
            borderColor="layoutBorderColor"
            rounded="small"
            padding="small"
            backgroundColor="greyBackgroundColor"
            textColor="primaryTextColor"
          >
            <Text type="text2" weight="medium">Styled Box</Text>
            <Text type="text2" color="secondary">
              Custom colors and small padding
            </Text>
          </VibeBox>
        </div>
      </div>

      {/* Flex Component Demo */}
      <div className="space-y-4">
        <Heading type="h3">VibeFlex Component</Heading>
        <div className="space-y-4">
          <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
            <Text type="text2" weight="medium" className="mb-2">Row Layout</Text>
            <VibeFlex direction="row" align="center" gap="medium">
              <VibeBox backgroundColor="secondaryBackgroundColor" padding="small" rounded="small">
                <Text type="text2">Item 1</Text>
              </VibeBox>
              <VibeBox backgroundColor="secondaryBackgroundColor" padding="small" rounded="small">
                <Text type="text2">Item 2</Text>
              </VibeBox>
              <VibeBox backgroundColor="secondaryBackgroundColor" padding="small" rounded="small">
                <Text type="text2">Item 3</Text>
              </VibeBox>
            </VibeFlex>
          </VibeBox>

          <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
            <Text type="text2" weight="medium" className="mb-2">Column Layout with Justify</Text>
            <VibeFlex direction="column" align="stretch" gap="small" style={{ height: '120px' }}>
              <VibeBox backgroundColor="secondaryBackgroundColor" padding="small" rounded="small">
                <Text type="text2">Header</Text>
              </VibeBox>
              <VibeBox backgroundColor="greyBackgroundColor" padding="small" rounded="small" className="flex-1">
                <Text type="text2">Content (flex-1)</Text>
              </VibeBox>
              <VibeBox backgroundColor="secondaryBackgroundColor" padding="small" rounded="small">
                <Text type="text2">Footer</Text>
              </VibeBox>
            </VibeFlex>
          </VibeBox>
        </div>
      </div>

      {/* Menu Component Demo */}
      <div className="space-y-4">
        <Heading type="h3">VibeMenu Components</Heading>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
            <Text type="text2" weight="medium" className="mb-4">Navigation Menu</Text>
            <VibeMenu size="medium">
              {menuItems.map((item) => (
                <VibeMenuItem
                  key={item.id}
                  title={item.title}
                  icon={item.icon}
                  selected={selectedItem === item.id}
                  onClick={() => setSelectedItem(item.id)}
                />
              ))}
            </VibeMenu>
          </VibeBox>

          <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
            <Text type="text2" weight="medium" className="mb-4">Organized Menu</Text>
            <VibeMenu size="medium">
              <VibeMenuTitle>
                <Text type="text2" color="secondary" weight="medium">FAVORITES</Text>
              </VibeMenuTitle>
              {favoriteItems.map((item) => (
                <VibeMenuItem
                  key={item.id}
                  title={item.title}
                  icon={item.icon}
                  selected={selectedItem === item.id}
                  onClick={() => setSelectedItem(item.id)}
                />
              ))}
              
              <VibeMenuDivider />
              
              <VibeMenuTitle>
                <Text type="text2" color="secondary" weight="medium">MAIN</Text>
              </VibeMenuTitle>
              {menuItems.slice(0, 3).map((item) => (
                <VibeMenuItem
                  key={item.id}
                  title={item.title}
                  icon={item.icon}
                  selected={selectedItem === item.id}
                  onClick={() => setSelectedItem(item.id)}
                />
              ))}
              
              <VibeMenuItem
                title="Add New Item"
                icon={<Plus className="h-4 w-4" />}
                onClick={() => console.log('Add new item')}
              />
            </VibeMenu>
          </VibeBox>
        </div>
      </div>

      {/* Complex Layout Demo */}
      <div className="space-y-4">
        <Heading type="h3">Complex Layout Example</Heading>
        <VibeBox
          border
          borderColor="layoutBorderColor"
          rounded="medium"
          backgroundColor="primaryBackgroundColor"
          style={{ height: '400px' }}
        >
          <VibeFlex direction="row" className="h-full">
            {/* Sidebar */}
            <VibeBox
              border
              borderColor="layoutBorderColor"
              backgroundColor="secondaryBackgroundColor"
              className="w-64 border-r"
            >
              <VibeFlex direction="column" className="h-full">
                <VibeBox padding="medium" border borderColor="layoutBorderColor" className="border-b">
                  <Heading type="h3">Sidebar</Heading>
                </VibeBox>
                <VibeBox padding="small" className="flex-1">
                  <VibeMenu size="small">
                    {menuItems.map((item) => (
                      <VibeMenuItem
                        key={item.id}
                        title={item.title}
                        icon={item.icon}
                        selected={selectedItem === item.id}
                        onClick={() => setSelectedItem(item.id)}
                      />
                    ))}
                  </VibeMenu>
                </VibeBox>
                <VibeBox padding="medium" className="mt-auto">
                  <VibeButton kind="primary" size="small" className="w-full">
                    <Plus className="mr-2 h-4 w-4" />
                    Add Item
                  </VibeButton>
                </VibeBox>
              </VibeFlex>
            </VibeBox>

            {/* Main Content */}
            <VibeFlex direction="column" className="flex-1">
              {/* Header */}
              <VibeBox
                padding="medium"
                border
                borderColor="layoutBorderColor"
                backgroundColor="primaryBackgroundColor"
                className="border-b"
              >
                <VibeFlex align="center" justify="space-between">
                  <Heading type="h3">Main Content</Heading>
                  <VibeButton kind="secondary" size="small">
                    Action
                  </VibeButton>
                </VibeFlex>
              </VibeBox>

              {/* Content Area */}
              <VibeBox padding="large" className="flex-1">
                <VibeFlex direction="column" gap="medium" className="h-full">
                  <Text type="text1">
                    Selected: <strong>{selectedItem}</strong>
                  </Text>
                  <VibeBox
                    backgroundColor="greyBackgroundColor"
                    padding="large"
                    rounded="medium"
                    className="flex-1"
                  >
                    <VibeFlex direction="column" align="center" justify="center" className="h-full">
                      <Text type="text1" color="secondary">
                        Content area for {selectedItem}
                      </Text>
                      <Text type="text2" color="secondary">
                        This demonstrates a complex layout using Vibe components
                      </Text>
                    </VibeFlex>
                  </VibeBox>
                </VibeFlex>
              </VibeBox>
            </VibeFlex>
          </VibeFlex>
        </VibeBox>
      </div>
    </div>
  );
}