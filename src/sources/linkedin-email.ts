import type { JobOffer } from '../types.js';
import { ENV } from '../config.js';
import { createLogger } from '../utils/logger.js';

const logger = createLogger('LINKEDIN_EMAIL');

async function refreshAccessToken(): Promise<string | null> {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: ENV.GMAIL_CLIENT_ID,
        client_secret: ENV.GMAIL_CLIENT_SECRET,
        refresh_token: ENV.GMAIL_REFRESH_TOKEN,
      }),
    });

    if (!response.ok) {
      logger.error(`Token refresh failed: ${response.status}`);
      return null;
    }

    const data = (await response.json()) as { access_token: string };
    return data.access_token;
  } catch (error) {
    logger.error(`Token refresh exception: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  }
}

function extractOffersFromHtml(html: string): Array<{ title: string; company: string; url: string }> {
  const offers: Array<{ title: string; company: string; url: string }> = [];

  try {
    const linkRegex = /href="(https:\/\/www\.linkedin\.com\/comm\/jobs\/view\/[^"]+)"/g;
    const urls = new Set<string>();
    let match: RegExpExecArray | null;

    while ((match = linkRegex.exec(html)) !== null) {
      if (match[1]) urls.add(match[1]);
    }

    const titleRegex = /<(?:h[23]|strong)[^>]*>([^<]+)<\/(?:h[23]|strong)>/gi;
    const titles: string[] = [];
    while ((match = titleRegex.exec(html)) !== null) {
      if (match[1]?.trim()) titles.push(match[1].trim());
    }

    const urlArray = [...urls];
    for (let i = 0; i < urlArray.length; i++) {
      offers.push({
        title: titles[i * 2] ?? `Offre LinkedIn #${i + 1}`,
        company: titles[i * 2 + 1] ?? '',
        url: urlArray[i]!,
      });
    }
  } catch (error) {
    logger.debug(`HTML parsing issue: ${error instanceof Error ? error.message : String(error)}`);
  }

  return offers;
}

function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
  return Buffer.from(base64, 'base64').toString('utf-8');
}

interface GmailMessageDetail {
  payload?: {
    body?: { data?: string };
    parts?: Array<{ mimeType?: string; body?: { data?: string } }>;
  };
}

export async function fetchOffers(): Promise<JobOffer[]> {
  if (!ENV.GMAIL_CLIENT_ID || !ENV.GMAIL_CLIENT_SECRET || !ENV.GMAIL_REFRESH_TOKEN) {
    logger.warn('Gmail API non configurée — skip LinkedIn emails. Lance: npx tsx scripts/gmail-auth.ts');
    return [];
  }

  try {
    const token = await refreshAccessToken();
    if (!token) return [];

    const after = Math.floor((Date.now() - 7 * 24 * 60 * 60 * 1000) / 1000);
    const query = `from:jobs-noreply@linkedin.com after:${after}`;
    const GMAIL_API = 'https://gmail.googleapis.com/gmail/v1/users/me';

    const listResponse = await fetch(
      `${GMAIL_API}/messages?q=${encodeURIComponent(query)}&maxResults=20`,
      { headers: { Authorization: `Bearer ${token}` } },
    );

    if (!listResponse.ok) {
      logger.error(`Gmail list failed: ${listResponse.status}`);
      return [];
    }

    const listData = (await listResponse.json()) as { messages?: Array<{ id: string }> };
    const messageIds = listData.messages ?? [];

    if (messageIds.length === 0) {
      logger.info('Aucun email LinkedIn récent trouvé');
      return [];
    }

    const allOffers: JobOffer[] = [];

    for (const { id } of messageIds) {
      const msgResponse = await fetch(
        `${GMAIL_API}/messages/${id}?format=full`,
        { headers: { Authorization: `Bearer ${token}` } },
      );

      if (!msgResponse.ok) continue;

      const msgData = (await msgResponse.json()) as GmailMessageDetail;

      let htmlBody = '';
      if (msgData.payload?.body?.data) {
        htmlBody = decodeBase64Url(msgData.payload.body.data);
      } else if (msgData.payload?.parts) {
        const htmlPart = msgData.payload.parts.find((p) => p.mimeType === 'text/html');
        if (htmlPart?.body?.data) {
          htmlBody = decodeBase64Url(htmlPart.body.data);
        }
      }

      if (!htmlBody) continue;

      const extracted = extractOffersFromHtml(htmlBody);
      for (const offer of extracted) {
        allOffers.push({
          title: offer.title,
          company: offer.company || null,
          url: offer.url,
          source: 'linkedin-email',
          location: null,
          contractType: null,
          publishedAt: new Date(),
          description: null,
        });
      }
    }

    logger.info(`${allOffers.length} offres extraites de ${messageIds.length} emails LinkedIn`);
    return allOffers;
  } catch (error) {
    logger.error(error instanceof Error ? error.message : String(error));
    return [];
  }
}
