import { createRequire } from 'node:module';
import path from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');

const timeline = {
  total_events: 11,
  eras: ['唐代', '北宋', '南宋', '元代', '明代', '清末', '现代'],
  events: [
    { era: '唐代', year: '627-649', event: '玄奘法师西行取经归来', description: "玄奘法师见此地'层峦丛翠，曲水净秀，山形酷似印度灵鹫山'，命名为'小灵山'，嘱咐大弟子窥基法师在此住持道场。", spot: '祥符禅寺' },
    { era: '唐代', year: '650', event: '小灵山庵建立', description: '窥基法师遵师命在此建立小灵山庵，开启灵山千年佛教传承。', spot: '祥符禅寺' },
    { era: '北宋', year: '1008-1016', event: "宋真宗赐额'祥符禅寺'", description: "大中祥符年间，宋真宗赐额'祥符禅寺'，寺院进入鼎盛时期。", spot: '祥符禅寺' },
    { era: '南宋', year: '1127-1279', event: '兵燹毁坏', description: '南宋时期，祥符禅寺遭兵燹毁坏，佛教传承受到重创。', spot: '祥符禅寺' },
    { era: '元代', year: '1271-1368', event: '寺院重建', description: '元代重建祥符禅寺，佛教文化在此地再度复兴。', spot: '祥符禅寺' },
    { era: '明代', year: '1368-1644', event: '鼎盛时期', description: '明代祥符禅寺达到鼎盛，香火旺盛，成为江南重要佛教道场。', spot: '祥符禅寺' },
    { era: '清末', year: '1850-1912', event: '战火毁坏', description: '清末民初再次毁于战火，仅存千年银杏、六角古井和残垣断壁。', spot: '祥符禅寺' },
    { era: '现代', year: '1994', event: '景区规划建设', description: '无锡市政府决定在小灵山建设灵山大佛景区，开启现代佛教文化旅游新篇章。', spot: '灵山大佛' },
    { era: '现代', year: '1997', event: '灵山大佛落成开光', description: "11月15日，88米高露天青铜释迦牟尼立像落成开光，赵朴初'五方五佛'理念实现。", spot: '灵山大佛' },
    { era: '现代', year: '2009', event: '灵山梵宫开放', description: "1月1日灵山梵宫正式开放，被誉为'佛教艺术的卢浮宫'，汇集多种传统工艺。", spot: '灵山梵宫' },
    { era: '现代', year: '2015', event: '拈花湾小镇开放', description: '禅意小镇拈花湾开放，成为灵山胜境的重要组成部分。', spot: '拈花湾' },
  ],
};

const today = {
  card: {
    month: 6,
    day: 6,
    title: '玄奘命名小灵山',
    year_ago: '约1370年前',
    description: "据传唐代贞观年间，玄奘法师游历至此，见山形酷似印度灵鹫山，命名为'小灵山'，开启了此地的佛教传承。",
  },
  match: 'random',
};

async function checkViewport(browser, viewport, screenshotName) {
  const page = await browser.newPage({ viewport });
  const logs = [];
  page.on('console', msg => logs.push(`${msg.type()}: ${msg.text()}`));
  page.on('pageerror', error => logs.push(`pageerror: ${error.message}`));
  await page.route('**/api/history/timeline**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(timeline),
  }));
  await page.route('**/api/history/today**', route => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(today),
  }));
  await page.goto('http://127.0.0.1:5173/history', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.resolve(screenshotName), fullPage: true });
  await page.locator('.history-era-banner').first().scrollIntoViewIfNeeded();
  await page.waitForTimeout(700);
  await page.screenshot({ path: path.resolve(screenshotName.replace('.png', '-era.png')), fullPage: false });
  const metrics = await page.evaluate(() => {
    const cards = [...document.querySelectorAll('.history-event-card')];
    const loadedImages = [...document.images].filter((img) => img.complete && img.naturalWidth > 0);
    const badImages = [...document.images].filter((img) => img.complete && img.naturalWidth === 0).map((img) => img.getAttribute('src'));
    const overflowing = [...document.querySelectorAll('.history-gate, .history-today, .history-era-banner, .history-event-card')]
      .filter((el) => {
        const rect = el.getBoundingClientRect();
        return rect.left < -2 || rect.right > window.innerWidth + 2;
      })
      .length;

    return {
      viewport: `${window.innerWidth}x${window.innerHeight}`,
      cards: cards.length,
      loadedImages: loadedImages.length,
      badImages,
      overflowing,
      title: document.querySelector('.history-gate-copy h2')?.textContent || '',
      bodyText: document.body.innerText.slice(0, 500),
    };
  });
  metrics.logs = logs.slice(-20);
  await page.close();
  return metrics;
}

const browser = await chromium.launch({
  headless: true,
  executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
});
const desktop = await checkViewport(browser, { width: 1366, height: 900 }, 'history-redesign-desktop.png');
const mobile = await checkViewport(browser, { width: 390, height: 844 }, 'history-redesign-mobile.png');
await browser.close();

console.log(JSON.stringify({ desktop, mobile }, null, 2));
