import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync, existsSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import test from 'node:test';

test('native history coverage has uniform opacity, true gaps, and round screen-point strokes', { skip: process.platform !== 'darwin' }, () => {
  const header = path.resolve('node_modules/react-native-maps/ios/AirMaps/AIRMapHistoryDrawing.h');
  assert.ok(existsSync(header), 'production coverage drawing is required');
  const directory = mkdtempSync(path.join(tmpdir(), 'kwilt-history-raster-'));
  try {
    const file = path.join(directory, 'probe.m');
    const binary = path.join(directory, 'probe');
    writeFileSync(file, `
#import <Foundation/Foundation.h>
#import "${header}"
static CGContextRef bitmap(unsigned char *pixels, int n) {
 CGColorSpaceRef space=CGColorSpaceCreateDeviceRGB();
 CGContextRef c=CGBitmapContextCreate(pixels,n,n,8,n*4,space,(CGBitmapInfo)kCGImageAlphaPremultipliedLast);
 CGColorSpaceRelease(space); return c;
}
int main() { @autoreleasepool {
 for(int scale=1;scale<=2;scale++) for(int zoom=1;zoom<=2;zoom++) {
  int n=128*scale; size_t bytes=n*n*4;
  unsigned char *one=calloc(bytes,1), *many=calloc(bytes,1);
  CGFloat components[]={.37,.49,.33,1};
  CGColorSpaceRef space=CGColorSpaceCreateDeviceRGB();
  CGColorRef color=CGColorCreate(space,components);
  for(int version=0;version<2;version++) {
   CGContextRef c=bitmap(version?many:one,n);
   CGContextScaleCTM(c,scale*zoom,scale*zoom);
   CGMutablePathRef p=CGPathCreateMutable();
   for(int repeat=0;repeat<(version?20:1);repeat++) {
    CGPathMoveToPoint(p,NULL,20.0/zoom,40.0/zoom);
    CGPathAddLineToPoint(p,NULL,60.0/zoom,40.0/zoom);
    CGPathAddLineToPoint(p,NULL,60.0/zoom,70.0/zoom);
    CGPathMoveToPoint(p,NULL,85.0/zoom,40.0/zoom);
    CGPathAddLineToPoint(p,NULL,110.0/zoom,40.0/zoom);
   }
   AIRMapDrawHistoryCoverage(c,p,3.0/zoom,color,.55);
   CGPathRelease(p); CGContextRelease(c);
  }
  for(size_t i=0;i<bytes;i++) if(abs(one[i]-many[i])>1) return 1;
  int center=((n-1-40*scale)*n+40*scale)*4+3;
  if(abs(one[center]-140)>2) { fprintf(stderr,"alpha=%d scale=%d zoom=%d\\n",one[center],scale,zoom); return 2; }
  if(one[((n-1-40*scale)*n+75*scale)*4+3]!=0) return 3;
  if(one[((n-1-35*scale)*n+40*scale)*4+3]!=0) return 4;
  // Round cap extends beyond the exact start, but not beyond half the width.
  if(one[((n-1-40*scale)*n+19*scale)*4+3]==0) return 5;
  if(one[((n-1-40*scale)*n+17*scale)*4+3]!=0) return 6;
  CGColorRelease(color); CGColorSpaceRelease(space); free(one);free(many);
 }
 puts("PASS uniform native coverage");
} }
`);
    execFileSync('xcrun', ['clang', '-fobjc-arc', '-framework', 'Foundation', '-framework', 'CoreGraphics', file, '-o', binary]);
    assert.match(execFileSync(binary, { encoding: 'utf8' }), /PASS uniform native coverage/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

// Compile the actual native width calculation into a Core Graphics pixel probe.
test('foreground gradient uses the requested screen-point width', { skip: process.platform !== 'darwin' }, () => {
  const source = readFileSync('node_modules/react-native-maps/ios/AirMaps/AIRMapPolylineRenderer.m', 'utf8');
  const calculation = source.match(/CGFloat lineWidth = ([^;]+);/)[1].replace('self.lineWidth', 'requestedWidth');
  const directory = mkdtempSync(path.join(tmpdir(), 'kwilt-gradient-width-'));
  try {
    const file = path.join(directory, 'probe.m'), binary = path.join(directory, 'probe');
    writeFileSync(file, `
#import <CoreGraphics/CoreGraphics.h>
#import <stdio.h>
#import <stdlib.h>
#import <math.h>
int main() {
 for(int scale=1;scale<=2;scale++) for(int zoom=1;zoom<=2;zoom++) {
  int n=64*scale; unsigned char *pixels=calloc(n*n*4,1);
  CGColorSpaceRef space=CGColorSpaceCreateDeviceRGB();
  CGContextRef c=CGBitmapContextCreate(pixels,n,n,8,n*4,space,(CGBitmapInfo)kCGImageAlphaPremultipliedLast);
  CGContextScaleCTM(c,scale*zoom,scale*zoom);
  CGFloat requestedWidth=4.5, zoomScale=zoom;
  CGFloat lineWidth=${calculation};
  CGContextSetLineWidth(c,lineWidth); CGContextSetLineCap(c,kCGLineCapRound); CGContextSetLineJoin(c,kCGLineJoinRound);
  CGContextSetRGBStrokeColor(c,0,1,0,1);
  CGContextMoveToPoint(c,10.0/zoom,32.0/zoom); CGContextAddLineToPoint(c,50.0/zoom,32.0/zoom); CGContextStrokePath(c);
  double covered=0; for(int y=0;y<n;y++) covered+=pixels[(y*n+30*scale)*4+3]/255.0;
  if(fabs(covered/scale-requestedWidth)>.15) { fprintf(stderr,"width=%f requested=%f\\n",covered/scale,requestedWidth); return 1; }
  CGContextRelease(c); CGColorSpaceRelease(space); free(pixels);
 }
 puts("PASS gradient width");
}
`);
    execFileSync('xcrun', ['clang', '-framework', 'CoreGraphics', file, '-o', binary]);
    assert.match(execFileSync(binary, { encoding: 'utf8' }), /PASS gradient width/);
  } finally { rmSync(directory, { recursive: true, force: true }); }
});
