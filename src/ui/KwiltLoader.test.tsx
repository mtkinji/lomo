import { readdirSync, readFileSync, statSync } from 'fs';
import path from 'path';

const SRC_ROOT = path.join(__dirname, '..');

function productSourceFiles(directory: string): string[] {
  return readdirSync(directory).flatMap((entry) => {
    const absolutePath = path.join(directory, entry);
    if (statSync(absolutePath).isDirectory()) return productSourceFiles(absolutePath);
    if (!absolutePath.endsWith('.tsx') || absolutePath.endsWith('.test.tsx')) return [];
    return [absolutePath];
  });
}

describe('canonical Kwilt loading boundaries', () => {
  const files = productSourceFiles(SRC_ROOT);

  it('keeps native activity indicators behind the canonical loader', () => {
    const rawIndicatorFiles = files
      .filter((file) => /<ActivityIndicator\b|\bActivityIndicator\s*[,}]/.test(readFileSync(file, 'utf8')))
      .map((file) => path.relative(SRC_ROOT, file));

    expect(rawIndicatorFiles).toEqual([]);
  });

  it('keeps native refresh controls behind the canonical refresh implementation', () => {
    const rawRefreshFiles = files
      .filter((file) => readFileSync(file, 'utf8').includes('RefreshControl'))
      .map((file) => path.relative(SRC_ROOT, file));

    expect(rawRefreshFiles).toEqual(['ui/KwiltRefresh.tsx']);
  });

  it('keeps branded refresh visuals out of scroll-content layout', () => {
    const refreshCallers = files
      .filter((file) => !file.endsWith('ui/KwiltRefresh.tsx'))
      .filter((file) => readFileSync(file, 'utf8').includes('useKwiltRefresh'));

    expect(refreshCallers.map((file) => path.relative(SRC_ROOT, file))).not.toEqual([]);
    expect(refreshCallers.filter((file) => !readFileSync(file, 'utf8').includes('KwiltRefreshFrame'))).toEqual([]);
    expect(refreshCallers.filter((file) => readFileSync(file, 'utf8').includes('refreshIndicator'))).toEqual([]);
  });
});
