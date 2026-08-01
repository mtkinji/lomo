import fs from 'node:fs';
import path from 'node:path';

describe('Explore Metal fog integration contract', () => {
  it('measures reveal distance against explicit route segments instead of guessed point adjacency', () => {
    const shaderPatch = fs.readFileSync(
      path.resolve(process.cwd(), 'patches/react-native-maps+1.20.1.patch'),
      'utf8',
    );

    expect(shaderPatch).toContain('float segmentDistance(float2 point, float2 start, float2 end)');
    expect(shaderPatch).toContain('fogSegmentStarts');
    expect(shaderPatch).toContain('fogSegmentEnds');
    expect(shaderPatch).toContain('result=min(result,segmentDistance(pixel,segmentStarts[i],segmentEnds[i]))');
    expect(shaderPatch).not.toContain('distance(points[i],points[i+1])<=maxJoinDistance');
  });

  it('keeps user-created Place familiarity as a bounded partial reveal separate from the exact route', () => {
    const shaderPatch = fs.readFileSync(
      path.resolve(process.cwd(), 'patches/react-native-maps+1.20.1.patch'),
      'utf8',
    );

    expect(shaderPatch).toContain('fogPlaceCoordinates');
    expect(shaderPatch).toContain('placeRevealRadius');
    expect(shaderPatch).toContain('distanceToPlace');
    expect(shaderPatch).toContain('placeAlphaMultiplier');
    expect(shaderPatch).toContain('AIRMapFogMaximumPlaceCount 256');
    expect(shaderPatch).not.toContain('fogTerrainSegmentStarts');
  });
});
