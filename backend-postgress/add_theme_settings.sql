-- Admin Theme Settings Table
CREATE TABLE IF NOT EXISTS admin_theme_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    theme_name VARCHAR(100) DEFAULT 'classic',
    custom_colors JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id)
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_admin_theme_settings_admin_id ON admin_theme_settings(admin_id);

-- Insert default theme settings for existing admins
INSERT INTO admin_theme_settings (admin_id, theme_name, custom_colors)
SELECT id, 'classic', '{}'
FROM users 
WHERE role = 'admin' 
AND id NOT IN (SELECT admin_id FROM admin_theme_settings WHERE admin_id IS NOT NULL)
ON CONFLICT (admin_id) DO NOTHING;
