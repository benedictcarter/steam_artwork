import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, Crop, RotateCcw, Undo2, X } from 'lucide-react';
import { type Asset } from './model';
import { clearRegions, opaqueBounds, type Pixels, type Point, TOLERANCE_MAX } from './retouch';

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
  const [source,setSource]=useState<Pixels|null>(null),[seeds,setSeeds]=useState<Point[]>([]),[tolerance,setTolerance]=useState(DEFAULT_TOLERANCE),[trim,setTrim]=useState(false);
  useEffect(()=>{let canceled=false;readPixels(asset).then(p=>{if(!canceled)setSource(p);}).catch(()=>{if(!canceled){onError(`Could not read ${asset.name}.`);onClose();}});return()=>{canceled=true;};},[asset,onClose,onError]);
  const pixels=useMemo(()=>source&&clearRegions(source,seeds,tolerance),[source,seeds,tolerance]);
  const frame=useMemo(()=>source&&pixels&&((trim&&opaqueBounds(pixels,source.width,source.height))||{x:0,y:0,width:source.width,height:source.height}),[source,pixels,trim]);
  const trimmed=!!source&&!!frame&&(frame.width<source.width||frame.height<source.height);
  useEffect(()=>{const c=view.current;if(!c||!source||!pixels||!frame)return;c.width=frame.width;c.height=frame.height;c.getContext('2d')!.putImageData(new ImageData(pixels,source.width,source.height),-frame.x,-frame.y);},[source,pixels,frame]);
  const pick=(e:React.MouseEvent<HTMLCanvasElement>)=>{if(!frame)return;const r=e.currentTarget.getBoundingClientRect();setSeeds(s=>[...s,{x:frame.x+(e.clientX-r.left)/r.width*frame.width,y:frame.y+(e.clientY-r.top)/r.height*frame.height}]);};
  const save=()=>{const c=view.current;if(!c||!frame)return;onSave({name:editedName(asset.name),data:c.toDataURL('image/png'),width:frame.width,height:frame.height});};
  return <div className="modal-backdrop" onMouseDown={e=>{if(e.target===e.currentTarget)onClose();}}><section className="modal retouch-modal" role="dialog" aria-modal="true" aria-label="Edit asset">
    <div className="modal-heading"><div><div className="eyebrow">EDIT ASSET</div><h2>Remove background</h2></div><button className="icon-button" onClick={onClose} aria-label="Close dialog"><X size={20}/></button></div>
    <p className="modal-description">Click the background to make it transparent. Each click clears the connected area of similar colour. Auto-crop trims the empty transparent edges. Your original stays in the library; saving adds an edited copy.</p>
    <div className="retouch-stage checker">{source?<canvas ref={view} onClick={pick} aria-label="Image to edit"/>:<p>Loading…</p>}</div>
    <div className="retouch-controls">
      <label className="retouch-tolerance" title="How different a colour can be from the one you clicked and still be removed. Raise it if bits of background remain; lower it if the subject is being eaten."><span>Tolerance</span><input type="range" min={0} max={TOLERANCE_MAX} value={tolerance} onChange={e=>setTolerance(Number(e.target.value))}/><span>{tolerance}</span></label>
      <label className="check-field" title="Cut the image down to the smallest rectangle that still holds every visible pixel."><input type="checkbox" checked={trim} onChange={e=>setTrim(e.target.checked)}/><Crop size={13}/>Auto-crop</label>
      {source&&frame&&<span className="retouch-size">{frame.width} × {frame.height}{trimmed?` (from ${source.width} × ${source.height})`:''}</span>}
    </div>
    <div className="modal-actions"><button className="button subtle" disabled={!seeds.length} onClick={()=>setSeeds(s=>s.slice(0,-1))}><Undo2 size={15}/>Undo click</button><button className="button subtle" disabled={!seeds.length} onClick={()=>setSeeds([])}><RotateCcw size={15}/>Reset</button><button className="button primary" disabled={!seeds.length&&!trimmed} onClick={save}><Check size={16}/>Save as new asset</button></div>
  </section></div>;
}
