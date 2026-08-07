const brandGreenPattern = /colors\.(?:pine\d+|accent(?:Muted)?|success)\b|['"]pine\d+['"]|#315545/gi;
const brandMomentMarker = /@kwilt-brand-moment:\s*\S/;

export function countUnmarkedBrandGreenUsages(text) {
  return text.split(/\r?\n/).reduce((count, line) => {
    if (brandMomentMarker.test(line)) return count;
    return count + (line.match(brandGreenPattern)?.length ?? 0);
  }, 0);
}

export function findBrandGreenUsageIncrease(relativeFile, currentText, baselineText) {
  const currentCount = countUnmarkedBrandGreenUsages(currentText);
  const baselineCount = countUnmarkedBrandGreenUsages(baselineText);
  if (currentCount <= baselineCount) return null;
  return `${relativeFile}: unmarked brand green usage increased from ${baselineCount} to ${currentCount}; use a neutral semantic token or add an explicit @kwilt-brand-moment: reason on the same line`;
}
