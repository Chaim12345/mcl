-- Create auth_logs table for tracking authentication events
CREATE TABLE IF NOT EXISTS auth_logs (
  id SERIAL PRIMARY KEY,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);

-- Create index on action for filtering by action type
CREATE INDEX IF NOT EXISTS idx_auth_logs_action ON auth_logs(action);

-- Create index on created_at for time-based queries
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);

-- Add comment to table
COMMENT ON TABLE auth_logs IS 'Stores authentication events like logins, logouts, token refreshes, etc.';