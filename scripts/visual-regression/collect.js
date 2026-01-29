const fs = require('fs');
const os = require('os');
const path = require('path');

const outputDir = path.resolve(process.cwd(), 'e2e/visual-output');
const candidates = [
  path.resolve(process.cwd(), 'maestro', 'screenshots'),
  path.resolve(process.cwd(), '.maestro', 'screenshots'),
  path.resolve(os.homedir(), '.maestro', 'screenshots'),
];

const sourceDir = candidates.find((candidate) => fs.existsSync(candidate));

if (!sourceDir) {
  console.error('No Maestro screenshots directory found.');
  console.error(`Checked:\n${candidates.map((c) => `- ${c}`).join('\n')}`);
  process.exit(1);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });
fs.cpSync(sourceDir, outputDir, { recursive: true });

console.log(`Collected screenshots from ${sourceDir}`);
console.log(`Output directory: ${outputDir}`);

