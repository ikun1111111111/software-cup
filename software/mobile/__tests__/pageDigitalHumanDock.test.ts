import fs from 'fs';
import path from 'path';

describe('page digital human dock', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../components/vrm/PageDigitalHumanDock.tsx'),
    'utf8',
  );

  test('shows the text bubble only when real speech text exists', () => {
    expect(source).not.toContain('我是小灵，随时为你讲解');
    expect(source).toContain("digitalHuman.subtitle?.trim() || digitalHuman.speechText?.trim() || ''");
    expect(source).toContain('{displayText ? (');
    expect(source).toContain('styles.speechBubble');
    expect(source).toContain('numberOfLines={3}');
    expect(source).not.toContain('speechBubbleVisible');
  });

  test('keeps the character canvas below the home action cards', () => {
    expect(source).toContain("const DOCK_VISUAL_OFFSET_Y = 56;");
    expect(source).toContain("transform: [{ translateY: DOCK_VISUAL_OFFSET_Y }]");
    expect(source).toMatch(/styles\.canvas[\s\S]*pointerEvents="none"/);
  });
});
