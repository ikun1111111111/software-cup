import fs from 'fs';
import path from 'path';

describe('page digital human dock copy', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../components/vrm/PageDigitalHumanDock.tsx'),
    'utf8',
  );

  test('shows the current line temporarily and hides it after the idle delay', () => {
    expect(source).toContain("idleText = '我是小灵，随时为你讲解'");
    expect(source).toContain('digitalHuman.speechText?.trim() || digitalHuman.subtitle?.trim() || idleText');
    expect(source).toContain('const SPEECH_BUBBLE_VISIBLE_MS = 3000');
    expect(source).toContain('setSpeechBubbleVisible(true)');
    expect(source).toContain('setSpeechBubbleVisible(false)');
    expect(source).toContain('clearTimeout(hideTimer)');
    expect(source).toContain('{speechBubbleVisible && (');
    expect(source).toContain('numberOfLines={2}');
  });

  test('keeps the character and speech bubble below the home action cards', () => {
    expect(source).toContain("const DOCK_VISUAL_OFFSET_Y = 56;");
    expect(source).toContain("transform: [{ translateY: DOCK_VISUAL_OFFSET_Y }]");
    expect(source).toContain('right: 90');
    expect(source).toContain('bottom: 152');
    expect(source).toContain('width: 156');
  });

  test('offers an accessible user-triggered read action for browser autoplay restrictions', () => {
    expect(source).toContain('accessibilityLabel="朗读小灵提示"');
    expect(source).toContain("digitalHuman.speak(displayText, { emotion: 'neutral' })");
    expect(source).toMatch(/styles\.canvas[\s\S]*pointerEvents="none"/);
  });
});
