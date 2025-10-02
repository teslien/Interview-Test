-- Migration script to add admin_notifications table
-- Run this script to add the missing notifications table

-- Admin notifications table
CREATE TABLE IF NOT EXISTS admin_notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    type VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_notifications_admin_id ON admin_notifications(admin_id);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON admin_notifications(created_at);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON admin_notifications(is_read);

-- Verify table was created
SELECT 'admin_notifications table created successfully' as status;
