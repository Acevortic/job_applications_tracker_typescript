import dotenv from 'dotenv';

dotenv.config();

export const config = {
  gmail: {
    clientId: process.env.GMAIL_CLIENT_ID || '',
    clientSecret: process.env.GMAIL_CLIENT_SECRET || '',
    refreshToken: process.env.GMAIL_REFRESH_TOKEN || '',
    userEmail: process.env.GMAIL_USER_EMAIL || '',
  },
  googleSheets: {
    spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID || '',
    clientEmail: process.env.GOOGLE_SHEETS_CLIENT_EMAIL || '',
    privateKey: (() => {
      const key = process.env.GOOGLE_SHEETS_PRIVATE_KEY || '';
      if (!key) return '';
      
      // Handle different newline formats:
      // 1. Replace escaped newlines (\n) with actual newlines
      // 2. Handle both single and double backslashes
      // 3. Preserve the key format
      let formattedKey = key
        .replace(/\\n/g, '\n')      // Replace escaped newlines (most common)
        .replace(/\\\\n/g, '\\n')   // Handle double-escaped (keep as single escape)
        .replace(/\\r\\n/g, '\n')   // Handle Windows line endings
        .replace(/\\r/g, '\n')      // Handle old Mac line endings
        .trim();
      
      return formattedKey;
    })(),
  },
  openai: {
    apiKey: process.env.OPENAI_API_KEY || '',
  },
  discord: {
    webhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
  },
  gcp: {
    projectId: process.env.GCP_PROJECT_ID || '',
  },
  jobKeywords: [
    'interview',
    'application',
    'position',
    'role',
    'rejected',
    'accepted',
    'next steps',
    'hiring',
    'candidate',
    'scheduled',
    'interview scheduled',
  ],
};

// Validate required configuration
function validateConfig() {
  const required = [
    'GMAIL_CLIENT_ID',
    'GMAIL_CLIENT_SECRET',
    'GMAIL_REFRESH_TOKEN',
    'GMAIL_USER_EMAIL',
    'GOOGLE_SHEETS_SPREADSHEET_ID',
    'GOOGLE_SHEETS_CLIENT_EMAIL',
    'GOOGLE_SHEETS_PRIVATE_KEY',
    'OPENAI_API_KEY',
    'DISCORD_WEBHOOK_URL',
  ];

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.warn(`Warning: Missing environment variables: ${missing.join(', ')}`);
  }
}

validateConfig();
