import fs from 'fs';
import path from 'path';

describe('explore navigation performance guard', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../app/(tabs)/explore.tsx'),
    'utf8',
  );

  test('keeps the 20 MB VRM model out of the navigation critical path', () => {
    expect(source).not.toContain("import { VRMView } from '@/components/vrm/VRMView';");
    expect(source).not.toContain("import { preloadDigitalHuman } from '@/services/digitalHuman';");
    expect(source).toContain("const LazyExploreVRMView = React.lazy(() =>");
    expect(source).toContain('shouldMountVRM ? (');
    expect(source).toContain('setShouldMountVRM(true)');
    expect(source).toContain('accessibilityLabel="加载小灵3D形象"');
  });
});
