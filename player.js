import {cameraWallDistance} from './camera-collision.js';
import {poolAt,poolHeight,nearbyPool,crossingPoint} from './swimming.js';
import * as THREE from '../vendor/three.module.js';
import {groundHeight,walkHeight,BOUNDS,inPolygon,segmentPoint} from './geography.js';

export const PLAYER_SCALE=.78;
export function createPlayer(scene,canvas,camera,colliders,spawn=[0,31]){
  const group=new THREE.Group(),rig=new THREE.Group();group.add(rig);scene.add(group);
  const materials={skin:new THREE.MeshLambertMaterial({color:'#b59a71',flatShading:true}),shirt:new THREE.MeshLambertMaterial({color:'#f1e8c8',flatShading:true}),shorts:new THREE.MeshLambertMaterial({color:'#aa7bb3',flatShading:true}),hat:new THREE.MeshLambertMaterial({color:'#e4c97e',flatShading:true}),band:new THREE.MeshLambertMaterial({color:'#a483ad',flatShading:true}),hair:new THREE.MeshLambertMaterial({color:'#665d4a',flatShading:true})};
  function part(geo,mat,parent,x,y,z){const m=new THREE.Mesh(geo,materials[mat]);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
  const cylinder=(r1,r2,h)=>new THREE.CylinderGeometry(r1,r2,h,7);
  part(cylinder(.27,.31,.73),'shirt',rig,0,1.23,0).scale.z=.7;
  part(cylinder(.105,.11,.17),'skin',rig,0,1.68,0);
  part(new THREE.IcosahedronGeometry(.22,1),'skin',rig,0,1.91,0).scale.set(.88,1.17,.9);
  part(new THREE.SphereGeometry(.219,7,5,0,Math.PI*2,0,Math.PI*.53),'hair',rig,0,1.95,0);
  const hat=new THREE.Group();hat.position.set(0,2.11,0);hat.rotation.z=-.09;hat.rotation.x=.08;rig.add(hat);
  part(cylinder(.47,.49,.06),'hat',hat,0,0,0).scale.z=.88;
  part(cylinder(.24,.3,.23),'hat',hat,0,.12,0).scale.z=.9;
  part(cylinder(.294,.303,.065),'band',hat,0,.065,0).scale.z=.9;
  // The figure faces local +Z. Pivoted limbs create a simple gait.
  const arms=[],legs=[];
  for(const side of [-1,1]){
    const arm=new THREE.Group();arm.position.set(side*.34,1.54,0);rig.add(arm);
    part(cylinder(.115,.095,.28),'shirt',arm,0,-.1,0);part(cylinder(.066,.052,.43),'skin',arm,0,-.43,0);part(new THREE.IcosahedronGeometry(.072,0),'skin',arm,0,-.67,0);arms.push(arm);
    const leg=new THREE.Group();leg.position.set(side*.16,.9,0);rig.add(leg);
    part(cylinder(.16,.145,.4),'shorts',leg,0,-.12,0).scale.z=.88;part(cylinder(.073,.06,.49),'skin',leg,0,-.55,0);const foot=part(new THREE.IcosahedronGeometry(.12,0),'skin',leg,0,-.82,.045);foot.scale.set(.7,.55,1.4);legs.push(leg);
  }
  const keys=new Set();let yaw=0,pitch=.12,distance=10.5,drag=null,jumpRequested=false,verticalSpeed=0,grounded=true,phase=0,blocked=false,swimming=null;
  const velocity=new THREE.Vector3(),move=new THREE.Vector3(),target=new THREE.Vector3(),desired=new THREE.Vector3(),joystick=new THREE.Vector2();
  const inputCodes=new Set(['KeyW','KeyA','KeyS','KeyD','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','KeyQ','KeyE','ShiftLeft','ShiftRight','KeyR']);
  function travelTo(point,bearing=0){group.scale.setScalar(PLAYER_SCALE);hat.visible=true;swimming=null;rig.rotation.x=0;group.position.set(point[0],walkHeight(...point)+.065,point[1]);velocity.set(0,0,0);verticalSpeed=0;grounded=true;yaw=bearing;pitch=.12;rig.rotation.y=bearing+Math.PI;camera.position.set(group.position.x+Math.sin(yaw)*distance,group.position.y+3.2,group.position.z+Math.cos(yaw)*distance);camera.lookAt(group.position.clone().add(new THREE.Vector3(0,1.2,0)));}
  const reset=()=>travelTo(spawn,0);reset();
  const clearInput=()=>{keys.clear();joystick.set(0,0);drag=null;jumpRequested=false;document.querySelector('#stick').style.transform='';};
  window.addEventListener('keydown',e=>{if(blocked||e.target.closest?.('dialog,button,input,textarea'))return;if(inputCodes.has(e.code))e.preventDefault();keys.add(e.code);if(e.code==='Space'&&!e.repeat)jumpRequested=true;if(e.code==='KeyR')reset();});
  window.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',clearInput);document.addEventListener('visibilitychange',()=>{if(document.hidden)clearInput();});
  canvas.addEventListener('pointerdown',e=>{if(blocked)return;drag={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);canvas.focus({preventScroll:true});});
  canvas.addEventListener('pointermove',e=>{if(!drag||drag.id!==e.pointerId)return;yaw-=(e.clientX-drag.x)*.005;pitch=THREE.MathUtils.clamp(pitch+(e.clientY-drag.y)*.003,.05,.9);drag.x=e.clientX;drag.y=e.clientY;});
  canvas.addEventListener('pointerup',()=>drag=null);canvas.addEventListener('pointercancel',()=>drag=null);
  canvas.addEventListener('wheel',e=>{e.preventDefault();distance=THREE.MathUtils.clamp(distance+e.deltaY*.006,3.5,15);},{passive:false});
  const pad=document.querySelector('#joystick'),stick=document.querySelector('#stick');let padId=null;
  function updatePad(e){const r=pad.getBoundingClientRect();joystick.set((e.clientX-r.left-r.width/2)/40,(e.clientY-r.top-r.height/2)/40);if(joystick.length()>1)joystick.normalize();stick.style.transform=`translate(${joystick.x*34}px,${joystick.y*34}px)`;}
  pad.addEventListener('pointerdown',e=>{padId=e.pointerId;pad.setPointerCapture(e.pointerId);updatePad(e);});
  pad.addEventListener('pointermove',e=>{if(e.pointerId===padId)updatePad(e);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])pad.addEventListener(event,()=>{padId=null;joystick.set(0,0);stick.style.transform='';});
  document.querySelector('#jump').addEventListener('pointerdown',e=>{e.preventDefault();if(!blocked)jumpRequested=true;});
  function resolveCollision(){
    const p=group.position,radius=.27;
    const candidates=colliders.query?colliders.query(p.x,p.z,2):colliders;
    for(const c of candidates){
      if(String(c.id).startsWith("pool-"))continue;
      if(p.y>c.maxY||p.y+1.8<c.minY)continue;
      const dx=p.x-c.x,dz=p.z-c.z,px=c.w/2+radius-Math.abs(dx),pz=c.d/2+radius-Math.abs(dz);
      if(px<=0||pz<=0)continue;
      if(c.polygon){
        const inside=inPolygon(p.x,p.z,c.polygon);let nearest={d:Infinity};
        for(let i=0;i<c.polygon.length;i++){const q=segmentPoint(p.x,p.z,c.polygon[i],c.polygon[(i+1)%c.polygon.length]);if(q.d<nearest.d)nearest=q;}
        if(inside||nearest.d<radius){let nx=p.x-nearest.x,nz=p.z-nearest.z,d=Math.hypot(nx,nz);if(d<.00001){nx=p.x-c.x;nz=p.z-c.z;d=Math.hypot(nx,nz)||1;}const direction=inside?-1:1;p.x=nearest.x+nx/d*radius*direction;p.z=nearest.z+nz/d*radius*direction;velocity.x=0;velocity.z=0;}
      }else if(px<pz){p.x+=(dx<0?-1:1)*px;velocity.x=0;}else{p.z+=(dz<0?-1:1)*pz;velocity.z=0;}
    }
    p.x=THREE.MathUtils.clamp(p.x,BOUNDS.minX,BOUNDS.maxX);p.z=THREE.MathUtils.clamp(p.z,BOUNDS.minZ,BOUNDS.maxZ);
  }
  function toggleSwim(){if(blocked)return false;const near=nearbyPool(group.position.x,group.position.z);if(!near)return false;const entering=!swimming,p=crossingPoint(near.pool,near.edge,entering);if(!p)return false;const candidates=colliders.query?colliders.query(...p,1):colliders;if(candidates.some(c=>!String(c.id).startsWith('pool-')&&inPolygon(...p,c.polygon)))return false;group.position.set(p[0],entering?poolHeight(near.pool)-1.12:walkHeight(...p)+.065,p[1]);swimming=entering?near.pool:null;verticalSpeed=0;velocity.set(0,0,0);hat.visible=!swimming;return true;}
  return {group,materials,toggleSwim,get swimming(){return !!swimming;},setSeated(position,heading){group.scale.setScalar(PLAYER_SCALE);hat.visible=false;group.position.copy(position);rig.rotation.set(0,heading,0);rig.position.y=0;legs.forEach(o=>o.rotation.x=-1.25);arms.forEach(o=>o.rotation.x=-.8);},reset,clearInput,travelTo(point,bearing=0){clearInput();travelTo(point,bearing);},get yaw(){return yaw;},get moving(){return velocity.length()>.2;},setBlocked(value){blocked=value;if(value)clearInput();},update(dt,t,occluders){
    if(!blocked){
      yaw+=((keys.has('KeyQ')?1:0)-(keys.has('KeyE')?1:0))*dt*1.8;
      let x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0)+joystick.x;
      let z=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0)+joystick.y;
      move.set(x,0,z);if(move.length()>1)move.normalize();move.applyAxisAngle(new THREE.Vector3(0,1,0),yaw);
      swimming=poolAt(group.position.x,group.position.z);
      const speed=swimming?2.5:keys.has('ShiftLeft')||keys.has('ShiftRight')?16:4.8;
      velocity.lerp(move.multiplyScalar(speed),1-Math.exp(-dt*12));
      // Small substeps avoid tunnelling through narrow trunks when running.
      const steps=Math.max(1,Math.ceil(velocity.length()*dt/.14));
      for(let i=0;i<steps;i++){group.position.x+=velocity.x*dt/steps;group.position.z+=velocity.z*dt/steps;resolveCollision();}
      swimming=poolAt(group.position.x,group.position.z);
      if(jumpRequested&&grounded&&!swimming){verticalSpeed=6.3;grounded=false;}jumpRequested=false;
      verticalSpeed-=18*dt;group.position.y+=verticalSpeed*dt;
      const floor=walkHeight(group.position.x,group.position.z)+.065;
      if(swimming){group.position.y=poolHeight(swimming)-1.12+Math.sin(t*3)*.035;verticalSpeed=0;grounded=false;}
      if(!swimming&&group.position.y<=floor){group.position.y=floor;verticalSpeed=0;grounded=true;}
      if(velocity.length()>.12){const angle=Math.atan2(velocity.x,velocity.z);rig.rotation.y+=Math.atan2(Math.sin(angle-rig.rotation.y),Math.cos(angle-rig.rotation.y))*(1-Math.exp(-dt*14));}
    }else velocity.multiplyScalar(Math.exp(-dt*14));
    const speed=velocity.length();phase+=dt*speed*3.4;const gait=Math.min(speed/3.6,1);
    legs.forEach((leg,i)=>leg.rotation.x=grounded?Math.sin(phase+i*Math.PI)*.62*gait:-.25+(i*.5));
    arms.forEach((arm,i)=>{arm.rotation.x=grounded?-Math.sin(phase+i*Math.PI)*.48*gait:-.6;arm.rotation.z=(i?-.07:.07);});
    rig.position.y=grounded?Math.abs(Math.sin(phase))*.035*gait:0;
    rig.rotation.z=Math.sin(t*1.1)*.007*(1-gait);
    hat.visible=!swimming;rig.rotation.x=swimming?.14:0;
    if(swimming){rig.position.y=0;legs.forEach((leg,i)=>leg.rotation.x=Math.sin(t*7+i*Math.PI)*.28);arms.forEach((arm,i)=>{arm.rotation.x=-1.2+Math.sin(t*4+i*Math.PI)*.8;arm.rotation.z=(i?1:-1)*.45;});}
    target.copy(group.position).add(new THREE.Vector3(0,1.2,0));
    desired.set(Math.sin(yaw)*Math.cos(pitch)*distance,Math.sin(pitch)*distance+.5,Math.cos(yaw)*Math.cos(pitch)*distance).add(target);
    desired.y=Math.max(desired.y,groundHeight(desired.x,desired.z)+.65);
    const cameraRay=new THREE.Ray(target,new THREE.Vector3().subVectors(desired,target).normalize());
    let safeDistance=target.distanceTo(desired);
    safeDistance=cameraWallDistance(colliders.query?colliders.query(target.x,target.z,distance+2):colliders,target,cameraRay.direction,safeDistance);
    desired.copy(cameraRay.direction).multiplyScalar(safeDistance).add(target);
    camera.position.lerp(desired,1-Math.exp(-dt*7));camera.lookAt(target);
    // Fade obstructing walls so the character stays readable without camera jumps.
    const ray=new THREE.Raycaster(target,new THREE.Vector3().subVectors(camera.position,target).normalize(),0,target.distanceTo(camera.position));
    const hits=new Set(ray.intersectObjects(occluders,false).map(hit=>hit.object));
    for(const object of occluders){if(!object.userData.fadeMaterial){object.material=object.material.clone();object.material.transparent=true;object.material.opacity=1;object.userData.fadeMaterial=true;}const alpha=hits.has(object)?.22:1;object.material.opacity=THREE.MathUtils.lerp(object.material.opacity,alpha,1-Math.exp(-dt*8));object.material.depthWrite=object.material.opacity>.95;}
  }};
}

