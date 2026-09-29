// Clip polygons to each DEM triangle so flat overlays follow the terrain exactly.
import * as T from '../vendor/three.module.js';
import {terrainBounds,elevationData,groundHeight} from './geography.js';
export function terrainSurfaceGeometry(p,lift){
 const verts=[],bounds=terrainBounds(),size=elevationData.size,dx=(bounds.maxX-bounds.minX)/(size-1),dz=(bounds.maxZ-bounds.minZ)/(size-1),cross=(a,b,c)=>(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);
 function clip(poly,triangle){const sign=Math.sign(cross(...triangle));for(let k=0;k<3&&poly.length;k++){const a=triangle[k],b=triangle[(k+1)%3],out=[];for(let i=0;i<poly.length;i++){const q=poly[i],r=poly[(i+1)%poly.length],dq=cross(a,b,q)*sign,dr=cross(a,b,r)*sign;if(dq>=-1e-8)out.push(q);if((dq>=0)!==(dr>=0)){const t=dq/(dq-dr);out.push([q[0]+(r[0]-q[0])*t,q[1]+(r[1]-q[1])*t]);}}poly=out;}return poly;}
 for(const indices of T.ShapeUtils.triangulateShape(p.map(q=>new T.Vector2(...q)),[])){const tri=indices.map(i=>p[i]),xs=tri.map(q=>q[0]),zs=tri.map(q=>q[1]),minI=Math.max(0,Math.floor((Math.min(...xs)-bounds.minX)/dx)),maxI=Math.min(size-2,Math.floor((Math.max(...xs)-bounds.minX)/dx)),minJ=Math.max(0,Math.floor((Math.min(...zs)-bounds.minZ)/dz)),maxJ=Math.min(size-2,Math.floor((Math.max(...zs)-bounds.minZ)/dz));
  for(let j=minJ;j<=maxJ;j++)for(let i=minI;i<=maxI;i++){const x=bounds.minX+i*dx,z=bounds.minZ+j*dz;for(const cell of [[[x,z],[x,z+dz],[x+dx,z]],[[x+dx,z],[x,z+dz],[x+dx,z+dz]]]){const poly=clip(tri,cell);for(let k=1;k<poly.length-1;k++)for(const q of [poly[0],poly[k],poly[k+1]])verts.push(q[0],groundHeight(...q)+lift,q[1]);}}
 }
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(verts,3));geo.computeVertexNormals();return geo;
}
