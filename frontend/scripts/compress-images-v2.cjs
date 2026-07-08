const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const TARGET_DIR = path.join(__dirname, '..', 'public', 'image', 'history');

const files = fs.readdirSync(TARGET_DIR).filter(f => f.endsWith('.png'));

async function recompress() {
  for (const file of files) {
    const filePath = path.join(TARGET_DIR, file);
    const isBg = file.startsWith('img-era-bg-');
    const isSealOrTitle = file.startsWith('img-seal-') || file.startsWith('img-title-');

    let pipeline = sharp(filePath);

    if (isBg) {
      pipeline = pipeline.resize(1440, 810, { fit: 'inside', withoutEnlargement: true });
    } else if (isSealOrTitle) {
      pipeline = pipeline.resize(600, 600, { fit: 'inside', withoutEnlargement: true });
    } else {
      pipeline = pipeline.resize(960, 640, { fit: 'inside', withoutEnlargement: true });
    }

    pipeline = pipeline.png({
      quality: 70,
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 10,
    });

    const buf = await pipeline.toBuffer();
    fs.writeFileSync(filePath, buf);

    const outSize = buf.length;
    console.log(`${file}: ${(outSize / 1024).toFixed(0)}KB`);
  }
}

recompress().catch(console.error);
