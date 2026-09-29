import {mapData,groundHeight,inPolygon,segmentPoint} from './geography.js';
export function poolHeight(pool){return Math.max(...pool.polygon.map(p=>groundHeight(...p)))+.25;}
export function poolAt(x,z){return (mapData.facilities?.pools||[]).find(p=>inPolygon(x,z,p.polygon))||null;}
export function poolEdge(pool,x,z){let best={d:Infinity};for(let i=0;i<pool.polygon.length;i++){const a=pool.polygon[i],b=pool.polygon[(i+1)%pool.polygon.length],q=segmentPoint(x,z,a,b);if(q.d<best.d)best={...q,a,b};}return best;}
export function nearbyPool(x,z,max=5){return (mapData.facilities?.pools||[]).map(pool=>({pool,edge:poolEdge(pool,x,z)})).filter(q=>q.edge.d<max||inPolygon(x,z,q.pool.polygon)).sort((a,b)=>a.edge.d-b.edge.d)[0]||null;}
export function crossingPoint(pool,edge,inside,distance=1.2){const dx=edge.b[0]-edge.a[0],dz=edge.b[1]-edge.a[1],len=Math.hypot(dx,dz);for(const sign of [-1,1]){const p=[edge.x+dz/len*distance*sign,edge.z-dx/len*distance*sign];if(inPolygon(...p,pool.polygon)===inside)return p;}return null;}
