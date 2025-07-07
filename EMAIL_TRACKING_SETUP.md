# Email Tracking Pixel Setup Guide

This guide will help you set up the email tracking pixel system for your blog.

## Overview

The email tracking system consists of:
1. A Vercel edge function (`/api/img`) that receives tracking pixel requests
2. Integration with PostHog for analytics
3. A test page to verify functionality

## Setup Steps

### 1. Environment Variables

#### Local Development
Create a `.env.local` file in your project root:

```bash
# PostHog API Key for email tracking
POSTHOG_API_KEY=your_posthog_api_key_here
```

#### Production (Vercel)
1. Go to your Vercel dashboard
2. Navigate to your project settings
3. Go to "Environment Variables"
4. Add:
   - **Name**: `POSTHOG_API_KEY`
   - **Value**: Your PostHog API key
   - **Environment**: Production, Preview, Development

### 2. Getting Your PostHog API Key

1. Log into your PostHog account
2. Go to Project Settings
3. Find your API key in the "Project API Key" section
4. Copy the key and add it to your environment variables

### 3. Testing the Setup

#### Local Testing
1. Start your development server:
   ```bash
   npm run dev
   ```

2. Test the API directly by visiting:
   ```
   http://localhost:3000/api/img?id=test-123&recipientEmail=test@example.com&subject=Test&campaign=test
   ```
3. You should see a transparent pixel load (or download a 1x1 GIF file)

#### Manual Testing
You can also test the API directly by visiting:
```
http://localhost:3000/api/img?id=test-123&recipientEmail=test@example.com&subject=Test&campaign=test
```

### 4. Using the Tracking Pixel

#### Basic Usage
```html
<img src="https://your-domain.com/api/img?id=unique-id" width="1" height="1" alt="" style="display:none;">
```

#### Full Usage with All Parameters
```html
<img src="https://your-domain.com/api/img?id=unique-id&recipientName=John%20Doe&recipientEmail=john@example.com&subject=Meeting%20Request&campaign=newsletter" width="1" height="1" alt="" style="display:none;">
```

## Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `id` | No | Custom tracking ID. If not provided, one will be auto-generated |
| `recipientName` | No | Name of the email recipient |
| `recipientEmail` | No | Email address of the recipient (used as PostHog distinct_id) |
| `subject` | No | Email subject line |
| `campaign` | No | Campaign name (defaults to "general") |

## PostHog Events

The system sends two types of events to PostHog:

### 1. Email Opened Event
- **Event Name**: `Email Opened`
- **Properties**: All tracking parameters plus technical data (user agent, IP, etc.)

### 2. Identify Event (if recipient email provided)
- **Event Name**: `$identify`
- **Properties**: Recipient information for user identification

## Troubleshooting

### Common Issues

1. **Pixel not loading**: Check that your Vercel deployment is working
2. **PostHog not receiving events**: Verify your API key is correct
3. **CORS errors**: The API includes CORS headers, but some email clients may still block pixels

### Debugging

Check the Vercel function logs in your dashboard to see if there are any errors in the tracking function.

## Next Steps

Once this basic setup is working, you can:
1. Create the Raycast extension for generating tracking pixels
2. Integrate with MailMate for automated draft creation
3. Add more sophisticated tracking features

## Security Notes

- The tracking pixel is designed to be lightweight and stateless
- No sensitive data is stored on your server
- All tracking data goes directly to PostHog
- Consider privacy implications and ensure compliance with relevant regulations 