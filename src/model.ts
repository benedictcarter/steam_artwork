import { CAMERA_DISTANCE_MAX, CAMERA_DISTANCE_MIN, rotate, TILT_LIMIT, tiltedBox } from './perspective';
export type Asset = { id: string; name: string; kind: 'image' | 'font'; mime: string; data: string; width?: number; height?: number; family?: string };
export type Layer = { id: string; name: string; type: 'image' | 'text'; assetId?: string; x: number; y: number; width: number; height: number; angle: number; opacity: number; visible: boolean; locked: boolean; flipX: boolean; flipY: boolean; cropX?: number; cropY?: number; cropWidth?: number; cropHeight?: number; text?: string; fontFamily?: string; fontSize?: number; fill?: string; align?: 'left' | 'center' | 'right'; stroke?: string; strokeWidth?: number; tiltX?: number; tiltY?: number; cameraDistance?: number };
export type Board = { id: string; name: string; group: 'Store' | 'Library' | 'Extras'; width: number; height: number; background: string | null; layers: Layer[]; enabled: boolean; note?: string };
export type Project = { format: 'steam-art-studio'; version: 1; name: string; assets: Asset[]; boards: Board[] };
export const uid = () => crypto.randomUUID();
const preset = (id: string, name: string, group: Board['group'], width: number, height: number, note?: string): Board => ({id,name,group,width,height,background:null,layers:[],enabled:true,note});
export function newProject(): Project {return {format:'steam-art-studio',version:1,name:'Untitled project',assets:[],boards:[
  preset('header','Header capsule','Store',920,430),
  preset('small','Small capsule','Store',462,174,'Check your title at 120 × 45 and 184 × 69.'),
  preset('main','Main capsule','Store',1232,706),
  preset('vertical','Vertical capsule','Store',748,896),
  preset('library-capsule','Library capsule','Library',600,900),
  preset('library-header','Library header','Library',920,430),
  preset('library-hero','Library hero','Library',3840,1240,'Artwork only. Export your logo separately.'),
  preset('library-logo','Library logo','Library',1280,720,'Transparent PNG. Adjust the aspect ratio: width 1280 or height 720.'),
  {...preset('page-background','Page background','Extras',1438,810),enabled:false},
]};}
export const layerBase = (): Omit<Layer,'name'|'type'> => ({id:uid(),x:0,y:0,width:100,height:100,angle:0,opacity:1,visible:true,locked:false,flipX:false,flipY:false});
export function imageLayer(asset: Asset, board: Board, at?: {x:number;y:number}): Layer {
  const scale = Math.min(board.width/(asset.width||1),board.height/(asset.height||1))*.85;
  const width=(asset.width||1)*scale,height=(asset.height||1)*scale;
  return {...layerBase(),name:asset.name,type:'image',assetId:asset.id,width,height,x:at?at.x-width/2:(board.width-width)/2,y:at?at.y-height/2:(board.height-height)/2};
}
export function textLayer(board: Board): Layer {return {...layerBase(),name:'Game title',type:'text',text:'GAME TITLE',fontFamily:'sans-serif',fontSize:Math.round(board.width*.1),fill:'#ffffff',align:'center',stroke:'#000000',strokeWidth:0,width:board.width*.8,height:board.height*.2,x:board.width*.1,y:board.height*.35};}
export function fitImage(layer: Layer, asset: Asset, board: Board, mode:'fit'|'fill'): Layer {
  const sourceWidth=layer.cropWidth||asset.width||1,sourceHeight=layer.cropHeight||asset.height||1;
  const scale=(mode==='fill'?Math.max:Math.min)(board.width/sourceWidth,board.height/sourceHeight);
  const width=sourceWidth*scale,height=sourceHeight*scale;
  return {...layer,width,height,x:(board.width-width)/2,y:(board.height-height)/2,angle:0};
}
export function cropImage(layer:Layer,asset:Asset,rect:Partial<Pick<Layer,'cropX'|'cropY'|'cropWidth'|'cropHeight'>>):Layer{
  const aw=asset.width||1,ah=asset.height||1;
  const cropX=Math.max(0,Math.min(aw-1,rect.cropX??layer.cropX??0)),cropY=Math.max(0,Math.min(ah-1,rect.cropY??layer.cropY??0));
  const cropWidth=Math.max(1,Math.min(aw-cropX,rect.cropWidth??layer.cropWidth??aw)),cropHeight=Math.max(1,Math.min(ah-cropY,rect.cropHeight??layer.cropHeight??ah));
  return {...layer,cropX,cropY,cropWidth,cropHeight,width:layer.width*cropWidth/(layer.cropWidth||aw),height:layer.height*cropHeight/(layer.cropHeight||ah)};
}
export function updateBoard(project:Project,id:string,fn:(b:Board)=>Board):Project{return {...project,boards:project.boards.map(b=>b.id===id?fn(b):b)};}
export function updateLayers(project:Project,boardId:string,patches:Record<string,Partial<Layer>>):Project{return updateBoard(project,boardId,b=>({...b,layers:b.layers.map(l=>patches[l.id]?{...l,...patches[l.id]}:l)}));}
export function moveLayer(project:Project,boardId:string,id:string,direction:number):Project{return updateBoard(project,boardId,b=>{const layers=[...b.layers],index=layers.findIndex(l=>l.id===id),to=Math.max(0,Math.min(layers.length-1,index+direction));if(index<0||index===to)return b;const [item]=layers.splice(index,1);layers.splice(to,0,item);return {...b,layers};});}
export function duplicateLayer(layer:Layer):Layer{return {...layer,id:uid(),name:layer.name+' copy',x:layer.x+20,y:layer.y+20};}
export type Rect={x:number;y:number;width:number;height:number};
export function layerBounds(layers:Layer[]):Rect{
  const points=layers.flatMap(l=>{const b=tiltedBox(l.width,l.height,l);return [[b.x,b.y],[b.x+b.width,b.y],[b.x+b.width,b.y+b.height],[b.x,b.y+b.height]].map(([u,v])=>{const r=rotate({x:u,y:v},l.angle);return {x:l.x+r.x,y:l.y+r.y};});});
  const xs=points.map(p=>p.x),ys=points.map(p=>p.y),x=Math.min(...xs),y=Math.min(...ys);
  return {x,y,width:Math.max(...xs)-x,height:Math.max(...ys)-y};
}
export function fitLayers(layers:Layer[],board:Pick<Board,'width'|'height'>):Layer[]{
  const from=layerBounds(layers),scale=Math.min(board.width/from.width,board.height/from.height);
  const left=(board.width-from.width*scale)/2,top=(board.height-from.height*scale)/2;
  return layers.map(l=>({...l,id:uid(),x:left+(l.x-from.x)*scale,y:top+(l.y-from.y)*scale,width:l.width*scale,height:l.height*scale,...(l.type==='text'&&{fontSize:(l.fontSize||48)*scale,strokeWidth:(l.strokeWidth||0)*scale})}));
}
export function safeName(name:string):string{return name.trim().replace(/[<>:"/\\|?*\x00-\x1f]/g,'-').replace(/\s+/g,'-').slice(0,90)||'artwork';}

export function validateProject(value:unknown):Project {
  const p=value as Project;
  const fail=()=>{throw new Error('This is not a valid Steam Art Studio project.');};
  if(!p||p.format!=='steam-art-studio'||p.version!==1||typeof p.name!=='string'||!Array.isArray(p.assets)||!Array.isArray(p.boards)||!p.boards.length||p.boards.length>30||p.assets.length>500)fail();
  const ids=new Set<string>();
  for(const a of p.assets){if(!a||typeof a.id!=='string'||ids.has(a.id)||typeof a.name!=='string'||!['image','font'].includes(a.kind)||typeof a.data!=='string'||!a.data.startsWith('data:'))fail();ids.add(a.id);if(a.kind==='image'&&(!Number.isFinite(a.width)||!Number.isFinite(a.height)||(a.width||0)<=0||(a.height||0)<=0))fail();if(a.kind==='font'&&typeof a.family!=='string')fail();}
  const boardIds=new Set<string>();
  for(const b of p.boards){if(!b||typeof b.id!=='string'||boardIds.has(b.id)||typeof b.name!=='string'||!['Store','Library','Extras'].includes(b.group)||![b.width,b.height].every(n=>Number.isInteger(n)&&n>0&&n<=8192)||b.width*b.height>40_000_000||!Array.isArray(b.layers)||b.layers.length>200||typeof b.enabled!=='boolean'||!(b.background===null||/^#[0-9a-f]{6}$/i.test(b.background)))fail();boardIds.add(b.id);const layerIds=new Set<string>();for(const l of b.layers){if(!l||typeof l.id!=='string'||layerIds.has(l.id)||typeof l.name!=='string'||!['image','text'].includes(l.type)||![l.x,l.y,l.width,l.height,l.angle,l.opacity].every(Number.isFinite)||l.width<=0||l.height<=0||l.width>100_000||l.height>100_000||l.opacity<0||l.opacity>1||typeof l.visible!=='boolean'||typeof l.locked!=='boolean')fail();layerIds.add(l.id);if(![l.tiltX,l.tiltY].every(t=>t===undefined||(Number.isFinite(t)&&Math.abs(t)<=TILT_LIMIT))||!(l.cameraDistance===undefined||(Number.isFinite(l.cameraDistance)&&l.cameraDistance>=CAMERA_DISTANCE_MIN&&l.cameraDistance<=CAMERA_DISTANCE_MAX)))fail();if(l.type==='image'&&!p.assets.some(a=>a.id===l.assetId&&a.kind==='image'))fail();if(l.type==='text'&&(typeof l.text!=='string'||typeof l.fontFamily!=='string'||!Number.isFinite(l.fontSize)||(l.fontSize||0)<=0||!/^#[0-9a-f]{6}$/i.test(l.fill||'')))fail();}}
  return p;
}
