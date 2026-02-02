import { EmailMonitor } from '../services/emailMonitor';
import { DataExtractor } from '../services/dataExtractor';
import { SheetsService } from '../services/sheetsService';

/**
 * Cloud Function to process new job-related emails
 * This can be triggered by:
 * - Gmail push notifications (via Pub/Sub)
 * - HTTP endpoint (for manual triggering or polling)
 * - Cloud Scheduler (for periodic checks)
 */
export async function processEmail(req: any, res: any): Promise<void> {
  try {
    console.log('Starting email processing...');

    const emailMonitor = new EmailMonitor();
    const dataExtractor = new DataExtractor();
    const sheetsService = new SheetsService();

    // Check for new job-related emails
    const emails = await emailMonitor.checkForJobEmails(20);

    if (emails.length === 0) {
      console.log('No new job-related emails found');
      res.status(200).json({ message: 'No new emails to process', processed: 0 });
      return;
    }

    console.log(`Found ${emails.length} job-related emails to process`);

    let processedCount = 0;
    let skippedCount = 0;

    for (const email of emails) {
      try {
        // Check if email was already processed
        const isProcessed = await sheetsService.isEmailProcessed(email.id);
        if (isProcessed) {
          console.log(`Email ${email.id} already processed, skipping`);
          skippedCount++;
          continue;
        }

        // Extract structured data from email
        const application = await dataExtractor.extractApplicationData(
          email.subject,
          email.body,
          email.date
        );

        if (!application) {
          console.log(`Could not extract application data from email ${email.id}`);
          skippedCount++;
          continue;
        }

        // Add email ID to track processed emails
        application.emailId = email.id;

        // Add to Google Sheets
        await sheetsService.addApplication(application);
        processedCount++;

        console.log(
          `Processed application: ${application.company} - ${application.role} (${application.status})`
        );
      } catch (error) {
        console.error(`Error processing email ${email.id}:`, error);
        // Continue with next email even if one fails
      }
    }

    const result = {
      message: 'Email processing completed',
      processed: processedCount,
      skipped: skippedCount,
      total: emails.length,
    };

    console.log('Email processing completed:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in processEmail function:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// For Google Cloud Functions
export const processEmailFunction = processEmail;
