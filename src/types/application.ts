export type ApplicationStatus = 'Accepted' | 'Rejected' | 'In-Process';

export interface JobApplication {
  date: string; // Date of application (ISO format)
  company: string;
  role: string;
  status: ApplicationStatus;
  nextSteps: string; // Time-sensitive next steps or empty if none
  emailDate: string; // Date email was received (ISO format)
  emailId?: string; // Gmail message ID to track processed emails
}

export interface ApplicationRow {
  Date: string;
  Company: string;
  Role: string;
  Status: ApplicationStatus;
  'Next Steps': string;
  'Email Date': string;
}
