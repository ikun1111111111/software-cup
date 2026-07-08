const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SOURCE_DIR = 'C:\\Users\\11486\\Desktop\\软件杯web端素材包\\历史探索内容素材包\\Kimi_Agent_灵山朝代内容规划\\images\\history';
const TARGET_DIR = path.join(__dirname, '..', 'public', 'image', 'history');

if (!fs.existsSync(TARGET_DIR)) {
  fs.mkdirSync(TARGET_DIR, { recursive: true });
}

const files = fs.readdirSync(SOURCE_DIR).filter(f => f.endsWith('.png'));

async function compress() {
  for (const file of files) {
    const inputPath = path.join(SOURCE_DIR, file);
    const outputPath = path.join(TARGET_DIR, file);

    const isBg = file.startsWith('img-era-bg-');
    const isSealOrTitle = file.startsWith('img-seal-') || file.startsWith('img-title-');

    let pipeline = sharp(inputPath);

    if (isBg) {
      pipeline = pipeline.resize(1920, 1080, { fit: 'inside', withoutEnlargement: true });
    } else if (!isSealOrTitle) {
      pipeline = pipeline.resize(1200, 800, { fit: 'inside', withoutEnlargement: true });
    }

    pipeline = pipeline.png({
      quality: 80,
      compressionLevel: 9,
      adaptiveFiltering: true,
    });

    await pipeline.toFile(outputPath);

    const inSize = fs.statSync(inputPath).size;
    const outSize = fs.statSync(outputPath).size;
    const ratio = ((1 - outSize / inSize) * 100).toFixed(1);
    console.log(`${file}: ${(inSize / 1024).toFixed(0)}KB -> ${(outSize / 1024).toFixed(0)}KB (-${ratio}%)`);
  }
}

compress().catch(console.error);
