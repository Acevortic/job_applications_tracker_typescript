import { google } from 'googleapis';
import { config } from '../config/config';
import { JobApplication, ApplicationRow } from '../types/application';

export class SheetsService {
  private sheets: any;
  private spreadsheetId: string;

  constructor() {
    this.spreadsheetId = config.googleSheets.spreadsheetId;
    this.initializeSheets();
  }

  private async initializeSheets() {
    // Validate private key format before attempting to use it
    const privateKey = config.googleSheets.privateKey;
    
    if (!privateKey) {
      throw new Error('GOOGLE_SHEETS_PRIVATE_KEY is not set in environment variables');
    }
    
    // Check if the key has the proper PEM format markers
    if (!privateKey.includes('BEGIN') || !privateKey.includes('END')) {
      throw new Error(
        'GOOGLE_SHEETS_PRIVATE_KEY appears to be malformed. ' +
        'It should include -----BEGIN PRIVATE KEY----- and -----END PRIVATE KEY----- markers. ' +
        'In your .env file, use \\n to represent newlines (e.g., "-----BEGIN PRIVATE KEY-----\\n...\\n-----END PRIVATE KEY-----")'
      );
    }
    
    try {
      const auth = new google.auth.JWT({
        email: config.googleSheets.clientEmail,
        key: privateKey,
        scopes: ['https://www.googleapis.com/auth/spreadsheets'],
      });

      this.sheets = google.sheets({ version: 'v4', auth });
    } catch (error: any) {
      if (error.message?.includes('DECODER') || error.message?.includes('unsupported')) {
        throw new Error(
          'Failed to decode private key. Common issues:\n' +
          '1. The private key in your .env file should use \\n (backslash-n) for newlines, not actual line breaks\n' +
          '2. The key should include the full PEM format with BEGIN/END markers\n' +
          '3. Make sure there are no extra spaces or characters\n' +
          '4. The key should be on a single line in the .env file\n' +
          `Original error: ${error.message}`
        );
      }
      throw error;
    }
  }

  /**
   * Append a new job application to the Google Sheet
   */
  async addApplication(application: JobApplication): Promise<void> {
    await this.ensureInitialized();

    const row: ApplicationRow = {
      Date: application.date,
      Company: application.company,
      Role: application.role,
      Status: application.status,
      'Next Steps': application.nextSteps,
      'Email Date': application.emailDate,
    };

    // Include emailId if available (7th column for tracking)
    const values = [[
      row.Date,
      row.Company,
      row.Role,
      row.Status,
      row['Next Steps'],
      row['Email Date'],
      application.emailId || '',
    ]];

    try {
      // Check if headers exist, if not create them
      await this.ensureHeaders();

      // Append the row (A:G to include emailId column)
      await this.sheets.spreadsheets.values.append({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A:G',
        valueInputOption: 'USER_ENTERED',
        insertDataOption: 'INSERT_ROWS',
        requestBody: {
          values,
        },
      });

      console.log(`Added application for ${application.company} - ${application.role}`);
    } catch (error) {
      console.error('Error adding application to Sheets:', error);
      throw error;
    }
  }

  /**
   * Get all applications from the sheet
   */
  async getAllApplications(): Promise<JobApplication[]> {
    await this.ensureInitialized();
    await this.ensureHeaders();

    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A2:G', // Skip header row, include emailId column
      });

      const rows = response.data.values || [];
      const applications: JobApplication[] = [];

      for (const row of rows) {
        if (row.length >= 6) {
          applications.push({
            date: row[0] || '',
            company: row[1] || '',
            role: row[2] || '',
            status: row[3] as any || 'In-Process',
            nextSteps: row[4] || '',
            emailDate: row[5] || '',
            emailId: row[6] || undefined,
          });
        }
      }

      return applications;
    } catch (error) {
      console.error('Error reading applications from Sheets:', error);
      throw error;
    }
  }

  /**
   * Get applications that have next steps
   * Filters for applications with meaningful next steps like "next steps", "interview", "invitation", etc.
   */
  async getApplicationsWithNextSteps(): Promise<JobApplication[]> {
    const allApplications = await this.getAllApplications();
    
    // Keywords that indicate meaningful next steps
    const nextStepsKeywords = [
      'next steps',
      'interview',
      'invitation',
      'scheduled',
      'deadline',
      'follow up',
      'follow-up',
      'action required',
      'response needed',
      'meeting',
      'call',
      'assessment',
      'test',
      'assignment',
    ];
    
    return allApplications.filter((app) => {
      if (!app.nextSteps || app.nextSteps.trim().length === 0) {
        return false;
      }
      
      // Check if nextSteps contains any of the keywords (case-insensitive)
      const nextStepsLower = app.nextSteps.toLowerCase();
      return nextStepsKeywords.some((keyword) => 
        nextStepsLower.includes(keyword.toLowerCase())
      );
    });
  }

  /**
   * Check if an email has already been processed
   */
  async isEmailProcessed(emailId: string): Promise<boolean> {
    const applications = await this.getAllApplications();
    return applications.some((app) => app.emailId === emailId);
  }

  /**
   * Ensure headers exist in the sheet
   */
  private async ensureHeaders(): Promise<void> {
    try {
      const response = await this.sheets.spreadsheets.values.get({
        spreadsheetId: this.spreadsheetId,
        range: 'Sheet1!A1:G1',
      });

      const headers = response.data.values?.[0] || [];

      if (headers.length === 0 || headers[0] !== 'Date') {
        // Headers don't exist, create them
        await this.sheets.spreadsheets.values.update({
          spreadsheetId: this.spreadsheetId,
          range: 'Sheet1!A1:G1',
          valueInputOption: 'USER_ENTERED',
          requestBody: {
            values: [['Date', 'Company', 'Role', 'Status', 'Next Steps', 'Email Date', 'Email ID']],
          },
        });
      }
    } catch (error: any) {
      // Check for permission errors
      if (error?.message?.includes('permission') || error?.code === 403) {
        const serviceAccountEmail = config.googleSheets.clientEmail;
        const spreadsheetId = this.spreadsheetId;
        
        throw new Error(
          `Permission denied accessing Google Sheet.\n\n` +
          `To fix this:\n` +
          `1. Open your Google Sheet: https://docs.google.com/spreadsheets/d/${spreadsheetId}\n` +
          `2. Click the "Share" button (top right)\n` +
          `3. Add this service account email with "Editor" permissions:\n` +
          `   ${serviceAccountEmail}\n` +
          `4. Make sure the email matches exactly (copy-paste it)\n` +
          `5. Verify your GOOGLE_SHEETS_SPREADSHEET_ID is correct\n\n` +
          `Current values:\n` +
          `- Service Account Email: ${serviceAccountEmail || 'NOT SET'}\n` +
          `- Spreadsheet ID: ${spreadsheetId || 'NOT SET'}\n\n` +
          `Original error: ${error.message}`
        );
      }
      
      // Check for invalid spreadsheet ID
      if (error?.code === 400 || error?.message?.includes('not found')) {
        throw new Error(
          `Invalid or inaccessible Google Sheet.\n\n` +
          `Check that:\n` +
          `1. GOOGLE_SHEETS_SPREADSHEET_ID is correct (found in the sheet URL)\n` +
          `2. The sheet exists and is accessible\n` +
          `3. The service account has been shared with the sheet\n\n` +
          `Current Spreadsheet ID: ${this.spreadsheetId || 'NOT SET'}\n` +
          `Original error: ${error.message}`
        );
      }
      
      console.error('Error ensuring headers:', error);
      throw error;
    }
  }

  /**
   * Ensure sheets client is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.sheets) {
      await this.initializeSheets();
    }
  }
}
