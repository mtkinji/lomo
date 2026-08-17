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

export function findBottomDockGeometryOverrides(relativeFile, text) {
  if (relativeFile.startsWith('src/ui/')) return [];

  const findings = [];
  const actionDockTags = text.match(/<(?:ActionDock|SplitActionDock)\b[\s\S]*?>/g) ?? [];
  if (actionDockTags.some((tag) => /\b(?:insetX|insetBottom|safeAreaLift)\s*=/.test(tag))) {
    findings.push(
      `${relativeFile}: ActionDock geometry is canonical; remove insetX, insetBottom, and safeAreaLift overrides`,
    );
  }

  const bottomDrawerTags = text.match(/<BottomDrawer\b[\s\S]*?>/g) ?? [];
  if (bottomDrawerTags.some((tag) => /\bbottomAccessoryStyle\s*=/.test(tag))) {
    findings.push(
      `${relativeFile}: BottomDrawer action geometry is canonical; remove bottomAccessoryStyle`,
    );
  }

  const footerTags = text.match(/<BottomDrawerFooter\b[\s\S]*?>/g) ?? [];
  if (footerTags.some((tag) => /\b(?:paddingHorizontal|paddingTop|paddingBottom)\s*=/.test(tag))) {
    findings.push(
      `${relativeFile}: BottomDrawerFooter geometry is canonical; remove padding overrides`,
    );
  }

  return findings;
}
