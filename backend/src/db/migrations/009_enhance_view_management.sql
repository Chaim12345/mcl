-- Enhance view management with additional features

-- Add columns to saved_views table for additional metadata
ALTER TABLE saved_views
ADD COLUMN IF NOT EXISTS columns_config JSONB,
ADD COLUMN IF NOT EXISTS layout_config JSONB,
ADD COLUMN IF NOT EXISTS team_access JSONB,
ADD COLUMN IF NOT EXISTS is_global BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS icon VARCHAR(50),
ADD COLUMN IF NOT EXISTS color VARCHAR(50);

-- Create a table for view permissions
CREATE TABLE IF NOT EXISTS view_permissions (
  id VARCHAR(255) PRIMARY KEY,
  view_id VARCHAR(255) NOT NULL,
  user_id VARCHAR(255) NOT NULL,
  permission_level VARCHAR(50) NOT NULL, -- 'view', 'edit', 'manage'
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (view_id) REFERENCES saved_views(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(view_id, user_id)
);

-- Create a table for board default views
CREATE TABLE IF NOT EXISTS board_default_views (
  id VARCHAR(255) PRIMARY KEY,
  board_id VARCHAR(255) NOT NULL,
  view_id VARCHAR(255) NOT NULL,
  is_global BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (board_id) REFERENCES boards(id) ON DELETE CASCADE,
  FOREIGN KEY (view_id) REFERENCES saved_views(id) ON DELETE CASCADE,
  UNIQUE(board_id, is_global)
);

-- Create a table for view templates
CREATE TABLE IF NOT EXISTS view_templates (
  id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  filter_json JSONB,
  sort_json JSONB,
  columns_config JSONB,
  layout_config JSONB,
  icon VARCHAR(50),
  color VARCHAR(50),
  category VARCHAR(100),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Create triggers for updated_at timestamps
CREATE TRIGGER update_view_permissions_timestamp
BEFORE UPDATE ON view_permissions
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_board_default_views_timestamp
BEFORE UPDATE ON board_default_views
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_view_templates_timestamp
BEFORE UPDATE ON view_templates
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_view_permissions_view_id ON view_permissions(view_id);
CREATE INDEX IF NOT EXISTS idx_view_permissions_user_id ON view_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_board_default_views_board_id ON board_default_views(board_id);
CREATE INDEX IF NOT EXISTS idx_board_default_views_view_id ON board_default_views(view_id);
CREATE INDEX IF NOT EXISTS idx_view_templates_category ON view_templates(category);
CREATE INDEX IF NOT EXISTS idx_view_templates_created_by ON view_templates(created_by);

-- Add a function to copy a view
CREATE OR REPLACE FUNCTION copy_view(source_view_id VARCHAR(255), new_name VARCHAR(255), user_id VARCHAR(255))
RETURNS VARCHAR(255) AS $$
DECLARE
  new_view_id VARCHAR(255);
  source_view RECORD;
BEGIN
  -- Generate a new ID for the copied view
  SELECT 'view_' || MD5(random()::text || clock_timestamp()::text) INTO new_view_id;
  
  -- Get the source view
  SELECT * INTO source_view FROM saved_views WHERE id = source_view_id;
  
  -- Create a copy of the view
  INSERT INTO saved_views (
    id, name, board_id, filter_json, sort_json, is_default, is_shared,
    columns_config, layout_config, team_access, is_global, is_template,
    icon, color, created_by, created_at, updated_at
  ) VALUES (
    new_view_id, new_name, source_view.board_id, source_view.filter_json,
    source_view.sort_json, FALSE, FALSE, source_view.columns_config,
    source_view.layout_config, source_view.team_access, FALSE, FALSE,
    source_view.icon, source_view.color, user_id, NOW(), NOW()
  );
  
  RETURN new_view_id;
END;
$$ LANGUAGE plpgsql;