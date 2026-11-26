import { useEffect, useRef, useState } from 'react';
import { ActiveSelection, Canvas } from 'fabric';
import { ImagePlus, Maximize2 } from 'lucide-react';
import { type Board, type Asset, type Layer } from './model';
import { makeObject, objectPatch, SELECTION_STYLE, type ArtObject } from './render';
import { diagonalCorners } from './controls';

type Props={board:Board;assets:Asset[];active:boolean;selected:string[];guides:boolean;onSelect:(board:string,layers:string[])=>void;onChange:(board:string,patches:Record<string,Partial<Layer>>)=>void;onDrop:(board:string,asset:string|null,files:File[],at:{x:number;y:number})=>void;onFocus:(board:string)=>void;onError:(message:string)=>void;};
const layerIds=(c:Canvas)=>c.getActiveObjects().map(o=>(o as ArtObject).layerId).filter((id):id is string=>!!id);
function selectLayers(c:Canvas,ids:string[]){
  if(layerIds(c).join('|')===ids.join('|'))return;
  const objects=c.getObjects().filter(o=>ids.includes((o as ArtObject).layerId||'')&&o.selectable);
  c.discardActiveObject();
  if(objects.length===1)c.setActiveObject(objects[0]);else if(objects.length)c.setActiveObject(new ActiveSelection(objects,{canvas:c,...SELECTION_STYLE}));
}
export function Artboard(props:Props){
  const {board,assets,active,selected,guides}=props;
  const element=useRef<HTMLCanvasElement>(null),host=useRef<HTMLDivElement>(null),canvas=useRef<Canvas|null>(null),latest=useRef(props),syncing=useRef(false);
  const [drop,setDrop]=useState(false);
  latest.current=props;
  useEffect(()=>{
    const c=new Canvas(element.current!,{selection:true,selectionColor:'rgba(185,238,131,.12)',selectionBorderColor:'#b9ee83',preserveObjectStacking:true,enableRetinaScaling:true,renderOnAddRemove:false,uniformScaling:true});canvas.current=c;
    const size=()=>{if(!host.current)return;const b=latest.current.board,w=host.current.clientWidth;c.setDimensions({width:w,height:w*b.height/b.width});c.setZoom(w/b.width);c.requestRenderAll();};
    const ro=new ResizeObserver(size);ro.observe(host.current!);size();
    const select=()=>{const o=c.getActiveObject();if(o){o.set(SELECTION_STYLE);diagonalCorners(o);}if(!syncing.current)latest.current.onSelect(latest.current.board.id,layerIds(c));};
    c.on('selection:created',select);c.on('selection:updated',select);c.on('selection:cleared',select);
    c.on('mouse:down',e=>{if(!e.target)latest.current.onSelect(latest.current.board.id,[]);});
    c.on('object:modified',e=>{const moved=(e.target instanceof ActiveSelection?e.target.getObjects():[e.target]) as ArtObject[];syncing.current=true;if(e.target instanceof ActiveSelection)c.discardActiveObject();syncing.current=false;latest.current.onChange(latest.current.board.id,Object.fromEntries(moved.filter(o=>o.layerId).map(o=>[o.layerId!,objectPatch(o)])));});
    c.on('text:editing:exited',e=>{const obj=e.target as ArtObject;if(obj.layerId)latest.current.onChange(latest.current.board.id,{[obj.layerId]:objectPatch(obj)});});
    return()=>{ro.disconnect();canvas.current=null;void c.dispose();};
  },[]);
  useEffect(()=>{let canceled=false;const c=canvas.current;if(!c)return;Promise.all(board.layers.map(l=>makeObject(l,assets))).then(objects=>{if(canceled){objects.forEach(o=>o.dispose());return;}syncing.current=true;c.discardActiveObject();c.getObjects().forEach(o=>o.dispose());c.clear();c.backgroundColor=board.background||'transparent';c.add(...objects);const p=latest.current;if(p.active)selectLayers(c,p.selected);c.requestRenderAll();syncing.current=false;}).catch(e=>{if(!canceled)latest.current.onError(e.message);});return()=>{canceled=true;};},[board,assets]);
  const selectedKey=selected.join('|');
  useEffect(()=>{const c=canvas.current;if(!c)return;syncing.current=true;selectLayers(c,active?latest.current.selected:[]);c.requestRenderAll();syncing.current=false;},[active,selectedKey]);
  return <section className={`artboard ${active?'active':''} ${drop?'drag-over':''}`} data-board={board.id}>
    <div className="artboard-heading"><button className="board-name" onClick={()=>props.onSelect(board.id,[])}>{board.name}<span>{board.width} × {board.height}</span></button><button className="icon-button board-focus" title={`Focus ${board.name}`} aria-label={`Focus ${board.name}`} onClick={()=>props.onFocus(board.id)}><Maximize2 size={13}/></button></div>
    <div className="artboard-surface checker" ref={host} style={{aspectRatio:`${board.width}/${board.height}`}} onDragOver={e=>{e.preventDefault();setDrop(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDrop(false);}} onDrop={e=>{e.preventDefault();setDrop(false);const r=e.currentTarget.getBoundingClientRect();props.onDrop(board.id,e.dataTransfer.getData('application/x-steam-art-asset')||null,Array.from(e.dataTransfer.files),{x:(e.clientX-r.left)/r.width*board.width,y:(e.clientY-r.top)/r.height*board.height});}}>
      <canvas ref={element}/>
      {!board.layers.length&&<div className="empty-artboard" aria-hidden="true"><ImagePlus size={21}/><span>Drop an image or add text</span></div>}
      {guides&&<div className="composition-guides" aria-hidden="true"><i/><i/><i/><i/></div>}
    </div>
  </section>;
}
