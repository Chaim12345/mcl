-- Drop existing triggers and function
DROP TRIGGER IF EXISTS update_users_timestamp ON users;
DROP TRIGGER IF EXISTS update_workspaces_timestamp ON workspaces;
DROP TRIGGER IF EXISTS update_workspace_members_timestamp ON workspace_members;
DROP TRIGGER IF EXISTS update_boards_timestamp ON boards;
DROP TRIGGER IF EXISTS update_board_columns_timestamp ON board_columns;
DROP TRIGGER IF EXISTS update_board_items_timestamp ON board_items;
DROP TRIGGER IF EXISTS update_comments_timestamp ON comments;
DROP FUNCTION IF EXISTS update_timestamp();

-- Create corrected trigger function for users table (uses "updatedAt")
CREATE OR REPLACE FUNCTION update_users_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW."updatedAt" = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger function for other tables (uses updated_at)
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for each table with correct column names
CREATE TRIGGER update_users_timestamp
BEFORE UPDATE ON users
FOR EACH ROW EXECUTE PROCEDURE update_users_timestamp();

CREATE TRIGGER update_workspaces_timestamp
BEFORE UPDATE ON workspaces
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_workspace_members_timestamp
BEFORE UPDATE ON workspace_members
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_boards_timestamp
BEFORE UPDATE ON boards
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_board_columns_timestamp
BEFORE UPDATE ON board_columns
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_board_items_timestamp
BEFORE UPDATE ON board_items
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

CREATE TRIGGER update_comments_timestamp
BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();