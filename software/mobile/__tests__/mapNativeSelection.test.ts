import fs from 'fs';
import path from 'path';

describe('native map selection viewport guard', () => {
  const source = fs.readFileSync(
    path.resolve(__dirname, '../components/map/AmapView.native.tsx'),
    'utf8',
  );

  test('updates selection inside the existing WebView instead of rebuilding the map', () => {
    const htmlMemoStart = source.indexOf('const html = useMemo');
    const htmlMemoEnd = source.indexOf('const source = useMemo');
    const htmlMemo = source.slice(htmlMemoStart, htmlMemoEnd);

    expect(htmlMemo).not.toContain('activeSpotId');
    expect(source).toContain('window.setActiveSpot');
  });
});
