import { SheetsService } from '../services/sheetsService';
import { DiscordService } from '../services/discordService';

/**
 * Cloud Function to send daily summary to Discord
 * Should be triggered daily by Cloud Scheduler
 */
export async function dailySummary(req: any, res: any): Promise<void> {
  try {
    console.log('Starting daily summary job...');

    const sheetsService = new SheetsService();
    const discordService = new DiscordService();

    // Get all applications
    const allApplications = await sheetsService.getAllApplications();
    
    // Filter applications from today
    const today = new Date().toISOString().split('T')[0];
    const todayApplications = allApplications.filter(
      (app) => app.emailDate === today
    );
    const totalApplicationsToday = todayApplications.length;

    console.log(`Total applications today: ${totalApplicationsToday}`);

    // Get applications with next steps (from all time, not just today)
    const applicationsWithNextSteps = await sheetsService.getApplicationsWithNextSteps();

    console.log(
      `Applications with next steps: ${applicationsWithNextSteps.length}`
    );

    // Send summary to Discord
    await discordService.sendDailySummary(totalApplicationsToday, applicationsWithNextSteps);

    const result = {
      message: 'Daily summary sent successfully',
      totalApplicationsToday,
      applicationsWithNextSteps: applicationsWithNextSteps.length,
    };

    console.log('Daily summary job completed:', result);
    res.status(200).json(result);
  } catch (error) {
    console.error('Error in dailySummary function:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}

// For Google Cloud Functions
export const dailySummaryFunction = dailySummary;
