# Deployment Guide

## Prerequisites

1. Install Google Cloud SDK: https://cloud.google.com/sdk/docs/install
2. Authenticate: `gcloud auth login`
3. Set your project: `gcloud config set project YOUR_PROJECT_ID`

## Step 1: Enable Required APIs

```bash
gcloud services enable gmail.googleapis.com
gcloud services enable sheets.googleapis.com
gcloud services enable cloudfunctions.googleapis.com
gcloud services enable cloudscheduler.googleapis.com
```

## Step 2: Set Up Environment Variables

### Option A: Using Secret Manager (Recommended)

1. Create secrets for sensitive values:
```bash
echo -n "your_gmail_client_id" | gcloud secrets create gmail-client-id --data-file=-
echo -n "your_gmail_client_secret" | gcloud secrets create gmail-client-secret --data-file=-
echo -n "your_gmail_refresh_token" | gcloud secrets create gmail-refresh-token --data-file=-
echo -n "your_openai_api_key" | gcloud secrets create openai-api-key --data-file=-
echo -n "your_discord_webhook_url" | gcloud secrets create discord-webhook-url --data-file=-
```

2. Grant access to Cloud Functions service account:
```bash
PROJECT_NUMBER=$(gcloud projects describe $(gcloud config get-value project) --format="value(projectNumber)")
gcloud secrets add-iam-policy-binding gmail-client-id \
  --member="serviceAccount:${PROJECT_NUMBER}-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
# Repeat for other secrets
```

### Option B: Using Environment Variables

Set environment variables when deploying (less secure):
```bash
gcloud functions deploy processEmail \
  --set-env-vars GMAIL_CLIENT_ID=xxx,GMAIL_CLIENT_SECRET=xxx,...
```

## Step 3: Build and Deploy Functions

### Build the project:
```bash
npm install
npm run build
```

### Deploy Email Processing Function:
```bash
npm run build  # Build TypeScript first

gcloud functions deploy processEmail \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=processEmail \
  --trigger-http \
  --allow-unauthenticated \
  --set-secrets=GMAIL_CLIENT_ID=gmail-client-id:latest,GMAIL_CLIENT_SECRET=gmail-client-secret:latest,GMAIL_REFRESH_TOKEN=gmail-refresh-token:latest,OPENAI_API_KEY=openai-api-key:latest,GOOGLE_SHEETS_SPREADSHEET_ID=your_sheet_id,GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account_email,GOOGLE_SHEETS_PRIVATE_KEY=your_private_key,DISCORD_WEBHOOK_URL=discord-webhook-url:latest
```

### Deploy Daily Summary Function:
```bash
npm run build  # Build TypeScript first

gcloud functions deploy dailySummary \
  --gen2 \
  --runtime=nodejs20 \
  --region=us-central1 \
  --source=. \
  --entry-point=dailySummary \
  --trigger-http \
  --allow-unauthenticated \
  --set-secrets=GOOGLE_SHEETS_SPREADSHEET_ID=your_sheet_id,GOOGLE_SHEETS_CLIENT_EMAIL=your_service_account_email,GOOGLE_SHEETS_PRIVATE_KEY=your_private_key,DISCORD_WEBHOOK_URL=discord-webhook-url:latest
```

## Step 4: Set Up Cloud Scheduler

### Schedule Daily Summary (runs at 9 AM daily):
```bash
gcloud scheduler jobs create http daily-job-summary \
  --location=us-central1 \
  --schedule="0 9 * * *" \
  --uri="https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/dailySummary" \
  --http-method=GET \
  --time-zone="America/New_York"
```

### Schedule Email Processing (runs every 30 minutes):
```bash
gcloud scheduler jobs create http email-processing \
  --location=us-central1 \
  --schedule="*/30 * * * *" \
  --uri="https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/processEmail" \
  --http-method=GET
```

## Step 5: Set Up Google Sheets

1. Create a new Google Sheet
2. Note the Spreadsheet ID from the URL
3. Create a service account in Google Cloud Console
4. Download the JSON key file
5. Share the Google Sheet with the service account email (viewer or editor permissions)
6. Extract the client_email and private_key from the JSON file

## Testing

### Test Email Processing:
```bash
curl https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/processEmail
```

### Test Daily Summary:
```bash
curl https://us-central1-YOUR_PROJECT_ID.cloudfunctions.net/dailySummary
```

## Monitoring

View logs:
```bash
gcloud functions logs read processEmail --limit=50
gcloud functions logs read dailySummary --limit=50
```

## Troubleshooting

1. **Authentication errors**: Ensure OAuth tokens are valid and not expired
2. **Sheets permission errors**: Verify service account has access to the sheet
3. **Function timeouts**: Increase timeout in function configuration
4. **Missing environment variables**: Check that all secrets/env vars are set correctly
