/**
 * Main server for Railway deployment and local testing
 * Runs email processing on a schedule and daily summaries
 */

import { DateTime } from 'luxon';
import { processEmail } from './functions/processEmail';
import { dailySummary } from './jobs/dailySummary';

const DAILY_SUMMARY_ZONE = 'America/Chicago';
const DAILY_SUMMARY_HOUR = 9;

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

  // Run email processing immediately on startup
  runEmailProcessing();

  // Schedule email processing every 30 minutes
  setInterval(() => {
    runEmailProcessing();
  }, EMAIL_CHECK_INTERVAL);

  // Schedule daily summary at 9 AM America/Chicago (handles CST/CDT automatically)
  function scheduleDailySummary() {
    const now = DateTime.now().setZone(DAILY_SUMMARY_ZONE);
    let target = now.set({ hour: DAILY_SUMMARY_HOUR, minute: 0, second: 0, millisecond: 0 });
    if (target <= now) {
      target = target.plus({ days: 1 });
    }

    const msUntilTarget = target.toMillis() - DateTime.now().toMillis();
    console.log(`\n⏰ Daily summary scheduled for ${target.toLocaleString(DateTime.DATETIME_FULL)} (${target.toUTC().toISO()})`);

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
console.log('📊 Daily summary: 9:00 AM America/Chicago daily\n');

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
