import {terrainSurfaceGeometry} from './terrain-surface.js';
import {mergeGeometries} from '../vendor/addons/utils/BufferGeometryUtils.js';
import * as T from '../vendor/three.module.js';
import {mapData,groundHeight,inPolygon,roadClearance,nearestRoad,spatialIndex} from './geography.js';
import {blockedAt} from './mobility.js';
import {createTrafficCar} from './traffic-cars.js';
const cube=new T.BoxGeometry(1,1,1),materials=new Map();
function mat(color){if(!materials.has(color))materials.set(color,new T.MeshStandardMaterial({color,roughness:.8}));return materials.get(color);}
export function box(g,c,x,y,z,w,h,d){const m=new T.Mesh(cube,mat(c));m.position.set(x,y,z);m.scale.set(w,h,d);m.castShadow=m.receiveShadow=true;g.add(m);return m;}
function centre(p){return p.reduce((a,b)=>[a[0]+b[0]/p.length,a[1]+b[1]/p.length],[0,0]);}
export function surface(g,p,color,lift=.07,height=null){
 if(height===null){const material=mat(color);material.side=T.DoubleSide;const mesh=new T.Mesh(terrainSurfaceGeometry(p,lift),material);mesh.receiveShadow=true;mesh.userData.facilitySurface=true;g.add(mesh);return mesh;}
 const points=p.map(q=>new T.Vector2(...q)),triangles=T.ShapeUtils.triangulateShape(points,[]),vertices=[];
 function tri(a,b,c){if(Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(a[0]-c[0],a[1]-c[1]),Math.hypot(b[0]-c[0],b[1]-c[1]))>8){const ab=a.map((v,i)=>(v+b[i])/2),bc=b.map((v,i)=>(v+c[i])/2),ca=c.map((v,i)=>(v+a[i])/2);tri(a,ab,ca);tri(ab,b,bc);tri(ca,bc,c);tri(ab,bc,ca);return;}for(const q of [a,b,c])vertices.push(q[0],height??groundHeight(...q)+lift,q[1]);}
 for(const t of triangles)tri(...t.map(i=>p[i]));const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));geo.computeVertexNormals();const material=mat(color);material.side=T.DoubleSide;const mesh=new T.Mesh(geo,material);mesh.receiveShadow=true;mesh.userData.facilitySurface=true;g.add(mesh);return mesh;
}
export function label(g,text,x,y,z,color='#286886',w=3){
 if(typeof document==='undefined'||!document.createElement)return;
 const c=document.createElement('canvas');c.width=512;c.height=160;const ctx=c.getContext('2d');if(!ctx)return;ctx.fillStyle=color;ctx.fillRect(0,0,512,160);ctx.fillStyle='white';ctx.font='bold 56px Arial';ctx.direction='rtl';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(text,256,80,490);const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;const mesh=new T.Mesh(new T.PlaneGeometry(w,w*160/512),new T.MeshBasicMaterial({map:texture,side:T.DoubleSide}));mesh.position.set(x,y,z);g.add(mesh);
}
export function createFacilities(scene,world){
 const root=new T.Group();root.name='Mapped parking, fuel and pools';scene.add(root);const data=mapData.facilities,stalls=[],parked=[],pools=[],fuel=[];if(!data)return {update(){},stalls,parked,pools,fuel};
 const blocked=(x,z,r=.3)=>blockedAt(world.colliders,x,z,r);
 function solid(p,id){const xs=p.map(q=>q[0]),zs=p.map(q=>q[1]);world.colliders.push({id,polygon:p,x:(Math.min(...xs)+Math.max(...xs))/2,z:(Math.min(...zs)+Math.max(...zs))/2,w:Math.max(...xs)-Math.min(...xs),d:Math.max(...zs)-Math.min(...zs),minY:Math.min(...p.map(q=>groundHeight(...q)))-2,maxY:Math.max(...p.map(q=>groundHeight(...q)))+5});}
 for(const lot of data.parking){
  const [x,z]=lot.p,signY=groundHeight(x,z);if(!lot.polygon){label(root,'P',x,signY+2.5,z);box(root,'#858b8c',x,signY+1.2,z,.08,2.4,.08);continue;}
  const p=lot.polygon;surface(root,p,'#737b7e');if(mapData.landmarks&&[178883768,178883770].includes(lot.id))continue;
  const edge=p.map((a,i)=>({a,b:p[(i+1)%p.length]})).sort((a,b)=>Math.hypot(b.a[0]-b.b[0],b.a[1]-b.b[1])-Math.hypot(a.a[0]-a.b[0],a.a[1]-a.b[1]))[0];
  const yaw=Math.atan2(edge.b[1]-edge.a[1],edge.b[0]-edge.a[0]),c=Math.cos(yaw),s=Math.sin(yaw),local=p.map(q=>[(q[0]-x)*c+(q[1]-z)*s,-(q[0]-x)*s+(q[1]-z)*c]),to=(u,v)=>[x+u*c-v*s,z+u*s+v*c];let n=0;
  for(let u=Math.min(...local.map(q=>q[0]))+1.6;u<Math.max(...local.map(q=>q[0]))-1.5;u+=2.9)for(let v=Math.min(...local.map(q=>q[1]))+3;v<Math.max(...local.map(q=>q[1]))-2.6;v+=12){
   const corners=[[-1.35,-2.5],[1.35,-2.5],[1.35,2.5],[-1.35,2.5]].map(q=>to(u+q[0],v+q[1])),q=to(u,v);
   if(![...corners,q].every(q=>inPolygon(...q,p)&&roadClearance(...q)>1&&!blocked(...q)))continue;
   stalls.push({lot:lot.id,p:q,corners});for(const du of [-1.35,1.35]){const strip=[[-.055,-2.5],[.055,-2.5],[.055,2.5],[-.055,2.5]].map(a=>to(u+du+a[0],v+a[1]));surface(root,strip,'#eee8d9',.105);}
   if(n++%5===0&&parked.length<35){const car=createTrafficCar((lot.id+n)%7,['#dddeda','#758892','#afa59c','#303b46'][n%4]);car.root.position.set(q[0],groundHeight(...q)+.09,q[1]);car.root.rotation.y=-yaw;root.add(car.root);parked.push(car.root);solid(corners,'parked-'+lot.id+'-'+n);}
  }
  const sign=p[0];if(!blocked(...sign)&&roadClearance(...sign)>0){box(root,'#919b9c',sign[0],groundHeight(...sign)+1.3,sign[1],.08,2.6,.08);label(root,lot.access==='private'?'חניה פרטית':'P  חניה',sign[0],groundHeight(...sign)+2.6,sign[1]);}
 }
 // Nodes locate forecourts; canopy and pump layouts are illustrative, not surveyed.
 for(const f of data.fuel){
  const [x,z]=f.p,r=nearestRoad(x,z,mapData.roads.filter(r=>!['footway','path','steps'].includes(r.kind))),group=new T.Group();root.add(group);group.position.set(x,groundHeight(x,z),z);group.rotation.y=Math.atan2(r.x-x,r.z-z);const color=f.name.includes('פז')?'#d6b537':f.name.includes('סונול')?'#347799':'#da5d44';
  let placed=0;
  let best=null;
  for(let radius=0;radius<=18;radius+=2)for(let k=0;k<16;k++){
   const cx=x+Math.cos(k*Math.PI/8)*radius,cz=z+Math.sin(k*Math.PI/8)*radius,angle=group.rotation.y;
   const valid=[[-4.6,-3],[-4.6,3],[4.6,-3],[4.6,3],[-3.4,0],[3.4,0]].every(([a,b])=>{const px=cx+Math.cos(angle)*a+Math.sin(angle)*b,pz=cz-Math.sin(angle)*a+Math.cos(angle)*b;return !blocked(px,pz,.5)&&roadClearance(px,pz)>1;});
   if(valid&&!best)best=[cx,cz];
  }
  if(best)group.position.set(best[0],groundHeight(...best),best[1]);
  for(const side of [-1,1]){const point=new T.Vector3(side*3.4,0,0);group.localToWorld(point);if(blocked(point.x,point.z,1.4)||roadClearance(point.x,point.z)<1.4)continue;
   const y=groundHeight(point.x,point.z)-group.position.y;box(group,'#d5d3c8',side*3.4,y+.13,0,1.5,.26,4.7);box(group,'#e7e7dd',side*3.4,y+1.05,0,.85,1.8,.7);box(group,color,side*3.4,y+1.65,.36,.88,.55,.04);box(group,'#152c32',side*3.4,y+1.35,.385,.55,.3,.025);
   const hose=new T.Mesh(new T.TorusGeometry(.32,.035,6,18,Math.PI*1.65),mat('#272a2a'));hose.position.set(side*3.4+.58,y+1.15,0);group.add(hose);box(group,'#d1d4cc',side*3.4,y+2.4,-1.7,.18,4.8,.18);
   const p=[[-.8,-2.4],[.8,-2.4],[.8,2.4],[-.8,2.4]].map(a=>{const v=new T.Vector3(side*3.4+a[0],0,a[1]);group.localToWorld(v);return[v.x,v.z];});solid(p,'pump-'+f.id+'-'+side);placed++;
  }
  if(placed){const pad=[[-5,-3.5],[5,-3.5],[5,3.5],[-5,3.5]].map(([x,z])=>{const q=new T.Vector3(x,0,z);group.localToWorld(q);return[q.x,q.z];});surface(root,pad,'#9b9b92',.08);box(group,'#eeeee4',0,5,0,10,.3,7);box(group,color,0,5.23,0,10.1,.22,7.1);label(group,f.name,0,5.25,3.57,color,5);}
  label(group,f.name,0,2.8,5,color,3.5);fuel.push({id:f.id,p:f.p,pumps:placed});
 }
 for(const pool of data.pools){
  const p=pool.polygon,h=Math.max(...p.map(q=>groundHeight(...q)))+.25;
  const mesh=surface(root,p,'#36b5ce',0,h);mesh.material=new T.MeshPhysicalMaterial({color:'#35bbcf',roughness:.22,metalness:.25,clearcoat:1,side:T.DoubleSide});mesh.material.onBeforeCompile=shader=>{shader.uniforms.poolTime={value:0};shader.vertexShader='uniform float poolTime;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\n transformed.y += sin(position.x * 1.8 + poolTime) * cos(position.z * 1.3 + poolTime * .7) * .025;');mesh.userData.shader=shader;};
  for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],length=Math.hypot(b[0]-a[0],b[1]-a[1]),rim=box(root,'#eee5cd',(a[0]+b[0])/2,h+.1,(a[1]+b[1])/2,length,.22,.55);rim.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);const bottom=Math.min(groundHeight(...a),groundHeight(...b))-.15,wallHeight=h-bottom;const skirt=box(root,'#c4dce0',(a[0]+b[0])/2,bottom+wallHeight/2,(a[1]+b[1])/2,length,wallHeight,.18);skirt.rotation.copy(rim.rotation);}
  solid(p,'pool-'+pool.id);pools.push(mesh);
  if(inPolygon(...pool.p,data.country.polygon)){
   const xs=p.map(q=>q[0]),zs=p.map(q=>q[1]);
   for(let i=0;i<4;i++){const x=Math.max(...xs)+3.5,z=Math.min(...zs)+3+i*6;if(!inPolygon(x,z,data.country.polygon)||data.pools.some(q=>inPolygon(x,z,q.polygon))||blocked(x,z,2)||roadClearance(x,z)<1)continue;const y=groundHeight(x,z);box(root,'#efe3c9',x,y+.4,z,1,.18,2);const back=box(root,'#ddd3b9',x,y+.68,z-.8,1,.8,.12);back.rotation.x=-.35;box(root,'#b4aaa0',x+1.4,y+1.2,z,.06,2.4,.06);const umbrella=new T.Mesh(new T.ConeGeometry(1.55,.45,8),mat(i%2?'#e3b273':'#e3dbc6'));umbrella.position.set(x+1.4,y+2.5,z);root.add(umbrella);}
  }
 }
 const cp=data.country.polygon[10];label(root,'קאנטרי קלאב ערד',cp[0],groundHeight(...cp)+3,cp[1],'#36868b',6);
 world.colliders.query=spatialIndex(world.colliders);
 for(const d of world.destinations){if(!blocked(...d.arrival,.7))continue;const start=[...d.arrival];let found=false;for(let r=2;r<35&&!found;r+=2)for(let k=0;k<16;k++){const q=[start[0]+Math.cos(k*Math.PI/8)*r,start[1]+Math.sin(k*Math.PI/8)*r];if(!blocked(...q,.8)){d.arrival=q;found=true;break;}}}
 // Batch all repeated boxes; nearby parked cars retain their own detailed materials.
 root.updateMatrixWorld(true);const batches=new Map(),remove=[];root.traverse(o=>{if(o.isMesh&&o.geometry===cube){const key=o.material.uuid;if(!batches.has(key))batches.set(key,{material:o.material,matrices:[]});batches.get(key).matrices.push(o.matrixWorld.clone());remove.push(o);}});for(const o of remove)o.removeFromParent();for(const b of batches.values()){const m=new T.InstancedMesh(cube,b.material,b.matrices.length);b.matrices.forEach((q,i)=>m.setMatrixAt(i,q));m.castShadow=m.receiveShadow=true;root.add(m);}
 const surfaces=new Map();root.traverse(o=>{if(!o.userData.facilitySurface||pools.includes(o))return;const key=o.material.uuid;if(!surfaces.has(key))surfaces.set(key,{material:o.material,objects:[]});surfaces.get(key).objects.push(o);});for(const b of surfaces.values()){const merged=new T.Mesh(mergeGeometries(b.objects.map(o=>o.geometry)),b.material);merged.receiveShadow=true;for(const o of b.objects){o.removeFromParent();o.geometry.dispose();}root.add(merged);}
 return {stalls,parked,pools,fuel,update(t,player){for(const pool of pools)if(pool.userData.shader)pool.userData.shader.uniforms.poolTime.value=t;for(const car of parked)car.visible=car.position.distanceTo(player)<230;}};
}
