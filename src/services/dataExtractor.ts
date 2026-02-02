import OpenAI from 'openai';
import { config } from '../config/config';
import { JobApplication, ApplicationStatus } from '../types/application';

export class DataExtractor {
  private openai: OpenAI;

  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey,
    });
  }

  /**
   * Extract structured job application data from email content
   */
  async extractApplicationData(
    emailSubject: string,
    emailBody: string,
    emailDate: string
  ): Promise<JobApplication | null> {
    try {
      const prompt = this.buildExtractionPrompt(emailSubject, emailBody);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that extracts structured data from job-related emails. 
            Extract information about job applications, interviews, rejections, and acceptances.
            Always return valid JSON in the exact format specified.`,
          },
          {
            role: 'user',
            content: prompt,
          },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        console.error('No content in OpenAI response');
        return null;
      }

      const extracted = JSON.parse(content);

      // Validate and normalize the extracted data
      const application: JobApplication = {
        date: this.extractDate(extracted.date) || new Date().toISOString().split('T')[0],
        company: this.extractCompany(extracted.company, emailSubject, emailBody) || 'Unknown',
        role: extracted.role || this.extractRoleFromSubject(emailSubject) || 'Unknown',
        status: this.normalizeStatus(extracted.status),
        nextSteps: extracted.nextSteps || extracted.next_steps || '',
        emailDate: emailDate,
      };

      // Only return if we have at least company or role
      if (application.company === 'Unknown' && application.role === 'Unknown') {
        return null;
      }

      return application;
    } catch (error) {
      console.error('Error extracting data from email:', error);
      return null;
    }
  }

  private buildExtractionPrompt(subject: string, body: string): string {
    return `Extract job application information from this email. Return a JSON object with the following structure:
{
  "date": "YYYY-MM-DD format date of when the application was made (if mentioned, otherwise use today's date)",
  "company": "Company name",
  "role": "Job title/position name",
  "status": "One of: Accepted, Rejected, In-Process",
  "nextSteps": "Any time-sensitive next steps, interview dates, deadlines, or action items mentioned. Leave empty if none."
}

Email Subject: ${subject}

Email Body:
${body.substring(0, 4000)} // Limit body length

Rules:
- If the email is a rejection, status should be "Rejected"
- If the email is an acceptance/offer, status should be "Accepted"
- If the email mentions an interview or next steps, status should be "In-Process"
- Extract any interview dates, deadlines, or action items in the "nextSteps" field
- If company or role cannot be determined, use "Unknown"`;
  }

  private extractDate(dateStr: string | undefined): string | null {
    if (!dateStr) return null;
    try {
      const date = new Date(dateStr);
      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    } catch {
      // Invalid date
    }
    return null;
  }

  private extractCompany(
    extractedCompany: string | undefined,
    subject: string,
    body: string
  ): string | null {
    if (extractedCompany && extractedCompany !== 'Unknown') {
      return extractedCompany;
    }

    // Try to extract from email domain or subject
    const emailMatch = body.match(/@([a-zA-Z0-9.-]+)\./);
    if (emailMatch) {
      const domain = emailMatch[1];
      // Remove common email providers
      if (!['gmail', 'yahoo', 'outlook', 'hotmail', 'icloud'].includes(domain.toLowerCase())) {
        return domain.split('.')[0].charAt(0).toUpperCase() + domain.split('.')[0].slice(1);
      }
    }

    return null;
  }

  private extractRoleFromSubject(subject: string): string | null {
    // Try to extract role from common patterns
    const patterns = [
      /(?:for|position|role|opportunity).*?([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/i,
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(?:position|role|job)/i,
    ];

    for (const pattern of patterns) {
      const match = subject.match(pattern);
      if (match && match[1]) {
        return match[1];
      }
    }

    return null;
  }

  private normalizeStatus(status: string | undefined): ApplicationStatus {
    if (!status) return 'In-Process';

    const normalized = status.toLowerCase().trim();

    if (normalized.includes('accept') || normalized.includes('offer') || normalized.includes('congrat')) {
      return 'Accepted';
    }

    if (normalized.includes('reject') || normalized.includes('decline') || normalized.includes('unfortunately')) {
      return 'Rejected';
    }

    return 'In-Process';
  }
}
