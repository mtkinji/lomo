import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {mkdtempSync, writeFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import test from 'node:test';
test('heat counts outings, preserves gaps, and saturates within the same line footprint', {skip: process.platform !== 'darwin'}, () => {
 const dir=mkdtempSync(path.join(tmpdir(),'kwilt-heat-'));
 try {
  const file=path.join(dir,'heat.m'), binary=path.join(dir,'heat');
  writeFileSync(file, `
#import <Foundation/Foundation.h>
#import "${path.resolve('node_modules/react-native-maps/ios/AirMaps/AIRMapHistoryDrawing.h')}"
static void draw(unsigned char *pixels, int visits, int copies, int scale) {
 int n=128*scale; CGColorSpaceRef space=CGColorSpaceCreateDeviceRGB();
 CGContextRef c=CGBitmapContextCreate(pixels,n,n,8,n*4,space,(CGBitmapInfo)kCGImageAlphaPremultipliedLast);
 CGContextScaleCTM(c,scale,scale);
 CGMutablePathRef p=CGPathCreateMutable();
 for(int copy=0;copy<copies;copy++) {
  CGPathMoveToPoint(p,NULL,20,40);CGPathAddLineToPoint(p,NULL,60,40);CGPathAddLineToPoint(p,NULL,60,70);
  CGPathMoveToPoint(p,NULL,85,40);CGPathAddLineToPoint(p,NULL,110,40);
 }
 CGPathRef paths[100];for(int i=0;i<visits;i++) paths[i]=p;
 CGFloat rgb[]={.298,.655,.498,1};CGColorRef color=CGColorCreate(space,rgb);
 AIRMapDrawHistoryHeat(c,p,paths,visits,4,color,.94);
 CGColorRelease(color);CGPathRelease(p);CGContextRelease(c);CGColorSpaceRelease(space);
}
int main(){
 for(int scale=1;scale<=2;scale++) {
 int n=128*scale;size_t bytes=n*n*4;
 unsigned char *one=calloc(bytes,1),*duplicates=calloc(bytes,1),*four=calloc(bytes,1),*many=calloc(bytes,1);
 draw(one,1,1,scale);draw(duplicates,1,20,scale);draw(four,4,1,scale);draw(many,100,1,scale);
 for(size_t i=0;i<bytes;i++)if(abs(one[i]-duplicates[i])>1)return 1;
 int core=((n-1-40*scale)*n+40*scale)*4;
 if(!(one[core]<four[core] && four[core]<many[core]))return 2;
 if(one[core+3]<230 || abs(one[core+3]-many[core+3])>1)return 3;
 int gap=((n-1-40*scale)*n+75*scale)*4+3;
 if(one[gap]!=0 || many[gap]!=0)return 4;
 int outside=((n-1-35*scale)*n+40*scale)*4+3;
 if(many[outside]!=0)return 5;
 free(one);free(duplicates);free(four);free(many);
 }
 puts("PASS outing heat and contrast");
}
`);
  execFileSync('xcrun',['clang','-fobjc-arc','-framework','Foundation','-framework','CoreGraphics',file,'-o',binary]);
  assert.match(execFileSync(binary,{encoding:'utf8'}),/PASS outing heat and contrast/);
 }finally{rmSync(dir,{recursive:true,force:true});}
});
