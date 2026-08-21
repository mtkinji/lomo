import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { rosterIdsFromEnv } from './pipeline.mjs';

function requiredEnv(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function escape(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

async function list(status) {
  const operationToken = process.env.KWILT_RECIPE_IMAGE_OPERATION_TOKEN?.trim();
  const accessToken = process.env.KWILT_RECIPE_IMAGE_ADMIN_TOKEN?.trim();
  const response = await fetch(`${requiredEnv('SUPABASE_URL').replace(/\/$/, '')}/functions/v1/recipe-image-admin`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(operationToken ? { 'x-kwilt-operation-token': operationToken } : { Authorization: `Bearer ${accessToken}` }),
    },
    body: JSON.stringify({
      action: 'list',
      status,
      limit: 250,
      rosterIds: selectedRosterIds ? [...selectedRosterIds] : undefined,
      promptVersion: selectedPromptVersion ?? undefined,
    }),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload?.error || `Could not list ${status} jobs.`);
  return payload.jobs ?? [];
}

const selectedRosterIds = rosterIdsFromEnv(process.env.KWILT_RECIPE_IMAGE_ROSTER_IDS);
const selectedPromptVersion = process.env.KWILT_RECIPE_IMAGE_PROMPT_VERSION?.trim() || null;
const selectedStatuses = (process.env.KWILT_RECIPE_IMAGE_REVIEW_STATUSES ?? 'editorial_review,rejected,published')
  .split(',').map((status) => status.trim()).filter(Boolean);
const selectedCreatedAfter = process.env.KWILT_RECIPE_IMAGE_CREATED_AFTER?.trim()
  ? new Date(process.env.KWILT_RECIPE_IMAGE_CREATED_AFTER)
  : null;
if (selectedCreatedAfter && Number.isNaN(selectedCreatedAfter.getTime())) {
  throw new Error('KWILT_RECIPE_IMAGE_CREATED_AFTER must be an ISO timestamp.');
}
const jobs = (await Promise.all(selectedStatuses.map((status) => list(status)))).flat()
  .filter((job) => !selectedRosterIds || selectedRosterIds.has(job.roster_id))
  .filter((job) => !selectedPromptVersion || job.prompt_version === selectedPromptVersion)
  .filter((job) => !selectedCreatedAfter || new Date(job.created_at) >= selectedCreatedAfter)
  .sort((left, right) => `${left.roster_id}:${left.candidate_index}`.localeCompare(`${right.roster_id}:${right.candidate_index}`));
const cards = jobs.map((job) => `
  <article class="card ${escape(job.status)}">
    <div class="crop"><img src="${escape(job.media?.storage_ref)}" alt="${escape(job.media?.alt_text)}"></div>
    <div class="square"><img src="${escape(job.media?.storage_ref)}" alt=""></div>
    <h2>${escape(job.roster_id)} · candidate ${escape(Number(job.candidate_index) + 1)}</h2>
    <p class="status">${escape(job.status)}</p>
    <p>${escape(job.qa_result?.summary ?? job.rejection_reasons?.join('; '))}</p>
    <dl><dt>Identity</dt><dd>${escape(job.qa_result?.identityScore)}</dd><dt>Ingredients</dt><dd>${escape(job.qa_result?.ingredientFidelityScore)}</dd><dt>Structure</dt><dd>${escape(job.qa_result?.structureScore)}</dd><dt>Crop</dt><dd>${escape(job.qa_result?.cropScore)}</dd><dt>Artifacts</dt><dd>${escape(job.qa_result?.artifactScore)}</dd></dl>
    <p class="job">${escape(job.id)}</p>
  </article>`).join('');
const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>Kwilt Recipe Image Review</title><style>
  :root{font-family:ui-sans-serif,system-ui;background:#f4f1ea;color:#171713}body{margin:0;padding:32px}header{max-width:900px;margin:0 auto 32px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:24px}.card{background:#fff;border-radius:20px;padding:14px;box-shadow:0 8px 32px #302b1f14}.crop{aspect-ratio:3/2;overflow:hidden;border-radius:13px}.square{width:92px;aspect-ratio:1;overflow:hidden;border:3px solid white;border-radius:12px;margin:-52px 12px 12px auto;position:relative;box-shadow:0 5px 16px #0002}.crop img,.square img{width:100%;height:100%;object-fit:cover}h2{font-size:18px;margin:8px 2px}.status{text-transform:uppercase;letter-spacing:.08em;font-size:11px;font-weight:700}.rejected{opacity:.66}.published{outline:3px solid #588157}dl{display:grid;grid-template-columns:1fr auto;margin:12px 2px}dt,dd{border-bottom:1px solid #eee;padding:5px 0}.job{font:11px ui-monospace,monospace;color:#777;overflow-wrap:anywhere}
  @media print{body{padding:0}.grid{grid-template-columns:repeat(3,1fr);gap:10px}.card{break-inside:avoid;box-shadow:none;border:1px solid #ddd}}
</style></head><body><header><h1>Kwilt Recipe Image Review</h1><p>${jobs.length} candidates. Automation has filtered obvious failures; publication still requires the five human checks.</p></header><main class="grid">${cards}</main></body></html>`;
const output = path.resolve(process.argv[2] || 'artifacts/recipe-images/review.html');
await mkdir(path.dirname(output), { recursive: true });
await writeFile(output, html, 'utf8');
console.log(output);
