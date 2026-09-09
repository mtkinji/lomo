import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

// Execute the production map insertion method against a Foundation-only map
// double. This exercises native ordering without requiring React or Simulator.
test('path outline refreshes stay below the color layer', {
  skip: process.platform !== 'darwin',
}, () => {
  const source = readFileSync(new URL('../../node_modules/react-native-maps/ios/AirMaps/AIRMap.m', import.meta.url), 'utf8');
  const signature = '- (void)addOverlay:(id<MKOverlay>)overlay';
  const start = source.indexOf(signature);
  let method = '';
  if (start >= 0) {
    let end = source.indexOf('{', start), depth = 1;
    for (++end; depth; ++end) {
      if (source[end] === '{') ++depth;
      if (source[end] === '}') --depth;
    }
    method = source.slice(start, end);
  }
  const directory = mkdtempSync(path.join(tmpdir(), 'kwilt-map-order-'));
  try {
    const file = path.join(directory, 'main.m');
    const binary = path.join(directory, 'probe');
    writeFileSync(file, `
#import <Foundation/Foundation.h>
@protocol MKOverlay <NSObject> @end
@interface AIRMapPolyline : NSObject <MKOverlay>
@property NSInteger zIndex;
@end
@implementation AIRMapPolyline @end
@interface AIRMapHistoryOverlay : NSObject <MKOverlay> @end
@implementation AIRMapHistoryOverlay @end
@interface TestMap : NSObject
@property NSMutableArray *overlays;
- (void)addOverlay:(id<MKOverlay>)overlay;
- (void)insertOverlay:(id<MKOverlay>)overlay belowOverlay:(id<MKOverlay>)other;
@end
@implementation TestMap
- (instancetype)init { if ((self = [super init])) _overlays = [NSMutableArray new]; return self; }
- (void)addOverlay:(id<MKOverlay>)overlay { [_overlays addObject:overlay]; }
- (void)insertOverlay:(id<MKOverlay>)overlay belowOverlay:(id<MKOverlay>)other { [_overlays insertObject:overlay atIndex:[_overlays indexOfObject:other]]; }
@end
@interface AIRMap : TestMap @end
@implementation AIRMap
${method}
@end
int main() { @autoreleasepool {
  AIRMap *map = [AIRMap new];
  AIRMapPolyline *outline = [AIRMapPolyline new]; outline.zIndex = 1;
  AIRMapPolyline *color = [AIRMapPolyline new]; color.zIndex = 2;
  [map addOverlay:outline]; [map addOverlay:color];
  AIRMapHistoryOverlay *history = [AIRMapHistoryOverlay new];
  [map addOverlay:history];
  if (map.overlays.firstObject != history) return 4;
  // AIRMapPolyline.update removes and re-adds an overlay after prop changes.
  for (int i = 0; i < 20; ++i) {
    [map.overlays removeObject:history]; [map addOverlay:history];
    if (map.overlays.firstObject != history) return 5;
    [map.overlays removeObject:outline]; [map addOverlay:outline];
    if ([map.overlays indexOfObject:outline] >= [map.overlays indexOfObject:color]) return 1;
    [map.overlays removeObject:color]; [map addOverlay:color];
    if ([map.overlays indexOfObject:outline] >= [map.overlays indexOfObject:color]) return 2;
  }
  // New outlines arriving after existing colors have the same guarantee.
  AIRMapPolyline *laterOutline = [AIRMapPolyline new]; laterOutline.zIndex = 1;
  [map addOverlay:laterOutline];
  if ([map.overlays indexOfObject:laterOutline] >= [map.overlays indexOfObject:color]) return 3;
  puts("PASS stable path layering");
} }
`);
    execFileSync('xcrun', ['clang', '-fobjc-arc', '-framework', 'Foundation', file, '-o', binary]);
    assert.match(execFileSync(binary, {encoding:'utf8'}), /PASS stable path layering/);
  } finally { rmSync(directory, {recursive:true, force:true}); }
});
