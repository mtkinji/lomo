#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const docsDir = path.join(repoRoot, "docs");
const jtbdDir = path.join(docsDir, "jtbd");
const personasDir = path.join(docsDir, "personas");
const jobFlowsDir = path.join(docsDir, "job-flows");
const featureBriefsDir = path.join(docsDir, "feature-briefs");
const featuresDir = path.join(repoRoot, "src", "features");

const EXEMPT_FEATURE_DIRS = new Set(["dev"]);
const VALID_FEATURE_STATUS = new Set(["draft", "shipping", "shipped", "sunset"]);
const VALID_BRIEF_STATUS = new Set(["draft", "accepted", "shipped", "retired"]);
const VALID_JTBD_LEVELS = new Set(["top", "mid", "leaf"]);
const VALID_JTBD_CONFIDENCE = new Set(["hypothesis", "validated", "retired"]);
const REQUIRED_JTBD_FIELDS = ["id", "title", "parent", "level", "owner", "last_reviewed", "confidence"];
const REQUIRED_FEATURE_FIELDS = ["feature", "audiences", "personas", "hero_jtbd", "serves", "status", "last_reviewed"];

const errors = [];
const warnings = [];

function walkMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...walkMarkdown(p));
    if (entry.isFile() && entry.name.endsWith(".md")) out.push(p);
  }
  return out;
}

function parseFrontMatter(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { frontMatter: null, body: text };
  try {
    return { frontMatter: yaml.load(match[1]) ?? {}, body: text.slice(match[0].length) };
  } catch (error) {
    return { frontMatter: null, body: text, parseError: error.message };
  }
}

function relPath(filePath) {
  return path.relative(repoRoot, filePath);
}

function asArray(value) {
  if (value === undefined || value === null) return [];
  return Array.isArray(value) ? value : [value];
}

function missingFields(frontMatter, fields) {
  return fields.filter((field) => !(field in frontMatter));
}

function dateIsStale(value) {
  if (!value) return false;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  return Date.now() - date.getTime() > 180 * 24 * 60 * 60 * 1000;
}

function collectJtbds() {
  const byId = new Map();
  const files = walkMarkdown(jtbdDir).filter((file) => {
    const base = path.basename(file);
    return base !== "README.md" && !base.startsWith("_");
  });

  for (const file of files) {
    const { frontMatter, parseError } = parseFrontMatter(file);
    if (parseError) {
      errors.push(`${relPath(file)}: YAML parse error - ${parseError}`);
      continue;
    }
    if (!frontMatter) {
      errors.push(`${relPath(file)}: missing YAML front-matter`);
      continue;
    }
    for (const field of missingFields(frontMatter, REQUIRED_JTBD_FIELDS)) {
      errors.push(`${relPath(file)}: missing required front-matter field \`${field}\``);
    }
    const id = frontMatter.id;
    if (typeof id !== "string" || !id.startsWith("jtbd-")) {
      errors.push(`${relPath(file)}: id \`${id}\` must start with \`jtbd-\``);
    } else if (byId.has(id)) {
      errors.push(`${relPath(file)}: duplicate JTBD id \`${id}\``);
    } else {
      byId.set(id, { file, frontMatter });
    }
    if (frontMatter.level && !VALID_JTBD_LEVELS.has(frontMatter.level)) {
      errors.push(`${relPath(file)}: level \`${frontMatter.level}\` must be one of ${[...VALID_JTBD_LEVELS].join(", ")}`);
    }
    if (frontMatter.confidence && !VALID_JTBD_CONFIDENCE.has(frontMatter.confidence)) {
      errors.push(`${relPath(file)}: confidence \`${frontMatter.confidence}\` must be one of ${[...VALID_JTBD_CONFIDENCE].join(", ")}`);
    }
  }

  for (const { file, frontMatter } of byId.values()) {
    const parent = frontMatter.parent;
    if (parent === null || parent === undefined || parent === "null") continue;
    if (!byId.has(parent)) errors.push(`${relPath(file)}: parent \`${parent}\` does not resolve to a real JTBD id`);
  }

  return byId;
}

function collectAudiences(jtbdById) {
  const byId = new Map();
  const byPersona = new Map();
  const files = walkMarkdown(personasDir).filter((file) => !path.basename(file).startsWith("_"));

  for (const file of files) {
    const { frontMatter, parseError } = parseFrontMatter(file);
    if (parseError) {
      errors.push(`${relPath(file)}: YAML parse error - ${parseError}`);
      continue;
    }
    if (!frontMatter?.id) continue;
    byId.set(frontMatter.id, { file, frontMatter });
    if (frontMatter.representative_persona) {
      byPersona.set(frontMatter.representative_persona, frontMatter.id);
    }
    if (frontMatter.hero_jtbd && !jtbdById.has(frontMatter.hero_jtbd)) {
      errors.push(`${relPath(file)}: hero_jtbd \`${frontMatter.hero_jtbd}\` does not resolve to a real JTBD id`);
    }
  }

  return { byId, byPersona };
}

function collectJobFlows(jtbdById, audiences) {
  const byId = new Map();
  const byAudienceHero = new Map();
  const files = walkMarkdown(jobFlowsDir).filter((file) => !path.basename(file).startsWith("_"));

  for (const file of files) {
    const { frontMatter, parseError } = parseFrontMatter(file);
    if (parseError) {
      errors.push(`${relPath(file)}: YAML parse error - ${parseError}`);
      continue;
    }
    if (!frontMatter?.id) continue;
    byId.set(frontMatter.id, { file, frontMatter });
    byAudienceHero.set(`${frontMatter.audience}:${frontMatter.hero_jtbd}`, frontMatter.id);
    validateAudiencePersonaHero(file, frontMatter, jtbdById, audiences);
  }

  return { byId, byAudienceHero };
}

function validateAudiencePersonaHero(file, frontMatter, jtbdById, audiences) {
  for (const audience of asArray(frontMatter.audiences ?? frontMatter.audience)) {
    if (!audiences.byId.has(audience)) {
      errors.push(`${relPath(file)}: audience \`${audience}\` does not resolve to docs/personas/`);
    }
  }
  for (const persona of asArray(frontMatter.personas ?? frontMatter.persona)) {
    const audience = audiences.byPersona.get(persona);
    if (!audience) {
      errors.push(`${relPath(file)}: persona \`${persona}\` is not a known representative persona`);
      continue;
    }
    const declaredAudiences = asArray(frontMatter.audiences ?? frontMatter.audience);
    if (declaredAudiences.length && !declaredAudiences.includes(audience)) {
      errors.push(`${relPath(file)}: persona \`${persona}\` belongs to \`${audience}\`, not ${declaredAudiences.join(", ")}`);
    }
  }
  if (frontMatter.hero_jtbd && !jtbdById.has(frontMatter.hero_jtbd)) {
    errors.push(`${relPath(file)}: hero_jtbd \`${frontMatter.hero_jtbd}\` does not resolve to a real JTBD id`);
  }
}

function collectFeatureBriefs(jtbdById, audiences, jobFlows) {
  const bySlug = new Map();
  const withFrontMatter = [];
  const files = walkMarkdown(featureBriefsDir).filter((file) => path.basename(file) !== "_AUTHORING.md");

  for (const file of files) {
    const slug = path.basename(file, ".md");
    const parsed = parseFrontMatter(file);
    bySlug.set(slug, { file, slug, ...parsed });
    if (!parsed.frontMatter) continue; // Legacy briefs without front-matter are allowed until touched.
    withFrontMatter.push(slug);
    validateBriefFrontMatter(file, parsed.frontMatter, jtbdById, audiences, jobFlows);
  }

  return { bySlug, withFrontMatter };
}

function validateBriefFrontMatter(file, frontMatter, jtbdById, audiences, jobFlows) {
  for (const field of ["id", "status", "audiences", "personas", "hero_jtbd", "serves"]) {
    if (!(field in frontMatter)) errors.push(`${relPath(file)}: missing required feature brief field \`${field}\``);
  }
  if (frontMatter.id && !String(frontMatter.id).startsWith("brief-")) {
    errors.push(`${relPath(file)}: id \`${frontMatter.id}\` must start with \`brief-\``);
  }
  if (frontMatter.status && !VALID_BRIEF_STATUS.has(frontMatter.status)) {
    errors.push(`${relPath(file)}: status \`${frontMatter.status}\` must be one of ${[...VALID_BRIEF_STATUS].join(", ")}`);
  }
  validateAudiencePersonaHero(file, frontMatter, jtbdById, audiences);
  for (const id of asArray(frontMatter.serves)) {
    if (!jtbdById.has(id)) errors.push(`${relPath(file)}: serves \`${id}\` does not resolve to a real JTBD id`);
  }
  if (frontMatter.job_flow) {
    const flow = jobFlows.byId.get(frontMatter.job_flow);
    if (!flow) {
      errors.push(`${relPath(file)}: job_flow \`${frontMatter.job_flow}\` does not resolve to docs/job-flows/`);
    } else {
      validateJobFlowAgreement(file, frontMatter, flow.frontMatter);
    }
  }
}

function collectFeatures(jtbdById, audiences, jobFlows, featureBriefs) {
  const featureBriefRefs = new Map();
  if (!fs.existsSync(featuresDir)) return featureBriefRefs;

  const entries = fs.readdirSync(featuresDir, { withFileTypes: true }).filter((entry) => entry.isDirectory());
  for (const entry of entries) {
    if (EXEMPT_FEATURE_DIRS.has(entry.name)) continue;
    const manifestPath = path.join(featuresDir, entry.name, "FEATURE.md");
    if (!fs.existsSync(manifestPath)) {
      errors.push(`src/features/${entry.name}: missing FEATURE.md`);
      continue;
    }
    const { frontMatter, parseError } = parseFrontMatter(manifestPath);
    if (parseError) {
      errors.push(`${relPath(manifestPath)}: YAML parse error - ${parseError}`);
      continue;
    }
    if (!frontMatter) {
      errors.push(`${relPath(manifestPath)}: missing YAML front-matter`);
      continue;
    }
    validateFeatureManifest(manifestPath, entry.name, frontMatter, jtbdById, audiences, jobFlows, featureBriefs);
    for (const brief of asArray(frontMatter.briefs)) {
      if (!featureBriefRefs.has(brief)) featureBriefRefs.set(brief, []);
      featureBriefRefs.get(brief).push({ file: manifestPath, frontMatter });
    }
  }

  return featureBriefRefs;
}

function validateFeatureManifest(file, folderName, frontMatter, jtbdById, audiences, jobFlows, featureBriefs) {
  for (const field of missingFields(frontMatter, REQUIRED_FEATURE_FIELDS)) {
    errors.push(`${relPath(file)}: missing required feature field \`${field}\``);
  }
  if (frontMatter.feature !== folderName) {
    errors.push(`${relPath(file)}: feature \`${frontMatter.feature}\` must match folder name \`${folderName}\``);
  }
  if (frontMatter.status && !VALID_FEATURE_STATUS.has(frontMatter.status)) {
    errors.push(`${relPath(file)}: status \`${frontMatter.status}\` must be one of ${[...VALID_FEATURE_STATUS].join(", ")}`);
  }
  if (dateIsStale(frontMatter.last_reviewed)) {
    warnings.push(`${relPath(file)}: last_reviewed \`${frontMatter.last_reviewed}\` is older than 180 days`);
  }
  validateAudiencePersonaHero(file, frontMatter, jtbdById, audiences);
  for (const id of asArray(frontMatter.serves)) {
    if (!jtbdById.has(id)) errors.push(`${relPath(file)}: serves \`${id}\` does not resolve to a real JTBD id`);
  }
  const expectedFlow = jobFlows.byAudienceHero.get(`${asArray(frontMatter.audiences)[0]}:${frontMatter.hero_jtbd}`);
  if (expectedFlow && !frontMatter.job_flow) {
    errors.push(`${relPath(file)}: missing job_flow for ${asArray(frontMatter.audiences)[0]} + ${frontMatter.hero_jtbd}`);
  }
  if (frontMatter.job_flow) {
    const flow = jobFlows.byId.get(frontMatter.job_flow);
    if (!flow) {
      errors.push(`${relPath(file)}: job_flow \`${frontMatter.job_flow}\` does not resolve to docs/job-flows/`);
    } else {
      validateJobFlowAgreement(file, frontMatter, flow.frontMatter);
    }
  }
  for (const brief of asArray(frontMatter.briefs)) {
    if (!featureBriefs.bySlug.has(brief)) {
      errors.push(`${relPath(file)}: brief \`${brief}\` does not resolve to docs/feature-briefs/${brief}.md`);
    }
  }
}

function validateJobFlowAgreement(file, frontMatter, jobFlowFrontMatter) {
  const audiences = asArray(frontMatter.audiences ?? frontMatter.audience);
  const personas = asArray(frontMatter.personas ?? frontMatter.persona);
  if (audiences.length && jobFlowFrontMatter.audience && !audiences.includes(jobFlowFrontMatter.audience)) {
    errors.push(`${relPath(file)}: job_flow audience \`${jobFlowFrontMatter.audience}\` does not match ${audiences.join(", ")}`);
  }
  if (personas.length && jobFlowFrontMatter.persona && !personas.includes(jobFlowFrontMatter.persona)) {
    errors.push(`${relPath(file)}: job_flow persona \`${jobFlowFrontMatter.persona}\` does not match ${personas.join(", ")}`);
  }
  if (frontMatter.hero_jtbd && jobFlowFrontMatter.hero_jtbd && frontMatter.hero_jtbd !== jobFlowFrontMatter.hero_jtbd) {
    errors.push(`${relPath(file)}: job_flow hero_jtbd \`${jobFlowFrontMatter.hero_jtbd}\` does not match \`${frontMatter.hero_jtbd}\``);
  }
}

function validateDrift(featureBriefs, featureBriefRefs) {
  for (const [brief, refs] of featureBriefRefs.entries()) {
    const record = featureBriefs.bySlug.get(brief);
    if (!record?.frontMatter) continue;
    for (const ref of refs) {
      const fields = ["audiences", "personas", "serves"];
      for (const field of fields) {
        const missing = asArray(record.frontMatter[field]).filter((value) => !asArray(ref.frontMatter[field]).includes(value));
        for (const value of missing) {
          errors.push(`${relPath(ref.file)}: referenced brief \`${brief}\` has ${field} value \`${value}\` missing from FEATURE.md`);
        }
      }
      for (const field of ["hero_jtbd", "job_flow"]) {
        if (record.frontMatter[field] && ref.frontMatter[field] && record.frontMatter[field] !== ref.frontMatter[field]) {
          errors.push(`${relPath(ref.file)}: referenced brief \`${brief}\` has ${field} \`${record.frontMatter[field]}\`, but FEATURE.md has \`${ref.frontMatter[field]}\``);
        }
      }
    }
  }
  for (const slug of featureBriefs.withFrontMatter) {
    if (!featureBriefRefs.has(slug)) {
      warnings.push(`docs/feature-briefs/${slug}.md: has front-matter but is not referenced by any FEATURE.md briefs list`);
    }
  }
}

function validateTrailerReferences(jtbdById) {
  const allDocFiles = walkMarkdown(docsDir).filter((file) => {
    if (file.startsWith(jtbdDir + path.sep)) return false;
    if (path.basename(file) === "_AUTHORING.md") return false;
    return true;
  });
  for (const file of allDocFiles) {
    const { body } = parseFrontMatter(file);
    const trailerMatch = body.match(/(?:^|\n)##\s+JTBDs served\b[\s\S]*$/i);
    if (!trailerMatch) continue;
    for (const match of trailerMatch[0].matchAll(/`(jtbd-[a-z0-9-]+)`/g)) {
      if (!jtbdById.has(match[1])) {
        errors.push(`${relPath(file)}: inline reference \`${match[1]}\` in JTBDs-served section does not resolve to a real JTBD id`);
      }
    }
  }
}

const jtbdById = collectJtbds();
const audiences = collectAudiences(jtbdById);
const jobFlows = collectJobFlows(jtbdById, audiences);
const featureBriefs = collectFeatureBriefs(jtbdById, audiences, jobFlows);
const featureBriefRefs = collectFeatures(jtbdById, audiences, jobFlows, featureBriefs);
validateDrift(featureBriefs, featureBriefRefs);
validateTrailerReferences(jtbdById);

console.log("Product lint summary:");
console.log(`  JTBDs found:           ${jtbdById.size}`);
console.log(`  Audiences found:       ${audiences.byId.size}`);
console.log(`  Job flows found:       ${jobFlows.byId.size}`);
console.log(`  Feature briefs found:  ${featureBriefs.bySlug.size}`);
console.log(`  Feature manifests:     ${featureBriefRefs.size ? [...featureBriefRefs.values()].flat().length : 0} brief references`);
console.log(`  Errors:                ${errors.length}`);
console.log(`  Warnings:              ${warnings.length}`);
console.log("");

if (warnings.length) {
  console.log("Warnings:");
  for (const warning of warnings) console.log(`  - ${warning}`);
  console.log("");
}

if (errors.length) {
  console.log("Errors:");
  for (const error of errors) console.log(`  - ${error}`);
  console.log("");
  process.exit(1);
}

console.log("OK - no errors.");
