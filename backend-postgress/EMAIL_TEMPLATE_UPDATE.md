# Email Template Update

## Overview
This update improves the invite email template with a professional HTML design and dynamic domain detection from the browser URL.

## Changes Made

### 1. Dynamic Domain Detection
- Added `FRONTEND_DOMAIN` environment variable for fallback domain
- Created `get_domain_from_request()` function to extract domain from request
- Automatically uses the correct domain from the browser URL

### 2. Professional HTML Email Template
- Created `create_invite_email_template()` function
- Modern, responsive HTML design with CSS styling
- Professional branding with company logo and colors
- Clear call-to-action button
- Comprehensive instructions for applicants
- Security notes and contact information

### 3. Enhanced Email Content
- Personalized greeting with applicant name
- Clear test information display
- Step-by-step instructions
- Security and integrity notes
- Professional footer with company branding

## Environment Configuration

Add this to your `.env` file:

```env
# Frontend Domain (for email links)
FRONTEND_DOMAIN=http://localhost:3000
```

For production, set it to your actual domain:
```env
FRONTEND_DOMAIN=https://yourdomain.com
```

## Features

### Email Template Features:
- ✅ **Responsive Design**: Works on desktop and mobile
- ✅ **Professional Branding**: Company logo and consistent styling
- ✅ **Clear Instructions**: Step-by-step guide for applicants
- ✅ **Security Notes**: Important security and integrity information
- ✅ **Call-to-Action**: Prominent button to take the test
- ✅ **Contact Information**: Support contact details
- ✅ **Dynamic Domain**: Automatically uses correct domain from request

### Technical Features:
- ✅ **Domain Detection**: Extracts domain from request URL
- ✅ **Fallback Support**: Uses environment variable if request domain unavailable
- ✅ **HTML Email**: Rich formatting with CSS styling
- ✅ **Mobile Responsive**: Optimized for all devices
- ✅ **Professional Layout**: Clean, modern design

## Usage

The email template is automatically used when:
1. Creating new test invitations
2. Retrying failed email sends
3. Any email sending operation

The domain is automatically detected from the request, ensuring links work correctly regardless of the deployment environment.

## Benefits

1. **Professional Appearance**: Modern, branded email design
2. **Better User Experience**: Clear instructions and professional presentation
3. **Dynamic Domain**: No more hardcoded URLs
4. **Mobile Friendly**: Responsive design works on all devices
5. **Security Awareness**: Clear security notes for applicants
6. **Brand Consistency**: Professional company branding throughout
