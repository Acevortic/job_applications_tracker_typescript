# Job Application Tracker Automation

Automated system to track job applications by monitoring Gmail for job-related emails, extracting structured data using AI, storing in Google Sheets, and sending daily Discord summaries.

## Features

- **Email Monitoring**: Automatically detects job-related emails in Gmail
- **AI Data Extraction**: Uses OpenAI to extract structured data (company, role, status, next steps)
- **Google Sheets Integration**: Stores all application data in a spreadsheet
- **Discord Notifications**: Daily summaries with total applications and pending next steps

## Setup

### Prerequisites

1. Node.js 20+ installed
2. Google Cloud Project with APIs enabled:
   - Gmail API
   - Google Sheets API
   - Cloud Functions API
   - Cloud Scheduler API
3. OpenAI API key
4. Discord webhook URL

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env with your credentials
```

### Required Credentials

#### Gmail API Setup

**Option 1: Use the helper script (Recommended)**

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
2. Create OAuth 2.0 credentials:
   - Click "Create Credentials" → "OAuth client ID"
   - Application type: "Desktop app"
   - Add `http://localhost:3000` as authorized redirect URI (just the domain, no path)
3. Enable Gmail API
4. Copy the Client ID and Client Secret to your `.env` file:
   ```
   GMAIL_CLIENT_ID=your_client_id
   GMAIL_CLIENT_SECRET=your_client_secret
   ```
5. Run the helper script to get your refresh token:
   ```bash
   npm run get-refresh-token
   ```
   This will open a browser, ask you to authorize, and automatically provide your refresh token.

**Option 2: Manual setup**

1. Follow steps 1-3 above
2. Use Google's OAuth 2.0 Playground or manually complete the OAuth flow to get a refresh token

#### Google Sheets API Setup
1. Create a service account in Google Cloud Console
2. Download the JSON key file
3. Share your Google Sheet with the service account email
4. Extract client email and private key from the JSON

#### OpenAI API
1. Get API key from [OpenAI Platform](https://platform.openai.com/)

#### Discord Webhook
1. Go to your Discord server settings
2. Integrations → Webhooks → New Webhook
3. Copy the webhook URL

### Google Sheet Setup

Create a Google Sheet with the following columns (headers will be created automatically):
- Date
- Company
- Role
- Status
- Next Steps
- Email Date

Share the sheet with your service account email.

## Local Development & Testing

See [LOCAL_TESTING.md](LOCAL_TESTING.md) for detailed testing instructions.

### Quick Test

```bash
# Install dependencies
npm install

# Set up your .env file (see Required Credentials above)

# Test email processing once
npm run test:email

# Test daily summary
npm run test:summary

# Run the full server (checks emails every 30 min, sends daily summary at 9 AM)
npm run dev
```

## Deployment

### Railway (Recommended for Continuous Running)

Railway is perfect for this use case as it runs continuously and handles scheduling.

1. **Create a Railway account** at [railway.app](https://railway.app)

2. **Create a new project** and connect your GitHub repository (or deploy from CLI)

3. **Add environment variables** in Railway dashboard:
   - Go to your project → Variables
   - Add all variables from your `.env` file:
     - `GMAIL_CLIENT_ID`
     - `GMAIL_CLIENT_SECRET`
     - `GMAIL_REFRESH_TOKEN`
     - `GMAIL_USER_EMAIL`
     - `GOOGLE_SHEETS_SPREADSHEET_ID`
     - `GOOGLE_SHEETS_CLIENT_EMAIL`
     - `GOOGLE_SHEETS_PRIVATE_KEY` (make sure newlines are preserved)
     - `OPENAI_API_KEY`
     - `DISCORD_WEBHOOK_URL`

4. **Deploy:**
   - Railway will automatically detect the `Procfile` and `package.json`
   - It will run `npm install`, `npm run build`, and `npm start`
   - The server will start and run continuously

5. **Monitor logs:**
   - View logs in Railway dashboard to see email processing and summaries

**Note:** Railway will keep your server running 24/7, automatically checking emails every 30 minutes and sending daily summaries at 9 AM.

### Google Cloud Functions

### Google Cloud Functions

1. Build the project:
```bash
npm run build
```

2. Deploy email processing function:
```bash
gcloud functions deploy processEmail \
  --runtime nodejs20 \
  --trigger-http \
  --entry-point processEmail \
  --source . \
  --region us-central1
```

3. Deploy daily summary function:
```bash
gcloud functions deploy dailySummary \
  --runtime nodejs20 \
  --trigger-http \
  --entry-point dailySummary \
  --source . \
  --region us-central1
```

4. Set up Cloud Scheduler for daily summary:
```bash
gcloud scheduler jobs create http daily-job-summary \
  --schedule="0 9 * * *" \
  --uri="https://us-central1-YOUR_PROJECT.cloudfunctions.net/dailySummary" \
  --http-method=GET \
  --time-zone="America/New_York"
```

5. Set up email monitoring (choose one):
   - **Option A**: Gmail Push Notifications (requires Pub/Sub)
   - **Option B**: Cloud Scheduler to trigger email processing periodically:
```bash
gcloud scheduler jobs create http email-processing \
  --schedule="*/30 * * * *" \
  --uri="https://us-central1-YOUR_PROJECT.cloudfunctions.net/processEmail" \
  --http-method=GET
```

### Environment Variables in Cloud Functions

Set environment variables for your functions:
```bash
gcloud functions deploy processEmail \
  --set-env-vars GMAIL_CLIENT_ID=xxx,GMAIL_CLIENT_SECRET=xxx,...
```

Or use Secret Manager for sensitive values.

## Usage

Once deployed:
1. The email processing function will check for new job-related emails
2. Extracted data will be automatically added to Google Sheets
3. Daily summaries will be sent to Discord at the scheduled time

## Project Structure

```
job_tracker_automations/
├── src/
│   ├── services/
│   │   ├── emailMonitor.ts      # Gmail API integration
│   │   ├── dataExtractor.ts      # AI data extraction
│   │   ├── sheetsService.ts      # Google Sheets operations
│   │   └── discordService.ts     # Discord webhook
│   ├── functions/
│   │   └── processEmail.ts       # Email processing function
│   ├── jobs/
│   │   └── dailySummary.ts       # Daily summary job
│   ├── types/
│   │   └── application.ts        # TypeScript types
│   └── config/
│       └── config.ts             # Configuration
├── package.json
├── tsconfig.json
└── README.md
```

## License

MIT
