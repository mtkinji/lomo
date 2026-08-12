import Jimp from 'jimp-compact';

const [sourcePath, shellPath, outputPath] = process.argv.slice(2);

if (!sourcePath || !shellPath || !outputPath) {
  throw new Error(
    'Usage: node build-left-nav-mockups.js <candidate-board> <generated-shell> <output-path>',
  );
}

const source = await Jimp.read(sourcePath);
const shell = await Jimp.read(shellPath);
const pine = Jimp.cssColorToHex('#315545');
const white = Jimp.cssColorToHex('#FFFFFF');

// Exact centers of the six-by-two concept sheet.
const sourceCentersX = [128, 384, 640, 896, 1152, 1408];
const sourceCentersY = [340, 682];
const sourceCropSize = 230;

// The generated comparison shell is three columns by four rows.
const phoneOriginsX = [152, 500, 850];
const phoneOriginsY = [0, 319, 638, 946];

function tintCandidate(mark) {
  mark.scan(0, 0, mark.bitmap.width, mark.bitmap.height, function recolor(_x, _y, idx) {
    const average =
      (this.bitmap.data[idx] + this.bitmap.data[idx + 1] + this.bitmap.data[idx + 2]) / 3;
    const inkCoverage = Math.max(0, Math.min(1, (245 - average) / 165));

    if (inkCoverage < 0.08) {
      this.bitmap.data[idx + 3] = 0;
      return;
    }

    this.bitmap.data[idx] = (pine >>> 24) & 0xff;
    this.bitmap.data[idx + 1] = (pine >>> 16) & 0xff;
    this.bitmap.data[idx + 2] = (pine >>> 8) & 0xff;
    this.bitmap.data[idx + 3] = Math.round(255 * Math.min(1, inkCoverage * 1.55));
  });

  return mark.autocrop().contain(28, 28, Jimp.HORIZONTAL_ALIGN_CENTER | Jimp.VERTICAL_ALIGN_MIDDLE);
}

for (let index = 0; index < 12; index += 1) {
  const shellRow = Math.floor(index / 3);
  const shellColumn = index % 3;
  const sourceRow = index < 6 ? 0 : 1;
  const sourceColumn = index % 6;
  const shellCenterX = phoneOriginsX[shellColumn] + 44;
  const shellCenterY = phoneOriginsY[shellRow] + 65;

  const candidate = tintCandidate(
    source
      .clone()
      .crop(
        sourceCentersX[sourceColumn] - sourceCropSize / 2,
        sourceCentersY[sourceRow] - sourceCropSize / 2,
        sourceCropSize,
        sourceCropSize,
      ),
  );

  // The generated shell carries a 22px four-leaf placeholder. Remove a full
  // 34px square before compositing so no placeholder pixels can survive
  // around or between the exact candidate pieces.
  shell.composite(new Jimp(34, 34, white), shellCenterX - 17, shellCenterY - 17);
  shell.composite(candidate, shellCenterX - 14, shellCenterY - 14);
}

await shell.write(outputPath);
