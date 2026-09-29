// Geographic coordinates are preserved in metres: +X east, -Z north.
export let mapData, elevationData;
let queryRoads=()=>[];
export const BASE_ELEVATION=500;
export const LIMIT=3800;
export const BOUNDS={minX:-3600,maxX:3800,minZ:-3100,maxZ:3300};
export function configureGeography(map,elevation){mapData=map;elevationData=elevation;
 const segments=[];for(const r of map.roads)for(let i=1;i<r.p.length;i++){const a=r.p[i-1],b=r.p[i],width=roadWidth(r);if(Math.hypot(a[0]-b[0],a[1]-b[1])>2000)continue;segments.push({x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,w:Math.abs(a[0]-b[0])+width+3,d:Math.abs(a[1]-b[1])+width+3,a,b,width,walk:['footway','path','steps','pedestrian','track','cycleway'].includes(r.kind)});}queryRoads=spatialIndex(segments,60);}
export function project(lat,lon){return [(lon-mapData.origin.lon)*mapData.metresLon,(mapData.origin.lat-lat)*mapData.metresLat];}
export function unproject(x,z){return {lat:mapData.origin.lat-z/mapData.metresLat,lon:mapData.origin.lon+x/mapData.metresLon};}
export function terrainBounds(){const b=elevationData.bounds;const a=project(b.north,b.west),c=project(b.south,b.east);return {minX:a[0],minZ:a[1],maxX:c[0],maxZ:c[1]};}
export function groundHeight(x,z){
 if(!elevationData)throw Error('Geography must be configured before creating the world.');
 const {size,values}=elevationData,b=terrainBounds();
 const u=Math.max(0,Math.min(size-1.000001,(x-b.minX)/(b.maxX-b.minX)*(size-1))),v=Math.max(0,Math.min(size-1.000001,(z-b.minZ)/(b.maxZ-b.minZ)*(size-1)));
 const ix=Math.floor(u),iz=Math.floor(v),fx=u-ix,fz=v-iz,k=iz*size+ix;
 const h00=values[k],h10=values[k+1],h01=values[k+size],h11=values[k+size+1];
 // Same triangle split as the displayed terrain, so feet and roads agree exactly.
 return (fx+fz<=1?h00+(h10-h00)*fx+(h01-h00)*fz:h11+(h01-h11)*(1-fx)+(h10-h11)*(1-fz))-BASE_ELEVATION;
}
export function inPolygon(x,z,p){let inside=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a[1]>z)!==(b[1]>z)&&x<(b[0]-a[0])*(z-a[1])/(b[1]-a[1])+a[0])inside=!inside;}return inside;}
export function segmentPoint(x,z,a,b){const dx=b[0]-a[0],dz=b[1]-a[1],l=dx*dx+dz*dz;const t=l?Math.max(0,Math.min(1,((x-a[0])*dx+(z-a[1])*dz)/l)):0;const px=a[0]+dx*t,pz=a[1]+dz*t;return {x:px,z:pz,d:Math.hypot(x-px,z-pz),t};}
export function roadWidth(r){if(r.width)return Math.min(25,Math.max(1,r.width));if(['footway','path','steps','pedestrian','cycleway'].includes(r.kind))return r.kind==='pedestrian'?4:1.8;if(r.kind==='track')return 3.2;if(r.oneway&&r.lanes>=2)return Math.min(18,r.lanes*3.2);if(r.oneway)return ['primary','trunk','secondary'].includes(r.kind)?7:4.5;return {trunk:14,primary:12,secondary:10,tertiary:9,residential:7,service:4.5,unclassified:6}[r.kind]||5;}
export function nearestRoad(x,z,roads=mapData.roads){let best={d:Infinity};for(const road of roads)for(let i=1;i<road.p.length;i++){const p=segmentPoint(x,z,road.p[i-1],road.p[i]);if(p.d<best.d)best={...p,road};}return best;}
export function spatialIndex(items,cell=100){const bins=new Map();for(const item of items){for(let x=Math.floor((item.x-item.w/2)/cell);x<=Math.floor((item.x+item.w/2)/cell);x++)for(let z=Math.floor((item.z-item.d/2)/cell);z<=Math.floor((item.z+item.d/2)/cell);z++){const key=x+','+z;if(!bins.has(key))bins.set(key,[]);bins.get(key).push(item);}}return (x,z,r=2)=>{const result=new Set();for(let a=Math.floor((x-r)/cell);a<=Math.floor((x+r)/cell);a++)for(let b=Math.floor((z-r)/cell);b<=Math.floor((z+r)/cell);b++)for(const item of bins.get(a+','+b)||[])result.add(item);return [...result];};}

export function walkHeight(x,z){let lift=0;for(const s of queryRoads(x,z,2)){const d=segmentPoint(x,z,s.a,s.b).d;if(d<s.width/2)lift=Math.max(lift,s.walk?.13:.18);else if(!s.walk&&d<s.width/2+1.4)lift=Math.max(lift,.12);}return groundHeight(x,z)+lift;}

export function roadClearance(x,z,r=5){let distance=Infinity;for(const s of queryRoads(x,z,r))distance=Math.min(distance,segmentPoint(x,z,s.a,s.b).d-s.width/2);return distance;}
