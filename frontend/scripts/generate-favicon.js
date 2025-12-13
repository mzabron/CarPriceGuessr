const fs = require('fs/promises');
const path = require('path');

const jimp = require('jimp');

async function main() {
  const { default: pngToIco } = await import('png-to-ico');

  const projectRoot = path.resolve(__dirname, '..');
  const inputPng = path.join(projectRoot, 'public', 'car_image.png');
  const outputIco = path.join(projectRoot, 'public', 'favicon.ico');

  const image = await jimp.Jimp.read(inputPng);

  // Google Search prefers favicons that are at least 48x48 (or a multiple of 48).
  // ICOs can embed multiple sizes, which also helps across browsers.
  const sizes = [16, 32, 48];
  const pngBuffers = [];

  for (const size of sizes) {
    const resized = image.clone().cover({ w: size, h: size });
    const buffer = await resized.getBuffer('image/png');
    pngBuffers.push(buffer);
  }

  const icoBuffer = await pngToIco(pngBuffers);
  await fs.writeFile(outputIco, icoBuffer);

  // eslint-disable-next-line no-console
  console.log(`Generated ${path.relative(projectRoot, outputIco)} from ${path.relative(projectRoot, inputPng)}`);
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to generate favicon.ico:', err);
  process.exit(1);
});
