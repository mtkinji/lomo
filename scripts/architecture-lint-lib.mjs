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

export function findRawInteractiveControlImports(relativeFile, text) {
  const reactNativeImports = text.match(/import\s+\{[^}]*\}\s+from\s+['"]react-native['"]/g) ?? [];
  const rawControls = new Set();
  for (const statement of reactNativeImports) {
    if (/\bPressable\b/.test(statement)) rawControls.add('Pressable');
    if (/\bTouchableOpacity\b/.test(statement)) rawControls.add('TouchableOpacity');
  }
  if (!rawControls.size) return [];
  const controls = [...rawControls].join(' and ');
  return [
    `${relativeFile}: import app-owned ${controls} from src/ui/HapticPressable so enabled controls acknowledge taps`,
  ];
}

export function findActionRuntimeBoundaryViolations(relativeFile, text, manifest) {
  const findings = [];
  for (const operation of manifest?.operations ?? []) {
    if (relativeFile === operation.actionModule) continue;
    const protectedFile = (operation.protectedFiles ?? [])
      .find((candidate) => candidate.path === relativeFile);
    if (!protectedFile) continue;
    for (const rule of protectedFile.forbiddenPatterns ?? []) {
      let pattern;
      try {
        pattern = new RegExp(rule.pattern, 'u');
      } catch {
        findings.push(`${relativeFile}: ${operation.id}: invalid action-boundary pattern ${rule.pattern}`);
        continue;
      }
      if (pattern.test(text)) {
        findings.push(`${relativeFile}: ${operation.id}: ${rule.message}`);
      }
    }
  }
  return findings;
}
