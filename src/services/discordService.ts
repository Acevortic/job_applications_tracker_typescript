import { config } from '../config/config';
import { JobApplication } from '../types/application';

export class DiscordService {
  private webhookUrl: string;

  constructor() {
    this.webhookUrl = config.discord.webhookUrl;
    
    if (!this.webhookUrl || this.webhookUrl.trim() === '') {
      throw new Error(
        'DISCORD_WEBHOOK_URL is not set in environment variables. ' +
        'Please add it to your .env file to enable Discord notifications.'
      );
    }
    
    // Validate webhook URL format
    if (!this.webhookUrl.startsWith('https://discord.com/api/webhooks/') && 
        !this.webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
      console.warn(
        'Warning: DISCORD_WEBHOOK_URL does not appear to be a valid Discord webhook URL. ' +
        'Expected format: https://discord.com/api/webhooks/{id}/{token}'
      );
    }
  }

  /**
   * Send a daily summary to Discord
   */
  async sendDailySummary(
    totalApplications: number,
    applicationsWithNextSteps: JobApplication[]
  ): Promise<void> {
    const message = this.formatSummaryMessage(totalApplications, applicationsWithNextSteps);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `Discord webhook failed with status ${response.status}: ${errorText}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }

      console.log('✅ Daily summary sent to Discord successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error sending Discord webhook:', errorMessage);
      
      // Provide helpful debugging information
      if (errorMessage.includes('fetch')) {
        console.error('   This might indicate a network issue or invalid webhook URL');
      }
      
      throw error;
    }
  }

  /**
   * Format the summary message for Discord (simplified to stay under 2000 char limit)
   */
  private formatSummaryMessage(
    totalApplicationsToday: number,
    applicationsWithNextSteps: JobApplication[]
  ): string {
    let message = `**Total Applications today:** ${totalApplicationsToday}\n\n`;

    if (applicationsWithNextSteps.length === 0) {
      message += '**Applications with next steps:** None';
    } else {
      message += `**Applications with next steps:**\n`;
      for (const app of applicationsWithNextSteps) {
        message += `${app.company} / ${app.role}\n`;
      }
    }

    // Ensure message is under 2000 characters (Discord limit)
    if (message.length > 2000) {
      // Truncate the list if too long
      const header = `**Total Applications today:** ${totalApplicationsToday}\n\n**Applications with next steps:**\n`;
      const maxListLength = 2000 - header.length - 50; // Leave buffer
      let list = '';
      for (const app of applicationsWithNextSteps) {
        const line = `${app.company} / ${app.role}\n`;
        if (list.length + line.length > maxListLength) {
          list += `... and ${applicationsWithNextSteps.length - list.split('\n').length + 1} more`;
          break;
        }
        list += line;
      }
      message = header + list;
    }

    return message;
  }

  /**
   * Send a simple notification message
   */
  async sendNotification(message: string): Promise<void> {
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: message,
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        const errorMessage = `Discord webhook failed with status ${response.status}: ${errorText}`;
        console.error(errorMessage);
        throw new Error(errorMessage);
      }
      
      console.log('✅ Discord notification sent successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error sending Discord notification:', errorMessage);
      throw error;
    }
  }
}
