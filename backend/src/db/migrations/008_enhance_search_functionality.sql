-- Enhance search functionality with advanced indexing and functions

-- Create a function to generate a search document for an item
CREATE OR REPLACE FUNCTION generate_item_search_document(item_id VARCHAR(255))
RETURNS tsvector AS $$
DECLARE
  search_document tsvector;
BEGIN
  -- Get the base document from the item's title and description
  SELECT 
    setweight(to_tsvector('english', title), 'A') || 
    setweight(to_tsvector('english', COALESCE(description, '')), 'B')
  INTO search_document
  FROM board_items
  WHERE id = item_id;
  
  -- Add field values to the search document with lower weight
  -- This would be enhanced in a real implementation to handle different field types
  -- For now, we'll just use a placeholder for the concept
  
  -- Return the combined search document
  RETURN search_document;
END;
$$ LANGUAGE plpgsql;

-- Create a materialized view for search results with pre-computed documents
CREATE MATERIALIZED VIEW IF NOT EXISTS search_items_mv AS
SELECT 
  i.id,
  i.title,
  i.description,
  i."boardId" as board_id,
  i.column_id,
  i.created_at,
  i.updated_at,
  generate_item_search_document(i.id) as search_document
FROM board_items i;

-- Create index on the materialized view for fast searching
CREATE INDEX IF NOT EXISTS idx_search_items_mv_document ON search_items_mv USING GIN (search_document);
CREATE INDEX IF NOT EXISTS idx_search_items_mv_board_id ON search_items_mv (board_id);

-- Create a function to refresh the search materialized view
CREATE OR REPLACE FUNCTION refresh_search_items_mv()
RETURNS TRIGGER AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY search_items_mv;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to refresh the materialized view when items change
CREATE TRIGGER refresh_search_items_mv_insert
AFTER INSERT ON board_items
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_search_items_mv();

CREATE TRIGGER refresh_search_items_mv_update
AFTER UPDATE ON board_items
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_search_items_mv();

CREATE TRIGGER refresh_search_items_mv_delete
AFTER DELETE ON board_items
FOR EACH STATEMENT
EXECUTE FUNCTION refresh_search_items_mv();

-- Create a table for search suggestions based on common terms
CREATE TABLE IF NOT EXISTS search_suggestions (
  id VARCHAR(255) PRIMARY KEY,
  term VARCHAR(255) NOT NULL,
  frequency INTEGER NOT NULL DEFAULT 1,
  last_used TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(term)
);

-- Create index for fast suggestion lookups
CREATE INDEX IF NOT EXISTS idx_search_suggestions_term ON search_suggestions(term);
CREATE INDEX IF NOT EXISTS idx_search_suggestions_frequency ON search_suggestions(frequency DESC);

-- Create a function to update search suggestions
CREATE OR REPLACE FUNCTION update_search_suggestions()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert or update the suggestion
  INSERT INTO search_suggestions (id, term, frequency, last_used)
  VALUES (
    'sugg_' || md5(NEW.search_term),
    NEW.search_term,
    1,
    NEW.created_at
  )
  ON CONFLICT (term) DO UPDATE SET
    frequency = search_suggestions.frequency + 1,
    last_used = NEW.created_at;
    
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create a trigger to update suggestions when search history is added
CREATE TRIGGER update_search_suggestions_trigger
AFTER INSERT ON search_history
FOR EACH ROW
EXECUTE FUNCTION update_search_suggestions();

-- Create a function to extract keywords from search terms
CREATE OR REPLACE FUNCTION extract_search_keywords(search_term TEXT)
RETURNS TABLE(keyword TEXT, weight FLOAT) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    word::TEXT as keyword,
    1.0 / row_number() OVER () as weight
  FROM ts_stat(
    format('SELECT to_tsquery(''simple'', ''%s'') as q', 
      regexp_replace(search_term, '[^a-zA-Z0-9]', ' ', 'g')
    )
  )
  ORDER BY nentry DESC
  LIMIT 5;
END;
$$ LANGUAGE plpgsql;