import fs from 'fs';
import path from 'path';

describe('page digital human dock', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../components/vrm/PageDigitalHumanDock.tsx'),
    'utf8',
  );

  test('no longer renders the idle speech bubble', () => {
    expect(source).not.toContain("idleText = '我是小灵，随时为你讲解'");
    expect(source).not.toContain('speechBubbleVisible');
    expect(source).not.toContain('setSpeechBubbleVisible');
    expect(source).not.toContain('styles.speechBubble');
    expect(source).not.toContain('accessibilityLabel="朗读小灵提示"');
    expect(source).not.toContain('numberOfLines={2}');
  });

  test('keeps the character canvas below the home action cards', () => {
    expect(source).toContain("const DOCK_VISUAL_OFFSET_Y = 56;");
    expect(source).toContain("transform: [{ translateY: DOCK_VISUAL_OFFSET_Y }]");
    expect(source).toMatch(/styles\.canvas[\s\S]*pointerEvents="none"/);
  });
});
