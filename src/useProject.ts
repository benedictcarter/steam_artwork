import { useCallback, useEffect, useRef, useState } from 'react';
import { newProject, type Project } from './model';
import { autosave, restore } from './files';

export function useProject(){
  const [project,setProject]=useState(newProject);
  const current=useRef(project),past=useRef<Project[]>([]),future=useRef<Project[]>([]);
  const [ready,setReady]=useState(false),[saveStatus,setSaveStatus]=useState('Restoring workspace…'),[error,setError]=useState(''),[autosaveEnabled,setAutosaveEnabled]=useState(true);
  const [revision,setRevision]=useState(0),merging=useRef<string|null>(null);
  const apply=useCallback((fn:(p:Project)=>Project,merge?:string)=>{const before=current.current;const next=fn(before);if(next===before)return;const continuing=!!merge&&merge===merging.current;merging.current=merge??null;if(!continuing)past.current.push(before);if(past.current.length>60)past.current.shift();future.current=[];current.current=next;setProject(next);setRevision(r=>r+1);},[]);
  const replace=useCallback((p:Project)=>{merging.current=null;past.current=[];future.current=[];current.current=p;setProject(p);setAutosaveEnabled(true);setRevision(r=>r+1);},[]);
  const undo=useCallback(()=>{merging.current=null;const p=past.current.pop();if(!p)return;future.current.push(current.current);current.current=p;setProject(p);setRevision(r=>r+1);},[]);
  const redo=useCallback(()=>{merging.current=null;const p=future.current.pop();if(!p)return;past.current.push(current.current);current.current=p;setProject(p);setRevision(r=>r+1);},[]);
  useEffect(()=>{let canceled=false;restore().then(p=>{if(!canceled&&p)replace(p);}).catch(e=>{if(!canceled){setAutosaveEnabled(false);setError(`Could not restore autosave: ${e.message}. The stored copy has been preserved. Open a project or start fresh to resume autosave.`);}}).finally(()=>{if(!canceled)setReady(true);});return()=>{canceled=true;};},[replace]);
  useEffect(()=>{if(!ready)return;if(!autosaveEnabled){setSaveStatus('Autosave paused');return;}let canceled=false;setSaveStatus('Saving on this device…');const timer=setTimeout(()=>{autosave(project).then(()=>{if(!canceled)setSaveStatus('Saved on this device');}).catch(()=>{if(!canceled){setSaveStatus('Autosave unavailable');setError('Browser autosave is unavailable. Use Save project to keep your work.');}});},600);return()=>{canceled=true;clearTimeout(timer);};},[project,ready,autosaveEnabled]);
  return {project,current,apply,replace,undo,redo,canUndo:past.current.length>0,canRedo:future.current.length>0,ready,saveStatus,error,setError,revision};
}
