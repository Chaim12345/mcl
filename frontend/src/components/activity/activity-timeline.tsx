import { useState } from 'react';
import { Activity } from '@/types';
import { useQuery } from '@tanstack/react-query';
import { activityService } from '@/services/activity-service';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  Download,
  Filter,
  Search,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { formatDistanceToNow, format } from 'date-fns';
import { ActivityItem } from './activity-item';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Badge } from '@/components/ui/badge';

interface ActivityTimelineProps {
  itemId?: string;
  userId?: string;
}

export function ActivityTimeline({ itemId, userId }: ActivityTimelineProps) {
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [filterType, setFilterType] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [isFilterOpen, setIsFilterOpen] = useState(false);

  // Fetch activities
  const { data, isLoading, isError } = useQuery({
    queryKey: ['activities', itemId, userId, page, limit, sortOrder, filterType, startDate, endDate],
    queryFn: () => {
      const params: any = {
        page,
        limit,
        sortOrder,
      };

      if (filterType) params.entityType = filterType;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      if (itemId) {
        return activityService.getItemActivities(itemId, params);
      } else if (userId) {
        return activityService.getUserActivities(userId, params);
      } else {
        return activityService.getActivities(params);
      }
    },
  });

  // Handle export
  const handleExport = async () => {
    try {
      const params: any = {};
      if (itemId) params.itemId = itemId;
      if (userId) params.userId = userId;
      if (filterType) params.entityType = filterType;
      if (startDate) params.startDate = startDate.toISOString();
      if (endDate) params.endDate = endDate.toISOString();

      const blob = await activityService.exportActivities(params);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `activities_export_${format(new Date(), 'yyyy-MM-dd')}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to export activities', error);
    }
  };

  // Handle pagination
  const handlePrevPage = () => {
    if (page > 1) {
      setPage(page - 1);
    }
  };

  const handleNextPage = () => {
    if (data?.pagination.hasNext) {
      setPage(page + 1);
    }
  };

  // Handle filter changes
  const handleFilterChange = (type: string | null) => {
    setFilterType(type);
    setPage(1);
  };

  // Handle date filter changes
  const handleStartDateChange = (date: Date | undefined) => {
    setStartDate(date || null);
    setPage(1);
  };

  const handleEndDateChange = (date: Date | undefined) => {
    setEndDate(date || null);
    setPage(1);
  };

  // Clear all filters
  const handleClearFilters = () => {
    setFilterType(null);
    setStartDate(null);
    setEndDate(null);
    setSearchQuery('');
    setPage(1);
  };

  // Group activities by date
  const groupActivitiesByDate = (activities: Activity[]) => {
    const groups: { [key: string]: Activity[] } = {};
    
    activities.forEach(activity => {
      const date = new Date(activity.createdAt).toDateString();
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(activity);
    });
    
    return Object.entries(groups).map(([date, activities]) => ({
      date,
      activities,
    }));
  };

  const groupedActivities = data?.activities ? groupActivitiesByDate(data.activities) : [];

  return (
    <div className="flex flex-col h-full">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-2">
          <Select value={sortOrder} onValueChange={(value: 'asc' | 'desc') => setSortOrder(value)}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Sort order" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="desc">Newest first</SelectItem>
              <SelectItem value="asc">Oldest first</SelectItem>
            </SelectContent>
          </Select>
          
          <Popover open={isFilterOpen} onOpenChange={setIsFilterOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1">
                <Filter className="h-4 w-4" />
                Filter
                {(filterType || startDate || endDate) && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1">
                    {(filterType ? 1 : 0) + (startDate || endDate ? 1 : 0)}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-80">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Activity Type</Label>
                  <Select 
                    value={filterType || ''} 
                    onValueChange={(value) => handleFilterChange(value || null)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All activity types" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All activity types</SelectItem>
                      <SelectItem value="item">Item activities</SelectItem>
                      <SelectItem value="comment">Comment activities</SelectItem>
                      <SelectItem value="board">Board activities</SelectItem>
                      <SelectItem value="workspace">Workspace activities</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Date Range</Label>
                  <div className="flex gap-2">
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {startDate ? format(startDate, 'PPP') : "Start date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={startDate || undefined}
                          onSelect={handleStartDateChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {endDate ? format(endDate, 'PPP') : "End date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <CalendarComponent
                          mode="single"
                          selected={endDate || undefined}
                          onSelect={handleEndDateChange}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
                
                <div className="flex justify-between">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleClearFilters}
                  >
                    Clear filters
                  </Button>
                  <Button 
                    size="sm" 
                    onClick={() => setIsFilterOpen(false)}
                  >
                    Apply filters
                  </Button>
                </div>
              </div>
            </PopoverContent>
          </Popover>
        </div>
        
        <Button 
          variant="outline" 
          size="sm" 
          className="gap-1"
          onClick={handleExport}
        >
          <Download className="h-4 w-4" />
          Export
        </Button>
      </div>
      
      <ScrollArea className="flex-1">
        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
            <Skeleton className="h-16 w-full" />
          </div>
        ) : isError ? (
          <div className="text-center py-8 text-destructive">
            Failed to load activities. Please try again.
          </div>
        ) : data?.activities.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No activities found.
          </div>
        ) : (
          <div className="space-y-6">
            {groupedActivities.map((group) => (
              <div key={group.date} className="space-y-2">
                <div className="sticky top-0 bg-background z-10 py-1 flex items-center gap-2">
                  <div className="h-px flex-1 bg-border"></div>
                  <span className="text-xs font-medium text-muted-foreground">
                    {new Date(group.date).toLocaleDateString(undefined, { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                  <div className="h-px flex-1 bg-border"></div>
                </div>
                
                <div className="space-y-2 pl-2">
                  {group.activities.map((activity) => (
                    <ActivityItem key={activity.id} activity={activity} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
      
      {data && data.pagination.totalPages > 1 && (
        <div className="flex justify-between items-center mt-4 pt-2 border-t">
          <div className="text-sm text-muted-foreground">
            Page {page} of {data.pagination.totalPages}
          </div>
          
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevPage}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={handleNextPage}
              disabled={!data.pagination.hasNext}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}