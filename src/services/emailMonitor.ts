import { google } from 'googleapis';
import { config } from '../config/config';

export interface EmailMessage {
  id: string;
  subject: string;
  body: string;
  from: string;
  date: string;
}

export class EmailMonitor {
  private gmail: any;
  private processedIds: Set<string> = new Set();

  constructor() {
    this.initializeGmail();
  }

  private async initializeGmail() {
    const oauth2Client = new google.auth.OAuth2(
      config.gmail.clientId,
      config.gmail.clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: config.gmail.refreshToken,
    });

    this.gmail = google.gmail({ version: 'v1', auth: oauth2Client });
  }

  /**
   * Check for new job-related emails
   */
  async checkForJobEmails(maxResults: number = 10): Promise<EmailMessage[]> {
    await this.ensureInitialized();

    try {
      // Build search query with job-related keywords
      const query = this.buildSearchQuery();

      const response = await this.gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults,
      });

      const messages = response.data.messages || [];
      const jobEmails: EmailMessage[] = [];

      for (const message of messages) {
        // Skip if already processed
        if (this.processedIds.has(message.id!)) {
          continue;
        }

        const email = await this.getMessageDetails(message.id!);
        if (email && this.isJobRelated(email)) {
          jobEmails.push(email);
          this.processedIds.add(email.id);
        }
      }

      return jobEmails;
    } catch (error) {
      console.error('Error checking for job emails:', error);
      throw error;
    }
  }

  /**
   * Get full email message details
   */
  private async getMessageDetails(messageId: string): Promise<EmailMessage | null> {
    try {
      const response = await this.gmail.users.messages.get({
        userId: 'me',
        id: messageId,
        format: 'full',
      });

      const message = response.data;
      const headers = message.payload?.headers || [];

      const subject = headers.find((h: any) => h.name === 'Subject')?.value || '';
      const from = headers.find((h: any) => h.name === 'From')?.value || '';
      const dateHeader = headers.find((h: any) => h.name === 'Date')?.value || '';
      // Format as YYYY-MM-DD for consistency with application date format
      const date = dateHeader 
        ? new Date(dateHeader).toISOString().split('T')[0] 
        : new Date().toISOString().split('T')[0];

      // Extract body text
      const body = this.extractBody(message.payload);

      return {
        id: messageId,
        subject,
        body,
        from,
        date,
      };
    } catch (error) {
      console.error(`Error getting message details for ${messageId}:`, error);
      return null;
    }
  }

  /**
   * Extract text body from email payload
   */
  private extractBody(payload: any): string {
    let body = '';

    if (payload.body?.data) {
      body = Buffer.from(payload.body.data, 'base64').toString('utf-8');
    }

    if (payload.parts) {
      for (const part of payload.parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          body += Buffer.from(part.body.data, 'base64').toString('utf-8');
        } else if (part.mimeType === 'text/html' && part.body?.data && !body) {
          // Fallback to HTML if no plain text
          const html = Buffer.from(part.body.data, 'base64').toString('utf-8');
          // Simple HTML tag removal
          body = html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        } else if (part.parts) {
          // Recursively check nested parts
          body += this.extractBody(part);
        }
      }
    }

    return body.trim();
  }

  /**
   * Build Gmail search query with job-related keywords
   */
  private buildSearchQuery(): string {
    const keywords = config.jobKeywords.map((k) => `"${k}"`).join(' OR ');
    // Search in inbox, exclude sent items
    return `in:inbox -in:sent (${keywords})`;
  }

  /**
   * Check if email is job-related based on content
   */
  private isJobRelated(email: EmailMessage): boolean {
    const text = `${email.subject} ${email.body}`.toLowerCase();
    const keywords = config.jobKeywords.map((k) => k.toLowerCase());

    // Check if at least 2 keywords are present
    const matches = keywords.filter((keyword) => text.includes(keyword));
    return matches.length >= 2;
  }

  /**
   * Mark an email as processed
   */
  markAsProcessed(emailId: string): void {
    this.processedIds.add(emailId);
  }

  /**
   * Ensure Gmail client is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.gmail) {
      await this.initializeGmail();
    }
  }
}
