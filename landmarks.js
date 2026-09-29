import * as T from '../vendor/three.module.js';
import {box,label,surface} from './facilities.js';
import {mapData,groundHeight,walkHeight,inPolygon,roadClearance,spatialIndex} from './geography.js';
import {blockedAt,vehicle} from './mobility.js';
export function createLandmarks(scene,world){
 const root=new T.Group();root.name='Arad shopping, station and Yehoshafat';scene.add(root);const data=mapData.landmarks,crowdHomes=[],buses=[],fronts=[],features=[],palmLights=[];if(!data)return {buses,crowdHomes,fronts,features,update(){}};
 const safe=(x,z,r=.5)=>!blockedAt(world.colliders,x,z,r)&&roadClearance(x,z)>.4;
 function crowd(p,zone,count=1){if(safe(...p))for(let i=0;i<count;i++)crowdHomes.push({p,zone});}
 function bench(x,z,yaw=0){if(!safe(x,z,1.3))return;const g=new T.Group();g.position.set(x,walkHeight(x,z),z);g.rotation.y=yaw;root.add(g);box(g,'#ac8b62',0,.48,0,2.1,.14,.52);box(g,'#ac8b62',0,.82,-.25,2.1,.55,.10);for(const x of [-.8,.8])box(g,'#65706b',x,.25,0,.08,.5,.45);}
 function planter(g,x,z,palm=false){const p=new T.Vector3(x,0,z);g.localToWorld(p);if(!safe(p.x,p.z,1.3))return;const h=groundHeight(p.x,p.z)-g.position.y;box(g,'#c2bcac',x,h+.5,z,1.8,1,1.8);box(g,'#756c4f',x,h+1.02,z,1.55,.05,1.55);box(g,'#8f826b',x,h+2.7,z,.22,3.4,.22);for(let j=0;j<6;j++){const angle=j*Math.PI/3,leaf=box(g,palm?['#c6a43f','#6f9e65','#b55f67'][j%3]:'#759068',x+Math.cos(angle)*.9,h+4.2,z+Math.sin(angle)*.9,2,.1,.45);if(palm){leaf.material=leaf.material.clone();leaf.material.emissive.copy(leaf.material.color);leaf.material.emissiveIntensity=.04;palmLights.push(leaf.material);}leaf.rotation.y=-angle;leaf.rotation.z=.22;} }
 function frame(a,b,offset=.12){const dx=b[0]-a[0],dz=b[1]-a[1],length=Math.hypot(dx,dz),mid=[(a[0]+b[0])/2,(a[1]+b[1])/2];return {dx:dx/length,dz:dz/length,length,mid};}
 function facade(building,kind){
  const p=building.p.slice(0,-1);let area=0;for(let i=0;i<p.length;i++)area+=p[i][0]*p[(i+1)%p.length][1]-p[(i+1)%p.length][0]*p[i][1];
  const reference=data[kind].p;
  const edges=p.map((a,i)=>({...frame(a,p[(i+1)%p.length]),a,b:p[(i+1)%p.length]})).filter(e=>e.length>(kind==='station'?15:40)).sort((a,b)=>Math.hypot(a.mid[0]-reference[0],a.mid[1]-reference[1])-Math.hypot(b.mid[0]-reference[0],b.mid[1]-reference[1]));
  const edge=edges[0];if(!edge)return;const sign=area>0?1:-1,nx=edge.dz*sign,nz=-edge.dx*sign,angle=Math.atan2(nx,nz);
  const slots=kind==='zim'?Math.floor(edge.length/9):kind==='mall'?1:3;
  for(let j=0;j<slots;j++){
   const t=(j+.5)/slots,x=edge.a[0]+(edge.b[0]-edge.a[0])*t+nx*.22,z=edge.a[1]+(edge.b[1]-edge.a[1])*t+nz*.22,y=groundHeight(x,z),g=new T.Group();g.position.set(x,y,z);g.rotation.y=angle;root.add(g);const width=kind==='mall'?18:edge.length/slots-.35;
   if(kind==='mall'){
    // Light stone blocks, shallow side towers and recessed glazed entrance seen in the exterior photo.
    for(const side of [-1,1])box(g,'#d8d1bd',side*10.2,5,.1,3.4,10.6,2.1);
    box(g,'#345665',0,3.7,.22,16,7.4,.12);box(g,'#263f46',0,1.8,.32,4.5,3.6,.1);
    for(let k=-7;k<=7;k+=2)box(g,'#9b9e93',k,3.7,.33,.075,7.4,.09);
    box(g,'#c7afa0',0,7.9,.6,23,.24,1.2);label(g,'קניון ערד',0,9,.38,'#526f71',10);box(g,'#e1d9c6',0,10.6,0,23,.35,2.4);
    for(let yy=.8;yy<10;yy+=1.25)for(const side of [-1,1])box(g,'#b1aa99',side*10.2,yy,1.17,3.4,.025,.02);
    for(const side of [-1,1]){bench(x+nx*8+edge.dx*side*13,z+nz*8+edge.dz*side*13,angle);planter(g,side*14,5);}
   }else{
    box(g,'#355b68',0,2,.13,width,3.8,.12);for(let k=-width/2;k<=width/2;k+=2)box(g,'#a7b4b4',k,2,.23,.075,3.8,.06);
    const names=kind==='zim'?['FOX','קסטרו','דלתא','סטימצקי','קפה קפה','אופיס דיפו','מחסני חשמל','הסטוק','פיצה האט','סיטי שופ']:['מידע · רב־קו','תחנה מרכזית ערד','מזנון'];
    const colors=kind==='zim'?['#739785','#c8a236','#75939e','#bc714e']:['#387b82'];
    box(g,colors[j%colors.length],0,5,.12,width,2,.3);label(g,names[j%names.length],0,4.35,.33,j%2?'#3e474a':'#667f70',Math.min(6,width-.3));
    box(g,'#c9c7bc',0,3.65,1.3,width,.15,2.8);
    if(kind==='zim'){planter(g,0,5,true);if(j%3===0){bench(x+nx*7+edge.dx*3,z+nz*7+edge.dz*3,angle);box(g,'#b8a27d',2,.72,6,1.1,.12,1.1);}}
   }
   fronts.push({kind,p:[x,z]});crowd([x+nx*3,z+nz*3],kind,3);crowd([x+nx*8+edge.dx*2,z+nz*8+edge.dz*2],kind,2);
  }
  if(kind==='mall')for(let u=-25;u<=25;u+=8)crowd([edge.mid[0]+nx*8+edge.dx*u,edge.mid[1]+nz*8+edge.dz*u],kind,3);
  const arrival=[edge.mid[0]+nx*(kind==='mall'?20:kind==='station'?11:15),edge.mid[1]+nz*(kind==='mall'?20:kind==='station'?11:15)],dest=world.destinations.find(d=>d.id===kind);
  if(dest){dest.arrival=arrival;dest.bearing=angle;dest.p=arrival;}
 }
 for(const kind of ['zim','mall','station'])for(const id of data[kind].buildings){const b=mapData.buildings.find(q=>q.id===id);if(b)facade(b,kind);}
 // Mall skylights are visible in the aerial reference.
 const mall=world.colliders.find(c=>c.id===99011774);if(mall)for(const z of [-95,-125]){const m=new T.Mesh(new T.ConeGeometry(10,5,4),new T.MeshStandardMaterial({color:'#547e99',metalness:.3,roughness:.25}));m.position.set(mall.x,mall.maxY+2.5,z);m.rotation.y=Math.PI/4;root.add(m);}
 const stationLots=mapData.facilities.parking.filter(p=>[178883768,178883770].includes(p.id));
 for(const lot of stationLots){const xs=lot.polygon.map(p=>p[0]),zs=lot.polygon.map(p=>p[1]);let n=0;
  for(let x=Math.min(...xs)+3;x<Math.max(...xs)-3;x+=4.6)for(let z=Math.min(...zs)+7;z<Math.max(...zs)-6;z+=16){
   if(buses.length>=14)break;const corners=[[-1.6,-5],[1.6,-5],[1.6,5],[-1.6,5]].map(p=>[x+p[0],z+p[1]]);
   if(!corners.every(p=>inPolygon(...p,lot.polygon)&&safe(...p,.35)))continue;
   const bus=vehicle(n++%2?'#5c9c7d':'#779dad',true);bus.root.position.set(x,groundHeight(x,z)+.09,z);root.add(bus.root);label(bus.root,['ערד','באר שבע','ים המלח'][n%3],0,2.75,4.56,'#263e3e',1.8);buses.push(bus);
   world.colliders.push({id:'terminal-bus-'+buses.length,x,z,w:3.2,d:10,polygon:corners,minY:groundHeight(x,z),maxY:groundHeight(x,z)+3.5});
   for(const side of [-1,1])box(root,'#e8c575',x+side*1.8,groundHeight(x+side*1.8,z)+.13,z,.12,.025,11);
  }
 }
 // Covered waiting bays follow the long edge of the mapped terminal building.
 const station=mapData.buildings.find(b=>b.id===178883771);if(station){const a=station.p[0],b=station.p[1],edge=frame(a,b),nx=-edge.dz,nz=edge.dx;
  for(let i=0;i<4;i++){const x=a[0]+(b[0]-a[0])*(i+.5)/4+nx*5,z=a[1]+(b[1]-a[1])*(i+.5)/4+nz*5;if(!safe(x,z,.6))continue;const g=new T.Group();g.position.set(x,groundHeight(x,z),z);g.rotation.y=-Math.atan2(edge.dz,edge.dx);root.add(g);box(g,'#d6d3c4',0,3,0,6.5,.18,3.5);for(const side of [-1,1])box(g,'#6e8080',side*2.8,1.5,-1.4,.1,3,.1);label(g,'רציף '+(i+1),0,2.65,1.78,'#2c777f',2);bench(x,z);crowd([x+nx*2,z+nz*2],'station',5);}
 }
 const park=data.park;
 surface(root,park.polygon,'#899c67',.065);
 for(const feature of park.features){features.push(feature);if(feature.kind==='dog_park'){
   const p=feature.polygon;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],len=Math.hypot(b[0]-a[0],b[1]-a[1]);for(let t=0;t<len;t+=2.5){if(i===0&&t<5)continue;const x=a[0]+(b[0]-a[0])*t/len,z=a[1]+(b[1]-a[1])*t/len;box(root,'#74816c',x,groundHeight(x,z)+.65,z,.05,1.3,.05);}const rail=box(root,'#74816c',(a[0]+b[0])/2,groundHeight((a[0]+b[0])/2,(a[1]+b[1])/2)+1.1,(a[1]+b[1])/2,len,.05,.05);rail.rotation.y=-Math.atan2(b[1]-a[1],b[0]-a[0]);}
   continue;
  }
  surface(root,feature.polygon,'#b78769',.09);const [x,z]=feature.p,g=new T.Group();g.position.set(x,groundHeight(x,z),z);root.add(g);
  for(const side of [-1,1]){for(const dz of [-1,1])box(g,'#6c998e',side*1.4,1.7,dz*1.4,.13,3.4,.13);box(g,'#e0bf66',side*1.4,2.8,0,.13,.12,2.8);}
  box(g,'#deb964',0,1.3,0,3,.2,3);const slide=box(g,'#64a8bb',0,.85,3,1.1,.12,4.2);slide.rotation.x=.38;for(let k=0;k<5;k++)box(g,'#e7c481',0,.25+k*.25,-1.6-k*.22,1,.1,.4);
  if(feature.id!==573537016){const sail=new T.BufferGeometry();sail.setAttribute('position',new T.Float32BufferAttribute([-6,4,-5,6,4.8,-5,6,4,5,-6,4,-5,6,4,5,-6,4.8,5],3));sail.computeVertexNormals();g.add(new T.Mesh(sail,new T.MeshLambertMaterial({color:'#e9ddc4',side:T.DoubleSide})));for(const sx of [-6,6])for(const sz of [-5,5])box(g,'#bdbfb0',sx,2.2,sz,.1,4.4,.1);}
  for(const dx of [-9,9]){bench(x+dx,z);crowd([x+dx,z+3],'park',4);}
 }
 // Place picnic furniture beside mapped paths, preserving existing road/path geometry.
 const paths=mapData.roads.filter(r=>['footway','path','pedestrian','cycleway'].includes(r.kind)&&r.p.some(p=>inPolygon(...p,park.polygon)));let furnished=0;
 for(const path of paths)for(let i=1;i<path.p.length&&furnished<24;i+=3){const p=path.p[i],prev=path.p[i-1],len=Math.hypot(p[0]-prev[0],p[1]-prev[1]);if(len<1)continue;const x=p[0]-(p[1]-prev[1])/len*3.5,z=p[1]+(p[0]-prev[0])/len*3.5;if(!inPolygon(x,z,park.polygon)||!safe(x,z,2))continue;bench(x,z);crowd([x+1,z+2],'park',2);furnished++;if(furnished%3===0){box(root,'#b79c77',x,groundHeight(x,z)+.75,z+2,2.1,.15,1.2);box(root,'#999689',x,groundHeight(x,z)+.35,z+2,.45,.7,.6);}}
 world.colliders.query=spatialIndex(world.colliders);world.crowdHomes=crowdHomes;world.stationBuses=buses;
 for(const d of world.destinations)if(blockedAt(world.colliders,...d.arrival,.5)){const original=[...d.arrival];let done=false;for(let r=2;r<40&&!done;r+=2)for(let k=0;k<16;k++){const p=[original[0]+Math.cos(k*Math.PI/8)*r,original[1]+Math.sin(k*Math.PI/8)*r];if(safe(...p)){d.arrival=p;done=true;break;}}}
 // Shared boxes are instanced by geometry/material; labels stay sharp as separate planes.
 root.updateMatrixWorld(true);const batches=new Map(),removed=[];root.traverse(o=>{if(!o.isMesh||o.geometry.type!=='BoxGeometry')return;const key=o.geometry.uuid+o.material.uuid;if(!batches.has(key))batches.set(key,{geo:o.geometry,mat:o.material,m:[]});batches.get(key).m.push(o.matrixWorld.clone());removed.push(o);});for(const o of removed)o.removeFromParent();for(const b of batches.values()){const mesh=new T.InstancedMesh(b.geo,b.mat,b.m.length);b.m.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
 return {buses,crowdHomes,fronts,features,update(hour=16){const night=1-T.MathUtils.smoothstep(Math.sin((hour-6)/12*Math.PI),-.12,.25);for(const material of palmLights)material.emissiveIntensity=.04+night*1.3;}};
}
