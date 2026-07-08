import type { DynastyData } from './types';
import tangRaw from './text-tang-cards.json';
import tangV2Raw from './text-tang-cards-v2.json';
import songRaw from './text-song-cards.json';
import songV2Raw from './text-song-cards-v2.json';
import mingRaw from './text-ming-cards.json';
import mingV2Raw from './text-ming-cards-v2.json';
import welcomeRaw from './text-welcome.json';

export const ERA_CARD_DATA: Record<string, DynastyData> = {
  tang: tangRaw as DynastyData,
  song: songRaw as DynastyData,
  ming: mingRaw as DynastyData,
};

export const ERA_CARD_DATA_V2: Record<string, DynastyData> = {
  tang: tangV2Raw as DynastyData,
  song: songV2Raw as DynastyData,
  ming: mingV2Raw as DynastyData,
};

export const ERA_WELCOME_MAP: Record<string, string> = {
  tang: welcomeRaw.welcomes.find((w: any) => w.dynasty === 'tang')?.welcomeText ?? '',
  song: welcomeRaw.welcomes.find((w: any) => w.dynasty === 'song')?.welcomeText ?? '',
  ming: welcomeRaw.welcomes.find((w: any) => w.dynasty === 'ming')?.welcomeText ?? '',
};

export function getDynastyData(era: string): DynastyData | undefined {
  return ERA_CARD_DATA[era];
}

export function getDynastyDataV2(era: string): DynastyData | undefined {
  return ERA_CARD_DATA_V2[era];
}

export function getWelcomeText(era: string): string {
  return ERA_WELCOME_MAP[era] ?? '';
}
