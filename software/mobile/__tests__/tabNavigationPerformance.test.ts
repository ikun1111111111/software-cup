import fs from 'fs';
import path from 'path';

describe('tab navigation performance guard', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/_layout.tsx'),
    'utf8',
  );
  const rootSource = fs.readFileSync(
    path.resolve(__dirname, '../app/_layout.tsx'),
    'utf8',
  );

  test('freezes and detaches inactive tab screens', () => {
    expect(source).toMatch(/<Tabs[\s\S]*?detachInactiveScreens/);
    expect(source).toContain('freezeOnBlur: true');
    expect(source).toContain('lazy: true');
    expect(source).toContain("animation: 'none'");
    expect(rootSource).toContain("import { enableFreeze } from 'react-native-screens';");
    expect(rootSource).toContain('enableFreeze(true);');
  });

  test('keeps unfocused tab icons idle instead of running infinite animations', () => {
    expect(source).not.toContain('withRepeat');
    expect(source).not.toContain('const breath = useSharedValue');
    expect(source).toMatch(/if \(Platform\.OS !== 'web'\) \{\s*Haptics\.impactAsync/s);
  });
});
