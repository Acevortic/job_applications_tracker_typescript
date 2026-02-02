/**
 * Main entry point for processEmail Cloud Function
 * Deploy from root with: --entry-point=processEmail
 * 
 * This file registers the HTTP function with the Functions Framework
 */
import * as functions from '@google-cloud/functions-framework';
import { processEmail } from './functions/processEmail';

functions.http('processEmail', processEmail);
