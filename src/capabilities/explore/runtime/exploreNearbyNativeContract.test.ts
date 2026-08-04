import fs from 'fs';
import path from 'path';

describe('Explore nearby native search contract', () => {
  const moduleRoot = path.resolve(process.cwd(), 'modules/kwilt-place-search');

  it('provides one optional, read-only Expo module backed by bounded MapKit POI search', () => {
    const index = fs.readFileSync(path.join(moduleRoot, 'index.ts'), 'utf8');
    const swift = fs.readFileSync(path.join(moduleRoot, 'ios/KwiltPlaceSearchModule.swift'), 'utf8');

    expect(index).toContain("requireOptionalNativeModule<KwiltPlaceSearchNativeModule>('KwiltPlaceSearch')");
    expect(index).toContain('searchNearby');
    expect(swift).toContain('MKLocalPointsOfInterestRequest');
    expect(swift).toContain('MKPointOfInterestFilter');
    expect(swift).toContain('.museum');
    expect(swift).toContain('.park');
    expect(swift).toContain('.campground');
    expect(swift).toContain('1609.344');
    expect(swift).toContain('GenericException<String>, @unchecked Sendable');
    expect(swift).not.toContain('AsyncFunction("save');
    expect(swift).not.toContain('AsyncFunction("createMission');
  });
});
