-- Add dynamic column support to board_columns table
ALTER TABLE board_columns 
ADD COLUMN field_type VARCHAR(50) DEFAULT 'text',
ADD COLUMN options JSONB,
ADD COLUMN required BOOLEAN DEFAULT FALSE;

-- Update existing columns to have default field_type
UPDATE board_columns SET field_type = 'status' WHERE field_type IS NULL;