import * as THREE from '../vendor/three.module.js';
import {roadMarkings} from './road-markings.js';
import {mapData,elevationData,groundHeight,terrainBounds,BASE_ELEVATION,BOUNDS,inPolygon,nearestRoad,roadWidth,spatialIndex,roadClearance} from './geography.js';
export {groundHeight,LIMIT} from './geography.js';
let seed=92626;function random(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}const rand=(a,b)=>a+(b-a)*random();
const v=(x,y,z)=>new THREE.Vector3(x,y,z),cube=new THREE.BoxGeometry(1,1,1),rock=new THREE.IcosahedronGeometry(1,0),trunk=new THREE.CylinderGeometry(.18,.28,3.5,6);
const materials=new Map();function mat(c){if(!materials.has(c))materials.set(c,new THREE.MeshLambertMaterial({color:c,flatShading:true}));return materials.get(c);}
function mesh(geo,color,parent,x,y,z,sx=1,sy=sx,sz=sx){const o=new THREE.Mesh(geo,mat(color));o.position.set(x,y,z);o.scale.set(sx,sy,sz);o.castShadow=true;o.receiveShadow=true;parent.add(o);return o;}
function box(parent,c,x,y,z,w,h,d){return mesh(cube,c,parent,x,y,z,w,h,d);}
class GeometryBatch {
 constructor(){this.p=[];this.c=[];}
 tri(a,b,c,color){const col=new THREE.Color(color);this.p.push(...a,...b,...c);for(let i=0;i<3;i++)this.c.push(col.r,col.g,col.b);}
 quad(a,b,c,d,color){this.tri(a,b,c,color);this.tri(a,c,d,color);}
 geometry(g,color,position=[0,0,0]){const source=g.index?g.toNonIndexed():g,p=source.attributes.position;const col=new THREE.Color(color);for(let i=0;i<p.count;i++){this.p.push(p.getX(i)+position[0],p.getY(i)+position[1],p.getZ(i)+position[2]);this.c.push(col.r,col.g,col.b);}if(source!==g)source.dispose();}
 finish(parent,{shadow=false,flat=true}={}){if(!this.p.length)return null;const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(this.p,3));g.setAttribute('color',new THREE.Float32BufferAttribute(this.c,3));g.computeVertexNormals();g.computeBoundingSphere();const o=new THREE.Mesh(g,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:flat}));o.castShadow=shadow;o.receiveShadow=true;parent.add(o);return o;}
}
export function createWorld(scene){
 seed=92626;const root=new THREE.Group();scene.add(root);const colliders=[],details=[],secrets=[],occluders=[];
 const b=terrainBounds(),n=elevationData.size,p=[],indices=[],colors=[],color=new THREE.Color();
 for(let iz=0;iz<n;iz++)for(let ix=0;ix<n;ix++){
  const x=b.minX+(b.maxX-b.minX)*ix/(n-1),z=b.minZ+(b.maxZ-b.minZ)*iz/(n-1),h=elevationData.values[iz*n+ix];p.push(x,h-BASE_ELEVATION,z);
  color.set(h>560?'#d2bc95':h>420?'#c5a779':'#c7ac87');color.multiplyScalar(rand(.96,1.035));colors.push(color.r,color.g,color.b);
  if(ix<n-1&&iz<n-1){const a=iz*n+ix;indices.push(a,a+n,a+1,a+1,a+n,a+n+1);}
 }
 const terrainGeo=new THREE.BufferGeometry();terrainGeo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));terrainGeo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));terrainGeo.setIndex(indices);terrainGeo.computeVertexNormals();
 const terrain=new THREE.Mesh(terrainGeo,new THREE.MeshLambertMaterial({vertexColors:true,flatShading:true}));terrain.receiveShadow=true;root.add(terrain);
 // GIS polylines, resampled onto the DEM. Road widths are inferred when absent.
 const streetBatch=new GeometryBatch(),sidewalkBatch=new GeometryBatch(),lineBatch=new GeometryBatch(),pathBatch=new GeometryBatch();
 function strip(batch,a,c,width,color,lift){const len=Math.hypot(c[0]-a[0],c[1]-a[1]);if(len<.02||len>2000)return;const dx=(c[0]-a[0])/len,dz=(c[1]-a[1])/len,count=Math.ceil(len/5);for(let i=0;i<count;i++){const pts=[];for(const [t,s] of [[i/count,-1],[i/count,1],[(i+1)/count,1],[(i+1)/count,-1]]){const x=a[0]+(c[0]-a[0])*t-dz*width*.5*s,z=a[1]+(c[1]-a[1])*t+dx*width*.5*s;pts.push([x,groundHeight(x,z)+lift,z]);}batch.quad(...pts,color);}}
 const walkKinds=new Set(['footway','pedestrian','path','steps','track','cycleway']);
 for(const road of mapData.roads){const walk=walkKinds.has(road.kind),width=roadWidth(road);for(let i=1;i<road.p.length;i++){
  const a=road.p[i-1],c=road.p[i];if(Math.abs(a[0])>4400||Math.abs(a[1])>4000||Math.abs(c[0])>4400||Math.abs(c[1])>4000)continue;
  if(!walk)strip(sidewalkBatch,a,c,width+2.8,'#ddc8a8',.12);
  strip(walk?pathBatch:streetBatch,a,c,width,walk?'#c8b48e':'#8f9695',walk?.13:.18);

 }}
 const markings=roadMarkings(mapData.roads);for(const line of markings)strip(lineBatch,line.a,line.b,line.width,line.color,.21);sidewalkBatch.finish(root);streetBatch.finish(root);pathBatch.finish(root);lineBatch.finish(root);
 // OSM parks retain their actual outlines. Green is deliberately limited to them.
 const parkBatch=new GeometryBatch();
 function parkTriangle(a,b,c,depth=0){const length=Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(a[0]-c[0],a[1]-c[1]),Math.hypot(c[0]-b[0],c[1]-b[1]));if(length>22&&depth<6){const ab=[(a[0]+b[0])/2,(a[1]+b[1])/2],ac=[(a[0]+c[0])/2,(a[1]+c[1])/2],bc=[(b[0]+c[0])/2,(b[1]+c[1])/2];parkTriangle(a,ab,ac,depth+1);parkTriangle(ab,b,bc,depth+1);parkTriangle(ac,bc,c,depth+1);parkTriangle(ab,bc,ac,depth+1);return;}parkBatch.tri(...[a,c,b].map(q=>[q[0],groundHeight(...q)+.045,q[1]]),'#999b74');}
 for(const park of mapData.parks){if(mapData.landmarks?.park&&[mapData.landmarks.park.id,...mapData.landmarks.park.features.map(f=>f.id)].includes(park.id))continue;const ps=park.p.slice(0,-1);if(ps.length<3)continue;const triangles=THREE.ShapeUtils.triangulateShape(ps.map(q=>new THREE.Vector2(...q)),[]);for(const t of triangles){let [a,b,c]=t.map(i=>ps[i]);if((b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0])<0)[b,c]=[c,b];parkTriangle(a,b,c);}}
 parkBatch.finish(root);
 // Exact building footprints; heights use OSM when supplied, otherwise defaults.
 const chunks=new Map();function chunk(x,z){const key=Math.floor(x/220)+','+Math.floor(z/220);if(!chunks.has(key))chunks.set(key,{shell:new GeometryBatch(),detail:new GeometryBatch(),x:Math.floor(x/220)*220+110,z:Math.floor(z/220)*220+110});return chunks.get(key);}
 for(const building of mapData.buildings){
  const poly=building.p.slice(0,-1);if(poly.length<3)continue;
  const xs=poly.map(q=>q[0]),zs=poly.map(q=>q[1]),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),x=(minX+maxX)/2,z=(minZ+maxZ)/2;
  if(maxX-minX>250||maxZ-minZ>250)continue;
  const landmarkKind=Object.entries(mapData.landmarks||{}).find(([k,v])=>v.buildings?.includes(building.id))?.[0];
  const isSculpture=[805524639,805524640,805524641,805524642,1158257650,1158257651].includes(building.id);
  const ground=poly.map(q=>groundHeight(...q)),base=Math.min(...ground)-.15+(building.minHeight||0),top=Math.max(...ground)+Math.max(1,Math.min(55,building.height));
  const target=chunk(x,z),tint=landmarkKind?(landmarkKind==='zim'?'#87a69a':'#ddd6c1'):isSculpture?'#e3dcc9':['#dfcfad','#d4c2a0','#e6d9bf','#cdbb9d','#e2d2b4','#d7d8d1','#bdb8aa','#d4b9a3','#eae3d1','#c8c4b6'][building.id%10];
  const shape=new THREE.Shape(poly.map(q=>new THREE.Vector2(q[0]-x,-q[1]+z)));
  const geo=new THREE.ExtrudeGeometry(shape,{depth:top-base,bevelEnabled:false,steps:1});geo.rotateX(-Math.PI/2);target.shell.geometry(geo,tint,[x,base,z]);geo.dispose();
  const triangles=THREE.ShapeUtils.triangulateShape(poly.map(q=>new THREE.Vector2(...q)),[]);for(const t of triangles){const points=t.map(i=>[poly[i][0],top+.04,poly[i][1]]);const cross=(points[1][0]-points[0][0])*(points[2][2]-points[0][2])-(points[1][2]-points[0][2])*(points[2][0]-points[0][0]);if(cross>0)[points[1],points[2]]=[points[2],points[1]];target.shell.tri(...points,['#e6d9bd','#c8c5b9','#d3bba3','#c7c9c6'][building.id%4]);}
  colliders.push({x,z,w:maxX-minX,d:maxZ-minZ,minY:base,maxY:top,polygon:poly,id:building.id});
  if(isSculpture||landmarkKind)continue;
  let area=0;for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length];area+=a[0]*b[1]-b[0]*a[1];}
  for(let i=0;i<poly.length;i++){
   const a=poly[i],b=poly[(i+1)%poly.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);if(len<4)continue;const dx=(b[0]-a[0])/len,dz=(b[1]-a[1])/len,sign=area>0?1:-1,nx=dz*sign,nz=-dx*sign;
   const columns=Math.min(10,Math.floor(len/4.2)),floors=Math.min(7,Math.max(1,Math.floor((top-Math.max(...ground))/3.2)));
   for(let floor=0;floor<floors;floor++)for(let j=0;j<columns;j++){
    const t=(j+.5)/columns,cx=a[0]+(b[0]-a[0])*t+nx*.055,cz=a[1]+(b[1]-a[1])*t+nz*.055,y=top-1.4-floor*3.2,w=Math.min(1.25,len/columns*.26),h=.78;
    let q=[[cx-dx*w,y-h,cz-dz*w],[cx+dx*w,y-h,cz+dz*w],[cx+dx*w,y+h,cz+dz*w],[cx-dx*w,y+h,cz-dz*w]];if(building.id%4===0&&floor===0){const band=q.map(p=>[p[0],p[1]+1.02,p[2]]);target.detail.quad(...band,['#aa9380','#a6a59b','#b9a593'][building.id%3]);}if(area>0)q.reverse();target.detail.quad(...q,(building.id+j+floor)%7===0?'#b49a6d':'#607875');
   }
  }
  // Small inset roof volumes vary the silhouette without moving mapped walls.
  if(building.id%4===1&&maxX-minX>9&&maxZ-minZ>9&&[[-1.3,-1.3],[-1.3,1.3],[1.3,-1.3],[1.3,1.3]].every(([dx,dz])=>inPolygon(x+dx,z+dz,poly))){const g=cube.clone();g.scale(2.3,1.3,2.3);target.detail.geometry(g,tint,[x,top+.65,z]);g.dispose();}
  // A low parapet and a solar water-heater are stylized architectural details.
  if((maxX-minX)<45&&(maxZ-minZ)<45){const g=cube.clone();g.scale(2.2,.15,1.5);g.rotateX(-.35);target.detail.geometry(g,'#425c65',[x,top+.8,z]);g.dispose();const tank=new THREE.CylinderGeometry(.4,.4,1.7,7);tank.rotateZ(Math.PI/2);target.detail.geometry(tank,'#eee5d0',[x,top+1.4,z-.75]);tank.dispose();}
 }
 for(const c of chunks.values()){c.shell.finish(root,{shadow:true});const object=c.detail.finish(root,{shadow:true});if(object)details.push({object,x:c.x,z:c.z});}
 colliders.query=spatialIndex(colliders);
 const facilityOccupied=(x,z)=>[...(mapData.facilities?.parking||[]),...(mapData.facilities?.pools||[])].some(f=>f.polygon&&inPolygon(x,z,f.polygon))||(mapData.facilities?.fuel||[]).some(f=>Math.hypot(x-f.p[0],z-f.p[1])<28);
 const occupied=(x,z,r=1)=>facilityOccupied(x,z)||colliders.query(x,z,r).some(c=>inPolygon(x,z,c.polygon)||c.polygon.some(p=>Math.hypot(p[0]-x,p[1]-z)<r));
 // Plantings along streets and in parks are illustrative rather than surveyed trees.
 const treePositions=[],treeCells=new Map();const props=new THREE.Group();root.add(props);
 function tree(x,z,scale=1){if(x<BOUNDS.minX||x>BOUNDS.maxX||z<BOUNDS.minZ||z>BOUNDS.maxZ||occupied(x,z,2)||roadClearance(x,z)<1.2)return;const cx=Math.floor(x/5),cz=Math.floor(z/5);for(let i=cx-1;i<=cx+1;i++)for(let j=cz-1;j<=cz+1;j++)if((treeCells.get(i+","+j)||[]).some(p=>Math.hypot(x-p[0],z-p[1])<4))return;const key=cx+","+cz;if(!treeCells.has(key))treeCells.set(key,[]);treeCells.get(key).push([x,z]);treePositions.push([x,z]);const y=groundHeight(x,z);mesh(trunk,'#9d8b68',props,x,y+1.75,z,scale);for(let i=0;i<3;i++)mesh(rock,['#6d8667','#83946e','#738564'][i],props,x+(i-1)*1.05*scale,y+3.7*scale,z+Math.sin(i*3)*.7*scale,2.1*scale,1.2*scale,1.65*scale);}
 for(const t of mapData.trees||[])tree(...t.p,t.height?Math.max(.7,Math.min(1.9,t.height/5)):rand(.85,1.4));
 const roadNames=new Set();
 function sign(text,x,z){if(typeof document==='undefined'||!document.createElement)return;const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');if(!ctx)return;ctx.fillStyle='#536e69';ctx.fillRect(0,0,512,128);ctx.strokeStyle='#e8e7ce';ctx.lineWidth=6;ctx.strokeRect(9,9,494,110);ctx.font='bold 48px Arial';ctx.fillStyle='#fff6dc';ctx.textAlign='center';ctx.textBaseline='middle';ctx.direction='rtl';ctx.fillText(text,256,64,465);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(3.6,.9),new THREE.MeshBasicMaterial({map:tex,side:THREE.DoubleSide}));m.position.set(x,groundHeight(x,z)+2.5,z);props.add(m);box(props,'#858b7e',x,m.position.y-1.25,z,.07,2.5,.07);}
 for(const road of mapData.roads){if(!['primary','secondary','tertiary','residential'].includes(road.kind))continue;let dist=0;for(let i=1;i<road.p.length;i++){const a=road.p[i-1],b=road.p[i],len=Math.hypot(b[0]-a[0],b[1]-a[1]);dist+=len;if(len<1)continue;const nx=-(b[1]-a[1])/len,nz=(b[0]-a[0])/len,offset=roadWidth(road)/2+2.4;if(dist>85&&Math.abs(a[0])<3100&&Math.abs(a[1])<2800){tree(a[0]+nx*offset,a[1]+nz*offset,rand(.8,1.1));dist=0;}if(road.name&&!roadNames.has(road.name)&&roadNames.size<65&&len>18){roadNames.add(road.name);sign(road.name,a[0]+nx*offset,a[1]+nz*offset);}}}
 for(const park of mapData.parks){if(park.p.length<4)continue;const xs=park.p.map(q=>q[0]),zs=park.p.map(q=>q[1]);for(let i=0;i<Math.min(12,park.p.length);i++){const x=rand(Math.min(...xs),Math.max(...xs)),z=rand(Math.min(...zs),Math.max(...zs));if(inPolygon(x,z,park.p))tree(x,z,rand(.75,1.15));}}
 // OSM vegetation polygons: denser woodland, sparse dry scrub; no blanket desert lawn.
 for(const area of mapData.greenAreas||[]){const xs=area.p.map(p=>p[0]),zs=area.p.map(p=>p[1]),loX=Math.max(BOUNDS.minX,Math.min(...xs)),hiX=Math.min(BOUNDS.maxX,Math.max(...xs)),loZ=Math.max(BOUNDS.minZ,Math.min(...zs)),hiZ=Math.min(BOUNDS.maxZ,Math.max(...zs));const forest=['forest','wood'].includes(area.kind);for(let i=0;i<Math.min(180,Math.max(0,(hiX-loX)*(hiZ-loZ)/(forest?220:400)));i++){const x=rand(loX,hiX),z=rand(loZ,hiZ);if(!inPolygon(x,z,area.p)||occupied(x,z,1)||roadClearance(x,z)<1.2)continue;if(forest)tree(x,z,rand(.9,1.5));else mesh(rock,'#93966c',props,x,groundHeight(x,z)+.26,z,rand(.45,.9),.35,rand(.4,.8));}}
 // Sparse low shrubs and stones replace the former lawn, pond and dense woodland.
 for(let i=0;i<1500;i++){const x=rand(-3400,3500),z=rand(-2900,3100);if(occupied(x,z)||roadClearance(x,z)<1)continue;mesh(rock,i%3===0?'#aaa783':'#b6a07e',props,x,groundHeight(x,z)+.22,z,rand(.22,.65),rand(.2,.45),rand(.25,.7));}
 function safeNear(point,preferRoad=true){const r=preferRoad?nearestRoad(...point):null;const start=r&&r.d<160?[r.x,r.z]:point;for(let radius=0;radius<100;radius+=3)for(let j=0;j<12;j++){const a=j*Math.PI/6,x=start[0]+Math.cos(a)*radius,z=start[1]+Math.sin(a)*radius;if(!occupied(x,z,1.8))return [x,z];}return [...point];}
 const destinations=mapData.points.map(p=>{const arrival=safeNear(p.id==='moav'?[p.p[0]-22,p.p[1]-12]:p.p,p.preferRoad??(p.id!=='moav'&&p.id!=='gorni'));const secretPosition=safeNear([arrival[0]+12,arrival[1]+8],false);return {...p,arrival,secretPosition};});
 for(const destination of destinations.filter(d=>d.collectible!==false)){const [x,z]=destination.secretPosition,g=new THREE.Group();g.position.set(x,groundHeight(x,z)+1.65,z);root.add(g);const shape=mesh(new THREE.OctahedronGeometry(.58,0),'#ba815b',g,0,0,0);const halo=new THREE.Mesh(new THREE.RingGeometry(.8,.9,32),new THREE.MeshBasicMaterial({color:'#fff0bd',side:THREE.DoubleSide,transparent:true,opacity:.7}));halo.rotation.x=-Math.PI/2;halo.position.y=-1.3;g.add(halo);secrets.push({g,shape,halo,x,z,name:destination.name,index:secrets.length,baseY:g.position.y,found:false});}
 // Instance repeated decorative meshes; preserve GIS building batches separately.
 props.updateMatrixWorld(true);const batches=new Map();props.traverse(o=>{if(!o.isMesh||o.material.map)return;const key=o.geometry.uuid+o.material.uuid;if(!batches.has(key))batches.set(key,[]);batches.get(key).push(o);});for(const list of batches.values()){if(list.length<3)continue;const first=list[0],batch=new THREE.InstancedMesh(first.geometry,first.material,list.length);list.forEach((o,i)=>{batch.setMatrixAt(i,o.matrixWorld);o.removeFromParent();});batch.castShadow=true;batch.receiveShadow=true;batch.computeBoundingSphere();root.add(batch);}
 // A pale desert sky; all terrain beyond town comes from the same elevation grid.
 const sky=new THREE.Mesh(new THREE.SphereGeometry(19000,24,16),new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,uniforms:{top:{value:new THREE.Color('#70b0d1')},bottom:{value:new THREE.Color('#edddbe')}},vertexShader:'varying vec3 p;void main(){p=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 p;uniform vec3 top;uniform vec3 bottom;void main(){gl_FragColor=vec4(mix(bottom,top,smoothstep(-.04,.42,normalize(p).y)),1.);\n#include <colorspace_fragment>\n}'}));scene.add(sky);
 return {markings,sky,treePositions,root,colliders,occluders,secrets,destinations,spawn:destinations[0].arrival,safeNear,stats:{roads:mapData.roads.length,buildings:colliders.length},update(t,player){sky.position.copy(player);for(const d of details)d.object.visible=Math.hypot(d.x-player.x,d.z-player.z)<950;for(const s of secrets){if(s.found)continue;s.g.position.y=s.baseY+Math.sin(t*1.7+s.index)*.18;s.shape.rotation.y=t*.6;}}};
}

