import fs from 'fs';
import path from 'path';

describe('routes page VRM stage', () => {
  function readRoutesSource(): string {
    return fs.readFileSync(
      path.join(__dirname, '..', 'app', 'routes', 'index.tsx'),
      'utf8',
    );
  }

  test('tracks the hero avatar slot while the route list scrolls', () => {
    const source = readRoutesSource();
    const slotMatch = source.match(/<VRMStageSlot[\s\S]*?id="routes-hero-avatar"[\s\S]*?\/>/);

    expect(slotMatch).not.toBeNull();
    expect(slotMatch![0]).toMatch(/\btrackMotion(?:=\{true\})?\b/);
  });

  test('uses custom avatar framing for the compact route hero stage', () => {
    const source = readRoutesSource();
    const slotMatch = source.match(/<VRMStageSlot[\s\S]*?id="routes-hero-avatar"[\s\S]*?\/>/);

    expect(slotMatch).not.toBeNull();
    expect(slotMatch![0]).toMatch(/framing=\{\{[\s\S]*cameraDistance/);
  });

  test('grounds the avatar stage inside the hero card', () => {
    const source = readRoutesSource();
    const avatarStageStyle = source.match(/avatarStage:\s*\{[\s\S]*?\n  \},/);

    expect(source).toContain('styles.avatarGround');
    expect(source).toContain('styles.avatarRing');
    expect(avatarStageStyle?.[0]).not.toMatch(/right:\s*-\d/);
    expect(avatarStageStyle?.[0]).not.toMatch(/bottom:\s*-\d/);
  });
});
