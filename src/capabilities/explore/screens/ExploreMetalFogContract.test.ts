import fs from 'node:fs';
import path from 'node:path';

describe('Explore Metal fog integration contract', () => {
  it('measures reveal distance against connected route segments instead of circular point stamps', () => {
    const shaderPatch = fs.readFileSync(
      path.resolve(process.cwd(), 'patches/react-native-maps+1.20.1.patch'),
      'utf8',
    );

    expect(shaderPatch).toContain('float segmentDistance(float2 point, float2 start, float2 end)');
    expect(shaderPatch).toContain('result=min(result,segmentDistance(pixel,points[i],points[i+1]))');
    expect(shaderPatch).toContain('distance(points[i],points[i+1])<=maxJoinDistance');
  });
});
