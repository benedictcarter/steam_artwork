export type Vec={x:number;y:number};
export type Tilt={tiltX:number;tiltY:number;cameraDistance:number};
export type Triangle={src:[Vec,Vec,Vec];dst:[Vec,Vec,Vec]};
export type Affine=[number,number,number,number,number,number];

export const TILT_LIMIT=80;
export const CAMERA_DISTANCE_MIN=0.25;
export const CAMERA_DISTANCE_MAX=10;
export const DEFAULT_CAMERA_DISTANCE=1;
const NEAREST_CAMERA_GAP=1.05;
const MESH_CELLS=16;
const FIT_STEPS=8;
const RADIANS=Math.PI/180;

export const isTilted=(t:Partial<Tilt>)=>!!(t.tiltX||t.tiltY);

export function projector(width:number,height:number,tilt:Partial<Tilt>):(p:Vec)=>Vec{
  const a=(tilt.tiltX||0)*RADIANS,b=(tilt.tiltY||0)*RADIANS;
  const place=({x,y}:Vec)=>{const z=-y*Math.sin(a);return {x:x*Math.cos(b)-z*Math.sin(b),y:y*Math.cos(a),z:x*Math.sin(b)+z*Math.cos(b)};};
  const corners=[{x:-width/2,y:-height/2},{x:width/2,y:-height/2},{x:width/2,y:height/2},{x:-width/2,y:height/2}];
  const nearest=Math.max(...corners.map(c=>-place(c).z));
  const camera=Math.max((tilt.cameraDistance??DEFAULT_CAMERA_DISTANCE)*Math.hypot(width,height)/2,nearest*NEAREST_CAMERA_GAP);
  return p=>{const q=place(p),s=camera/(camera+q.z);return {x:q.x*s,y:q.y*s};};
}

export type Box={x:number;y:number;width:number;height:number};
export function tiltedBox(width:number,height:number,tilt:Partial<Tilt>):Box{
  const f=projector(width,height,tilt),ps=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([u,v])=>f({x:u*width/2,y:v*height/2})),xs=ps.map(p=>p.x),ys=ps.map(p=>p.y);
  const left=Math.min(...xs),top=Math.min(...ys);
  return {x:width/2+left,y:height/2+top,width:Math.max(...xs)-left,height:Math.max(...ys)-top};
}
export function flatSize(box:{width:number;height:number},tilt:Partial<Tilt>,guess:{width:number;height:number}){
  let s=guess;
  for(let i=0;i<FIT_STEPS;i++){const b=tiltedBox(s.width,s.height,tilt);s={width:s.width*box.width/b.width,height:s.height*box.height/b.height};}
  return s;
}
export const rotate=({x,y}:Vec,degrees:number):Vec=>{const a=degrees*RADIANS;return {x:x*Math.cos(a)-y*Math.sin(a),y:x*Math.sin(a)+y*Math.cos(a)};};

export function mesh(project:(p:Vec)=>Vec,area:{width:number;height:number},pixels:{width:number;height:number},cells=MESH_CELLS):Triangle[]{
  const triangles:Triangle[]=[];
  const at=(i:number,j:number)=>({src:{x:i/cells*pixels.width,y:j/cells*pixels.height},dst:project({x:(i/cells-.5)*area.width,y:(j/cells-.5)*area.height})});
  for(let j=0;j<cells;j++)for(let i=0;i<cells;i++){
    const p=at(i,j),q=at(i+1,j),r=at(i+1,j+1),s=at(i,j+1);
    triangles.push({src:[p.src,q.src,r.src],dst:[p.dst,q.dst,r.dst]},{src:[p.src,r.src,s.src],dst:[p.dst,r.dst,s.dst]});
  }
  return triangles;
}

export function affine([s0,s1,s2]:[Vec,Vec,Vec],[d0,d1,d2]:[Vec,Vec,Vec]):Affine{
  const ux=s1.x-s0.x,uy=s1.y-s0.y,vx=s2.x-s0.x,vy=s2.y-s0.y,det=ux*vy-vx*uy;
  const a=((d1.x-d0.x)*vy-(d2.x-d0.x)*uy)/det,c=((d2.x-d0.x)*ux-(d1.x-d0.x)*vx)/det;
  const b=((d1.y-d0.y)*vy-(d2.y-d0.y)*uy)/det,d=((d2.y-d0.y)*ux-(d1.y-d0.y)*vx)/det;
  return [a,b,c,d,d0.x-a*s0.x-c*s0.y,d0.y-b*s0.x-d*s0.y];
}
