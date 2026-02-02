/**
 * Utility functions for email parsing
 */

/**
 * Clean HTML from email body
 */
export function cleanHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, ' ') // Remove HTML tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

/**
 * Extract plain text from email body
 */
export function extractPlainText(body: string): string {
  // Remove common email signatures and quoted replies
  const lines = body.split('\n');
  const cleanedLines: string[] = [];

  for (const line of lines) {
    // Skip quoted replies (lines starting with >)
    if (line.trim().startsWith('>')) {
      continue;
    }

    // Skip common signature markers
    if (
      line.trim().toLowerCase().includes('sent from') ||
      line.trim().toLowerCase().includes('--') ||
      line.trim().startsWith('On ')
    ) {
      break;
    }

    cleanedLines.push(line);
  }

  return cleanedLines.join('\n').trim();
}
