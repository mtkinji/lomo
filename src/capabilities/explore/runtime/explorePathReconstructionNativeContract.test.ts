import fs from 'fs';
import path from 'path';

describe('Explore path reconstruction native contract', () => {
  const moduleRoot = path.resolve(process.cwd(), 'modules/kwilt-route-reconstruction');

  it('uses bounded Apple directions without mutating the raw recording', () => {
    const index = fs.readFileSync(path.join(moduleRoot, 'index.ts'), 'utf8');
    const swift = fs.readFileSync(path.join(moduleRoot, 'ios/KwiltRouteReconstructionModule.swift'), 'utf8');

    expect(index).toContain("requireOptionalNativeModule<KwiltRouteReconstructionNativeModule>('KwiltRouteReconstruction')");
    expect(index).toContain('routeBetween');
    expect(swift).toContain('MKDirections.Request()');
    expect(swift).toContain('requestsAlternateRoutes = false');
    expect(swift).toContain('route.polyline.points()');
    expect(swift).toContain('GenericException<String>, @unchecked Sendable');
    expect(swift).not.toContain('CLLocationManager');
  });
});
