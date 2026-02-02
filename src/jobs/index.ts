/**
 * Entry point for dailySummary Cloud Function
 * This file is used when deploying to Google Cloud Functions
 * 
 * Deploy with: --entry-point=dailySummary --source=src/jobs
 */
import * as functions from '@google-cloud/functions-framework';
import { dailySummary } from './dailySummary';

functions.http('dailySummary', dailySummary);
