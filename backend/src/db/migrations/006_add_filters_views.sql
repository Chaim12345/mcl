-- Add tables for saved filters and views

-- Create saved_filters table
CREATE TABLE IF NOT EXISTS saved_filters (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  board_id VARCHAR(255) NOT NULL,
  filter_json JSONB NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create saved_views table
CREATE TABLE IF NOT EXISTS saved_views (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  board_id VARCHAR(255) NOT NULL,
  filter_json JSONB,
  sort_json JSONB,
  is_default BOOLEAN DEFAULT FALSE,
  is_shared BOOLEAN DEFAULT FALSE,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_saved_filters_timestamp
BEFORE UPDATE ON saved_filters
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_saved_views_timestamp
BEFORE UPDATE ON saved_views
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- Add field_type, options, and required columns to board_columns if they don't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'board_columns' AND column_name = 'field_type') THEN
    ALTER TABLE board_columns ADD COLUMN field_type VARCHAR(50) DEFAULT 'text';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'board_columns' AND column_name = 'options') THEN
    ALTER TABLE board_columns ADD COLUMN options JSONB;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns 
                WHERE table_name = 'board_columns' AND column_name = 'required') THEN
    ALTER TABLE board_columns ADD COLUMN required BOOLEAN DEFAULT FALSE;
  END IF;
END $$;