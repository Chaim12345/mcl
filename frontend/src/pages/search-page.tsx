import { useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

import { AuthGuard } from '@/components/auth/auth-guard';
import { MainLayout } from '@/components/layout/main-layout';
import { Button } from '@/components/ui/button';
import { SearchResults } from '@/components/search';
import { useSearchStore } from '@/stores/search-store';

export function SearchPage() {
  const { boardId } = useParams<{ boardId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setSearchQuery } = useSearchStore();
  
  // Get query from URL params
  const query = searchParams.get('q') || '';
  
  // Set search query from URL
  useEffect(() => {
    setSearchQuery(query);
  }, [query, setSearchQuery]);
  
  const handleResultClick = (itemId: string) => {
    if (boardId) {
      navigate(`/boards/${boardId}/items/${itemId}`);
    }
  };
  
  return (
    <AuthGuard>
      <MainLayout>
        <div className="space-y-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="ghost" 
              size="sm" 
              className="h-8 w-8 p-0"
              onClick={() => navigate(-1)}
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="sr-only">Back</span>
            </Button>
            
            <h1 className="text-2xl font-bold">Search Results</h1>
          </div>
          
          {boardId ? (
            <SearchResults 
              boardId={boardId} 
              onResultClick={handleResultClick}
            />
          ) : (
            <div className="flex flex-col items-center justify-center h-64 space-y-4">
              <p className="text-muted-foreground">Please select a board to search in.</p>
              <Button onClick={() => navigate('/dashboard')}>
                Go to Dashboard
              </Button>
            </div>
          )}
        </div>
      </MainLayout>
    </AuthGuard>
  );
}