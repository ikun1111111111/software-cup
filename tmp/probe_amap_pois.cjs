const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.0/node_modules/playwright');

const KEY = '69ce537355cca1a2ba0bbf3b737c5d35';
const outPath = path.join(__dirname, 'amap-poi-results.json');
const keywords = [
  '\u7075\u5c71\u5927\u7167\u58c1',
  '\u7075\u5c71\u5927\u4f5b',
  '\u4e5d\u9f99\u704c\u6d74',
  '\u4e94\u5370\u575b\u57ce',
  '\u7075\u5c71\u68b5\u5bab',
  '\u7965\u7b26\u7985\u5bfa',
  '\u4f5b\u624b\u5e7f\u573a',
  '\u767e\u5b50\u620f\u5f25\u52d2',
  '\u66fc\u98de\u9f99\u5854',
  '\u7075\u5c71\u7cbe\u820d',
  '\u83e9\u63d0\u5927\u9053',
  '\u4e94\u660e\u6865',
  '\u4f5b\u8db3\u575b',
  '\u4e94\u667a\u95e8',
  '\u964d\u9b54\u6d6e\u96d5',
  '\u963f\u80b2\u738b\u67f1',
  '\u4f5b\u6559\u6587\u5316\u535a\u89c8\u9986',
  '\u4e09\u5723\u6bbf',
  '\u65e0\u5c3d\u610f\u658b',
];

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage();
  await page.setContent(`
    <!doctype html>
    <meta charset="utf-8" />
    <div id="map" style="width:400px;height:300px"></div>
    <script src="https://webapi.amap.com/maps?v=2.0&key=${KEY}&plugin=AMap.PlaceSearch"></script>
  `);
  await page.waitForFunction(() => Boolean(window.AMap), null, { timeout: 20000 });
  const results = await page.evaluate(async (searchKeywords) => {
    await new Promise((resolve) => window.AMap.plugin('AMap.PlaceSearch', resolve));
    const searcher = new window.AMap.PlaceSearch({
      city: '\u65e0\u9521',
      citylimit: false,
      pageSize: 5,
      pageIndex: 1,
    });
    const searchOne = (keyword) => new Promise((resolve) => {
      searcher.search(keyword, (status, result) => {
        const pois = result?.poiList?.pois?.map((poi) => ({
          name: poi.name,
          address: poi.address,
          type: poi.type,
          distance: poi.distance,
          location: poi.location ? { longitude: poi.location.lng, latitude: poi.location.lat } : null,
        })) ?? [];
        resolve({ keyword, status, info: result?.info ?? null, pois });
      });
    });

    const rows = [];
    for (const keyword of searchKeywords) {
      rows.push(await searchOne(keyword));
    }
    return rows;
  }, keywords);
  await browser.close();

  fs.writeFileSync(outPath, JSON.stringify(results, null, 2), 'utf8');
  console.log(outPath);
  console.log(JSON.stringify(results, null, 2));
})();
