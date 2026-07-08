const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const outDir = path.resolve(__dirname, '../public/image/history');

const titles = [
  { name: 'title-tang', bg: '#3d2b1f' },
  { name: 'title-song', bg: '#1a2e28' },
  { name: 'title-ming', bg: '#2a1510' },
];

async function render() {
  for (const t of titles) {
    const svgPath = path.join(outDir, `${t.name}.svg`);
    const pngPath = path.join(outDir, `${t.name}.png`);

    if (!fs.existsSync(svgPath)) {
      console.error(`Missing ${svgPath}`);
      continue;
    }

    const svgBuffer = fs.readFileSync(svgPath);

    // Render SVG to PNG at 2x for crispness
    await sharp(svgBuffer, { density: 300 })
      .resize(1024, 280, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toFile(pngPath);

    console.log(`Rendered ${t.name}.png`);
  }
}

render().catch(console.error);
