# Local Testing Guide

## Quick Start

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Set up your `.env` file:**
   ```bash
   # Copy the example (if it exists) or create one with:
   GMAIL_CLIENT_ID=your_client_id
   GMAIL_CLIENT_SECRET=your_client_secret
   GMAIL_REFRESH_TOKEN=your_refresh_token
   GMAIL_USER_EMAIL=your_email@gmail.com
   GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id
   GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account_email
   GOOGLE_SHEETS_PRIVATE_KEY=your_private_key
   OPENAI_API_KEY=your_openai_key
   DISCORD_WEBHOOK_URL=your_discord_webhook
   ```

3. **Get your Gmail refresh token (if you haven't already):**
   ```bash
   npm run get-refresh-token
   ```

## Testing Individual Functions

### Test Email Processing

Test processing emails once:
```bash
npm run test:email
```

Or run the full server (processes emails every 30 minutes):
```bash
npm run dev
```

### Test Daily Summary

Test the daily summary:
```bash
npm run test:summary
```

## Running the Full Server Locally

The server will:
- Check for new emails every 30 minutes
- Send daily summary at 9:00 AM

```bash
# Development mode (with TypeScript)
npm run dev

# Production mode (requires build first)
npm run build
npm start
```

## What to Expect

When you run `npm run dev` or `npm start`:

1. **On startup:** Email processing runs immediately
2. **Every 30 minutes:** Email processing runs automatically
3. **Daily at 9 AM:** Daily summary is sent to Discord

You'll see logs like:
```
🚀 Job Tracker Automations Server Starting...
📧 Email processing: Every 30 minutes
📊 Daily summary: 9:00 AM daily

📧 Running email processing...
Starting email processing...
Found 2 job-related emails to process
Processed application: Acme Corp - Software Engineer (In-Process)
...
```

## Troubleshooting

### "No new job-related emails found"
- This is normal if there are no new emails matching the keywords
- Check that your Gmail credentials are correct
- Verify the email search is working by checking Gmail manually

### "Error adding application to Sheets"
- Verify your Google Sheets service account has access to the spreadsheet
- Check that the spreadsheet ID is correct
- Ensure the private key is properly formatted (with `\n` for newlines)

### "Error extracting data from email"
- Check your OpenAI API key is valid
- Verify you have credits in your OpenAI account

### "Error sending Discord webhook"
- Verify your Discord webhook URL is correct
- Test the webhook URL manually in a browser

## Testing with Sample Data

To test without waiting for real emails, you can:

1. Send yourself a test email with job-related keywords
2. Wait for the next 30-minute check, or
3. Manually trigger: `npm run test:email`

## Stopping the Server

Press `Ctrl+C` to stop the server gracefully.
