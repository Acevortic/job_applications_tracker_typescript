/**
 * Main server for Railway deployment and local testing
 * Runs email processing on a schedule and daily summaries
 */

import { processEmail } from './functions/processEmail';
import { dailySummary } from './jobs/dailySummary';

// Mock request/response objects for direct function calls
function createMockReqRes() {
  const res: any = {
    status: (code: number) => {
      res.statusCode = code;
      return res;
    },
    json: (data: any) => {
      console.log('Response:', JSON.stringify(data, null, 2));
      return res;
    },
    statusCode: 200,
  };

  return {
    req: {} as any,
    res,
  };
}

/**
 * Run email processing
 */
async function runEmailProcessing() {
  console.log('\n📧 Running email processing...');
  const { req, res } = createMockReqRes();
  
  try {
    await processEmail(req, res);
  } catch (error) {
    console.error('Error in email processing:', error);
  }
}

/**
 * Run daily summary
 */
async function runDailySummary() {
  console.log('\n📊 Running daily summary...');
  const { req, res } = createMockReqRes();
  
  try {
    await dailySummary(req, res);
  } catch (error) {
    console.error('Error in daily summary:', error);
  }
}

/**
 * Schedule tasks
 */
function scheduleTasks() {
  const EMAIL_CHECK_INTERVAL = 30 * 60 * 1000; // 30 minutes
  const DAILY_SUMMARY_HOUR = 9; // 9 AM
  const DAILY_SUMMARY_MINUTE = 0;

  // Run email processing immediately on startup
  runEmailProcessing();

  // Schedule email processing every 30 minutes
  setInterval(() => {
    runEmailProcessing();
  }, EMAIL_CHECK_INTERVAL);

  // Schedule daily summary
  function scheduleDailySummary() {
    const now = new Date();
    const targetTime = new Date();
    targetTime.setHours(DAILY_SUMMARY_HOUR, DAILY_SUMMARY_MINUTE, 0, 0);

    // If target time has passed today, schedule for tomorrow
    if (targetTime.getTime() < now.getTime()) {
      targetTime.setDate(targetTime.getDate() + 1);
    }

    const msUntilTarget = targetTime.getTime() - now.getTime();
    console.log(`\n⏰ Daily summary scheduled for ${targetTime.toLocaleString()}`);

    setTimeout(() => {
      runDailySummary();
      // Schedule next day's summary
      scheduleDailySummary();
    }, msUntilTarget);
  }

  scheduleDailySummary();
}

// Start the server
console.log('🚀 Job Tracker Automations Server Starting...');
console.log('📧 Email processing: Every 30 minutes');
console.log('📊 Daily summary: 9:00 AM daily\n');

scheduleTasks();

// Keep the process alive
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully...');
  process.exit(0);
});
