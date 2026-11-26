import { FabricImage, FabricObject, Textbox, StaticCanvas } from 'fabric';
import type { Asset, Board, Layer } from './model';
import { loadFonts, packIco } from './files';
import { boardOutputs, safeName } from './model';
import { affine, flatSize, isTilted, mesh, projector, rotate, tiltedBox, type Tilt, type Vec } from './perspective';

export const SELECTION_STYLE={cornerColor:'#b9ee83',borderColor:'#b9ee83',cornerStrokeColor:'#18251a',transparentCorners:false,cornerSize:9,padding:2};
export type ArtObject=FabricObject & { layerId?:string };
// Fabric owns and disposes its image element. Sharing one between artboards or
// export canvases makes disposing the first canvas invalidate the other images.
async function imageElement(asset:Asset){const img=new Image();img.src=asset.data;await img.decode();return img;}
const TILTED_TEXT_RESOLUTION=2;
type Picture={element:CanvasImageSource;sx:number;sy:number;sw:number;sh:number;width:number;height:number};
function outward(points:Vec[],grow:number):Vec[]{const cx=(points[0].x+points[1].x+points[2].x)/3,cy=(points[0].y+points[1].y+points[2].y)/3;return points.map(p=>{const d=Math.hypot(p.x-cx,p.y-cy)||1;return {x:p.x+(p.x-cx)/d*grow,y:p.y+(p.y-cy)/d*grow};});}
class TiltedLayer extends FabricObject{
  constructor(readonly picture:Picture,readonly tilt:Partial<Tilt>,readonly fontSize:number|undefined,readonly flat:{width:number;height:number}){const box=tiltedBox(flat.width,flat.height,tilt);super({width:box.width,height:box.height,objectCaching:false,strokeWidth:0});}
  _render(ctx:CanvasRenderingContext2D){
    const {picture:p,flat}=this,box=tiltedBox(flat.width,flat.height,this.tilt);
    ctx.translate(flat.width/2-box.x-box.width/2,flat.height/2-box.y-box.height/2);
    const m=ctx.getTransform(),grow=1/Math.sqrt(Math.abs(m.a*m.d-m.b*m.c)||1);
    for(const t of mesh(projector(flat.width,flat.height,this.tilt),flat,{width:p.sw,height:p.sh})){
      const clip=outward(t.dst,grow),xs=t.src.map(v=>v.x),ys=t.src.map(v=>v.y);
      const x0=Math.max(0,Math.floor(Math.min(...xs))-1),y0=Math.max(0,Math.floor(Math.min(...ys))-1),x1=Math.min(p.sw,Math.ceil(Math.max(...xs))+1),y1=Math.min(p.sh,Math.ceil(Math.max(...ys))+1);
      ctx.save();ctx.beginPath();ctx.moveTo(clip[0].x,clip[0].y);ctx.lineTo(clip[1].x,clip[1].y);ctx.lineTo(clip[2].x,clip[2].y);ctx.closePath();ctx.clip();
      ctx.transform(...affine(t.src,t.dst));ctx.drawImage(p.element,p.sx+x0,p.sy+y0,x1-x0,y1-y0,x0,y0,x1-x0,y1-y0);ctx.restore();
    }
  }
}
async function flatObject(layer:Layer,assets:Asset[]):Promise<{object:FabricObject;picture:()=>Picture}>{
  if(layer.type==='image'){
    const asset=assets.find(a=>a.id===layer.assetId);if(!asset)throw new Error(`Missing image: ${layer.name}`);
    const img=await imageElement(asset);
    const sx=layer.cropX||0,sy=layer.cropY||0,sw=layer.cropWidth||img.naturalWidth,sh=layer.cropHeight||img.naturalHeight;
    return {object:new FabricImage(img,{cropX:sx,cropY:sy,width:sw,height:sh,scaleX:layer.width/sw,scaleY:layer.height/sh,strokeWidth:0}),picture:()=>({element:img,sx,sy,sw,sh,width:layer.width,height:layer.height})};
  }
  const text=new Textbox(layer.text||'',{width:layer.width,fontFamily:layer.fontFamily||'sans-serif',fontSize:layer.fontSize||48,fill:layer.fill||'#ffffff',textAlign:layer.align||'left',stroke:layer.stroke||'#000000',strokeWidth:layer.strokeWidth||0,paintFirst:'stroke',splitByGrapheme:false,strokeUniform:true});
  return {object:text,picture:()=>{const element=text.toCanvasElement({multiplier:TILTED_TEXT_RESOLUTION,enableRetinaScaling:false});return {element,sx:0,sy:0,sw:element.width,sh:element.height,width:element.width/TILTED_TEXT_RESOLUTION,height:element.height/TILTED_TEXT_RESOLUTION};}};
}
export async function makeObject(layer:Layer,assets:Asset[]):Promise<ArtObject>{
  const flat=await flatObject(layer,assets),size={width:flat.object.width*flat.object.scaleX,height:flat.object.height*flat.object.scaleY};
  const object:ArtObject=isTilted(layer)?new TiltedLayer(flat.picture(),layer,layer.fontSize,size):flat.object;
  const corner=rotate(tiltedBox(size.width,size.height,layer),layer.angle);
  object.set({originX:'left',originY:'top',left:layer.x+corner.x,top:layer.y+corner.y,angle:layer.angle,opacity:layer.opacity,visible:layer.visible,flipX:layer.flipX,flipY:layer.flipY,selectable:!layer.locked,evented:!layer.locked,...SELECTION_STYLE,strokeUniform:true});
  object.layerId=layer.id;return object;
}
export function objectPatch(object:ArtObject):Partial<Layer>{
  const drawn={width:object.width*object.scaleX,height:object.height*object.scaleY},tilt=object instanceof TiltedLayer?object.tilt:{};
  const size=object instanceof TiltedLayer?flatSize(drawn,tilt,object.flat):drawn,corner=rotate(tiltedBox(size.width,size.height,tilt),object.angle);
  const p:Partial<Layer>={x:object.left-corner.x,y:object.top-corner.y,angle:object.angle,flipX:object.flipX,flipY:object.flipY,width:Math.max(1,size.width),height:Math.max(1,size.height)};
  if(object instanceof Textbox){p.fontSize=Math.max(1,object.fontSize*object.scaleY);p.text=object.text;}
  if(object instanceof TiltedLayer&&object.fontSize)p.fontSize=Math.max(1,object.fontSize*size.height/object.flat.height);
  return p;
}
const toPNG=(el:HTMLCanvasElement)=>new Promise<Blob>((resolve,reject)=>el.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG export failed.')),'image/png'));
async function renderWidths(board:Board,assets:Asset[],widths:number[]):Promise<Blob[]>{
  await loadFonts(assets);await document.fonts.ready;
  const canvas=new StaticCanvas(undefined,{width:board.width,height:board.height,backgroundColor:board.background||'transparent',enableRetinaScaling:false,renderOnAddRemove:false});
  try{const objects=await Promise.all(board.layers.map(l=>makeObject(l,assets)));canvas.add(...objects);canvas.renderAll();const out:Blob[]=[];for(const w of widths)out.push(await toPNG(canvas.toCanvasElement(w/board.width)));return out;}finally{await canvas.dispose();}
}
export const renderPNG=async(board:Board,assets:Asset[])=>(await renderWidths(board,assets,[board.width]))[0];
const bytes=async(b:Blob)=>new Uint8Array(await b.arrayBuffer());
export async function boardFiles(board:Board,assets:Asset[]):Promise<Record<string,Uint8Array>>{
  const base=safeName(board.name).toLowerCase(),files:Record<string,Uint8Array>={};
  for(const o of boardOutputs(board)){
    const pngs=await Promise.all((await renderWidths(board,assets,o.widths)).map(bytes));
    if(o.format==='ico')files[`${base}.ico`]=packIco(o.widths.map((size,i)=>({size,png:pngs[i]})));
    else o.widths.forEach((w,i)=>{files[`${base}${o.widths.length>1?`-${w}`:''}.png`]=pngs[i];});
  }
  return files;
}
export async function exportFiles(boards:Board[],assets:Asset[],progress:(n:number)=>void):Promise<Record<string,Uint8Array>>{const files:Record<string,Uint8Array>={};for(let i=0;i<boards.length;i++){Object.assign(files,await boardFiles(boards[i],assets));progress(i+1);}return files;}
