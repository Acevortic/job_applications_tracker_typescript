/**
 * Entry point for processEmail Cloud Function
 * This file is used when deploying to Google Cloud Functions
 * 
 * Deploy with: --entry-point=processEmail --source=src/functions
 */
import * as functions from '@google-cloud/functions-framework';
import { processEmail } from './processEmail';

functions.http('processEmail', processEmail);
