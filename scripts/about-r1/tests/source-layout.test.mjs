import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdtempSync,mkdirSync,cpSync,writeFileSync,rmSync} from 'node:fs';
import {resolve} from 'node:path';
import {tmpdir} from 'node:os';
import {aboutRenderedWidth,aboutWideGeometry,aboutMediaCss} from '../../../app/utils/aboutR1LayoutMath.ts';
import {aboutSourceAssets} from '../../../app/data/about-r1-assets.generated.ts';
import {verifyAboutAssets} from '../verify-source.mjs';
const root=resolve(import.meta.dirname,'../../..');
const frozen=JSON.parse(readFileSync(resolve(root,'docs/migration/smd-about-r1/source-manifest.json'),'utf8'));
test('the actual PNG/SVG bytes and 59 text digests match the frozen source',()=>{
  assert.deepEqual(verifyAboutAssets(),{text:59,photos:8,icons:4,sourceAuthority:'PSD_BUILD_SOURCE_V1'});
});
test('asset corruption is rejected without replacement',()=>{
  const tmp=mkdtempSync(resolve(tmpdir(),'smd-about-source-'));
  try {
    mkdirSync(resolve(tmp,'public'),{recursive:true});
    mkdirSync(resolve(tmp,'docs/migration/smd-about-r1'),{recursive:true});
    cpSync(resolve(root,'docs/migration/smd-about-r1/source-manifest.json'),
      resolve(tmp,'docs/migration/smd-about-r1/source-manifest.json'));
    cpSync(resolve(root,'public/about'),resolve(tmp,'public/about'),{recursive:true});
    const file=Object.values(aboutSourceAssets.photos)[0].fileName;
    writeFileSync(resolve(tmp,'public/about',file),'invalid');
    assert.throws(()=>verifyAboutAssets(tmp),/ASSET_BYTES_MISMATCH/);
  } finally {rmSync(tmp,{recursive:true,force:true});}
});
test('wide height is scaled exactly once and caps at the 1920 source',()=>{
  assert.equal(aboutRenderedWidth(1920),1440);
  assert.equal(aboutRenderedWidth(2560),1440);
  assert.equal(aboutRenderedWidth(1440),1080);
  assert.deepEqual(aboutWideGeometry(1920,1650,300),{scale:.75,top:1144.5,height:225});
  assert.equal(aboutWideGeometry(1920,7750,720).top,5719.5);
  for(const n of [0,-1,NaN,Infinity])assert.throws(()=>aboutRenderedWidth(n),/VIEWPORT_INVALID/);
});
test('rendered CSS maps all original PNG corners to the observed PSD transform, including rotation',()=>{
  for(const p of Object.values(aboutSourceAssets.photos)){
    const observed=frozen.assets.photos[p.slotId].sourceTransform;
    const css=aboutMediaCss(p),frame=p.frame,fw=frame[2]-frame[0],fh=frame[3]-frame[1];
    const m=css.imageStyle.transform.slice(7,-1).split(',').map(Number);
    const tx=parseFloat(css.imageStyle.left)/100*fw,ty=parseFloat(css.imageStyle.top)/100*fh;
    const corners=[[0,0],[p.sourceWidth,0],[p.sourceWidth,p.sourceHeight],[0,p.sourceHeight]];
    corners.forEach(([u,v],i)=>{
      const x=frame[0]+m[0]*u+m[2]*v+tx,y=frame[1]+m[1]*u+m[3]*v+ty;
      assert.ok(Math.abs(x-observed[i*2])<1e-8,p.slotId+' corner x');
      assert.ok(Math.abs(y-observed[i*2+1])<1e-8,p.slotId+' corner y');
    });
  }
  assert.notEqual(aboutSourceAssets.photos['about.practice.02.photo'].sourceToFrame[1],0);
});
test('bad or degenerate geometry is rejected',()=>{
  const p=aboutSourceAssets.photos['about.hero.photo'];
  for(const frame of [[0,0,0,2],[NaN,0,2,2]])assert.throws(()=>aboutMediaCss({...p,frame}),/GEOMETRY_INVALID/);
  assert.throws(()=>aboutMediaCss({...p,sourceToFrame:[0,0,0,0,0,0]}),/GEOMETRY_INVALID/);
});
