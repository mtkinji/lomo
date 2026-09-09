import { buildPathPresentation } from './explorePathPresentation';
import { buildRecordedPathTraces } from './exploreGeometry';
import type { ExplorePoint, ExploreSession } from './types';

const points: ExplorePoint[] = Array.from({ length: 4 }, (_, i) => ({
  id: `p${i}`, latitude: 40 + i * 0.00003, longitude: -111,
  recordedAt: new Date(1750000000000 + i * 1000).toISOString(),
  horizontalAccuracyM: 4, altitudeM: 1500, altitudeAccuracyM: 4, speedMps: 4, courseDeg: null,
}));
function session(id: string, overrides: Partial<ExploreSession> = {}): ExploreSession {
  return { id, trackingPolicy: 'adventure', startedAt: points[0].recordedAt,
    endedAt: points[3].recordedAt, points, discoveredPlaceIds: [], recapStatus: 'ready',
    completedReason: 'manual', recapNotificationSentAt: null, backgroundStillnessAnchor: null,
    backgroundStillSince: null, ...overrides };
}
const a = session('a');
const b = session('b');
const input = { sessions: [a, b], activeSession: null, reviewedSessionId: null,
  playbackVisiblePointCount: null, showMyPath: true };

describe('path presentation ownership', () => {
  it('shows completed deliberate history without implying a selected journey', () => {
    expect(buildPathPresentation({ ...input, sessions: [a, session('ambient', { trackingPolicy: 'ambient' }),
      session('unfinished', { endedAt: null })] })).toEqual({ historyGroups: [points], foreground: null });
  });
  it('hides both layers with My Path disabled', () => {
    expect(buildPathPresentation({ ...input, reviewedSessionId: 'a', showMyPath: false }))
      .toEqual({ historyGroups: [], foreground: null });
  });
  it('keeps full review selected and excludes the whole selected session during playback', () => {
    const full = buildPathPresentation({ ...input, reviewedSessionId: 'a' });
    expect(full.foreground?.points).toBe(points);
    const partial = buildPathPresentation({ ...input, reviewedSessionId: 'a', playbackVisiblePointCount: 2 });
    expect(partial.historyGroups).toEqual([b.points]);
    expect(partial.foreground?.points).toEqual(points.slice(0, 2));
    expect(partial.foreground?.recordingEnd).toBeNull();
    expect(full.foreground?.recordingEnd).toBe(points[3]);
  });
  it('gives active recording precedence and ignores playback cutoff', () => {
    const active = session('active', { endedAt: null });
    const result = buildPathPresentation({ ...input, activeSession: active, reviewedSessionId: 'a', playbackVisiblePointCount: 0 });
    expect(result.foreground).toMatchObject({ sessionId: 'active', kind: 'recording', points, recordingEnd: null });
    expect(result.historyGroups).toEqual([a.points, b.points]);
  });
  it('never highlights ambient acquisition or an invalid reviewed id', () => {
    expect(buildPathPresentation({ ...input, activeSession: session('ambient', { trackingPolicy: 'ambient', endedAt: null }),
      reviewedSessionId: 'missing' }).foreground).toBeNull();
  });
  it.each([-10, 0, 2, 100])('clamps review count %s without mutating canonical samples', count => {
    const snapshot = JSON.stringify(input);
    const result = buildPathPresentation({ ...input, reviewedSessionId: 'a', playbackVisiblePointCount: count });
    expect(result.foreground?.points).toHaveLength(Math.max(0, Math.min(4, count)));
    expect(JSON.stringify(input)).toBe(snapshot);
  });
  it('reports an observation outage and an interrupted recording end without connecting the gap', () => {
    const broken = [...points.slice(0, 2), ...points.slice(2).map(p => ({ ...p,
      recordedAt: new Date(Date.parse(p.recordedAt) + 120000).toISOString() }))];
    const result = buildPathPresentation({ ...input, sessions: [session('gap', { points: broken, completedReason: 'interrupted' })], reviewedSessionId: 'gap' });
    expect(result.foreground).toMatchObject({ hasMissingObservations: true, recordingStart: broken[0], recordingEnd: broken[3] });
    expect(buildRecordedPathTraces([result.foreground!.points])).toHaveLength(2);
  });
  it('does not confuse native chunk boundaries with recording gaps', () => {
    const long = Array.from({ length: 1100 }, (_, i) => ({ ...points[0], id: `${i}`,
      latitude: 40 + i * 0.00003, longitude: -111 + (i % 2) * 0.00004,
      speedMps: 10, recordedAt: new Date(1750000000000 + i * 1000).toISOString() }));
    const result = buildPathPresentation({ ...input, sessions: [session('long', { points: long })], reviewedSessionId: 'long' });
    expect(buildRecordedPathTraces([long]).length).toBeGreaterThan(1);
    expect(result.foreground).toMatchObject({ hasMissingObservations: false, recordingStart: long[0], recordingEnd: long[1099] });
  });
});
