const path = require('path');
const { chromium } = require('C:\\Users\\lenovo\\.cache\\codex-runtimes\\codex-primary-runtime\\dependencies\\node\\node_modules\\playwright');

const root = path.resolve(__dirname, '..');
const shot = path.join(root, 'tmp', 'map_probe.png');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 460, height: 900 },
    deviceScaleFactor: 1,
  });
  const consoleMessages = [];
  page.on('console', (msg) => consoleMessages.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', (err) => consoleMessages.push(`pageerror: ${err.message}`));

  await page.goto('http://127.0.0.1:8097/map', { waitUntil: 'domcontentloaded', timeout: 60000 });
  try {
    await page.waitForLoadState('networkidle', { timeout: 20000 });
  } catch {}
  await page.waitForTimeout(12000);

  await page.screenshot({ path: shot, fullPage: true });
  const result = await page.evaluate(() => {
    const map = document.querySelector('.amap-container') || document.querySelector('[class*="amap"]');
    const rectOf = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: Math.round(r.x), y: Math.round(r.y), w: Math.round(r.width), h: Math.round(r.height) };
    };
    const markers = Array.from(document.querySelectorAll('.amap-marker'))
      .slice(0, 30)
      .map((el) => ({ rect: rectOf(el), text: (el.textContent || '').trim().slice(0, 40) }));
    const labels = Array.from(document.querySelectorAll('div, span'))
      .map((el) => ({ rect: rectOf(el), text: (el.textContent || '').trim() }))
      .filter((item) => item.text && /灵山|梵宫|照壁|五印|九龙|大佛|精舍|菩提/.test(item.text))
      .slice(0, 50);
    return {
      url: location.href,
      bodyText: document.body.innerText.slice(0, 800),
      mapRect: rectOf(map),
      markerCount: document.querySelectorAll('.amap-marker').length,
      markers,
      labels,
    };
  });

  console.log('SCREENSHOT', shot);
  console.log('RESULT', JSON.stringify(result, null, 2));
  console.log('CONSOLE', JSON.stringify(consoleMessages.slice(-30), null, 2));
  await browser.close();
})();
