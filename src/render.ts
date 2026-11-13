import { FabricImage, Textbox, StaticCanvas, type FabricObject } from 'fabric';
import type { Asset, Board, Layer } from './model';
import { loadFonts, pack } from './files';
import { safeName } from './model';

export type ArtObject=FabricObject & { layerId?:string };
// Fabric owns and disposes its image element. Sharing one between artboards or
// export canvases makes disposing the first canvas invalidate the other images.
async function imageElement(asset:Asset){const img=new Image();img.src=asset.data;await img.decode();return img;}
export async function makeObject(layer:Layer,assets:Asset[]):Promise<ArtObject>{
  let object:ArtObject;
  if(layer.type==='image'){
    const asset=assets.find(a=>a.id===layer.assetId);if(!asset)throw new Error(`Missing image: ${layer.name}`);
    const img=await imageElement(asset);
    const width=layer.cropWidth||img.naturalWidth,height=layer.cropHeight||img.naturalHeight;
    object=new FabricImage(img,{cropX:layer.cropX||0,cropY:layer.cropY||0,width,height,scaleX:layer.width/width,scaleY:layer.height/height,strokeWidth:0});
  }else object=new Textbox(layer.text||'',{width:layer.width,fontFamily:layer.fontFamily||'sans-serif',fontSize:layer.fontSize||48,fill:layer.fill||'#ffffff',textAlign:layer.align||'left',stroke:layer.stroke||'#000000',strokeWidth:layer.strokeWidth||0,paintFirst:'stroke',splitByGrapheme:false});
  object.set({originX:'left',originY:'top',left:layer.x,top:layer.y,angle:layer.angle,opacity:layer.opacity,visible:layer.visible,flipX:layer.flipX,flipY:layer.flipY,selectable:!layer.locked,evented:!layer.locked,cornerColor:'#b9ee83',borderColor:'#b9ee83',cornerStrokeColor:'#18251a',transparentCorners:false,cornerSize:9,padding:2,strokeUniform:true});
  object.layerId=layer.id;return object;
}
export function objectPatch(object:ArtObject):Partial<Layer>{const p:Partial<Layer>={x:object.left,y:object.top,angle:object.angle,flipX:object.flipX,flipY:object.flipY};if(object instanceof Textbox){p.width=Math.max(1,object.width*object.scaleX);p.fontSize=Math.max(1,object.fontSize*object.scaleY);p.height=Math.max(1,object.height*object.scaleY);p.text=object.text;}else{p.width=Math.max(1,object.width*object.scaleX);p.height=Math.max(1,object.height*object.scaleY);}return p;}
export async function renderPNG(board:Board,assets:Asset[]):Promise<Blob>{
  await loadFonts(assets);await document.fonts.ready;
  const canvas=new StaticCanvas(undefined,{width:board.width,height:board.height,backgroundColor:board.background||'transparent',enableRetinaScaling:false,renderOnAddRemove:false});
  try{const objects=await Promise.all(board.layers.map(l=>makeObject(l,assets)));canvas.add(...objects);canvas.renderAll();const el=canvas.toCanvasElement(1);return await new Promise<Blob>((resolve,reject)=>el.toBlob(blob=>blob?resolve(blob):reject(new Error('PNG export failed.')),'image/png'));}finally{await canvas.dispose();}
}
export async function exportBoards(boards:Board[],assets:Asset[],progress:(n:number)=>void):Promise<Blob>{const files:Record<string,Uint8Array>={};for(let i=0;i<boards.length;i++){files[`${safeName(boards[i].name).toLowerCase()}.png`]=new Uint8Array(await (await renderPNG(boards[i],assets)).arrayBuffer());progress(i+1);}const bytes=await pack(files);return new Blob([bytes.slice().buffer as ArrayBuffer],{type:'application/zip'});}
