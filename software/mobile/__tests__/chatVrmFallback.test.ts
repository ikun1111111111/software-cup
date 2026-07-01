import fs from 'fs';
import path from 'path';

describe('chat VRM fallback', () => {
  test('renders a page-level Xiaoling fallback independent of VRMView internals', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../app/(tabs)/chat.tsx'),
      'utf8',
    );

    expect(source).toContain('const [vrmReady, setVrmReady] = useState(false);');
    expect(source).toContain('onReadyChange={setVrmReady}');
    expect(source).toContain('!vrmReady && (');
    expect(source).toContain('styles.chatAvatarFallback');
    expect(source).toContain('VRMManager.requestManualReload');
  });

  test('VRMView reports render readiness to its parent', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/vrm/VRMView.tsx'),
      'utf8',
    );

    expect(source).toContain('onReadyChange?: (ready: boolean) => void;');
    expect(source).toContain('onReadyChangeRef.current?.(ready);');
    expect(source).toContain('useEffect(() => { onReadyChangeRef.current = onReadyChange; }, [onReadyChange]);');
  });

  test('web VRM readiness waits for visible canvas pixels', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/vrm/VRMView.tsx'),
      'utf8',
    );

    expect(source).toContain('function hasVisibleWebGLPixels(renderer: THREE.WebGLRenderer): boolean');
    expect(source).toContain('const hasVisibleFrame = modelLoadedRef.current && hasVisibleWebGLPixels(renderer);');
    expect(source).toContain('if (hasVisibleFrame) {');
  });
});
