const path = require('path');
const { chromium } = require('C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.0/node_modules/playwright');

const KEY = '69ce537355cca1a2ba0bbf3b737c5d35';
const raw = { latitude: 31.4268, longitude: 120.0962 };

function wgs84ToGcj02(latitude, longitude) {
  const a = 6378245.0;
  const ee = 0.00669342162296594323;
  function transformLatitude(x, y) {
    let ret = -100.0 + 2.0 * x + 3.0 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(y * Math.PI) + 40.0 * Math.sin((y / 3.0) * Math.PI)) * 2.0) / 3.0;
    ret += ((160.0 * Math.sin((y / 12.0) * Math.PI) + 320 * Math.sin((y * Math.PI) / 30.0)) * 2.0) / 3.0;
    return ret;
  }
  function transformLongitude(x, y) {
    let ret = 300.0 + x + 2.0 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += ((20.0 * Math.sin(6.0 * x * Math.PI) + 20.0 * Math.sin(2.0 * x * Math.PI)) * 2.0) / 3.0;
    ret += ((20.0 * Math.sin(x * Math.PI) + 40.0 * Math.sin((x / 3.0) * Math.PI)) * 2.0) / 3.0;
    ret += ((150.0 * Math.sin((x / 12.0) * Math.PI) + 300.0 * Math.sin((x / 30.0) * Math.PI)) * 2.0) / 3.0;
    return ret;
  }
  let dLat = transformLatitude(longitude - 105.0, latitude - 35.0);
  let dLng = transformLongitude(longitude - 105.0, latitude - 35.0);
  const radLat = (latitude / 180.0) * Math.PI;
  let magic = Math.sin(radLat);
  magic = 1 - ee * magic * magic;
  const sqrtMagic = Math.sqrt(magic);
  dLat = (dLat * 180.0) / (((a * (1 - ee)) / (magic * sqrtMagic)) * Math.PI);
  dLng = (dLng * 180.0) / ((a / sqrtMagic) * Math.cos(radLat) * Math.PI);
  return { latitude: latitude + dLat, longitude: longitude + dLng };
}

const converted = wgs84ToGcj02(raw.latitude, raw.longitude);

async function render(page, label, point) {
  await page.setContent(`
    <!doctype html>
    <meta charset="utf-8" />
    <style>html,body,#map{margin:0;width:100%;height:100%;}</style>
    <div id="map"></div>
    <script src="https://webapi.amap.com/maps?v=2.0&key=${KEY}"></script>
  `);
  await page.waitForFunction(() => Boolean(window.AMap), null, { timeout: 20000 });
  await page.evaluate((p) => {
    const map = new window.AMap.Map('map', {
      center: [p.longitude, p.latitude],
      zoom: 16,
      viewMode: '2D',
      mapStyle: 'amap://styles/normal',
      features: ['bg', 'road', 'building', 'point'],
      showIndoorMap: false,
    });
    new window.AMap.Marker({
      map,
      position: [p.longitude, p.latitude],
      label: { content: 'CENTER', direction: 'right' },
    });
    window.__map = map;
  }, point);
  await page.waitForTimeout(5000);
  const file = path.join(__dirname, `${label}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log(`${label}=${file}`, point);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 720 } });
  await render(page, 'amap-raw-coordinate', raw);
  await render(page, 'amap-wgs84-converted-coordinate', converted);
  await browser.close();
})();
