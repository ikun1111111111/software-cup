import fs from 'fs';
import path from 'path';

describe('VRM view focus guard', () => {
  test('web route views pause while unfocused and regain scene ownership on focus', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/vrm/VRMView.tsx'),
      'utf8',
    );
    const webSource = source.slice(
      source.indexOf('function VRMViewWeb('),
      source.indexOf('function VRMViewNative('),
    );

    expect(webSource).toContain("focusMode = 'route'");
    expect(webSource).toContain('const screenFocused = useIsFocused();');
    expect(webSource).toContain('resolveVRMViewActivity({');
    expect(webSource).toContain('const isActiveRef = useRef(viewActive);');
    expect(webSource).toContain('isActiveRef.current = viewActive;');
    expect(webSource).toContain('void reloadCurrentModel(undefined, false);');
  });

  test('pauses inactive route render loops and ignores stale async attachments', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/vrm/VRMView.tsx'),
      'utf8',
    );
    const nativeSource = source.slice(source.indexOf('function VRMViewNative('));

    expect(source).toContain("import { useIsFocused } from '@react-navigation/native';");
    expect(nativeSource).toMatch(/const screenFocused = useIsFocused\(\);/);
    expect(nativeSource).toContain('resolveVRMViewActivity({');
    expect(nativeSource).toContain('isActiveRef.current = viewActive;');
    expect((nativeSource.match(/if \(!isActiveRef\.current\) return;/g) || []).length).toBeGreaterThanOrEqual(2);
  });

  test('fully stops background animation frames while a route is unfocused', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/vrm/VRMView.tsx'),
      'utf8',
    );
    const webSource = source.slice(
      source.indexOf('function VRMViewWeb('),
      source.indexOf('function VRMViewNative('),
    );
    const nativeSource = source.slice(source.indexOf('function VRMViewNative('));

    expect(webSource).toContain('const pauseRenderLoop = useCallback');
    expect(webSource).toContain('const resumeRenderLoop = useCallback');
    expect(nativeSource).toContain('const pauseRenderLoop = useCallback');
    expect(nativeSource).toContain('const resumeRenderLoop = useCallback');
    expect(webSource).not.toMatch(/if \(!isActiveRef\.current\) \{\s*rafRef\.current = requestAnimationFrame\(animate\)/s);
    expect(nativeSource).not.toMatch(/if \(!isActiveRef\.current\) \{\s*rafRef\.current = requestAnimationFrame\(animate\)/s);
  });

  test('global stages and portal narration opt into component-owned focus', () => {
    const stageSource = fs.readFileSync(
      path.resolve(__dirname, '../components/vrm/VRMStageProvider.tsx'),
      'utf8',
    );
    const floatingSource = fs.readFileSync(
      path.resolve(__dirname, '../components/vrm/VRMFloating.tsx'),
      'utf8',
    );
    const narrationSource = fs.readFileSync(
      path.resolve(__dirname, '../components/guide/NarrationSheet.tsx'),
      'utf8',
    );

    expect(stageSource).toContain('focusMode="component"');
    expect(floatingSource).toContain('focusMode="component"');
    expect(narrationSource).toContain('focusMode="component"');
  });

  test('attraction narration owns the only VRM instance while its modal is open', () => {
    const attractionSource = fs.readFileSync(
      path.resolve(__dirname, '../app/attractions/[id].tsx'),
      'utf8',
    );

    expect(attractionSource).toMatch(/!showNarration && \([\s\S]*?<PageDigitalHumanDock/);
  });

  test('reattaches the singleton VRM scene when a focused route regains ownership', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/vrm/VRMView.tsx'),
      'utf8',
    );

    expect(source).toContain('function isVRMAttachedToScene(scene: THREE.Scene): boolean');
    expect(source).toContain('!isVRMAttachedToScene(sceneRef.current)');
    expect(source).toContain('void reloadCurrentModel(undefined, false);');
  });
});
