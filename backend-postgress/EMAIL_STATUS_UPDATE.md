# Email Status Update for Invites

## Overview
This update modifies the invite system to save invites to the database even when email sending fails, allowing admins to contact applicants directly or retry sending emails.

## Changes Made

### 1. Database Schema Updates
- Added `email_sent` boolean field to track email delivery status
- Added `email_sent_at` timestamp field to record when email was sent
- Added `email_error` text field to store error messages

### 2. Backend Changes
- Modified `/invites` POST endpoint to save invites even if email fails
- Updated `TestInvite` model to include new email status fields
- Added `/invites/{invite_id}/retry-email` endpoint for retrying failed emails
- Updated all invite-related endpoints to return email status information

### 3. Frontend Changes
- Updated invite creation to show appropriate messages for email success/failure
- Added email status indicators in the invites list
- Added retry email button for failed invites
- Enhanced UI to show email sent timestamps

## Migration Instructions

1. **Run the database migration:**
   ```bash
   cd backend-postgress
   python run_email_status_migration.py
   ```

2. **Restart the backend server** to apply the code changes

3. **The frontend will automatically use the new features** once the backend is updated

## New Features

### For Admins:
- **Invite Persistence**: Invites are always saved to the database, even if email fails
- **Email Status Tracking**: Clear indicators show whether emails were sent successfully
- **Retry Functionality**: One-click retry for failed email sends
- **Direct Contact**: Admin can contact applicants directly using the saved email information

### For Applicants:
- **No Impact**: The applicant experience remains the same
- **Reliability**: Invites are preserved even during email service issues

## API Changes

### New Endpoint:
- `POST /invites/{invite_id}/retry-email` - Retry sending email for a specific invite

### Updated Response Format:
All invite endpoints now return additional fields:
```json
{
  "id": "uuid",
  "test_id": "uuid",
  "applicant_email": "email@example.com",
  "applicant_name": "John Doe",
  "invited_by": "uuid",
  "invite_token": "uuid",
  "scheduled_date": "2024-01-01T00:00:00Z",
  "status": "sent",
  "email_sent": true,
  "email_sent_at": "2024-01-01T00:00:00Z",
  "email_error": null,
  "created_at": "2024-01-01T00:00:00Z"
}
```

## Benefits

1. **Improved Reliability**: Invites are never lost due to email failures
2. **Better Admin Experience**: Clear visibility into email delivery status
3. **Flexible Communication**: Admins can choose to contact applicants directly
4. **Audit Trail**: Complete history of email attempts and failures
5. **Recovery Options**: Easy retry mechanism for failed emails

## Backward Compatibility

- All existing functionality remains unchanged
- Existing invites will be marked as `email_sent: true` by default
- No breaking changes to existing API endpoints
