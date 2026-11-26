import { describe, expect, it } from 'vitest';
import { affine, CAMERA_DISTANCE_MIN, mesh, projector, TILT_LIMIT, type Vec } from './perspective';

const W=200,H=100;
const edge=(f:(p:Vec)=>Vec,a:Vec,b:Vec)=>{const p=f(a),q=f(b);return Math.hypot(q.x-p.x,q.y-p.y);};
const tl={x:-W/2,y:-H/2},tr={x:W/2,y:-H/2},br={x:W/2,y:H/2},bl={x:-W/2,y:H/2};

describe('perspective tilt',()=>{
  it('leaves an untilted layer exactly where it was',()=>{const f=projector(W,H,{});for(const c of [tl,tr,br,bl,{x:13,y:-7}])expect(f(c)).toEqual(c);});
  it('tilting back shrinks the top edge and grows the bottom edge',()=>{const f=projector(W,H,{tiltX:40});expect(edge(f,tl,tr)).toBeLessThan(W);expect(edge(f,bl,br)).toBeGreaterThan(W);});
  it('turning shrinks the right edge and grows the left edge',()=>{const f=projector(W,H,{tiltY:40});expect(edge(f,tr,br)).toBeLessThan(H);expect(edge(f,tl,bl)).toBeGreaterThan(H);});
  it('keeps the centre fixed',()=>{const f=projector(W,H,{tiltX:30,tiltY:-50,cameraDistance:.5});const c=f({x:0,y:0});expect(Math.abs(c.x)+Math.abs(c.y)).toBeLessThan(1e-9);});
  it('a closer camera exaggerates the near/far difference',()=>{const ratio=(d:number)=>{const f=projector(W,H,{tiltX:40,cameraDistance:d});return edge(f,bl,br)/edge(f,tl,tr);};expect(ratio(.5)).toBeGreaterThan(ratio(4));});
  it('stays finite at the extreme tilt and closest camera',()=>{for(const t of [TILT_LIMIT,-TILT_LIMIT]){const f=projector(W,H,{tiltX:t,tiltY:t,cameraDistance:CAMERA_DISTANCE_MIN});for(const c of [tl,tr,br,bl]){const p=f(c);expect(Number.isFinite(p.x)&&Number.isFinite(p.y)).toBe(true);expect(Math.abs(p.x)).toBeLessThan(W*50);}}});
  it('each mesh triangle maps its source corners exactly onto its projected corners',()=>{const f=projector(W,H,{tiltX:25,tiltY:35});for(const t of mesh(f,{width:W,height:H},{width:400,height:200},4)){const [a,b,c,d,e,g]=affine(t.src,t.dst);t.src.forEach((s,i)=>{expect(a*s.x+c*s.y+e).toBeCloseTo(t.dst[i].x,6);expect(b*s.x+d*s.y+g).toBeCloseTo(t.dst[i].y,6);});}});
});
