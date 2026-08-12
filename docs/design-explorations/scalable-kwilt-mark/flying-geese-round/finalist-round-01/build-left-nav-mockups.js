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

const sourceCentersX = [324, 768, 1212];
const sourceCentersY = [171, 512, 853];
const phoneOriginsX = [184, 613, 1039];
const phoneOriginsY = [0, 386, 767];
const cropSize = 294;

// Reuse one canonical current-navigation shell in every cell so even tiny
// generated shifts in the wordmark or menu rows cannot affect comparison.
const canonicalPhone = shell.clone().crop(184, 0, 294, 365);

for (const originY of phoneOriginsY) {
  for (const originX of phoneOriginsX) {
    shell.composite(canonicalPhone, originX, originY);
  }
}

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

for (let row = 0; row < 3; row += 1) {
  for (let column = 0; column < 3; column += 1) {
    const sourceCenterX = sourceCentersX[column];
    const sourceCenterY = sourceCentersY[row];
    const shellCenterX = phoneOriginsX[column] + 55;
    const shellCenterY = phoneOriginsY[row] + 80;
    const candidate = tintCandidate(
      source
        .clone()
        .crop(
          sourceCenterX - cropSize / 2,
          sourceCenterY - cropSize / 2,
          cropSize,
          cropSize,
        ),
    );

    const patch = new Jimp(34, 34, white);
    shell.composite(patch, shellCenterX - 17, shellCenterY - 17);
    shell.composite(candidate, shellCenterX - 14, shellCenterY - 14);
  }
}

await shell.write(outputPath);
