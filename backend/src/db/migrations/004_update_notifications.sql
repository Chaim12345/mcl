-- Update notifications table structure
DROP TABLE IF EXISTS notifications;

-- Create updated notifications table
CREATE TABLE notifications (
  id VARCHAR(255) PRIMARY KEY,
  "userId" VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  data JSONB DEFAULT '{}',
  read BOOLEAN DEFAULT FALSE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create notification_preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id VARCHAR(255) PRIMARY KEY DEFAULT gen_random_uuid()::text,
  "userId" VARCHAR(255) NOT NULL UNIQUE,
  "emailNotifications" BOOLEAN DEFAULT TRUE,
  "pushNotifications" BOOLEAN DEFAULT TRUE,
  "mentionNotifications" BOOLEAN DEFAULT TRUE,
  "assignmentNotifications" BOOLEAN DEFAULT TRUE,
  "commentNotifications" BOOLEAN DEFAULT TRUE,
  "dueDateReminders" BOOLEAN DEFAULT TRUE,
  "workspaceInvitations" BOOLEAN DEFAULT TRUE,
  "createdAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY ("userId") REFERENCES users(id) ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX idx_notifications_user_id ON notifications("userId");
CREATE INDEX idx_notifications_read ON notifications(read);
CREATE INDEX idx_notifications_created_at ON notifications("createdAt");
CREATE INDEX idx_notifications_type ON notifications(type);

-- Create trigger for notifications updated_at
CREATE TRIGGER update_notifications_timestamp
BEFORE UPDATE ON notifications
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();

-- Create trigger for notification_preferences updated_at
CREATE TRIGGER update_notification_preferences_timestamp
BEFORE UPDATE ON notification_preferences
FOR EACH ROW EXECUTE PROCEDURE update_timestamp();