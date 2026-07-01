import fs from 'fs';
import path from 'path';

describe('chat press responsiveness guard', () => {
  test('defers heavy question side effects until after the first visible update', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(tabs)/chat.tsx'),
      'utf8',
    );

    expect(source).toContain("from '@/utils/scheduling';");
    expect(source).toContain('runAfterNextPaint');
    expect(source).toContain('scheduleChatSideEffect');
    expect(source).toMatch(/scheduleChatSideEffect\(\(\) => \{\s*primeQuestionResponse\(\);/s);
  });

  test('keeps free-form input above the floating tab bar', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(tabs)/chat.tsx'),
      'utf8',
    );

    expect(source).toContain('TAB_BAR_CLEARANCE');
    expect(source).toMatch(/styles\.chatLayer,\s*\{\s*bottom:\s*TAB_BAR_CLEARANCE \+ Math\.max\(insets\.bottom,\s*0\)/s);
  });

  test('guards against duplicate auto-sends and repeated taps', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(tabs)/chat.tsx'),
      'utf8',
    );

    expect(source).toContain('sendLockedRef');
    expect(source).toMatch(/isStreaming \|\| sendLockedRef\.current/);
    expect(source).toContain('sentInitialQuestionKeyRef');
    expect(source).toContain('initialQuestionKey');
  });
});
