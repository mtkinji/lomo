import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const cues = [
  ['current_lookup_01', 'current_lookup', 'current-lookup-01.mp3', 'Checking the latest.', 'attentive_progress'],
  ['current_lookup_02', 'current_lookup', 'current-lookup-02.mp3', 'Looking that up now.', 'attentive_progress'],
  ['current_lookup_03', 'current_lookup', 'current-lookup-03.mp3', 'Getting the current details.', 'attentive_progress'],
  ['kwilt_lookup_01', 'kwilt_lookup', 'kwilt-lookup-01.mp3', 'Checking what’s in Kwilt.', 'attentive_progress'],
  ['kwilt_lookup_02', 'kwilt_lookup', 'kwilt-lookup-02.mp3', 'Looking in Kwilt now.', 'attentive_progress'],
  ['kwilt_lookup_03', 'kwilt_lookup', 'kwilt-lookup-03.mp3', 'Pulling up the details.', 'attentive_progress'],
  ['multi_source_01', 'multi_source', 'multi-source-01.mp3', 'Checking a few things.', 'attentive_progress'],
  ['multi_source_02', 'multi_source', 'multi-source-02.mp3', 'Putting that together.', 'attentive_progress'],
  ['multi_source_03', 'multi_source', 'multi-source-03.mp3', 'Looking across the details.', 'attentive_progress'],
  ['prepare_review_01', 'prepare_review', 'prepare-review-01.mp3', 'Preparing that for review.', 'attentive_progress'],
  ['prepare_review_02', 'prepare_review', 'prepare-review-02.mp3', 'Getting that ready.', 'attentive_progress'],
  ['prepare_review_03', 'prepare_review', 'prepare-review-03.mp3', 'Preparing the proposed change.', 'attentive_progress'],
  ['compare_or_calculate_01', 'compare_or_calculate', 'compare-calculate-01.mp3', 'Working that out.', 'attentive_progress'],
  ['compare_or_calculate_02', 'compare_or_calculate', 'compare-calculate-02.mp3', 'Comparing those now.', 'attentive_progress'],
  ['compare_or_calculate_03', 'compare_or_calculate', 'compare-calculate-03.mp3', 'Checking how those compare.', 'attentive_progress'],
  ['thoughtful_reasoning_01', 'thoughtful_reasoning', 'thoughtful-reasoning-01.mp3', 'Hmm. Let me think that through.', 'thoughtful_progress'],
  ['thoughtful_reasoning_02', 'thoughtful_reasoning', 'thoughtful-reasoning-02.mp3', 'That needs a little thought.', 'thoughtful_progress'],
  ['thoughtful_reasoning_03', 'thoughtful_reasoning', 'thoughtful-reasoning-03.mp3', 'Let me work through that.', 'thoughtful_progress'],
  ['retry_or_recover_01', 'retry_or_recover', 'retry-recover-01.mp3', 'Trying that again.', 'attentive_progress'],
  ['retry_or_recover_02', 'retry_or_recover', 'retry-recover-02.mp3', 'Taking another pass.', 'attentive_progress'],
  ['retry_or_recover_03', 'retry_or_recover', 'retry-recover-03.mp3', 'Giving that another try.', 'attentive_progress'],
  ['general_work_01', 'general_work', 'general-work-01.mp3', 'Working on that.', 'attentive_progress'],
  ['general_work_02', 'general_work', 'general-work-02.mp3', 'Taking a closer look.', 'attentive_progress'],
  ['general_work_03', 'general_work', 'general-work-03.mp3', 'Getting that together.', 'attentive_progress'],
];

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY?.trim();
const accessToken = process.env.KWILT_AUDIO_GENERATOR_ACCESS_TOKEN?.trim();
if (!supabaseUrl || !publishableKey || !accessToken) {
  throw new Error('Set SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, and KWILT_AUDIO_GENERATOR_ACCESS_TOKEN.');
}

const outputDirectory = path.resolve('assets/audio/conversation');
await mkdir(outputDirectory, { recursive: true });
const manifest = [];

for (const [id, family, filename, phrase, styleId] of cues) {
  const response = await fetch(`${supabaseUrl}/functions/v1/cook-voice-speech`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: publishableKey,
      'Content-Type': 'application/json',
      'x-kwilt-client': 'conversation-audio-generator',
    },
    body: JSON.stringify({ text: phrase, styleId }),
  });
  if (!response.ok) throw new Error(`Speech generation failed for ${id} (${response.status}).`);
  const payload = await response.json();
  if (typeof payload.audioBase64 !== 'string') throw new Error(`Speech generation returned no audio for ${id}.`);
  const audio = Buffer.from(payload.audioBase64, 'base64');
  if (!audio.length) throw new Error(`Speech generation returned empty audio for ${id}.`);
  const destination = path.join(outputDirectory, filename);
  await writeFile(destination, audio);
  let durationMs = null;
  try {
    durationMs = Math.round(Number(execFileSync('ffprobe', [
      '-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', destination,
    ], { encoding: 'utf8' }).trim()) * 1000);
  } catch {
    try {
      const output = execFileSync('afinfo', [destination], { encoding: 'utf8' });
      const seconds = /estimated duration:\s*([\d.]+)\s*sec/i.exec(output)?.[1];
      durationMs = seconds ? Math.round(Number(seconds) * 1000) : null;
    } catch {
      // Duration remains explicit-but-unknown when neither probe is available.
    }
  }
  if (durationMs === null || durationMs > 3_000) {
    throw new Error(`Conversation cue ${id} has an invalid ${durationMs ?? 'unknown'} ms duration.`);
  }
  manifest.push({
    id,
    family,
    phrase,
    filename,
    model: 'gpt-4o-mini-tts',
    voice: 'marin',
    styleId,
    byteLength: audio.length,
    durationMs,
    sha256: createHash('sha256').update(audio).digest('hex'),
  });
}

const totalBytes = manifest.reduce((sum, cue) => sum + cue.byteLength, 0);
if (totalBytes > 1_500_000) throw new Error(`Conversation cue library is ${totalBytes} bytes; limit is 1500000.`);
await writeFile(
  path.join(outputDirectory, 'manifest.json'),
  `${JSON.stringify({ model: 'gpt-4o-mini-tts', voice: 'marin', totalBytes, cues: manifest }, null, 2)}\n`,
);
console.log(`Generated ${manifest.length} reviewed conversation clips (${totalBytes} bytes).`);
