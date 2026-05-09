#!/usr/bin/env node
// JTBD taxonomy lint (basic v1).
//
// Validates:
//   - Every JTBD file in docs/jtbd/ has required front-matter and a unique id.
//   - Every `parent` reference resolves to a real JTBD id.
//   - Every `serves:` reference in docs/feature-briefs/ front-matter resolves to a real JTBD id.
//   - Every `jtbd-<id>` inline-code reference in docs/feature-briefs/ trailer sections resolves.
//
// Deferred to v2:
//   - Rot detection (hypothesis aging, orphan detection).
//   - Cross-repo lint (kwilt-site, kwilt-desktop) — symlinks expose the same files,
//     so running this from Kwilt covers it for now.
//
// Usage:
//   node scripts/jtbd-lint.mjs
//   npm run jtbd:lint
//
// Exit codes:
//   0 — all checks passed.
//   1 — one or more validation errors.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import yaml from "js-yaml";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const docsDir = path.join(repoRoot, "docs");
const jtbdDir = path.join(docsDir, "jtbd");
const featureBriefsDir = path.join(docsDir, "feature-briefs");

const REQUIRED_JTBD_FIELDS = [
  "id",
  "title",
  "parent",
  "level",
  "owner",
  "last_reviewed",
  "confidence",
];
const VALID_LEVELS = new Set(["top", "mid", "leaf"]);
const VALID_CONFIDENCE = new Set(["hypothesis", "validated", "retired"]);

function walkMarkdown(dir) {
  if (!fs.existsSync(dir)) return [];
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isSymbolicLink()) continue;
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...walkMarkdown(p));
    } else if (entry.isFile() && entry.name.endsWith(".md")) {
      out.push(p);
    }
  }
  return out;
}

function parseFrontMatter(filePath) {
  const text = fs.readFileSync(filePath, "utf8");
  const match = text.match(/^---\n([\s\S]*?)\n---\n?/);
  if (!match) return { frontMatter: null, body: text };
  try {
    const fm = yaml.load(match[1]);
    return { frontMatter: fm, body: text.slice(match[0].length) };
  } catch (e) {
    return { frontMatter: null, body: text, parseError: e.message };
  }
}

function relPath(p) {
  return path.relative(repoRoot, p);
}

const errors = [];
const warnings = [];

// 1) Collect JTBD ids and validate each JTBD file's shape.
const jtbdById = new Map();
const jtbdFiles = walkMarkdown(jtbdDir).filter((p) => {
  const base = path.basename(p);
  if (base === "README.md") return false;
  if (base.startsWith("_")) return false;
  return true;
});

for (const file of jtbdFiles) {
  const { frontMatter, parseError } = parseFrontMatter(file);
  if (parseError) {
    errors.push(`${relPath(file)}: YAML parse error — ${parseError}`);
    continue;
  }
  if (!frontMatter) {
    errors.push(`${relPath(file)}: missing YAML front-matter (every JTBD file must have it)`);
    continue;
  }
  for (const field of REQUIRED_JTBD_FIELDS) {
    if (!(field in frontMatter)) {
      errors.push(`${relPath(file)}: missing required front-matter field \`${field}\``);
    }
  }
  if (frontMatter.id) {
    if (typeof frontMatter.id !== "string" || !frontMatter.id.startsWith("jtbd-")) {
      errors.push(`${relPath(file)}: id \`${frontMatter.id}\` must be a string starting with \`jtbd-\``);
    }
    if (jtbdById.has(frontMatter.id)) {
      errors.push(
        `${relPath(file)}: duplicate id \`${frontMatter.id}\` — also used in ${relPath(jtbdById.get(frontMatter.id).file)}`,
      );
    } else {
      jtbdById.set(frontMatter.id, { file, frontMatter });
    }
  }
  if (frontMatter.level && !VALID_LEVELS.has(frontMatter.level)) {
    errors.push(`${relPath(file)}: level \`${frontMatter.level}\` must be one of: ${[...VALID_LEVELS].join(", ")}`);
  }
  if (frontMatter.confidence && !VALID_CONFIDENCE.has(frontMatter.confidence)) {
    errors.push(
      `${relPath(file)}: confidence \`${frontMatter.confidence}\` must be one of: ${[...VALID_CONFIDENCE].join(", ")}`,
    );
  }
}

// 2) Validate `parent` references resolve.
for (const { file, frontMatter } of jtbdById.values()) {
  if (frontMatter.parent === null || frontMatter.parent === undefined) continue;
  if (frontMatter.parent === "null") continue; // tolerate stringified null
  if (!jtbdById.has(frontMatter.parent)) {
    errors.push(
      `${relPath(file)}: parent \`${frontMatter.parent}\` does not resolve to a real JTBD id`,
    );
  }
}

// 3) Validate `serves:` and "JTBDs served" trailer references resolve.
//    feature briefs in docs/feature-briefs/ are scanned for both front-matter `serves:` and inline trailers.
//    All other docs (e.g. docs/chapters-plan.md, docs/launch/*) are scanned for trailer references only.
const referencedIds = new Set();

const allDocFiles = walkMarkdown(docsDir).filter((p) => {
  if (p.startsWith(jtbdDir + path.sep) || p === jtbdDir) return false; // skip JTBD files themselves
  if (path.basename(p) === "_AUTHORING.md") return false;
  return true;
});

for (const file of allDocFiles) {
  const isPrd = file.startsWith(featureBriefsDir + path.sep);
  const { frontMatter, body } = parseFrontMatter(file);

  // 3a) Front-matter `serves:` — only required/expected on feature briefs.
  if (isPrd && frontMatter && Array.isArray(frontMatter.serves)) {
    for (const id of frontMatter.serves) {
      referencedIds.add(id);
      if (!jtbdById.has(id)) {
        errors.push(`${relPath(file)}: \`serves: ${id}\` does not resolve to a real JTBD id`);
      }
    }
  }

  // 3b) Trailer `## JTBDs served` section — any doc may have one. Inline `jtbd-<id>` refs
  //     INSIDE that section must resolve. Inline refs outside that section are ignored
  //     (prose may legitimately mention old/retired/hypothetical ids).
  const trailerMatch = body.match(/(?:^|\n)##\s+JTBDs served\b[\s\S]*$/i);
  if (trailerMatch) {
    const trailer = trailerMatch[0];
    const inlineMatches = trailer.matchAll(/`(jtbd-[a-z0-9-]+)`/g);
    for (const m of inlineMatches) {
      const id = m[1];
      referencedIds.add(id);
      if (!jtbdById.has(id)) {
        errors.push(`${relPath(file)}: inline reference \`${id}\` in JTBDs-served section does not resolve to a real JTBD id`);
      }
    }
  }
}

// Reassign for the summary print below.
const prdFiles = allDocFiles;

// 4) Surface (info-level) JTBDs that are referenced nowhere — useful but not an error in v1.
const unreferenced = [];
for (const id of jtbdById.keys()) {
  if (!referencedIds.has(id)) unreferenced.push(id);
}

// Output.
const summary = {
  jtbdCount: jtbdById.size,
  docCount: prdFiles.length,
  errors: errors.length,
  warnings: warnings.length,
  unreferenced: unreferenced.length,
};

console.log("JTBD lint summary:");
console.log(`  JTBDs found:     ${summary.jtbdCount}`);
console.log(`  Docs scanned:    ${summary.docCount} (feature briefs + other docs that may carry JTBDs-served trailers)`);
console.log(`  Errors:          ${summary.errors}`);
console.log(`  Warnings:        ${summary.warnings}`);
console.log(`  Unreferenced:    ${summary.unreferenced} (info only — no feature brief references these yet)`);
console.log("");

if (warnings.length) {
  console.log("Warnings:");
  for (const w of warnings) console.log(`  - ${w}`);
  console.log("");
}

if (errors.length) {
  console.log("Errors:");
  for (const e of errors) console.log(`  - ${e}`);
  console.log("");
  process.exit(1);
}

if (unreferenced.length) {
  console.log("Unreferenced JTBDs (no feature brief currently `serves:` these):");
  for (const id of unreferenced) console.log(`  - ${id}`);
  console.log("");
}

console.log("OK — no errors.");
