const fs = require('fs');
const path = require('path');
const { chromium } = require('C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.0/node_modules/playwright');

const root = path.resolve(__dirname, '..');
const screenshot = path.join(root, 'tmp', 'map-after-coordinate-source-fix.png');
const logPath = path.join(root, 'tmp', 'map-after-coordinate-source-fix.log');
const url = process.env.MAP_URL || 'http://localhost:8123/map';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const page = await browser.newPage({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });
  const consoleLines = [];
  page.on('console', (msg) => consoleLines.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', (error) => consoleLines.push(`pageerror: ${error.message}`));
  await page.addInitScript(() => {
    const calls = [];
    Object.defineProperty(window, '__amapCalls', {
      configurable: true,
      value: calls,
    });

    const patchAmap = (amap) => {
      if (!amap || amap.__codexPatched) return amap;
      const OriginalMap = amap.Map;
      const OriginalMarker = amap.Marker;
      if (typeof OriginalMap === 'function') {
        amap.Map = function CodexPatchedMap(container, options) {
          calls.push({
            type: 'Map',
            center: options && options.center,
            zoom: options && options.zoom,
          });
          const map = new OriginalMap(container, options);
          window.__codexLastMap = map;
          return map;
        };
        amap.Map.prototype = OriginalMap.prototype;
      }
      if (typeof OriginalMarker === 'function') {
        amap.Marker = function CodexPatchedMarker(options) {
          calls.push({
            type: 'Marker',
            position: options && options.position,
            zIndex: options && options.zIndex,
          });
          return new OriginalMarker(options);
        };
        amap.Marker.prototype = OriginalMarker.prototype;
      }
      amap.__codexPatched = true;
      return amap;
    };

    let amapValue;
    Object.defineProperty(window, 'AMap', {
      configurable: true,
      get() {
        return amapValue;
      },
      set(value) {
        amapValue = patchAmap(value);
      },
    });
  });

  let opened = false;
  for (let attempt = 1; attempt <= 8; attempt += 1) {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
      opened = true;
      break;
    } catch (error) {
      consoleLines.push(`goto attempt ${attempt} failed: ${error.message}`);
      await page.waitForTimeout(3000);
    }
  }
  if (!opened) {
    throw new Error(`Unable to open ${url}`);
  }
  try {
    await page.waitForLoadState('networkidle', { timeout: 20000 });
  } catch {
    consoleLines.push('networkidle timeout');
  }
  await page.waitForTimeout(8000);

  const amapLoaded = await page.evaluate(() => Boolean(window.AMap));
  const amapCalls = await page.evaluate(() => window.__amapCalls || []);
  const currentCenter = await page.evaluate(() => {
    const center = window.__codexLastMap && window.__codexLastMap.getCenter
      ? window.__codexLastMap.getCenter()
      : null;
    return center ? { longitude: center.lng, latitude: center.lat } : null;
  });
  const bodyText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
  await page.screenshot({ path: screenshot, fullPage: true });
  await browser.close();

  fs.writeFileSync(
    logPath,
    [
      `url=${url}`,
      `amap_loaded=${amapLoaded}`,
      `current_center=${JSON.stringify(currentCenter)}`,
      `amap_calls=${JSON.stringify(amapCalls.slice(0, 30), null, 2)}`,
      `body_text_start=${bodyText.slice(0, 500).replace(/\n/g, ' | ')}`,
      'console:',
      ...consoleLines.slice(-80),
    ].join('\n'),
    'utf8',
  );

  console.log(`screenshot=${screenshot}`);
  console.log(`log=${logPath}`);
  console.log(`amap_loaded=${amapLoaded}`);
})();
