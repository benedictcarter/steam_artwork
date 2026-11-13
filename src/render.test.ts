import { beforeAll, describe, expect, it } from 'vitest';
import { setEnv } from 'fabric';
import { getEnv } from 'fabric/node';
import { renderPNG, exportBoards } from './render';
import { makeProjectFile, openProjectFile, unpack } from './files';
import { newProject, imageLayer, type Asset } from './model';

// Use Fabric's supported Node canvas environment to inspect real encoded pixels.
// The small shims supply browser Blob/Image APIs missing from its JSDOM runtime.
const env=getEnv();
const win=env.window as any;
beforeAll(()=>{
  setEnv(env);
  Object.defineProperty(globalThis,'document',{value:env.document,configurable:true});
  Object.defineProperty(globalThis,'Image',{value:win.Image,configurable:true});
  Object.defineProperty(globalThis,'FileReader',{value:win.FileReader,configurable:true});
  Object.defineProperty(globalThis,'Blob',{value:win.Blob,configurable:true});
  Object.defineProperty(globalThis,'File',{value:win.File,configurable:true});
  Object.defineProperty(env.document,'fonts',{value:{ready:Promise.resolve(),add(){}},configurable:true});
  win.Blob.prototype.arrayBuffer=function(){return new Promise((resolve,reject)=>{const r=new win.FileReader();r.onload=()=>resolve(r.result);r.onerror=reject;r.readAsArrayBuffer(this);});};
  win.HTMLImageElement.prototype.decode=function(){return new Promise((resolve,reject)=>{if(this.complete&&this.naturalWidth)resolve(undefined);else{this.onload=()=>resolve(undefined);this.onerror=reject;}});};
});
function fixture():Asset{const c=env.document.createElement('canvas');c.width=20;c.height=10;const ctx=c.getContext('2d')!;ctx.fillStyle='#ff0000';ctx.fillRect(0,0,20,10);return{id:'red-fixture',name:'red.png',kind:'image',mime:'image/png',data:c.toDataURL(),width:20,height:10};}
async function pixels(blob:Blob){const bytes=await blob.arrayBuffer();const img=new win.Image();img.src='data:image/png;base64,'+Buffer.from(bytes).toString('base64');await img.decode();const c=env.document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);return{width:c.width,height:c.height,pixel:(x:number,y:number)=>Array.from(ctx.getImageData(x,y,1,1).data)};}
describe('real export and portable project round trip',()=>{
  it('exports exact dimensions with top-left origins and alpha intact',async()=>{const p=newProject(),asset=fixture();const b={...p.boards[0],width:100,height:60,background:null};const l={...imageLayer(asset,b),x:10,y:15,width:40,height:20};b.layers=[l];const result=await pixels(await renderPNG(b,[asset]));expect([result.width,result.height]).toEqual([100,60]);expect(result.pixel(0,0)).toEqual([0,0,0,0]);expect(result.pixel(15,20)).toEqual([255,0,0,255]);expect(result.pixel(40,28)).toEqual([255,0,0,255]);expect(result.pixel(51,36)[3]).toBe(0);});
  it('clips cropped placements without changing the source asset',async()=>{const p=newProject(),asset=fixture();const b={...p.boards[0],width:60,height:30,background:'#112233'};b.layers=[{...imageLayer(asset,b),x:0,y:0,width:10,height:10,cropX:10,cropY:0,cropWidth:10,cropHeight:10}];const result=await pixels(await renderPNG(b,[asset]));expect(result.pixel(5,5)).toEqual([255,0,0,255]);expect(result.pixel(15,5)).toEqual([17,34,51,255]);expect(asset.width).toBe(20);});
  it('packs shared images repeatedly at each target’s independent dimensions',async()=>{const p=newProject(),asset=fixture();const boards=p.boards.filter(b=>['header','small','library-logo'].includes(b.id)).map(b=>({...b,layers:[imageLayer(asset,b)]}));const progress:number[]=[];const result=await exportBoards(boards,[asset],n=>progress.push(n));const archive=await unpack(new Uint8Array(await result.arrayBuffer()));expect(progress).toEqual([1,2,3]);for(const b of boards){const filename=b.name.toLowerCase().replaceAll(' ','-')+'.png';const bytes=archive[filename];const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);expect([view.getUint32(16),view.getUint32(20)]).toEqual([b.width,b.height]);}});
  it('reopens the saved ZIP with original asset bytes and editable layers',async()=>{const p=newProject();p.name='Round trip';p.assets=[fixture()];p.boards[0].layers=[imageLayer(p.assets[0],p.boards[0])];const blob=await makeProjectFile(p);const file=new File([await blob.arrayBuffer()],'roundtrip.steamart');const restored=await openProjectFile(file);expect(restored).toEqual(p);});
});
