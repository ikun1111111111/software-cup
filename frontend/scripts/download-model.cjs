/**
 * Download free Live2D sample model (Haru Greeter) from pixi-live2d-display test assets.
 * Usage: node scripts/download-model.cjs
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const MODEL_DIR = path.resolve(__dirname, '../public/models/haru');
const BASE_URL = 'https://cdn.jsdelivr.net/gh/guansss/pixi-live2d-display/test/assets/haru';

const FILES = [
  'haru_greeter_t03.model3.json',
  'haru_greeter_t03.moc3',
  'haru_greeter_t03.physics3.json',
  'haru_greeter_t03.pose3.json',
  'haru_greeter_t03.cdi3.json',
  'haru_greeter_t03.2048/texture_00.png',
  'haru_greeter_t03.2048/texture_01.png',
  'expressions/F01.exp3.json',
  'expressions/F02.exp3.json',
  'expressions/F03.exp3.json',
  'expressions/F04.exp3.json',
  'expressions/F05.exp3.json',
  'expressions/F06.exp3.json',
  'expressions/F07.exp3.json',
  'expressions/F08.exp3.json',
  'motion/haru_g_idle.motion3.json',
  'motion/haru_g_m07.motion3.json',
  'motion/haru_g_m15.motion3.json',
  'motion/haru_g_m14.motion3.json',
  'motion/haru_g_m05.motion3.json',
];

function fetchUrl(url) {
  return new Promise((resolve, reject) => {
    const mod = url.startsWith('https') ? https : require('http');
    mod.get(url, { headers: { 'User-Agent': 'node' } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302 || res.statusCode === 307 || res.statusCode === 308) {
        return fetchUrl(res.headers.location).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        res.resume();
        return reject(new Error(`HTTP ${res.statusCode}`));
      }
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

function downloadFile(url, dest) {
  return new Promise(async (resolve, reject) => {
    const dir = path.dirname(dest);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    // Skip only if file exists AND looks like real binary (>1KB), not a redirect page
    if (fs.existsSync(dest) && fs.statSync(dest).size > 1024) {
      console.log(`  [skip] ${path.relative(MODEL_DIR, dest)} (exists, ${fs.statSync(dest).size} bytes)`);
      return resolve();
    }
    try {
      const buf = await fetchUrl(url);
      fs.writeFileSync(dest, buf);
      console.log(`  [ok]   ${path.relative(MODEL_DIR, dest)} (${buf.length} bytes)`);
      resolve();
    } catch (e) {
      console.log(`  [FAIL] ${path.relative(MODEL_DIR, dest)}: ${e.message}`);
      reject(e);
    }
  });
}

async function main() {
  console.log('Downloading Live2D sample model (Haru Greeter)...');
  console.log(`Target: ${MODEL_DIR}\n`);

  let success = 0, failed = 0;
  for (const file of FILES) {
    const url = `${BASE_URL}/${file}`;
    const dest = path.join(MODEL_DIR, file);
    try {
      await downloadFile(url, dest);
      success++;
    } catch (e) {
      console.log(`  [FAIL] ${file}: ${e.message}`);
      failed++;
    }
  }

  console.log(`\nDone! ${success} downloaded, ${failed} failed.`);
  if (failed === 0) {
    console.log('\nModel ready! Start dev server and visit ChatPage to see the digital human.');
    console.log('Model path: /models/haru/haru_greeter_t03.model3.json');
  }
}

main().catch(console.error);
