import { Control, controlsUtils, type FabricObject, type TransformActionHandler } from 'fabric';

const CORNERS=['tl','tr','bl','br'] as const;

const alongDiagonal:TransformActionHandler=(_e,transform,x,y)=>{
  const target=transform.target,p=controlsUtils.getLocalPoint(transform,transform.originX,transform.originY,x,y),dim=target._getTransformedDimensions();
  const w=dim.x/target.scaleX*transform.original.scaleX,h=dim.y/target.scaleY*transform.original.scaleY;
  const scale=Math.max(Number.EPSILON,(Math.abs(p.x)*w+Math.abs(p.y)*h)/(w*w+h*h))*(transform.originX==='center'?2:1);
  const before=target.scaleX;
  target.set({scaleX:transform.original.scaleX*scale,scaleY:transform.original.scaleY*scale});
  return before!==target.scaleX;
};
const proportional=controlsUtils.wrapWithFireEvent('scaling',controlsUtils.wrapWithFixedAnchor(alongDiagonal));
const scaleFromCorner:TransformActionHandler=(e,transform,x,y)=>{const c=transform.target.canvas;return (c?.uniformScaling!==!!(e as MouseEvent)[c?.uniScaleKey as 'shiftKey'])?proportional(e,transform,x,y):controlsUtils.scalingEqually(e,transform,x,y);};

export function diagonalCorners(object:FabricObject){
  object.controls={...object.controls,...Object.fromEntries(CORNERS.map(k=>[k,new Control({...object.controls[k],actionHandler:scaleFromCorner})]))};
}
