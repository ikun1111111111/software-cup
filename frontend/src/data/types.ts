export interface Exhibit {
  type: 'image' | 'map' | 'scroll' | 'calligraphy' | 'comparison';
  asset: string;
  caption: string;
  animation: 'fadeSlideIn' | 'scrollRevealLeft' | 'brushWrite' | 'splitReveal' | 'crossfade' | 'scrollUnroll' | 'sealStamp';
  position: 'full' | 'center';
}

export interface Segment {
  text: string;
  emotion: 'smile' | 'think' | 'neutral' | 'surprise' | 'sorry';
  duration: number;
  exhibit: Exhibit;
}

export interface DiscoveryCard {
  id: string;
  title: string;
  summary: string;
  talkingPoints: string[];
  interactiveQuestion: string;
  mainImage: string | null;
  auxImage: string | null;
  /* v2 字段 */
  segments?: Segment[];
}

export interface Hotspot {
  id: string;
  name: string;
  position: { left: string; top: string };
  color: string;
  cardId: string;
}

export interface DynastyData {
  dynasty: string;
  dynastyName: string;
  welcomeText: string;
  cards: DiscoveryCard[];
  /* v2 字段 */
  hotspots?: Hotspot[];
}

export type CardUnlockState = {
  id: string;
  unlocked: boolean;
  viewed: boolean;
};
