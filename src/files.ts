import { unzip, zip, strFromU8, strToU8 } from 'fflate';
import { get, set } from 'idb-keyval';
import { type Asset, type Project, uid, validateProject } from './model';

const MAX_FILE=50*1024*1024;
export const readData = (file:Blob):Promise<string>=>new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve(String(r.result));r.onerror=()=>reject(new Error('Could not read file.'));r.readAsDataURL(file);});
export const dataBytes=(data:string)=>Uint8Array.from(atob(data.slice(data.indexOf(',')+1)),c=>c.charCodeAt(0));
const asBuffer=(bytes:Uint8Array)=>bytes.slice().buffer as ArrayBuffer;
export const pack=(files:Record<string,Uint8Array>):Promise<Uint8Array>=>new Promise((resolve,reject)=>zip(files,{level:3},(err,result)=>err?reject(err):resolve(result)));
export const unpack=(bytes:Uint8Array):Promise<Record<string,Uint8Array>>=>new Promise((resolve,reject)=>unzip(bytes,{filter:f=>f.originalSize<250*1024*1024},(err,result)=>err?reject(new Error('Could not read ZIP archive.')):resolve(result)));
export function download(blob:Blob,name:string){const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),30000);}
export async function makeProjectFile(project:Project):Promise<Blob>{
  const files:Record<string,Uint8Array>={};
  const assets=project.assets.map(a=>{const path=`assets/${a.id}`;files[path]=dataBytes(a.data);return {...a,data:undefined,path};});
  files['project.json']=strToU8(JSON.stringify({...project,assets},null,2));
  return new Blob([asBuffer(await pack(files))],{type:'application/zip'});
}
export async function openProjectFile(file:File):Promise<Project>{
  if(file.size>300*1024*1024)throw new Error('Project exceeds the 300 MB import limit.');
  const archive=await unpack(new Uint8Array(await file.arrayBuffer()));
  if(!archive['project.json'])throw new Error('This archive does not contain a Steam Art Studio project.');
  const p=JSON.parse(strFromU8(archive['project.json']));
  if(!Array.isArray(p.assets)||p.assets.length>500)throw new Error('Invalid project assets.');
  let total=0;
  p.assets=await Promise.all(p.assets.map(async(a:Asset&{path:string})=>{const data=archive[a.path];if(!data)throw new Error(`Missing asset: ${a.name}`);total+=data.byteLength;if(total>250*1024*1024)throw new Error('Expanded project exceeds 250 MB.');return {...a,path:undefined,data:await readData(new Blob([asBuffer(data)],{type:a.mime}))};}));
  const project=validateProject(p);await loadFonts(project.assets);return project;
}
const fontLoads=new Map<string,Promise<void>>();
export async function loadFont(asset:Asset):Promise<void>{if(asset.kind!=='font')return;let promise=fontLoads.get(asset.id);if(!promise){promise=(async()=>{const font=new FontFace(asset.family!,asBuffer(dataBytes(asset.data)));await font.load();document.fonts.add(font);})();fontLoads.set(asset.id,promise);promise.catch(()=>fontLoads.delete(asset.id));}return promise;}
export async function loadFonts(assets:Asset[]){await Promise.all(assets.filter(a=>a.kind==='font').map(loadFont));}
export async function importAssets(files:File[]):Promise<{assets:Asset[];warnings:string[]}>{
  const expanded:File[]=[];const warnings:string[]=[];
  for(const file of files){if(file.size>MAX_FILE){warnings.push(`${file.name}: limit is 50 MB per file.`);continue;}if(/\.zip$/i.test(file.name)){const contents=await unpack(new Uint8Array(await file.arrayBuffer()));let total=0;for(const [path,bytes] of Object.entries(contents)){if(!/\.(ttf|otf|woff2?)$/i.test(path)||path.startsWith('__MACOSX/'))continue;total+=bytes.length;if(total>MAX_FILE)throw new Error('Font pack exceeds 50 MB expanded.');expanded.push(new File([asBuffer(bytes)],path.split('/').at(-1)!));}if(!Object.keys(contents).some(p=>/\.(ttf|otf|woff2?)$/i.test(p)))warnings.push(`${file.name}: no supported font files found.`);}else expanded.push(file);}
  const assets:Asset[]=[];
  for(const file of expanded){try{const id=uid();if(/\.(ttf|otf|woff2?)$/i.test(file.name)){const asset:Asset={id,name:file.name,kind:'font',mime:file.type||'application/octet-stream',data:await readData(file),family:`imported-${id}`};await loadFont(asset);assets.push(asset);}else if(/\.(png|jpe?g|webp)$/i.test(file.name)){const data=await readData(file);const image=new Image();image.src=data;await image.decode();if(image.naturalWidth*image.naturalHeight>60_000_000)throw new Error('image exceeds 60 megapixels');assets.push({id,name:file.name,kind:'image',mime:file.type||'image/png',data,width:image.naturalWidth,height:image.naturalHeight});}else warnings.push(`${file.name}: use PNG, JPG, WebP, or font files.`);}catch(e){warnings.push(`${file.name}: ${e instanceof Error?e.message:'could not import'}`);}}
  return {assets,warnings};
}
const AUTOSAVE_KEY='steam-art-studio.project.v1';
let pending=Promise.resolve();
export function autosave(project:Project){const work=pending.catch(()=>{}).then(()=>set(AUTOSAVE_KEY,project));pending=work;return work;}
export async function restore():Promise<Project|null>{const p=await get(AUTOSAVE_KEY);if(!p)return null;const valid=validateProject(p);await loadFonts(valid.assets);return valid;}
