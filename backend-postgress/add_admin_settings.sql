-- Admin Email Settings Table
CREATE TABLE IF NOT EXISTS admin_email_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    smtp_host VARCHAR(255),
    smtp_port INTEGER DEFAULT 587,
    smtp_user VARCHAR(255),
    smtp_password VARCHAR(255),
    from_email VARCHAR(255),
    from_name VARCHAR(255) DEFAULT '12th Wonder Interview Platform',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_email_settings_admin_id ON admin_email_settings(admin_id);
