/**
 * Main entry point for dailySummary Cloud Function
 * Deploy from root with: --entry-point=dailySummary
 * 
 * This file registers the HTTP function with the Functions Framework
 */
import * as functions from '@google-cloud/functions-framework';
import { dailySummary } from './jobs/dailySummary';

functions.http('dailySummary', dailySummary);
