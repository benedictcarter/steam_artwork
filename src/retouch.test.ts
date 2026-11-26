import { describe, expect, it } from 'vitest';
import { clearRegions, EDGE_DEPTH, opaqueBounds } from './retouch';

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

describe('soft edges',()=>{
  const row=(...px:number[][])=>({width:px.length,height:1,data:new Uint8ClampedArray(px.flat())});
  const W=[255,255,255,255],R=[200,0,0,255],MIX=[228,128,128,255];
  it('changes nothing when softness is zero',()=>{const src=row(W,W,MIX,R,R);expect(clearRegions(src,[{x:0,y:0}],10,0)).toEqual(clearRegions(src,[{x:0,y:0}],10));});
  it('fades a half-blended edge pixel and removes the background tint from it',()=>{
    const out=clearRegions(row(W,W,MIX,R,R),[{x:0,y:0}],0,100);
    expect(out[2*4+3]).toBeGreaterThan(80);expect(out[2*4+3]).toBeLessThan(180);
    expect(out[2*4+1]).toBeLessThan(40);
    expect(Array.from(out.slice(3*4))).toEqual([...R,...R]);
  });
  it('reaches no deeper than the edge band into the subject',()=>{
    const near=[250,250,250,255],src=row(W,...Array(6).fill(near));
    const out=clearRegions(src,[{x:0,y:0}],0,100);
    for(let x=1;x<=EDGE_DEPTH;x++)expect(out[x*4+3]).toBeLessThan(255);
    for(let x=EDGE_DEPTH+1;x<7;x++)expect(out[x*4+3]).toBe(255);
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
