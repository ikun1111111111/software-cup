import { describe, expect, it } from 'vitest';
import { getKioskSpotConfig, KIOSK_SPOTS } from '../config/kioskSpots';

const expectedStorySpotIds = [
  'ling-shan-da-fo',
  'fan-gong',
  'jiu-long-guan-yu',
  'wu-yin-tan-cheng',
  'xiang-fu-chan-si',
  'fo-shou-guang-chang',
  'bai-zi-xi-mi-le',
  'man-fei-long-ta',
  'ling-shan-jing-she',
  'ling-shan-da-zhao-bi',
  'pu-ti-da-dao',
  'san-sheng-dian',
];

const expectedSpotDetailKeywords: Record<string, string[]> = {
  'ling-shan-da-fo': ['216级', '施无畏印', '五方'],
  'fan-gong': ['穹顶天象', '吉祥颂', '多工艺'],
  'jiu-long-guan-yu': ['花开见佛', '九龙吐水', '祈福圣水'],
  'wu-yin-tan-cheng': ['曼茶罗', '转经筒', '唐卡'],
  'xiang-fu-chan-si': ['玄奘', '江南第一钟', '千年银杏'],
  'fo-shou-guang-chang': ['11.7米', '天下第一掌', '抱佛脚'],
  'bai-zi-xi-mi-le': ['皆大欢喜', '亲子', '弥勒'],
  'man-fei-long-ta': ['傣族佛教', '园林', '风格差异'],
  'ling-shan-jing-she': ['禅食一味', '早课', '素斋'],
  'ling-shan-da-zhao-bi': ['39.8米', '深浮雕', '华夏第一壁'],
  'pu-ti-da-dao': ['太湖', '青龙山', '菩提树影'],
  'san-sheng-dian': ['文化整理', '展陈', '当代融合'],
};

const touristFacingBannedWords = ['官方资料', '资料包', '后台口吻', '当前代码'];

describe('kiosk spot configuration', () => {
  it('covers all official scenic spots with dedicated guide content', () => {
    const scenicSpots = KIOSK_SPOTS.filter((spot) => spot.id !== 'default');
    const storySpotIds = scenicSpots.map((spot) => spot.storySpotId);

    expect(scenicSpots).toHaveLength(expectedStorySpotIds.length);
    expect(new Set(storySpotIds).size).toBe(expectedStorySpotIds.length);

    expectedStorySpotIds.forEach((storySpotId) => {
      expect(storySpotIds).toContain(storySpotId);
    });

    scenicSpots.forEach((spot) => {
      expect(spot.greeting.length).toBeGreaterThan(20);
      expect(spot.guideScript.length).toBeGreaterThan(80);
      expect(spot.guideVisual.overview.length).toBeGreaterThan(40);
      expect(spot.guideVisual.facts.length).toBeGreaterThanOrEqual(4);
      expect(spot.guideVisual.metrics).toHaveLength(3);
      expect(spot.guideVisual.cards).toHaveLength(3);
      expect(spot.guideVisual.storyline).toHaveLength(3);
      expect(spot.guideVisual.tips.length).toBeGreaterThanOrEqual(3);
      spot.guideVisual.cards.forEach((card) => {
        expect(card.body.length).toBeGreaterThan(45);
      });
      expect(spot.routeGuide.main.length).toBeGreaterThan(40);
      expect(spot.serviceGuide.restroom).toMatch(/厕所|卫生间|WC/);
      expect(spot.actions.map((action) => action.id)).toEqual(
        expect.arrayContaining(['spot-guide', 'route-next', 'food-service'])
      );
    });
  });

  it('resolves both kiosk ids and backend scenic spot ids', () => {
    expect(getKioskSpotConfig('lingshan-dafo').storySpotId).toBe('ling-shan-da-fo');
    expect(getKioskSpotConfig('ling-shan-da-fo').id).toBe('lingshan-dafo');
    expect(getKioskSpotConfig('xiang-fu-chan-si').id).toBe('xiangfu-temple');
    expect(getKioskSpotConfig('fan-gong').name).toBe('灵山梵宫');
    expect(getKioskSpotConfig('pu-ti-da-dao').name).toBe('菩提大道');
  });

  it('keeps P1 scenic details concrete and tourist-facing', () => {
    const scenicSpots = KIOSK_SPOTS.filter((spot) => spot.id !== 'default');

    scenicSpots.forEach((spot) => {
      const combinedContent = [
        spot.guideScript,
        spot.guideVisual.overview,
        ...spot.guideVisual.facts,
        ...spot.guideVisual.metrics.flatMap((metric) => [metric.value, metric.label, metric.detail]),
        ...spot.guideVisual.cards.flatMap((card) => [card.title, card.eyebrow, card.body]),
        ...spot.guideVisual.storyline.flatMap((item) => [item.title, item.body]),
        ...spot.guideVisual.tips,
        spot.routeGuide.main,
      ].join('\n');

      expectedSpotDetailKeywords[spot.storySpotId].forEach((keyword) => {
        expect(combinedContent).toContain(keyword);
      });

      touristFacingBannedWords.forEach((word) => {
        expect(combinedContent).not.toContain(word);
      });
    });
  });
});
