import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { canonicalRecipeHash, loadCanonicalCatalog } from './catalog.mjs';

const AMBIGUOUS_COMPLETION = /\buntil\s+(?:done|ready|cooked(?:\s+through)?)\b/i;
const TECHNIQUE_CUE = /^(?:(?:then|next|meanwhile),?\s+)?(?:bake|roast|broil|grill|fry|cook|simmer|boil|steam|poach|sear|saut[eé]|proof|chill|freeze|refrigerate)\b|(?:[;,]\s+|\band\s+)(?:then\s+)?(?:bake|roast|broil|grill|fry|cook|simmer|boil|steam|poach|sear|saut[eé]|proof|chill|freeze|refrigerate)\b/i;
const COOKING_HAS_STARTED = /\b(?:heat|preheat|bake|roast|broil|grill|fry|cook|simmer|boil|steam|poach|sear|saut[eé])\b/i;
const TIME_OR_TEMPERATURE = /\b(?:\d+(?:\s+to\s+\d+)?\s*(?:seconds?|minutes?|hours?)|\d+\s*°?F|\d+\s*degrees?|according to (?:the )?package)\b/i;
const DONENESS_CUE = /\b(?:golden|browned?|tender|crisp|opaque|set|soft|creamy|thick(?:ened)?|fragrant|aromatic|bubbl(?:e|es|ing)|clean toothpick|springs? back|probe-tender|internal temperature|(?:to|reaches?) \d+\s*°?F|coats? (?:a |the )?spoon|reduced by|doubled|puffy|jiggly|charred|translucent|softened|firm center|dry to the touch|according to (?:the )?package)\b/i;
const LATE_PREPARATION = /^(?:meanwhile,?\s+)?(?:chop|dice|slice|mince|peel|grate|shred|trim|pit|core)\b/i;

function instructionCues(text) {
  const cues = text.trim().split(/(?<=[.!?])\s+(?=["“‘']?[A-Z0-9])/)
    .map((cue) => cue.trim()).filter(Boolean);
  return cues.length ? cues : [text.trim()];
}

function normalized(value) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase();
}

function phraseOccurrences(value, phrase) {
  if (!phrase) return 0;
  let count = 0;
  let cursor = 0;
  while (cursor <= value.length - phrase.length) {
    const index = value.indexOf(phrase, cursor);
    if (index < 0) break;
    count += 1;
    cursor = index + phrase.length;
  }
  return count;
}

function finding(code, severity, instructionIndex, message, evidence) {
  return { code, severity, instructionIndex, message, evidence };
}

export function auditRecipeInstructions(recipe, options = {}) {
  const findings = [];
  const seen = new Map();
  let priorCookingAction = false;
  let cueCount = 0;

  recipe.instructions.forEach((instruction, instructionIndex) => {
    const text = instruction.trim();
    const cues = instructionCues(text);
    const techniqueCues = cues.filter((cue) => TECHNIQUE_CUE.test(cue));
    const words = text ? text.split(/\s+/).length : 0;
    cueCount += cues.length;

    if (!text) {
      findings.push(finding(
        'blank-step', 'blocking', instructionIndex,
        'Instruction steps must not be blank.', instruction,
      ));
      return;
    }

    const key = normalized(text);
    if (seen.has(key)) {
      findings.push(finding(
        'duplicate-step', 'blocking', instructionIndex,
        `Instruction duplicates step ${seen.get(key) + 1}.`, text,
      ));
    } else seen.set(key, instructionIndex);

    if (AMBIGUOUS_COMPLETION.test(text) && !DONENESS_CUE.test(text)) {
      findings.push(finding(
        'ambiguous-completion', 'blocking', instructionIndex,
        'Replace generic completion language with an observable or measured endpoint.', text,
      ));
    }

    if (words > 60 || cues.length > 4) {
      findings.push(finding(
        'dense-phase', 'warning', instructionIndex,
        `Phase contains ${words} words and ${cues.length} inferred cues.`, text,
      ));
    }

    if (priorCookingAction && LATE_PREPARATION.test(text)) {
      findings.push(finding(
        'late-preparation', 'warning', instructionIndex,
        'Ingredient preparation begins after cooking has started; confirm this timing is intentional.', text,
      ));
    }

    if (techniqueCues.length && !TIME_OR_TEMPERATURE.test(text)) {
        findings.push(finding(
          'missing-technique-time-or-temperature', 'warning', instructionIndex,
          'Technique phase has no explicit time or temperature.', text,
        ));
    }
    if (techniqueCues.length && !DONENESS_CUE.test(text)) {
        findings.push(finding(
          'missing-doneness-cue', 'warning', instructionIndex,
          'Technique phase has no observable doneness cue.', text,
        ));
    }
    if (COOKING_HAS_STARTED.test(text)) priorCookingAction = true;
  });

  for (const annotation of options.enrichment?.equipmentAnnotations ?? []) {
    const instruction = recipe.instructions[annotation.instructionIndex];
    if (instruction === undefined || phraseOccurrences(instruction, annotation.phrase) !== 1) {
      findings.push(finding(
        'broken-equipment-phrase', 'blocking', annotation.instructionIndex,
        `Equipment annotation ${annotation.needId} no longer quotes one exact instruction phrase.`,
        annotation.phrase,
      ));
    }
  }

  findings.sort((left, right) => (
    (left.instructionIndex ?? Number.MAX_SAFE_INTEGER) - (right.instructionIndex ?? Number.MAX_SAFE_INTEGER)
    || left.code.localeCompare(right.code)
  ));
  const blockingFindings = findings.filter(({ severity }) => severity === 'blocking');
  const warnings = findings.filter(({ severity }) => severity === 'warning');
  return {
    rosterId: recipe.rosterId,
    sourceRecipeHash: canonicalRecipeHash(recipe),
    title: recipe.title,
    phaseCount: recipe.instructions.length,
    cueCount,
    blockingFindings,
    warnings,
    researchEvidence: {
      sourceCount: recipe.research?.sources?.length ?? 0,
      nonNegotiableTechniqueCount: recipe.research?.nonNegotiableTechniques?.length ?? 0,
      successSignalCount: recipe.research?.repeatedSuccessSignals?.length ?? 0,
      failureRiskCount: recipe.research?.repeatedFailureRisks?.length ?? 0,
    },
  };
}

export function buildInstructionAuditReport(catalog, options = {}) {
  const enrichmentByRosterId = options.enrichmentByRosterId ?? new Map();
  const recipes = [...catalog]
    .sort((left, right) => left.rosterId.localeCompare(right.rosterId))
    .map((recipe) => auditRecipeInstructions(recipe, {
      enrichment: enrichmentByRosterId.get(recipe.rosterId) ?? null,
    }));
  const allBlocking = recipes.flatMap(({ blockingFindings }) => blockingFindings);
  const allWarnings = recipes.flatMap(({ warnings }) => warnings);
  const countCodes = (rows) => Object.fromEntries([...rows.reduce((counts, row) => {
    counts.set(row.code, (counts.get(row.code) ?? 0) + 1);
    return counts;
  }, new Map())].sort(([left], [right]) => left.localeCompare(right)));
  return {
    schemaVersion: 1,
    summary: {
      totalRecipes: recipes.length,
      representedRecipes: new Set(recipes.map(({ rosterId }) => rosterId)).size,
      recipesWithBlockingFindings: recipes.filter(({ blockingFindings }) => blockingFindings.length).length,
      recipesWithWarnings: recipes.filter(({ warnings }) => warnings.length).length,
      blockingFindings: allBlocking.length,
      warnings: allWarnings.length,
      blockingByCode: countCodes(allBlocking),
      warningsByCode: countCodes(allWarnings),
    },
    recipes,
  };
}

async function runCli() {
  const kwiltRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const catalog = await loadCanonicalCatalog(kwiltRoot);
  const seed = JSON.parse(await readFile(
    path.join(kwiltRoot, 'src/capabilities/recipes/data/recipeEditorialEnrichment.seed.json'),
    'utf8',
  ));
  const report = buildInstructionAuditReport(catalog, {
    enrichmentByRosterId: new Map(seed.recipes.map((record) => [record.rosterId, record])),
  });
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  if (process.argv.includes('--fail-on-blocking') && report.summary.blockingFindings > 0) {
    process.exitCode = 1;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  await runCli();
}
