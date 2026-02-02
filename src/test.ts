/**
 * Simple test script to run functions manually
 * Usage: npm run test:email or npm run test:summary
 */

import { processEmail } from './functions/processEmail';
import { dailySummary } from './jobs/dailySummary';

// Create mock request/response
const mockReq = {} as any;
const mockRes = {
  status: (code: number) => {
    console.log(`Status: ${code}`);
    return mockRes;
  },
  json: (data: any) => {
    console.log('\n✅ Result:', JSON.stringify(data, null, 2));
    return mockRes;
  },
} as any;

// Get command from process args
const command = process.argv[2];

async function runTest() {
  try {
    if (command === 'email' || !command) {
      console.log('🧪 Testing email processing...\n');
      await processEmail(mockReq, mockRes);
    } else if (command === 'summary') {
      console.log('🧪 Testing daily summary...\n');
      await dailySummary(mockReq, mockRes);
    } else {
      console.log('Usage:');
      console.log('  npm run test:email    - Test email processing');
      console.log('  npm run test:summary  - Test daily summary');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

runTest();
