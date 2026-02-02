/**
 * Main entry point for local development
 * For cloud deployment, use the individual function files
 */

import { processEmail } from './functions/processEmail';
import { dailySummary } from './jobs/dailySummary';

// Export functions for cloud deployment
export { processEmail, dailySummary };

// For local testing
if (require.main === module) {
  console.log('Job Tracker Automations - Local Development Mode');
  console.log('For cloud deployment, use the individual function files');
  
  // Example: Run email processing
  // processEmail({}, { status: (code) => ({ json: (data) => console.log(data) }) });
}
