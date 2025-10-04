-- Update existing admin theme settings to use classic as default
UPDATE admin_theme_settings 
SET theme_name = 'classic', updated_at = CURRENT_TIMESTAMP 
WHERE theme_name = 'light';

-- Insert classic theme for any admins who don't have theme settings yet
INSERT INTO admin_theme_settings (admin_id, theme_name, custom_colors)
SELECT id, 'classic', '{}'
FROM users 
WHERE role = 'admin' 
AND id NOT IN (SELECT admin_id FROM admin_theme_settings WHERE admin_id IS NOT NULL)
ON CONFLICT (admin_id) DO NOTHING;
