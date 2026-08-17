#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const ALLOWED_BUNDLED_KEYS = new Set(['deep-work-drift', 'canyon-spring']);
const SOUNDSCAPE_IDS = new Set([
  'default',
  'focusFlowState',
  'midnightStudySession',
  'copacabanaFocus',
  'openRoadFocus',
  'cedarWorkshop',
  'rainlitLibrary',
  'quietRain',
  'canyonSpring',
  'oceanWaves',
  'fireplace',
]);

export function validateSoundscapeLoopContract(admissions) {
  if (!Array.isArray(admissions)) return ['loop admission must be an array'];
  const failures = [];
  const ids = new Set();
  const keys = new Set();

  for (const item of admissions) {
    const id = typeof item?.id === 'string' ? item.id : '<missing>';
    const assetKey = typeof item?.assetKey === 'string' ? item.assetKey : '<missing>';
    if (!SOUNDSCAPE_IDS.has(id)) failures.push(`${id}: unknown soundscape id`);
    if (ids.has(id)) failures.push(`duplicate soundscape id: ${id}`);
    if (keys.has(assetKey)) failures.push(`duplicate loop asset key: ${assetKey}`);
    if (!/^[a-z0-9][a-z0-9-]+$/.test(assetKey)) failures.push(`${id}: invalid loop asset key`);
    if (item?.loopPlayback !== 'seamless') failures.push(`${id}: not admitted for seamless looping`);
    if (item?.sampleRateHz !== 48_000 || item?.channels !== 2) {
      failures.push(`${id}: expected 48 kHz stereo`);
    }
    if (item?.source?.kind === 'remote') {
      if (!/^focus\.[a-z0-9-]+$/.test(item.source.id)) {
        failures.push(`${id}: malformed remote asset id`);
      }
    } else if (item?.source?.kind === 'bundled') {
      if (!ALLOWED_BUNDLED_KEYS.has(item.source.key)) {
        failures.push(`${id}: unknown bundled asset key`);
      }
    } else {
      failures.push(`${id}: unknown source kind`);
    }
    ids.add(id);
    keys.add(assetKey);
  }

  for (const id of SOUNDSCAPE_IDS) {
    if (!ids.has(id)) failures.push(`${id}: missing loop admission`);
  }
  return failures;
}

function runCli() {
  const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
  const admissionPath = path.join(repoRoot, 'assets/audio/SOUNDSCAPE_LOOP_ADMISSION.json');
  const admissions = JSON.parse(fs.readFileSync(admissionPath, 'utf8'));
  const failures = validateSoundscapeLoopContract(admissions);
  if (failures.length) {
    failures.forEach((failure) => console.error(`FAIL ${failure}`));
    process.exitCode = 1;
    return;
  }
  console.log(`PASS ${admissions.length} admitted Focus soundscapes`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) runCli();
