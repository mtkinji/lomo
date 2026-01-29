const fs = require('fs');
const path = require('path');
const pixelmatch = require('pixelmatch');
const { PNG } = require('pngjs');

const args = process.argv.slice(2);
const shouldUpdate = args.includes('--update');

const outputDir = path.resolve(process.cwd(), 'e2e/visual-output');
const baselineDir = path.resolve(process.cwd(), 'e2e/visual-baseline');
const diffDir = path.resolve(process.cwd(), 'e2e/visual-diff');

const listPngFiles = (dir) => {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...listPngFiles(fullPath));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) {
      results.push(fullPath);
    }
  }
  return results;
};

if (!fs.existsSync(outputDir)) {
  console.error(`Missing visual output directory: ${outputDir}`);
  process.exit(1);
}

const outputFiles = listPngFiles(outputDir);
if (outputFiles.length === 0) {
  console.error(`No PNG screenshots found in ${outputDir}`);
  process.exit(1);
}

if (shouldUpdate) {
  fs.rmSync(baselineDir, { recursive: true, force: true });
  fs.mkdirSync(baselineDir, { recursive: true });
  for (const file of outputFiles) {
    const relPath = path.relative(outputDir, file);
    const targetPath = path.join(baselineDir, relPath);
    fs.mkdirSync(path.dirname(targetPath), { recursive: true });
    fs.copyFileSync(file, targetPath);
  }
  console.log(`Updated baseline screenshots in ${baselineDir}`);
  process.exit(0);
}

if (!fs.existsSync(baselineDir)) {
  console.error(`Missing baseline directory: ${baselineDir}`);
  console.error('Run: npm run visual:update');
  process.exit(1);
}

fs.rmSync(diffDir, { recursive: true, force: true });
fs.mkdirSync(diffDir, { recursive: true });

let missingBaseline = 0;
let totalDiffs = 0;

for (const file of outputFiles) {
  const relPath = path.relative(outputDir, file);
  const baselinePath = path.join(baselineDir, relPath);
  if (!fs.existsSync(baselinePath)) {
    missingBaseline += 1;
    console.warn(`Missing baseline: ${relPath}`);
    continue;
  }

  const imgA = PNG.sync.read(fs.readFileSync(baselinePath));
  const imgB = PNG.sync.read(fs.readFileSync(file));

  if (imgA.width !== imgB.width || imgA.height !== imgB.height) {
    totalDiffs += 1;
    console.warn(`Size mismatch: ${relPath} (${imgA.width}x${imgA.height} vs ${imgB.width}x${imgB.height})`);
    continue;
  }

  const diff = new PNG({ width: imgA.width, height: imgA.height });
  const diffPixels = pixelmatch(
    imgA.data,
    imgB.data,
    diff.data,
    imgA.width,
    imgA.height,
    { threshold: 0.1 }
  );

  if (diffPixels > 0) {
    totalDiffs += 1;
    const diffPath = path.join(diffDir, relPath);
    fs.mkdirSync(path.dirname(diffPath), { recursive: true });
    fs.writeFileSync(diffPath, PNG.sync.write(diff));
    console.warn(`Visual diff: ${relPath} (${diffPixels} pixels)`);
  }
}

if (missingBaseline > 0 || totalDiffs > 0) {
  console.error(`Visual regression failures. Missing baselines: ${missingBaseline}, diffs: ${totalDiffs}`);
  console.error(`Diff output: ${diffDir}`);
  process.exit(1);
}

console.log('Visual regression: all screenshots match baseline.');

