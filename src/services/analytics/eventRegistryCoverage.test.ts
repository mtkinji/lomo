import fs from 'fs';
import path from 'path';
import { AnalyticsEvent } from './events';
import { NON_CLIENT_EVENT_DISPOSITIONS } from './eventDispositions';

function sourceCorpus(directory: string): string {
  if (!fs.existsSync(directory)) return '';
  return fs.readdirSync(directory, { withFileTypes: true }).map((entry) => {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) return sourceCorpus(target);
    if (!/\.(ts|tsx)$/.test(entry.name) || entry.name.includes('.test.') || target.endsWith('events.ts') || target.endsWith('eventDispositions.ts')) return '';
    return fs.readFileSync(target, 'utf8');
  }).join('\n');
}

describe('analytics event registry coverage', () => {
  it('classifies every event with no app or server source reference', () => {
    const corpus = sourceCorpus(path.resolve('src')) + sourceCorpus(path.resolve('supabase/functions'));
    const unclassified = Object.entries(AnalyticsEvent).filter(([key, value]) => (
      !corpus.includes(`AnalyticsEvent.${key}`)
      && !corpus.includes(`'${value}'`)
      && !corpus.includes(`"${value}"`)
      && !NON_CLIENT_EVENT_DISPOSITIONS[value]
    ));
    expect(unclassified).toEqual([]);
  });
});
