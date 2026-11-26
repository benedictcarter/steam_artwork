import type { Rect } from './model';
export type Pixels={data:Uint8ClampedArray;width:number;height:number};
export type Point={x:number;y:number};

const MAX_CHANNEL=255;
export const TOLERANCE_MAX=100;

export const SOFTNESS_MAX=100;
export const EDGE_DEPTH=2;

export function clearRegions(source:Pixels,seeds:Point[],tolerance:number,softness=0):Uint8ClampedArray<ArrayBuffer>{
  const {width,height,data}=source,out=new Uint8ClampedArray(data),limit=tolerance/TOLERANCE_MAX*MAX_CHANNEL,band=softness/SOFTNESS_MAX*MAX_CHANNEL;
  const owner=new Int32Array(width*height),stack=new Int32Array(width*height),colours:number[][]=[];
  const distance=(i:number,[r,g,b]:number[])=>Math.max(Math.abs(data[i*4]-r),Math.abs(data[i*4+1]-g),Math.abs(data[i*4+2]-b));
  const neighbours=(i:number)=>{const x=i%width;return [x>0?i-1:-1,x<width-1?i+1:-1,i-width,i+width].filter(n=>n>=0&&n<width*height);};
  const edge:number[]=[];
  seeds.forEach(seed=>{
    const sx=Math.floor(seed.x),sy=Math.floor(seed.y);
    if(sx<0||sy<0||sx>=width||sy>=height||owner[sy*width+sx])return;
    const s=sy*width+sx,colour=[data[s*4],data[s*4+1],data[s*4+2]],id=colours.push(colour);
    let top=0;stack[top++]=s;owner[s]=id;
    while(top){
      const i=stack[--top];out[i*4+3]=0;
      for(const n of neighbours(i)){if(owner[n])continue;if(distance(n,colour)<=limit||data[n*4+3]===0){owner[n]=id;stack[top++]=n;}else edge.push(i);}
    }
  });
  if(!band)return out;
  let ring=edge;
  for(let depth=0;depth<EDGE_DEPTH&&ring.length;depth++){
    const next:number[]=[];
    for(const i of ring)for(const n of neighbours(i)){
      if(owner[n])continue;
      const bg=colours[owner[i]-1],d=distance(n,bg);
      if(d>=limit+band)continue;
      const keep=Math.max(0,(d-limit)/band);owner[n]=owner[i];next.push(n);
      for(let k=0;k<3;k++)out[n*4+k]=keep?bg[k]+(data[n*4+k]-bg[k])/keep:bg[k];
      out[n*4+3]=data[n*4+3]*keep;
    }
    ring=next;
  }
  return out;
}

export function opaqueBounds(data:Uint8ClampedArray,width:number,height:number):Rect|null{
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  return right<0?null:{x:left,y:top,width:right-left+1,height:bottom-top+1};
}
