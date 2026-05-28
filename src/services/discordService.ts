import { config } from '../config/config';
import { JobApplication } from '../types/application';
import { DiscordEmbed, DiscordWebhookPayload } from '../types/discord';

const DISCORD_BLURPLE = 0x5865f2;
const DETAIL_EMBED_COLOR = 0x3498db;
const MAX_EMBED_CHARS = 6000;
const MAX_EMBEDS_PER_MESSAGE = 10;
const RATE_LIMIT_DELAY_MS = 600;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function truncate(value: string, maxLength: number): string {
  if (value.length <= maxLength) {
    return value;
  }
  return `${value.slice(0, maxLength - 3)}...`;
}

function embedCharCount(embed: DiscordEmbed): number {
  let count = 0;
  if (embed.title) count += embed.title.length;
  if (embed.description) count += embed.description.length;
  if (embed.footer?.text) count += embed.footer.text.length;
  if (embed.fields) {
    for (const field of embed.fields) {
      count += field.name.length + field.value.length;
    }
  }
  return count;
}

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
    const overviewEmbed = this.buildSummaryEmbed(
      totalApplications,
      applicationsWithNextSteps
    );
    const detailEmbeds = this.buildApplicationDetailEmbeds(applicationsWithNextSteps);
    const detailBatches = this.batchEmbeds(detailEmbeds);

    try {
      await this.sendWebhook({ embeds: [overviewEmbed] });

      for (const batch of detailBatches) {
        await sleep(RATE_LIMIT_DELAY_MS);
        await this.sendWebhook({ embeds: batch });
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
   * Build summary embed for daily job application report
   */
  private buildSummaryEmbed(
    totalApplicationsToday: number,
    applicationsWithNextSteps: JobApplication[]
  ): DiscordEmbed {
    const description = [
      `Total applications today: **${totalApplicationsToday}**`,
      '',
      applicationsWithNextSteps.length === 0
        ? 'Applications with next steps: **None**'
        : `Applications with next steps: **${applicationsWithNextSteps.length}**`,
    ].join('\n');

    return {
      title: 'Daily Job Applications Summary',
      description,
      color: DISCORD_BLURPLE,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * Build detail embeds for applications with next steps.
   */
  private buildApplicationDetailEmbeds(
    applicationsWithNextSteps: JobApplication[]
  ): DiscordEmbed[] {
    return applicationsWithNextSteps.map((application, index) => {
      const title = truncate(
        `${index + 1}. ${application.company} / ${application.role}`,
        256
      );
      const nextSteps = application.nextSteps?.trim() || 'No next steps provided';
      const description = truncate(nextSteps, 4096);
      const footer = `Status: ${application.status} • Email Date: ${application.emailDate}`;

      return {
        title,
        description,
        color: DETAIL_EMBED_COLOR,
        footer: { text: truncate(footer, 2048) },
      };
    });
  }

  /**
   * Group embeds into Discord-safe batches.
   */
  private batchEmbeds(embeds: DiscordEmbed[]): DiscordEmbed[][] {
    const batches: DiscordEmbed[][] = [];
    let currentBatch: DiscordEmbed[] = [];
    let currentChars = 0;

    for (const embed of embeds) {
      const chars = embedCharCount(embed);
      const exceedsBatchChars = currentChars + chars > MAX_EMBED_CHARS;
      const exceedsBatchCount =
        currentBatch.length >= MAX_EMBEDS_PER_MESSAGE;

      if (currentBatch.length > 0 && (exceedsBatchChars || exceedsBatchCount)) {
        batches.push(currentBatch);
        currentBatch = [];
        currentChars = 0;
      }

      currentBatch.push(embed);
      currentChars += chars;
    }

    if (currentBatch.length > 0) {
      batches.push(currentBatch);
    }

    return batches;
  }

  /**
   * Send a simple notification message
   */
  async sendNotification(message: string): Promise<void> {
    try {
      const trimmedMessage = message.trim();
      const payload: DiscordWebhookPayload = trimmedMessage
        ? {
            embeds: [
              {
                title: 'Notification',
                description: truncate(trimmedMessage, 4096),
                color: DISCORD_BLURPLE,
                timestamp: new Date().toISOString(),
              },
            ],
          }
        : { content: ' ' };
      await this.sendWebhook(payload);
      
      console.log('✅ Discord notification sent successfully');
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error('❌ Error sending Discord notification:', errorMessage);
      throw error;
    }
  }

  private async sendWebhook(payload: DiscordWebhookPayload): Promise<void> {
    const response = await fetch(this.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      const errorMessage = `Discord webhook failed with status ${response.status}: ${errorText}`;
      console.error(errorMessage);
      throw new Error(errorMessage);
    }
  }
}
