import { useEffect, useRef, useState } from 'react';
import { Check, RotateCcw, Undo2, X } from 'lucide-react';
import { type Asset } from './model';
import { clearRegions, type Pixels, type Point, TOLERANCE_MAX } from './retouch';

const DEFAULT_TOLERANCE=15;
const editedName=(name:string)=>name.replace(/\.[^.]+$/,'')+' (edited).png';

async function readPixels(asset:Asset):Promise<Pixels>{
  const img=new Image();img.src=asset.data;await img.decode();
  const c=document.createElement('canvas');c.width=img.naturalWidth;c.height=img.naturalHeight;
  const ctx=c.getContext('2d')!;ctx.drawImage(img,0,0);
  const {data,width,height}=ctx.getImageData(0,0,c.width,c.height);return {data,width,height};
}

type Props={asset:Asset;onSave:(asset:Pick<Asset,'name'|'data'|'width'|'height'>)=>void;onClose:()=>void;onError:(message:string)=>void};
export function RetouchDialog({asset,onSave,onClose,onError}:Props){
  const view=useRef<HTMLCanvasElement>(null);
  const [source,setSource]=useState<Pixels|null>(null),[seeds,setSeeds]=useState<Point[]>([]),[tolerance,setTolerance]=useState(DEFAULT_TOLERANCE);
  useEffect(()=>{let canceled=false;readPixels(asset).then(p=>{if(!canceled)setSource(p);}).catch(()=>{if(!canceled){onError(`Could not read ${asset.name}.`);onClose();}});return()=>{canceled=true;};},[asset,onClose,onError]);
  useEffect(()=>{const c=view.current;if(!c||!source)return;c.width=source.width;c.height=source.height;c.getContext('2d')!.putImageData(new ImageData(clearRegions(source,seeds,tolerance),source.width,source.height),0,0);},[source,seeds,tolerance]);
  const pick=(e:React.MouseEvent<HTMLCanvasElement>)=>{if(!source)return;const r=e.currentTarget.getBoundingClientRect();setSeeds(s=>[...s,{x:(e.clientX-r.left)/r.width*source.width,y:(e.clientY-r.top)/r.height*source.height}]);};
  const save=()=>{const c=view.current;if(!c||!source)return;onSave({name:editedName(asset.name),data:c.toDataURL('image/png'),width:source.width,height:source.height});};
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="modal retouch-modal" role="dialog" aria-modal="true" aria-label="Remove background">
    <div className="modal-heading"><div><div className="eyebrow">EDIT ASSET</div><h2>Remove background</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></div>
    <p className="modal-description">Click the background to make it transparent. Each click clears the connected area of similar colour. Your original stays in the library; saving adds an edited copy.</p>
    <div className="retouch-stage checker">{source?<canvas ref={view} onClick={pick} aria-label="Image to edit"/>:<p>Loading…</p>}</div>
    <label className="retouch-tolerance" title="How different a colour can be from the one you clicked and still be removed. Raise it if bits of background remain; lower it if the subject is being eaten."><span>Tolerance</span><input type="range" min={0} max={TOLERANCE_MAX} value={tolerance} onChange={e=>setTolerance(Number(e.target.value))}/><span>{tolerance}</span></label>
    <div className="modal-actions"><button className="button subtle" disabled={!seeds.length} onClick={()=>setSeeds(s=>s.slice(0,-1))}><Undo2 size={15}/>Undo click</button><button className="button subtle" disabled={!seeds.length} onClick={()=>setSeeds([])}><RotateCcw size={15}/>Reset</button><button className="button primary" disabled={!seeds.length} onClick={save}><Check size={16}/>Save as new asset</button></div>
  </section></div>;
}
