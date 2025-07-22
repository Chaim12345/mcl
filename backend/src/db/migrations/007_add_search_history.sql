-- Add search history table

-- Create search_history table
CREATE TABLE IF NOT EXISTS search_history (
  id VARCHAR(255) PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  search_term VARCHAR(255) NOT NULL,
  board_id VARCHAR(255),
  result_count INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE
);

-- Create index for faster search history queries
CREATE INDEX IF NOT EXISTS idx_search_history_user_term ON search_history(user_id, search_term);
CREATE INDEX IF NOT EXISTS idx_search_history_board_term ON search_history(board_id, search_term);

-- Add text search capabilities to board_items if not already present
-- Create GIN index for full-text search on title and description
CREATE INDEX IF NOT EXISTS idx_board_items_title_description_search 
ON board_items USING GIN (to_tsvector('english', title || ' ' || COALESCE(description, '')));