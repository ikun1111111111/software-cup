import fs from 'fs';
import path from 'path';

describe('VRM route speech scope', () => {
  test('clears manager speech when the route changes', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/vrm/VRMProvider.tsx'),
      'utf8',
    );

    expect(source).toContain('const previousRoutePathRef = useRef<string | null>(null);');
    expect(source).toContain('useLayoutEffect(() => {');
    expect(source).toContain('VRMManager.stopSpeaking({ playQueued: false });');
    expect(source).toContain('}, [routePath]);');
  });

  test('hides the floating bubble immediately when the route changes', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/vrm/VRMFloating.tsx'),
      'utf8',
    );

    expect(source).toContain('const hideBubbleImmediately = useCallback(() => {');
    expect(source).toContain("fullTextRef.current = '';");
    expect(source).toContain('setDisplayText');
    expect(source).toContain('setBubbleVisible(false);');
    expect(source).toContain('}, [hideBubbleImmediately, pathname]);');
  });

  test.each([
    ['chat', 'activate();'],
    ['explore', 'guide.activate();'],
    ['memory', 'memoryDigitalHuman.activate();'],
    ['profile', 'profileDigitalHuman.activate();'],
  ])('reactivates the %s tab speech driver when the tab regains focus', (screen, activation) => {
    const source = fs.readFileSync(
      path.resolve(__dirname, `../app/(tabs)/${screen}.tsx`),
      'utf8',
    );

    expect(source).toContain('useFocusEffect');
    expect(source).toContain(activation);
  });

  test.each([
    ['chat', '{ interrupt: true }'],
    ['explore', 'VRMManager.replaceSpeech('],
    ['memory', 'replaceCurrent: true'],
    ['profile', 'replaceCurrent: true'],
  ])('cancels delayed %s greetings on blur and replaces previous-page speech', (screen, replacement) => {
    const source = fs.readFileSync(
      path.resolve(__dirname, `../app/(tabs)/${screen}.tsx`),
      'utf8',
    );

    expect(source).toContain('useIsFocused');
    expect(source).toContain('if (!isFocused) return undefined;');
    expect(source).toContain(replacement);
  });

  test.each([
    ['map.tsx', 'VRMManager.replaceSpeech('],
    ['history/index.tsx', 'VRMManager.replaceSpeech('],
    ['routes/[id].tsx', 'VRMManager.replaceSpeech('],
    ['attractions/[id].tsx', 'replaceCurrent: true'],
  ])('focus-scopes the %s page-entry narration', (screen, replacement) => {
    const source = fs.readFileSync(
      path.resolve(__dirname, `../app/${screen}`),
      'utf8',
    );

    expect(source).toContain('useIsFocused');
    expect(source).toContain('if (!isFocused) return undefined;');
    expect(source).toContain(replacement);
  });
});
