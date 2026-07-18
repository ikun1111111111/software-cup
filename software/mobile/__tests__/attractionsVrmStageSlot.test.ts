import fs from 'fs';
import path from 'path';

describe('attractions page VRM stage', () => {
  function readAttractionsSource(): string {
    return fs.readFileSync(
      path.join(__dirname, '..', 'app', 'attractions', 'index.tsx'),
      'utf8',
    );
  }

  function readAttractionDetailSource(): string {
    return fs.readFileSync(
      path.join(__dirname, '..', 'app', 'attractions', '[id].tsx'),
      'utf8',
    );
  }

  test('tracks the hero avatar slot while the attractions list scrolls', () => {
    const source = readAttractionsSource();
    const slotMatch = source.match(/<VRMStageSlot[\s\S]*?id="attractions-hero-avatar"[\s\S]*?\/>/);

    expect(slotMatch).not.toBeNull();
    expect(slotMatch![0]).toMatch(/\btrackMotion(?:=\{true\})?\b/);
  });

  test('keeps the enlarged hero avatar above its name plate', () => {
    const source = readAttractionsSource();
    const slotMatch = source.match(/<VRMStageSlot[\s\S]*?id="attractions-hero-avatar"[\s\S]*?\/>/);

    expect(slotMatch).not.toBeNull();
    expect(slotMatch![0]).toMatch(/framing=\{ATTRACTIONS_HERO_FRAMING\}/);
    expect(source).toMatch(/const ATTRACTIONS_HERO_FRAMING = \{\s*offsetY: -0\.44,?\s*\}/);
  });

  test('uses one automatic narration source when attraction detail opens', () => {
    const source = readAttractionDetailSource();

    expect(source).not.toContain("import { useTourGuide } from '@/hooks/useTourGuide';");
    expect(source).not.toContain('useTourGuide(distanceInfo, {');
    expect(source).toContain('{ replaceCurrent: true }');
  });
});
