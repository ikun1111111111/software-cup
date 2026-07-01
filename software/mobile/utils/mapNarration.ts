import type { Spot } from '@/api/spots';
import { getDemoSpotById } from '@/utils/localDemoData';

type SpotWithDetail = Spot & { detail?: string | null };

function cleanText(text?: string | null): string {
  return (text ?? '').replace(/\s+/g, ' ').trim();
}

export function previewNarrationText(text: string, maxLength = 42): string {
  const cleaned = cleanText(text);
  return cleaned.length > maxLength ? `${cleaned.slice(0, maxLength)}...` : cleaned;
}

export function buildMapSpotNarration(spot: Spot, fallback?: string): string {
  const localSpot = getDemoSpotById(spot.id);
  const overview = cleanText(spot.overview || localSpot?.overview);
  const detail = cleanText((spot as SpotWithDetail).detail || localSpot?.detail);
  const fallbackText = cleanText(fallback);

  if (detail && overview && detail !== overview) {
    return detail.includes(overview) ? detail : `${overview} ${detail}`;
  }

  return detail
    || overview
    || fallbackText
    || `${spot.name}是灵山胜境的一处导览节点，小灵会结合当前位置继续讲解。`;
}

export function buildMapNarrationFeedback(spotName: string, narrationText: string): string {
  return `小灵正在讲解${spotName}：${previewNarrationText(narrationText)}`;
}
