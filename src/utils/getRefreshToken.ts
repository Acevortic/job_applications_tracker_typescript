/**
 * Helper script to obtain Gmail OAuth refresh token
 * 
 * Usage:
 * 1. Set GMAIL_CLIENT_ID and GMAIL_CLIENT_SECRET in .env
 * 2. Run: npx ts-node src/utils/getRefreshToken.ts
 * 3. Follow the prompts to authorize and get your refresh token
 */

import { google } from 'googleapis';
import * as readline from 'readline';
import * as http from 'http';
import * as url from 'url';
import dotenv from 'dotenv';
import { config } from '../config/config';

dotenv.config();

const SCOPES = ['https://www.googleapis.com/auth/gmail.readonly'];

async function getRefreshToken() {
  const clientId = config.gmail.clientId || process.env.GMAIL_CLIENT_ID;
  const clientSecret = config.gmail.clientSecret || process.env.GMAIL_CLIENT_SECRET;

  // Try localhost redirect first, fall back to OOB if that fails
  const redirectUri = 'http://localhost:3000';
  const oauth2Client = new google.auth.OAuth2(
    clientId,
    clientSecret,
    redirectUri
  );

  // Generate the authorization URL with offline access to get refresh token
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline', // Required to get refresh token (must be 'offline', not 'online')
    scope: SCOPES,
    prompt: 'consent', // Force consent screen to ensure refresh token is returned
    include_granted_scopes: true,
  });

  // Verify the URL contains access_type=offline
  if (!authUrl.includes('access_type=offline')) {
    console.warn('⚠️  Warning: access_type=offline may not be in the URL');
    console.log('Generated URL:', authUrl);
  }

  console.log('\n🔐 Gmail OAuth Setup\n');
  console.log('⚠️  IMPORTANT: Make sure you\'ve added the redirect URI in Google Cloud Console:');
  console.log(`   ${redirectUri}\n`);
  console.log('Steps:');
  console.log('1. Go to: https://console.cloud.google.com/apis/credentials');
  console.log('2. Click on your OAuth 2.0 Client ID');
  console.log('3. Under "Authorized redirect URIs", click "ADD URI"');
  console.log(`4. Add exactly: ${redirectUri}`);
  console.log('5. Click "SAVE"\n');
  console.log('─────────────────────────────────────────────────\n');
  console.log('📋 Pre-flight Checklist:');
  console.log('   ✓ Gmail API enabled');
  console.log('   ✓ OAuth consent screen configured');
  console.log('   ✓ Redirect URI added: http://localhost:3000');
  console.log('   ✓ If app is in "Testing" mode, your email is added as test user\n');
  console.log('─────────────────────────────────────────────────\n');
  console.log('1. Open this URL in your browser:');
  console.log(`\n   ${authUrl}\n`);
  console.log('2. Authorize the application');
  console.log('3. You will be redirected to localhost - the script will handle it automatically\n');

  // Start a local server to receive the callback
  const server = http.createServer(async (req, res) => {
    if (!req.url) return;

    // Handle root path and any path (Google redirects to root)
    const queryObject = url.parse(req.url, true).query;
    const code = queryObject.code as string;
    const error = queryObject.error as string;

    if (error) {
      const errorDescription = queryObject.error_description as string || '';
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Authorization Error</h1>
            <p>Error: ${error}</p>
            <p>${errorDescription}</p>
            <p>Check the terminal for troubleshooting steps.</p>
          </body>
        </html>
      `);
      console.error(`\n❌ Authorization error: ${error}`);
      if (errorDescription) {
        console.error(`Error description: ${errorDescription}`);
      }
      console.log('\n🔧 Troubleshooting steps:');
      console.log('1. Verify redirect URI is added:');
      console.log('   - Go to: https://console.cloud.google.com/apis/credentials');
      console.log('   - Click your OAuth 2.0 Client ID');
      console.log('   - Ensure "http://localhost:3000" is in "Authorized redirect URIs"');
      console.log('2. Check OAuth consent screen:');
      console.log('   - Go to: https://console.cloud.google.com/apis/credentials/consent');
      console.log('   - Ensure it\'s configured (User Type: External or Internal)');
      console.log('   - If in "Testing" mode, add your email as a test user');
      console.log('3. Verify Gmail API is enabled:');
      console.log('   - Go to: https://console.cloud.google.com/apis/library/gmail.googleapis.com');
      console.log('   - Click "Enable" if not already enabled');
      server.close();
      process.exit(1);
      return;
    }

    if (code) {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Authorization Successful!</h1>
            <p>You can close this window and return to the terminal.</p>
            <script>setTimeout(() => window.close(), 2000);</script>
          </body>
        </html>
      `);

      try {
        // Exchange code for tokens
        const { tokens } = await oauth2Client.getToken(code);
        
        if (tokens.refresh_token) {
          console.log('\n✅ Success! Your refresh token:\n');
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
          console.log(tokens.refresh_token);
          console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
          console.log('Add this to your .env file as:');
          console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}\n`);
        } else {
          console.log('\n⚠️  Warning: No refresh token received.');
          console.log('This can happen if you\'ve already authorized the app before.');
          console.log('Try revoking access at: https://myaccount.google.com/permissions');
          console.log('Then run this script again.\n');
          if (tokens.access_token) {
            console.log('Access token received (expires in 1 hour):');
            console.log(tokens.access_token);
          }
        }

        server.close();
        process.exit(0);
      } catch (error) {
        console.error('\n❌ Error exchanging code for token:', error);
        server.close();
        process.exit(1);
      }
    } else {
      // Show a waiting page if no code yet
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(`
        <html>
          <body>
            <h1>Waiting for authorization...</h1>
            <p>Please complete the authorization in the browser.</p>
          </body>
        </html>
      `);
    }
  });

  server.listen(3000, () => {
    console.log('Local server started on port 3000...\n');
  });

  // Open browser automatically (optional)
  try {
    const { exec } = require('child_process');
    const platform = process.platform;
    let command = '';
    
    if (platform === 'darwin') {
      command = `open "${authUrl}"`;
    } else if (platform === 'win32') {
      command = `start "${authUrl}"`;
    } else {
      command = `xdg-open "${authUrl}"`;
    }
    
    exec(command);
  } catch (error) {
    // Browser opening failed, user can manually open the URL
  }
}

// Check if credentials are set
if (!config.gmail.clientId && !process.env.GMAIL_CLIENT_ID) {
  console.error('❌ Error: GMAIL_CLIENT_ID not found in .env file');
  console.log('\nTo get your Client ID and Secret:');
  console.log('1. Go to https://console.cloud.google.com/apis/credentials');
  console.log('2. Click "Create Credentials" → "OAuth client ID"');
  console.log('3. Application type: "Desktop app"');
  console.log('4. Copy the Client ID and Client Secret to your .env file');
  console.log('5. IMPORTANT: After creating, click on the credential to edit it');
  console.log('6. Under "Authorized redirect URIs", click "ADD URI"');
  console.log('7. Add exactly: http://localhost:3000');
  console.log('8. Click "SAVE"\n');
  process.exit(1);
}

if (!config.gmail.clientSecret && !process.env.GMAIL_CLIENT_SECRET) {
  console.error('❌ Error: GMAIL_CLIENT_SECRET not found in .env file');
  process.exit(1);
}

getRefreshToken().catch(console.error);
