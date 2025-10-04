# New Features Setup Guide

This guide explains how to set up the new features added to the Interview Test Platform:

## 1. Complete Applicant Deletion
## 2. Theme Settings with Multiple Themes

---

## Prerequisites

- PostgreSQL database running
- Backend server configured
- Frontend React app running

## Backend Setup

### 1. Database Migration for Theme Settings

Run the theme settings migration to add the new table:

**Option A: Using the Python script (recommended)**
```bash
cd backend-postgress
python run_theme_migration.py
```

**Option B: Manual SQL execution**
If you prefer to run the SQL manually, execute the contents of `backend-postgress/add_theme_settings.sql` in your PostgreSQL database.

### 2. Environment Variables

Make sure your `.env` file in `backend-postgress` directory contains:
```env
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_NAME=interview_platform
SECRET_KEY=your-secret-key-here
CORS_ORIGINS=http://localhost:3000,http://localhost:3001
ACCESS_TOKEN_EXPIRE_MINUTES=30
```

## Features Overview

### 1. Complete Applicant Deletion

**What it does:**
- Completely removes an applicant and ALL associated data
- Deletes user account, test invites, submissions, answers, and video monitoring sessions
- Cannot be undone - permanent deletion

**How to use:**
1. Go to Admin Dashboard
2. Click Settings gear icon
3. Navigate to "Applicant Management" tab
4. Find the applicant you want to delete
5. Click "Delete All Data" button (red button)
6. Confirm the deletion in the warning dialog

**API Endpoint:**
- `DELETE /api/admin/applicants/{applicant_id}` - Completely delete applicant

### 2. Theme Settings

**Available Themes:**
1. **Classic Theme** - Original glass-morphism design with gradients (default)
2. **Light Theme** - Clean and bright interface
3. **Dark Theme** - Easy on the eyes for long sessions
4. **Modern Theme** - Contemporary gradient design with blue/purple gradients
5. **Professional Theme** - Corporate-friendly styling with gray/blue scheme
6. **Premium Black Gold** - Luxury black background with gold accents

**How to use:**
1. Go to Admin Dashboard
2. Click Settings gear icon
3. Navigate to "Theme Settings" tab
4. Select a theme from the dropdown or click on a theme preview card
5. Click "Save Theme Settings"
6. Theme applies immediately

**Theme Features:**
- Real-time theme switching
- Per-admin account settings (each admin can have their own theme)
- Smooth transitions between themes
- Visual preview cards for each theme
- Persistent theme settings

**API Endpoints:**
- `GET /api/admin/theme-settings` - Get current theme settings
- `PUT /api/admin/theme-settings` - Update theme settings

## Technical Implementation

### Theme System Architecture

**Frontend:**
- `ThemeContext.js` - React context for theme management
- `themes.css` - CSS variables and theme-specific styles
- Theme-aware components with conditional styling

**Backend:**
- `admin_theme_settings` table for storing theme preferences
- Theme settings API endpoints
- Per-admin theme persistence

### File Structure
```
frontend/src/
├── contexts/
│   └── ThemeContext.js         # Theme management context
├── styles/
│   └── themes.css              # Theme CSS variables and styles
└── components/
    └── AdminDashboard.js       # Updated with theme support

backend-postgress/
├── add_theme_settings.sql      # Database migration
├── run_theme_migration.py      # Migration runner script
└── fastapi_postgres_backend.py # Updated with new endpoints
```

## Database Schema Changes

### New Table: `admin_theme_settings`
```sql
CREATE TABLE admin_theme_settings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    admin_id UUID REFERENCES users(id) ON DELETE CASCADE,
    theme_name VARCHAR(100) DEFAULT 'light',
    custom_colors JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(admin_id)
);
```

## Troubleshooting

### Theme Migration Issues
- Ensure PostgreSQL is running
- Check database credentials in `.env` file
- Verify the `interview_platform` database exists
- Make sure you have necessary database permissions

### Theme Not Applying
- Check browser console for JavaScript errors
- Verify theme settings are saved (check network tab)
- Refresh the page after theme change
- Clear browser cache if styles seem cached

### Deletion Not Working
- Verify admin permissions
- Check that all foreign key relationships are properly set up
- Ensure the applicant exists before attempting deletion

## Security Notes

### Applicant Deletion
- Only admins can delete applicants
- Deletion is permanent and cannot be undone
- Clear warning dialog prevents accidental deletions
- Logs the deletion action for audit purposes

### Theme Settings
- Theme settings are per-admin account
- No cross-admin theme interference
- Themes only affect visual presentation, not functionality
- CSS injection protection through predefined theme values

---

## Support

If you encounter any issues:
1. Check the browser console for JavaScript errors
2. Check the backend logs for API errors
3. Verify database connectivity
4. Ensure all migrations have been run successfully

The features are designed to be robust and user-friendly while maintaining security and data integrity.
