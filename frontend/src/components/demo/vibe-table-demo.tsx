import React, { useState } from 'react';
import {
  VibeTable,
  VibeTableHeader,
  VibeTableBody,
  VibeTableRow,
  VibeTableCell,
  VibeTableHeaderCell,
  VibeTableContainer,
  type VibeTableColumn
} from '@/components/vibe/vibe-table';
import { VibeBox, VibeFlex, VibeButton, VibeAvatar } from '@/components/vibe';
import { Heading, Text } from '@vibe/core';

// Temporary Badge component replacement
const VibeBadge = ({ text, color, type, ...props }: any) => (
  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
    color === 'positive' ? 'bg-green-100 text-green-800' : 
    color === 'warning' ? 'bg-yellow-100 text-yellow-800' : 
    color === 'negative' ? 'bg-red-100 text-red-800' :
    'bg-gray-100 text-gray-800'
  }`} {...props}>
    {text}
  </span>
);
import { 
  User, 
  Calendar, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Star,
  Edit,
  Trash2,
  MoreHorizontal
} from 'lucide-react';

// Sample data for demonstrations
const sampleProjects = [
  {
    id: '1',
    name: 'Website Redesign',
    status: 'In Progress',
    priority: 'High',
    assignee: 'John Doe',
    dueDate: '2024-02-15',
    progress: 75,
    budget: 15000,
    avatar: 'JD'
  },
  {
    id: '2', 
    name: 'Mobile App Development',
    status: 'Planning',
    priority: 'Medium',
    assignee: 'Jane Smith',
    dueDate: '2024-03-01',
    progress: 25,
    budget: 25000,
    avatar: 'JS'
  },
  {
    id: '3',
    name: 'Database Migration',
    status: 'Completed',
    priority: 'High',
    assignee: 'Mike Johnson',
    dueDate: '2024-01-30',
    progress: 100,
    budget: 8000,
    avatar: 'MJ'
  },
  {
    id: '4',
    name: 'Security Audit',
    status: 'In Progress',
    priority: 'Critical',
    assignee: 'Sarah Wilson',
    dueDate: '2024-02-10',
    progress: 60,
    budget: 12000,
    avatar: 'SW'
  },
  {
    id: '5',
    name: 'Performance Optimization',
    status: 'Planning',
    priority: 'Low',
    assignee: 'Tom Brown',
    dueDate: '2024-04-15',
    progress: 10,
    budget: 5000,
    avatar: 'TB'
  }
];

const sampleTasks = [
  {
    id: '1',
    title: 'Design homepage mockup',
    assignee: 'Alice Cooper',
    status: 'Done',
    priority: 'High',
    created: '2024-01-15',
    tags: ['Design', 'UI/UX']
  },
  {
    id: '2',
    title: 'Implement user authentication',
    assignee: 'Bob Wilson',
    status: 'In Progress',
    priority: 'Critical',
    created: '2024-01-20',
    tags: ['Backend', 'Security']
  },
  {
    id: '3',
    title: 'Write API documentation',
    assignee: 'Carol Davis',
    status: 'To Do',
    priority: 'Medium',
    created: '2024-01-25',
    tags: ['Documentation', 'API']
  }
];

export function VibeTableDemo() {
  const [selectedRows, setSelectedRows] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Project table columns
  const projectColumns: VibeTableColumn[] = [
    {
      id: 'name',
      title: 'Project Name',
      sortable: true,
      render: (value, row) => (
        <VibeFlex align="center" gap="small">
          <Star className="h-4 w-4 text-gray-400" />
          <Text type="text2" weight="medium">{value}</Text>
        </VibeFlex>
      )
    },
    {
      id: 'status',
      title: 'Status',
      sortable: true,
      render: (value) => {
        const colorMap = {
          'Completed': 'positive' as const,
          'In Progress': 'warning' as const,
          'Planning': 'primary' as const
        };
        return (
          <VibeBadge 
            type="indicator" 
            color={colorMap[value as keyof typeof colorMap] || 'dark'} 
            text={value} 
          />
        );
      }
    },
    {
      id: 'priority',
      title: 'Priority',
      sortable: true,
      render: (value) => {
        const colorMap = {
          'Critical': 'negative' as const,
          'High': 'warning' as const,
          'Medium': 'primary' as const,
          'Low': 'dark' as const
        };
        return (
          <VibeBadge 
            type="indicator" 
            color={colorMap[value as keyof typeof colorMap] || 'dark'} 
            text={value} 
          />
        );
      }
    },
    {
      id: 'assignee',
      title: 'Assignee',
      render: (value, row) => (
        <VibeFlex align="center" gap="small">
          <VibeAvatar 
            type="text" 
            text={row.avatar} 
            size="small"
          />
          <Text type="text2">{value}</Text>
        </VibeFlex>
      )
    },
    {
      id: 'dueDate',
      title: 'Due Date',
      sortable: true,
      render: (value) => (
        <VibeFlex align="center" gap="small">
          <Calendar className="h-4 w-4 text-gray-500" />
          <Text type="text2">{new Date(value).toLocaleDateString()}</Text>
        </VibeFlex>
      )
    },
    {
      id: 'progress',
      title: 'Progress',
      render: (value) => (
        <VibeFlex align="center" gap="small">
          <div className="w-16 h-2 bg-gray-200 rounded-full">
            <div 
              className="h-2 bg-blue-500 rounded-full" 
              style={{ width: `${value}%` }}
            />
          </div>
          <Text type="text2" color="secondary">{value}%</Text>
        </VibeFlex>
      )
    },
    {
      id: 'budget',
      title: 'Budget',
      sortable: true,
      render: (value) => (
        <Text type="text2" weight="medium">
          ${value.toLocaleString()}
        </Text>
      )
    },
    {
      id: 'actions',
      title: 'Actions',
      render: () => (
        <VibeFlex align="center" gap="small">
          <VibeButton kind="tertiary" size="small">
            <Edit className="h-4 w-4" />
          </VibeButton>
          <VibeButton kind="tertiary" size="small">
            <Trash2 className="h-4 w-4" />
          </VibeButton>
          <VibeButton kind="tertiary" size="small">
            <MoreHorizontal className="h-4 w-4" />
          </VibeButton>
        </VibeFlex>
      )
    }
  ];

  // Task table columns
  const taskColumns: VibeTableColumn[] = [
    {
      id: 'title',
      title: 'Task',
      sortable: true,
      render: (value) => (
        <Text type="text2" weight="medium">{value}</Text>
      )
    },
    {
      id: 'assignee',
      title: 'Assignee',
      render: (value) => (
        <VibeFlex align="center" gap="small">
          <User className="h-4 w-4 text-gray-500" />
          <Text type="text2">{value}</Text>
        </VibeFlex>
      )
    },
    {
      id: 'status',
      title: 'Status',
      render: (value) => {
        const iconMap = {
          'Done': <CheckCircle className="h-4 w-4 text-green-500" />,
          'In Progress': <Clock className="h-4 w-4 text-yellow-500" />,
          'To Do': <AlertCircle className="h-4 w-4 text-gray-500" />
        };
        return (
          <VibeFlex align="center" gap="small">
            {iconMap[value as keyof typeof iconMap]}
            <Text type="text2">{value}</Text>
          </VibeFlex>
        );
      }
    },
    {
      id: 'priority',
      title: 'Priority',
      render: (value) => (
        <VibeBadge 
          type="indicator" 
          color={value === 'Critical' ? 'negative' : value === 'High' ? 'warning' : 'primary'} 
          text={value} 
        />
      )
    },
    {
      id: 'tags',
      title: 'Tags',
      render: (value) => (
        <VibeFlex gap="small" className="flex-wrap">
          {value.map((tag: string, index: number) => (
            <VibeBadge 
              key={index}
              type="indicator" 
              color="dark" 
              text={tag}
            />
          ))}
        </VibeFlex>
      )
    }
  ];

  const handleSort = (columnId: string, direction: 'asc' | 'desc') => {
    setSortBy(columnId);
    setSortDirection(direction);
  };

  const handleRowClick = (row: any, index: number) => {
    console.log('Row clicked:', row, index);
  };

  const handleCellClick = (value: any, row: any, column: VibeTableColumn, index: number) => {
    console.log('Cell clicked:', { value, row, column, index });
  };

  return (
    <div className="space-y-8 p-6">
      <div className="space-y-4">
        <Heading type="h2">Vibe Table Components Demo</Heading>
        <Text type="text1" color="secondary">
          Demonstration of Vibe Table components with various features and customizations
        </Text>
      </div>

      {/* Basic Table Example */}
      <div className="space-y-4">
        <Heading type="h3">Project Management Table</Heading>
        <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
          <VibeTableContainer>
            <VibeTable
              columns={projectColumns}
              data={sampleProjects}
              size="medium"
              sortBy={sortBy}
              sortDirection={sortDirection}
              onSort={handleSort}
              onRowClick={handleRowClick}
              onCellClick={handleCellClick}
              selectedRows={selectedRows}
              emptyState={
                <div className="text-center py-8">
                  <Text type="text1" color="secondary">No projects found</Text>
                </div>
              }
              errorState={
                <div className="text-center py-8">
                  <Text type="text1" color="negative">Error loading projects</Text>
                </div>
              }
            />
          </VibeTableContainer>
        </VibeBox>
      </div>

      {/* Custom Table Structure */}
      <div className="space-y-4">
        <Heading type="h3">Custom Table Structure</Heading>
        <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
          <VibeTableContainer>
            <VibeTable
              columns={taskColumns}
              size="small"
              withoutBorder
            >
              <VibeTableHeader>
                <VibeTableHeaderCell>Task</VibeTableHeaderCell>
                <VibeTableHeaderCell>Assignee</VibeTableHeaderCell>
                <VibeTableHeaderCell>Status</VibeTableHeaderCell>
                <VibeTableHeaderCell>Priority</VibeTableHeaderCell>
                <VibeTableHeaderCell>Tags</VibeTableHeaderCell>
              </VibeTableHeader>
              <VibeTableBody>
                {sampleTasks.map((task) => (
                  <VibeTableRow key={task.id}>
                    <VibeTableCell>
                      <Text type="text2" weight="medium">{task.title}</Text>
                    </VibeTableCell>
                    <VibeTableCell>
                      <VibeFlex align="center" gap="small">
                        <User className="h-4 w-4 text-gray-500" />
                        <Text type="text2">{task.assignee}</Text>
                      </VibeFlex>
                    </VibeTableCell>
                    <VibeTableCell>
                      <VibeBadge 
                        type="indicator" 
                        color={task.status === 'Done' ? 'positive' : task.status === 'In Progress' ? 'warning' : 'dark'} 
                        text={task.status} 
                      />
                    </VibeTableCell>
                    <VibeTableCell>
                      <VibeBadge 
                        type="indicator" 
                        color={task.priority === 'Critical' ? 'negative' : task.priority === 'High' ? 'warning' : 'primary'} 
                        text={task.priority} 
                      />
                    </VibeTableCell>
                    <VibeTableCell>
                      <VibeFlex gap="small" className="flex-wrap">
                        {task.tags.map((tag, index) => (
                          <VibeBadge 
                            key={index}
                            type="indicator" 
                            color="dark" 
                            text={tag}
                          />
                        ))}
                      </VibeFlex>
                    </VibeTableCell>
                  </VibeTableRow>
                ))}
              </VibeTableBody>
            </VibeTable>
          </VibeTableContainer>
        </VibeBox>
      </div>

      {/* Table Sizes */}
      <div className="space-y-4">
        <Heading type="h3">Table Sizes</Heading>
        <div className="grid grid-cols-1 gap-6">
          {(['small', 'medium', 'large'] as const).map((size) => (
            <VibeBox key={size} border borderColor="uiBorderColor" rounded="medium" padding="medium">
              <div className="mb-4">
                <Text type="text2" weight="medium" className="capitalize">{size} Table</Text>
              </div>
              <VibeTableContainer>
                <VibeTable
                  columns={[
                    { id: 'name', title: 'Name' },
                    { id: 'role', title: 'Role' },
                    { id: 'status', title: 'Status' }
                  ]}
                  data={[
                    { id: '1', name: 'John Doe', role: 'Developer', status: 'Active' },
                    { id: '2', name: 'Jane Smith', role: 'Designer', status: 'Active' }
                  ]}
                  size={size}
                  emptyState={<div>No data</div>}
                  errorState={<div>Error</div>}
                />
              </VibeTableContainer>
            </VibeBox>
          ))}
        </div>
      </div>

      {/* Interactive Features */}
      <div className="space-y-4">
        <Heading type="h3">Interactive Features</Heading>
        <VibeBox border borderColor="uiBorderColor" rounded="medium" padding="medium">
          <div className="space-y-4">
            <VibeFlex align="center" justify="space-between">
              <Text type="text2" weight="medium">
                Selected Rows: {selectedRows.length}
              </Text>
              <VibeFlex gap="small">
                <VibeButton 
                  kind="secondary" 
                  size="small"
                  onClick={() => setSelectedRows([])}
                >
                  Clear Selection
                </VibeButton>
                <VibeButton 
                  kind="primary" 
                  size="small"
                  onClick={() => setSelectedRows(sampleProjects.map(p => p.id))}
                >
                  Select All
                </VibeButton>
              </VibeFlex>
            </VibeFlex>
            
            <VibeTableContainer>
              <VibeTable
                columns={[
                  { id: 'name', title: 'Project', sortable: true },
                  { id: 'status', title: 'Status', sortable: true },
                  { id: 'assignee', title: 'Assignee' }
                ]}
                data={sampleProjects}
                size="medium"
                selectedRows={selectedRows}
                onSelectionChange={setSelectedRows}
                sortBy={sortBy}
                sortDirection={sortDirection}
                onSort={handleSort}
                onRowClick={(row) => {
                  const isSelected = selectedRows.includes(row.id);
                  if (isSelected) {
                    setSelectedRows(prev => prev.filter(id => id !== row.id));
                  } else {
                    setSelectedRows(prev => [...prev, row.id]);
                  }
                }}
                emptyState={<div>No projects</div>}
                errorState={<div>Error loading</div>}
              />
            </VibeTableContainer>
          </div>
        </VibeBox>
      </div>
    </div>
  );
}