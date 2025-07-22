import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, Loader2, X, ArrowUpDown, SlidersHorizontal } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useSearchStore } from '@/stores/search-store';
import { useDebounce } from '@/hooks/use-debounce';
import { searchBoardItems } from '@/services/search-service';
import { BoardItem } from '@/types';

interface SearchResultsProps {
  boardId: string;
  onResultClick?: (itemId: string) => void;
}

export function SearchResults({ boardId, onResultClick }: SearchResultsProps) {
  const { searchQuery, setSearchQuery, clearSearch } = useSearchStore();
  const [sortBy, setSortBy] = useState<'relevance' | 'created' | 'updated'>('relevance');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [activeTab, setActiveTab] = useState('all');
  
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  // Perform search
  const { data, isLoading, error } = useQuery({
    queryKey: ['search-results', debouncedQuery, boardId, sortBy, sortDirection, activeTab],
    queryFn: () => searchBoardItems(boardId, debouncedQuery, {
      saveHistory: true,
      highlightResults: true,
      sortBy,
      sortDirection,
      searchInColumns: activeTab !== 'all' ? [activeTab] : undefined,
    }),
    enabled: debouncedQuery.length > 2,
  });
  
  const handleResultClick = (item: BoardItem) => {
    if (onResultClick) {
      onResultClick(item.id);
    }
  };
  
  const handleSortChange = (newSortBy: 'relevance' | 'created' | 'updated') => {
    if (sortBy === newSortBy) {
      // Toggle direction if same sort field
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(newSortBy);
      setSortDirection('desc'); // Default to descending for new sort field
    }
  };
  
  const getSortLabel = () => {
    switch (sortBy) {
      case 'relevance':
        return 'Relevance';
      case 'created':
        return 'Created Date';
      case 'updated':
        return 'Updated Date';
      default:
        return 'Sort';
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search items..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="absolute right-1 top-1 h-7 w-7 p-0"
              onClick={() => clearSearch()}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-1">
              <ArrowUpDown className="h-3.5 w-3.5" />
              <span>{getSortLabel()}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Sort By</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleSortChange('relevance')}>
              {sortBy === 'relevance' && (sortDirection === 'desc' ? '↓ ' : '↑ ')}
              Relevance
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('created')}>
              {sortBy === 'created' && (sortDirection === 'desc' ? '↓ ' : '↑ ')}
              Created Date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleSortChange('updated')}>
              {sortBy === 'updated' && (sortDirection === 'desc' ? '↓ ' : '↑ ')}
              Updated Date
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        
        <Button variant="outline" size="sm">
          <SlidersHorizontal className="h-3.5 w-3.5 mr-1" />
          Filters
        </Button>
      </div>
      
      <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
          <TabsTrigger value="title">Title</TabsTrigger>
          <TabsTrigger value="description">Description</TabsTrigger>
          <TabsTrigger value="comments">Comments</TabsTrigger>
        </TabsList>
      </Tabs>
      
      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      )}
      
      {error && (
        <div className="py-8 text-center">
          <p className="text-destructive">Error loading search results</p>
        </div>
      )}
      
      {!isLoading && !error && data && data.items.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">No results found</p>
        </div>
      )}
      
      {!isLoading && !error && data && data.items.length > 0 && (
        <>
          <p className="text-sm text-muted-foreground">
            Found {data.pagination.total} results for "{debouncedQuery}"
          </p>
          
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {data.items.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col p-3 border rounded-md cursor-pointer hover:bg-accent"
                  onClick={() => handleResultClick(item)}
                >
                  <div className="font-medium">{item.name}</div>
                  {/* Display highlighted content if available */}
                  {data.highlights && data.highlights[item.id] && (
                    <div className="mt-1 text-sm text-muted-foreground">
                      {data.highlights[item.id].map((highlight, i) => (
                        <div 
                          key={i} 
                          dangerouslySetInnerHTML={{ 
                            __html: highlight.replace(
                              /<em>(.*?)<\/em>/g, 
                              '<span class="bg-yellow-200 dark:bg-yellow-800">$1</span>'
                            ) 
                          }} 
                        />
                      ))}
                    </div>
                  )}
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <span>Created: {new Date(item.createdAt).toLocaleDateString()}</span>
                    <span>•</span>
                    <span>Updated: {new Date(item.updatedAt).toLocaleDateString()}</span>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
          
          {data.pagination.hasNext && (
            <div className="flex justify-center mt-4">
              <Button variant="outline">Load More</Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}