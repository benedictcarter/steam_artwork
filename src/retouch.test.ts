import { describe, expect, it } from 'vitest';
import { clearRegions, opaqueBounds } from './retouch';

const WHITE=[255,255,255,255],RED=[200,0,0,255];
const image=(rows:string[])=>({width:rows[0].length,height:rows.length,data:new Uint8ClampedArray(rows.join('').split('').flatMap(c=>c==='w'?WHITE:RED))});
const alpha=(out:Uint8ClampedArray,width:number)=>Array.from({length:out.length/4},(_,i)=>out[i*4+3]?'#':'.').join('').match(new RegExp(`.{${width}}`,'g'));

describe('background removal',()=>{
  it('clears only the similar region connected to the click, keeping enclosed same colour',()=>{
    const src=image(['wwwww','wrrrw','wrwrw','wrrrw','wwwww']);
    expect(alpha(clearRegions(src,[{x:0,y:0}],10),5)).toEqual(['.....','.###.','.###.','.###.','.....']);
  });
  it('never alters the source and tolerance widens the match',()=>{
    const src=image(['wr','rr']),before=new Uint8ClampedArray(src.data);
    expect(alpha(clearRegions(src,[{x:0,y:0}],100),2)).toEqual(['..','..']);
    expect(src.data).toEqual(before);
  });
});

describe('auto-crop',()=>{
  it('keeps exactly the visible pixels and nothing for an empty image',()=>{
    const src=image(['wwwww','wwrww','wwwrw','wwwww']);
    const out=clearRegions(src,[{x:0,y:0}],10);
    expect(opaqueBounds(out,5,4)).toEqual({x:2,y:1,width:2,height:2});
    expect(opaqueBounds(clearRegions(src,[{x:0,y:0}],100),5,4)).toBeNull();
  });
});
