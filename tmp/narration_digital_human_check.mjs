import { writeFileSync } from 'node:fs';

const port = Number(process.env.CDP_PORT || 9224);
const targetUrl = process.env.TARGET_URL || 'http://localhost:8100/attractions/ling-shan-da-fo';
const screenshotPath = process.env.SCREENSHOT_PATH || 'E:/03_Projects/software-cup/tmp/narration-digital-human.png';

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchJson(url, options) {
  const res = await fetch(url, options);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
}

async function waitForDebugger() {
  const endpoint = `http://localhost:${port}/json/version`;
  for (let i = 0; i < 40; i += 1) {
    try {
      return await fetchJson(endpoint);
    } catch {
      await delay(250);
    }
  }
  throw new Error('Chrome DevTools endpoint did not become ready');
}

function connect(wsUrl) {
  const ws = new WebSocket(wsUrl);
  let id = 0;
  const pending = new Map();
  const events = new Map();

  ws.addEventListener('message', (event) => {
    const msg = JSON.parse(event.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      if (msg.error) reject(new Error(JSON.stringify(msg.error)));
      else resolve(msg.result);
      return;
    }
    const listeners = events.get(msg.method) || [];
    listeners.forEach((listener) => listener(msg.params));
  });

  return new Promise((resolve, reject) => {
    ws.addEventListener('open', () => {
      resolve({
        send(method, params = {}) {
          const requestId = ++id;
          ws.send(JSON.stringify({ id: requestId, method, params }));
          return new Promise((resolveRequest, rejectRequest) => {
            pending.set(requestId, { resolve: resolveRequest, reject: rejectRequest });
          });
        },
        on(method, listener) {
          const listeners = events.get(method) || [];
          listeners.push(listener);
          events.set(method, listeners);
        },
        close() {
          ws.close();
        },
      });
    });
    ws.addEventListener('error', reject);
  });
}

async function waitForExpression(client, expression, timeoutMs = 15000) {
  const started = Date.now();
  while (Date.now() - started < timeoutMs) {
    const result = await client.send('Runtime.evaluate', {
      expression,
      returnByValue: true,
    });
    if (result.result?.value) return result.result.value;
    await delay(300);
  }
  throw new Error(`Timed out waiting for expression: ${expression}`);
}

await waitForDebugger();
await fetchJson(`http://localhost:${port}/json/new?${encodeURIComponent('about:blank')}`, { method: 'PUT' });
const targets = await fetchJson(`http://localhost:${port}/json/list`);
const pageTarget = targets.find((target) => target.type === 'page');
if (!pageTarget?.webSocketDebuggerUrl) throw new Error('No page target found');

const client = await connect(pageTarget.webSocketDebuggerUrl);
try {
  await client.send('Page.enable');
  await client.send('Runtime.enable');
  await client.send('Emulation.setDeviceMetricsOverride', {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await client.send('Page.navigate', { url: targetUrl });
  await waitForExpression(client, `document.body && document.body.innerText.includes('听小灵讲解')`);

  const clicked = await client.send('Runtime.evaluate', {
    expression: `
      (() => {
        const nodes = Array.from(document.querySelectorAll('button, a, [role="button"], div, span'));
        const matches = nodes
          .filter((node) => (node.innerText || node.textContent || '').includes('听小灵讲解'))
          .sort((a, b) => (a.innerText || a.textContent || '').length - (b.innerText || b.textContent || '').length);
        const textNode = matches[0];
        if (!textNode) return false;
        const button = textNode.closest('button, a, [role="button"]') || textNode.parentElement || textNode;
        button.scrollIntoView({ block: 'center', inline: 'center' });
        button.click();
        return true;
      })()
    `,
    returnByValue: true,
  });
  if (!clicked.result?.value) throw new Error('Narration button was not clicked');

  await waitForExpression(client, `document.body && document.body.innerText.includes('数字人讲解员')`);
  const hasVrmCanvas = await waitForExpression(client, `
    Array.from(document.querySelectorAll('canvas')).some((canvas) => {
      const rect = canvas.getBoundingClientRect();
      return rect.width > 40 && rect.height > 40;
    })
  `);
  const screenshot = await client.send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: false });
  writeFileSync(screenshotPath, Buffer.from(screenshot.data, 'base64'));
  console.log(JSON.stringify({ ok: true, hasDigitalHumanText: true, hasVrmCanvas, screenshotPath }));
} finally {
  client.close();
}
