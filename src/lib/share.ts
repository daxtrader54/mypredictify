const SITE_URL = 'https://mypredictify.com';

export type SharePlatform = 'twitter' | 'facebook' | 'whatsapp' | 'copy';

export function buildShareUrl(platform: SharePlatform, text: string, url: string): string | null {
  const encodedText = encodeURIComponent(text);
  const encodedUrl = encodeURIComponent(url);

  switch (platform) {
    case 'twitter':
      return `https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`;
    case 'facebook':
      return `https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}&quote=${encodedText}`;
    case 'whatsapp':
      return `https://api.whatsapp.com/send?text=${encodedText}%20${encodedUrl}`;
    case 'copy':
      return null; // handled via clipboard API
  }
}

export function buildShareText(contentType: string, detail: string): string {
  switch (contentType) {
    case 'prediction':
      return `${detail} — AI prediction on MyPredictify`;
    case 'value-bet':
      return `Found a value bet: ${detail} on MyPredictify`;
    case 'acca':
      return `My ACCA pick: ${detail} — built with MyPredictify`;
    case 'blog':
      return `${detail} — MyPredictify Blog`;
    case 'market':
      return `${detail} — market analysis on MyPredictify`;
    default:
      return `${detail} — MyPredictify`;
  }
}

export function buildSharePageUrl(contentType: string, contentId: string): string {
  switch (contentType) {
    case 'prediction':
      return `${SITE_URL}/predictions`;
    case 'value-bet':
      return `${SITE_URL}/value-bets`;
    case 'acca':
      return `${SITE_URL}/acca-builder`;
    case 'blog':
      return `${SITE_URL}/blog/${contentId}`;
    case 'market':
      return `${SITE_URL}/polymarket`;
    default:
      return SITE_URL;
  }
}
