# Admin Scheduling Feature

## Overview
This feature allows administrators to schedule tests for applicants instead of letting applicants choose their own schedule. This provides better control over test timing and ensures tests are taken at optimal times.

## Features

### 1. Admin Scheduling Options
- **Self-Schedule**: Let applicants choose their own date and time (default behavior)
- **Admin-Schedule**: Admin selects specific date and time for the applicant

### 2. Enhanced UI Components

#### Admin Dashboard - Send Invite Modal
- **Improved Layout**: Larger modal with better organization
- **Scheduling Options**: Radio buttons to choose between self-schedule and admin-schedule
- **Calendar Integration**: Modern calendar component for date selection
- **Time Slots**: Predefined time slots (9 AM - 8 PM)
- **Visual Feedback**: Shows selected date/time summary
- **Validation**: Ensures all required fields are filled

#### Test Invite Page - Calendar Improvements
- **Modern Design**: Enhanced calendar with better styling
- **Visual Indicators**: Clear selected date, today's date, and disabled dates
- **Improved Time Selection**: Better styled time picker
- **Summary Display**: Enhanced selected schedule display with gradient background

### 3. Backend Changes

#### Database Schema
```sql
-- New field added to test_invites table
ALTER TABLE test_invites 
ADD COLUMN admin_scheduled BOOLEAN DEFAULT FALSE;
```

#### API Updates
- **TestInvite Model**: Added `admin_scheduled` field
- **TestInviteCreate Model**: Added `scheduled_date` and `admin_scheduled` fields
- **Send Invite Endpoint**: Updated to handle scheduling data
- **Email Template**: Dynamic content based on scheduling type

### 4. Email Template Enhancements

#### Dynamic Content
- **Self-Scheduled**: "Choose a convenient date and time for your assessment"
- **Admin-Scheduled**: "Your test has been scheduled for: [Date] at [Time]"
- **Button Text**: 
  - Self-scheduled: "Schedule & Take Your Test"
  - Admin-scheduled: "Take Your Test"

#### Professional Design
- Modern HTML email template
- Responsive design
- Clear call-to-action buttons
- Professional styling with gradients and shadows

## Usage

### For Administrators

1. **Send Invite**:
   - Click "Send Invite" button in Admin Dashboard
   - Fill in basic information (test, applicant name, email)
   - Choose scheduling option:
     - **Self-Schedule**: Applicant chooses their own time
     - **Admin-Schedule**: Select specific date and time
   - Click "Send Invite"

2. **Admin-Scheduled Tests**:
   - Select date using the calendar
   - Choose time from available slots (9 AM - 8 PM)
   - Review the selected schedule
   - Send invite with scheduled time

### For Applicants

1. **Self-Scheduled Tests**:
   - Receive email with scheduling link
   - Click link to access test invitation page
   - Choose preferred date and time
   - Confirm schedule and take test

2. **Admin-Scheduled Tests**:
   - Receive email with pre-scheduled time
   - Click link to access test invitation page
   - See pre-scheduled date and time
   - Take test at the scheduled time

## Technical Implementation

### Frontend Changes

#### AdminDashboard.js
- Added scheduling state management
- Enhanced Send Invite modal with calendar
- Updated handleSendInvite function
- Added validation for scheduled tests

#### TestInvite.js
- Improved calendar styling with custom classNames
- Enhanced time selection UI
- Better visual feedback for selected schedule
- Modern gradient backgrounds and shadows

### Backend Changes

#### fastapi_postgres_backend.py
- Updated TestInvite and TestInviteCreate models
- Enhanced send_test_invite endpoint
- Modified email template function
- Added database field support

#### Database Migration
- `add_admin_scheduling.sql`: SQL migration script
- `run_admin_scheduling_migration.py`: Python migration runner

## Benefits

1. **Better Control**: Admins can schedule tests at optimal times
2. **Improved UX**: Modern, intuitive calendar interface
3. **Professional Emails**: Dynamic, context-aware email templates
4. **Flexibility**: Support for both self-scheduled and admin-scheduled tests
5. **Visual Appeal**: Enhanced UI with modern design elements

## Migration

To apply the database changes:

```bash
cd backend-postgress
python run_admin_scheduling_migration.py
```

This will add the `admin_scheduled` field to the `test_invites` table.

## Future Enhancements

1. **Recurring Schedules**: Support for recurring test schedules
2. **Time Zone Support**: Handle different time zones
3. **Calendar Integration**: Integration with external calendar systems
4. **Reminder Emails**: Automated reminder emails before scheduled tests
5. **Rescheduling**: Allow applicants to reschedule admin-scheduled tests
