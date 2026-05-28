export interface DiscordEmbedField {
  name: string;
  value: string;
  inline?: boolean;
}

export interface DiscordEmbedFooter {
  text: string;
}

export interface DiscordEmbed {
  title?: string;
  description?: string;
  color?: number;
  footer?: DiscordEmbedFooter;
  fields?: DiscordEmbedField[];
  timestamp?: string;
}

export interface DiscordWebhookPayload {
  content?: string;
  embeds?: DiscordEmbed[];
}
