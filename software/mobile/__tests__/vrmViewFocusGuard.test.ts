import fs from 'fs';
import path from 'path';

describe('VRM view focus guard', () => {
  test('pauses inactive route render loops and ignores stale async attachments', () => {
    const source = fs.readFileSync(
      path.resolve(__dirname, '../components/vrm/VRMView.tsx'),
      'utf8',
    );

    expect(source).toContain("import { useIsFocused } from '@react-navigation/native';");
    expect(source).toMatch(/const screenFocused = useIsFocused\(\);/);
    expect(source).toMatch(/isFocusedRef\.current = screenFocused;/);
    expect((source.match(/if \(!isFocusedRef\.current\) return;/g) || []).length).toBeGreaterThanOrEqual(4);
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
