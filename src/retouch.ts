export type Pixels={data:Uint8ClampedArray;width:number;height:number};
export type Point={x:number;y:number};

const MAX_CHANNEL=255;
export const TOLERANCE_MAX=100;

export function clearRegions(source:Pixels,seeds:Point[],tolerance:number):Uint8ClampedArray<ArrayBuffer>{
  const {width,height}=source,out=new Uint8ClampedArray(source.data),limit=tolerance/TOLERANCE_MAX*MAX_CHANNEL;
  const cleared=new Uint8Array(width*height),stack=new Int32Array(width*height);
  for(const seed of seeds){
    const sx=Math.floor(seed.x),sy=Math.floor(seed.y);
    if(sx<0||sy<0||sx>=width||sy>=height||cleared[sy*width+sx])continue;
    const s=(sy*width+sx)*4,r=source.data[s],g=source.data[s+1],b=source.data[s+2];
    const near=(i:number)=>Math.max(Math.abs(source.data[i*4]-r),Math.abs(source.data[i*4+1]-g),Math.abs(source.data[i*4+2]-b))<=limit||source.data[i*4+3]===0;
    let top=0;stack[top++]=sy*width+sx;cleared[sy*width+sx]=1;
    while(top){
      const i=stack[--top],x=i%width;out[i*4+3]=0;
      for(const n of [x>0?i-1:-1,x<width-1?i+1:-1,i-width,i+width])if(n>=0&&n<width*height&&!cleared[n]&&near(n)){cleared[n]=1;stack[top++]=n;}
    }
  }
  return out;
}

export type Rect={x:number;y:number;width:number;height:number};
export function opaqueBounds(data:Uint8ClampedArray,width:number,height:number):Rect|null{
  let left=width,top=height,right=-1,bottom=-1;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++)if(data[(y*width+x)*4+3]){left=Math.min(left,x);right=Math.max(right,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
  return right<0?null:{x:left,y:top,width:right-left+1,height:bottom-top+1};
}
