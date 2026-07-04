import fs from 'fs';
import path from 'path';

describe('map page navigation controls', () => {
  function readMapSource(): string {
    return fs.readFileSync(
      path.join(__dirname, '..', 'app', 'map.tsx'),
      'utf8',
    );
  }

  test('shows a live navigation strip on the map while guiding to a spot', () => {
    const source = readMapSource();

    expect(source).toContain('styles.navigationStrip');
    expect(source).toContain('styles.navigationTargetName');
    expect(source).toContain('styles.navigationMetaPill');
    expect(source).toContain('到达');
    expect(source).toContain('结束导航');
  });
});
