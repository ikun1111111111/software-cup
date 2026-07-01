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
});
