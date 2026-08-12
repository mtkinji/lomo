import Jimp from 'jimp-compact';

const sourceBoardPath = process.argv[2];
const outputDirectory = process.argv[3];

if (!sourceBoardPath || !outputDirectory) {
  throw new Error('Usage: node build-faithful-square-leads.js <duel-board> <output-directory>');
}

const board = await Jimp.read(sourceBoardPath);
const pine = { r: 49, g: 85, b: 69 };

const leads = [
  {
    name: 'thread-path-t2-square',
    crop: { x: 256, y: 220, width: 256, height: 240 },
  },
  {
    name: 'nested-k-k3-square',
    crop: { x: 768, y: 562, width: 256, height: 240 },
  },
];

function writeImage(image, path) {
  return new Promise((resolve, reject) => {
    image.write(path, error => (error ? reject(error) : resolve()));
  });
}

function extractInk(source) {
  source.scan(0, 0, source.bitmap.width, source.bitmap.height, function isolate(_x, _y, index) {
    const average =
      (this.bitmap.data[index] + this.bitmap.data[index + 1] + this.bitmap.data[index + 2]) / 3;
    const coverage = Math.max(0, Math.min(1, (236 - average) / 165));

    this.bitmap.data[index] = pine.r;
    this.bitmap.data[index + 1] = pine.g;
    this.bitmap.data[index + 2] = pine.b;
    this.bitmap.data[index + 3] = coverage < 0.04 ? 0 : Math.round(255 * Math.min(1, coverage * 1.6));
  });

  return source.autocrop();
}

for (const lead of leads) {
  const extracted = extractInk(
    board.clone().crop(lead.crop.x, lead.crop.y, lead.crop.width, lead.crop.height),
  );

  // Preserve the approved silhouette, gaps, and piece count. Expand only the
  // horizontal axis until the occupied bounds equal the original height.
  const squareSize = extracted.bitmap.height;
  extracted.resize(squareSize, squareSize, Jimp.RESIZE_BICUBIC);

  const master = new Jimp(1024, 1024, 0x00000000);
  const placed = extracted.clone().resize(768, 768, Jimp.RESIZE_BICUBIC);
  master.composite(placed, 128, 128);
  await writeImage(master, `${outputDirectory}/${lead.name}.png`);
}

const comparison = new Jimp(1200, 720, Jimp.cssColorToHex('#F7F2E8'));
const thread = await Jimp.read(`${outputDirectory}/thread-path-t2-square.png`);
const nestedK = await Jimp.read(`${outputDirectory}/nested-k-k3-square.png`);

comparison.composite(thread.clone().resize(320, 320), 200, 160);
comparison.composite(nestedK.clone().resize(320, 320), 680, 160);

await writeImage(comparison, `${outputDirectory}/faithful-square-leads-comparison.png`);
