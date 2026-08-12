import Jimp from 'jimp-compact';

const [sourceBoardPath, outputPath] = process.argv.slice(2);

if (!sourceBoardPath || !outputPath) {
  throw new Error('Usage: node build-positive-circle.js <duel-board> <output-png>');
}

function writeImage(image, path) {
  return new Promise((resolve, reject) => {
    image.write(path, error => (error ? reject(error) : resolve()));
  });
}

const board = await Jimp.read(sourceBoardPath);
const source = board.clone().crop(256, 220, 256, 240);
const pine = { r: 49, g: 85, b: 69 };

source.scan(0, 0, source.bitmap.width, source.bitmap.height, function isolate(_x, _y, index) {
  const average =
    (this.bitmap.data[index] + this.bitmap.data[index + 1] + this.bitmap.data[index + 2]) / 3;
  const coverage = Math.max(0, Math.min(1, (236 - average) / 165));

  this.bitmap.data[index] = pine.r;
  this.bitmap.data[index + 1] = pine.g;
  this.bitmap.data[index + 2] = pine.b;
  this.bitmap.data[index + 3] = coverage < 0.04 ? 0 : Math.round(255 * Math.min(1, coverage * 1.6));
});

const mark = source.autocrop();

// Make the approved T2 artwork optically square, then use a circle only as a
// clean outer crop. The green pieces remain the positive mark; no disc or ring
// is introduced.
const squareSize = mark.bitmap.height;
mark.resize(squareSize, squareSize, Jimp.RESIZE_BICUBIC);

const master = new Jimp(1024, 1024, 0x00000000);
const placed = mark.clone().resize(832, 832, Jimp.RESIZE_BICUBIC);
master.composite(placed, 96, 96);

const center = 512;
const radius = 416;
const feather = 2;

master.scan(0, 0, master.bitmap.width, master.bitmap.height, function circleCrop(x, y, index) {
  const distance = Math.hypot(x - center, y - center);
  const circleCoverage = Math.max(0, Math.min(1, (radius + feather - distance) / (feather * 2)));
  this.bitmap.data[index + 3] = Math.round(this.bitmap.data[index + 3] * circleCoverage);
});

await writeImage(master, outputPath);
