const { chromium } = require('C:/Users/lenovo/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/.pnpm/playwright@1.61.0/node_modules/playwright');

const url = process.env.MAP_URL || 'http://127.0.0.1:8104/map';

async function readAvatarSpeech(page) {
  const label = page.getByText('小灵正在带路').first();
  await label.waitFor({ timeout: 30000 });
  return label.locator('xpath=following-sibling::*[1]').textContent();
}

async function clickNarrationButton(page) {
  const labels = ['开始讲解', '重播讲解', '听小灵讲解'];
  for (const label of labels) {
    const button = page.getByText(label).last();
    if (await button.count()) {
      try {
        await button.click({ timeout: 5000 });
        return label;
      } catch {}
    }
  }

  const visibleText = await page.locator('body').innerText({ timeout: 5000 }).catch(() => '');
  const html = await page.content().catch(() => '');
  throw new Error(`Could not find narration button. Visible text:\n${visibleText.slice(0, 2000)}\nHTML:\n${html.slice(0, 2000)}`);
}

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const context = await browser.newContext({
    viewport: { width: 430, height: 932 },
    deviceScaleFactor: 1,
    isMobile: true,
    hasTouch: true,
  });

  await context.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel() {},
        getVoices() { return []; },
        pause() {},
        resume() {},
        speak(utterance) {
          window.setTimeout(() => {
            utterance.onboundary?.({ charIndex: 0, name: 'word' });
          }, 60);
          window.setTimeout(() => {
            utterance.onend?.();
          }, 12000);
        },
      },
    });
  });

  const page = await context.newPage();
  page.on('pageerror', (error) => {
    console.log(`pageerror:${error.message}`);
  });
  page.on('console', (message) => {
    const text = message.text();
    if (/error|warn/i.test(message.type()) || /VRM|Map|Amap|useVRMSync/i.test(text)) {
      console.log(`console:${message.type()}:${text}`);
    }
  });

  const response = await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  console.log(`status:${response?.status()} url:${page.url()}`);
  await page.waitForFunction(
    () => (document.getElementById('root')?.childElementCount || 0) > 0,
    { timeout: 90000 },
  );
  await page.waitForTimeout(2000);
  const clickedLabel = await clickNarrationButton(page);
  await page.waitForTimeout(900);
  const firstSpeech = (await readAvatarSpeech(page) || '').trim();
  await page.waitForTimeout(4200);
  const laterSpeech = (await readAvatarSpeech(page) || '').trim();
  console.log(JSON.stringify({ clickedLabel, firstSpeech, laterSpeech }, null, 2));
  await browser.close();

  if (!firstSpeech || !laterSpeech || firstSpeech === laterSpeech) {
    throw new Error(`Avatar speech did not progress: "${firstSpeech}" -> "${laterSpeech}"`);
  }
})();
