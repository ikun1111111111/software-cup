import fs from 'fs';
import path from 'path';

describe('attractions page VRM stage', () => {
  function readAttractionsSource(): string {
    return fs.readFileSync(
      path.join(__dirname, '..', 'app', 'attractions', 'index.tsx'),
      'utf8',
    );
  }

  test('tracks the hero avatar slot while the attractions list scrolls', () => {
    const source = readAttractionsSource();
    const slotMatch = source.match(/<VRMStageSlot[\s\S]*?id="attractions-hero-avatar"[\s\S]*?\/>/);

    expect(slotMatch).not.toBeNull();
    expect(slotMatch![0]).toMatch(/\btrackMotion(?:=\{true\})?\b/);
  });
});
