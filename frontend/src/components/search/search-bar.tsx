import { useState, useEffect, useRef } from 'react';
import { useNavigate, createSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, X, Clock, ArrowUp, ArrowDown, Loader2, ExternalLink } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useSearchStore } from '@/stores/search-store';
import { useDebounce } from '@/hooks/use-debounce';
import { 
  searchBoardItems, 
  getSearchSuggestions, 
  getSearchHistory 
} from '@/services/search-service';
import { CommandDialog } from '@/components/ui/command';

interface SearchBarProps {
  boardId?: string;
  className?: string;
  placeholder?: string;
  onResultClick?: (itemId: string) => void;
}

export function SearchBar({ 
  boardId, 
  className,
  placeholder = "Search...",
  onResultClick
}: SearchBarProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  
  const {
    searchQuery,
    searchResults,
    suggestions,
    isSearching,
    highlightedIndex,
    setSearchQuery,
    setSearchResults,
    setSuggestions,
    setIsSearching,
    setHighlightedIndex,
    clearSearch,
  } = useSearchStore();
  
  const debouncedQuery = useDebounce(searchQuery, 300);
  
  // Fetch search history
  const { data: searchHistory } = useQuery({
    queryKey: ['search-history'],
    queryFn: () => getSearchHistory(5, boardId),
    enabled: isOpen && searchQuery === '',
  });
  
  // Fetch search suggestions
  const { data: suggestionData } = useQuery({
    queryKey: ['search-suggestions', debouncedQuery, boardId],
    queryFn: () => getSearchSuggestions(debouncedQuery, { 
      boardId, 
      limit: 5,
      includeGenerated: true
    }),
    enabled: isOpen && debouncedQuery.length > 1,
  });
  
  // Perform search
  const { data: searchData, isFetching } = useQuery({
    queryKey: ['search-results', debouncedQuery, boardId],
    queryFn: () => searchBoardItems(boardId || '', debouncedQuery, {
      limit: 10,
      saveHistory: true,
      highlightResults: true,
    }),
    enabled: isOpen && debouncedQuery.length > 2 && !!boardId,
  });
  
  // Update search results
  useEffect(() => {
    if (searchData) {
      setSearchResults(searchData.items);
    }
  }, [searchData, setSearchResults]);
  
  // Update suggestions
  useEffect(() => {
    if (suggestionData) {
      setSuggestions(suggestionData);
    }
  }, [suggestionData, setSuggestions]);
  
  // Update search status
  useEffect(() => {
    setIsSearching(isFetching);
  }, [isFetching, setIsSearching]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          const items = searchResults.length > 0 
            ? searchResults 
            : suggestions.length > 0 
              ? suggestions 
              : searchHistory || [];
          setHighlightedIndex(Math.min(highlightedIndex + 1, items.length - 1));
          break;
        case 'ArrowUp':
          e.preventDefault();
          setHighlightedIndex(Math.max(highlightedIndex - 1, -1));
          break;
        case 'Enter':
          e.preventDefault();
          if (highlightedIndex >= 0) {
            if (searchResults.length > 0) {
              handleResultClick(searchResults[highlightedIndex].id);
            } else if (suggestions.length > 0) {
              handleSuggestionClick(suggestions[highlightedIndex]);
            } else if (searchHistory && searchHistory.length > 0) {
              handleHistoryClick(searchHistory[highlightedIndex].query);
            }
          } else if (searchQuery.trim()) {
            // Perform search with current query
            queryClient.invalidateQueries({ queryKey: ['search-results', debouncedQuery, boardId] });
          }
          break;
        case 'Escape':
          e.preventDefault();
          setIsOpen(false);
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [
    isOpen, 
    highlightedIndex, 
    searchResults, 
    suggestions, 
    searchHistory, 
    setHighlightedIndex, 
    searchQuery, 
    debouncedQuery, 
    boardId, 
    queryClient
  ]);
  
  // Focus input when dialog opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }
  }, [isOpen]);
  
  // Open search dialog with keyboard shortcut
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setIsOpen((open) => !open);
      }
    };
    
    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
    setHighlightedIndex(-1);
  };
  
  const handleClearSearch = () => {
    clearSearch();
    inputRef.current?.focus();
  };
  
  const handleResultClick = (itemId: string) => {
    if (onResultClick) {
      onResultClick(itemId);
    }
    setIsOpen(false);
  };
  
  const handleSuggestionClick = (suggestion: string) => {
    setSearchQuery(suggestion);
    queryClient.invalidateQueries({ queryKey: ['search-results', suggestion, boardId] });
  };
  
  const handleHistoryClick = (query: string) => {
    setSearchQuery(query);
    queryClient.invalidateQueries({ queryKey: ['search-results', query, boardId] });
  };
  
  return (
    <>
      <div className={cn("relative", className)}>
        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          type="search"
          placeholder={placeholder}
          className="pl-8 w-full md:w-[300px] lg:w-[400px]"
          onClick={() => setIsOpen(true)}
          onFocus={() => setIsOpen(true)}
        />
        <kbd className="pointer-events-none absolute right-2.5 top-2.5 hidden h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </div>
      
      <CommandDialog open={isOpen} onOpenChange={setIsOpen}>
        <div className="flex items-center border-b px-3">
          <Search className="mr-2 h-4 w-4 shrink-0 opacity-50" />
          <Input
            ref={inputRef}
            value={searchQuery}
            onChange={handleInputChange}
            placeholder="Search items..."
            className="flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50 border-0 focus-visible:ring-0"
          />
          {searchQuery && (
            <Button
              variant="ghost"
              size="sm"
              className="h-8 px-2 lg:px-3"
              onClick={handleClearSearch}
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Clear search</span>
            </Button>
          )}
        </div>
        <div className="py-6 px-4">
          {isSearching && (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
          
          {!isSearching && searchResults.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Results</h3>
              <div className="space-y-1">
                {searchResults.map((result, index) => (
                  <div
                    key={result.id}
                    className={cn(
                      "flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer",
                      highlightedIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => handleResultClick(result.id)}
                  >
                    <div className="flex-1">
                      <div className="font-medium">{result.name}</div>
                    </div>
                    {highlightedIndex === index && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Enter</span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Advanced search link */}
              {boardId && searchQuery.trim() && (
                <div 
                  className="flex items-center justify-center mt-2 text-sm text-primary cursor-pointer hover:underline"
                  onClick={() => {
                    navigate({
                      pathname: `/boards/${boardId}/search`,
                      search: createSearchParams({
                        q: searchQuery
                      }).toString()
                    });
                    setIsOpen(false);
                  }}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Advanced Search
                </div>
              )}
            </div>
          )}
          
          {!isSearching && searchResults.length === 0 && searchQuery.length > 2 && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              No results found.
            </div>
          )}
          
          {!isSearching && searchQuery.length > 1 && suggestions.length > 0 && searchResults.length === 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Suggestions</h3>
              <div className="space-y-1">
                {suggestions.map((suggestion, index) => (
                  <div
                    key={suggestion}
                    className={cn(
                      "flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer",
                      highlightedIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Search className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">{suggestion}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {!isSearching && searchQuery === '' && searchHistory && searchHistory.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium">Recent Searches</h3>
              <div className="space-y-1">
                {searchHistory.map((item, index) => (
                  <div
                    key={item.query}
                    className={cn(
                      "flex items-center px-2 py-1.5 text-sm rounded-md cursor-pointer",
                      highlightedIndex === index ? "bg-accent text-accent-foreground" : "hover:bg-accent hover:text-accent-foreground"
                    )}
                    onClick={() => handleHistoryClick(item.query)}
                  >
                    <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                    <div className="flex-1">{item.query}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(item.lastSearched).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {!isSearching && searchQuery === '' && (!searchHistory || searchHistory.length === 0) && (
            <div className="py-6 text-center text-sm text-muted-foreground">
              Type to search items...
            </div>
          )}
          
          <div className="mt-4 border-t pt-4 text-xs text-muted-foreground">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <ArrowUp className="h-3 w-3" />
                  <ArrowDown className="h-3 w-3" />
                  <span>to navigate</span>
                </div>
                <div className="flex items-center gap-1">
                  <span>Enter</span>
                  <span>to select</span>
                </div>
              </div>
              <div className="flex items-center gap-1">
                <span>Esc</span>
                <span>to close</span>
              </div>
            </div>
          </div>
        </div>
      </CommandDialog>
    </>
  );
}