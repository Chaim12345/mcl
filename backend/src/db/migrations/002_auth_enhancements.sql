-- Add password reset fields to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS "resetToken" VARCHAR(255),
ADD COLUMN IF NOT EXISTS "resetTokenExpiry" TIMESTAMP;

-- Create auth_logs table for authentication audit trail
CREATE TABLE IF NOT EXISTS auth_logs (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id VARCHAR(255) NOT NULL,
  action VARCHAR(255) NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create index on auth_logs for better query performance
CREATE INDEX IF NOT EXISTS idx_auth_logs_user_id ON auth_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auth_logs_action ON auth_logs(action);
CREATE INDEX IF NOT EXISTS idx_auth_logs_created_at ON auth_logs(created_at);

-- Create index on users for password reset tokens
CREATE INDEX IF NOT EXISTS idx_users_reset_token ON users("resetToken") WHERE "resetToken" IS NOT NULL;