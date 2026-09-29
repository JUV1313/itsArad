// Intersect mapped wall segments, not their axis-aligned bounding rectangles.
export function cameraWallDistance(colliders,origin,direction,limit){
 let distance=limit;const cross=(ax,az,bx,bz)=>ax*bz-az*bx;
 for(const c of colliders){if(String(c.id).startsWith('pool-'))continue;const p=c.polygon;if(!p)continue;
  for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],sx=b[0]-a[0],sz=b[1]-a[1],den=cross(direction.x,direction.z,sx,sz);if(Math.abs(den)<1e-9)continue;const ax=a[0]-origin.x,az=a[1]-origin.z,t=cross(ax,az,sx,sz)/den,u=cross(ax,az,direction.x,direction.z)/den,y=origin.y+direction.y*t;if(t>.5&&t<distance+.45&&u>=0&&u<=1&&y>=c.minY&&y<=c.maxY)distance=Math.max(.7,t-.45);
  }
 }
 return distance;
}
