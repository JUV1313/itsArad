import * as T from '../vendor/three.module.js';
import {GLTFLoader} from '../vendor/addons/loaders/GLTFLoader.js';
import {DRACOLoader} from '../vendor/addons/loaders/DRACOLoader.js';
import {RoomEnvironment} from '../vendor/addons/environments/RoomEnvironment.js';
// The source model faces -Z; the game's vehicle controller faces +Z.
export async function loadFerrari(renderer){
 const decoder=new DRACOLoader().setDecoderPath(new URL('../vendor/draco/',import.meta.url).href).setDecoderConfig({type:'wasm'});decoder.setWorkerLimit(1);
 const loader=new GLTFLoader().setDRACOLoader(decoder);let gltf;try{gltf=await loader.loadAsync(new URL('../assets/ferrari.glb',import.meta.url).href);}finally{decoder.dispose();}
 const model=gltf.scene.children[0],root=new T.Group(),body=new T.Group(),orientation=new T.Group();root.name='player-ferrari-458';root.add(body);body.add(orientation);orientation.rotation.y=Math.PI;orientation.add(model);
 const pmrem=new T.PMREMGenerator(renderer),room=new RoomEnvironment(),reflection=pmrem.fromScene(room,.04);room.dispose();pmrem.dispose();
 const paint=new T.MeshPhysicalMaterial({color:'#ff0000',metalness:1,roughness:.5,clearcoat:1,clearcoatRoughness:.03,envMap:reflection.texture,envMapIntensity:1});
 const details=new T.MeshStandardMaterial({color:'#ffffff',metalness:1,roughness:.35,envMap:reflection.texture});
 const glass=new T.MeshPhysicalMaterial({color:'#ffffff',metalness:.15,roughness:.04,transmission:1,thickness:.035,ior:1.5,envMap:reflection.texture});
 model.traverse(o=>{if(o.isMesh){o.castShadow=o.receiveShadow=true;for(const m of (Array.isArray(o.material)?o.material:[o.material])){m.envMap=reflection.texture;m.envMapIntensity=.7;}}});
 for(const name of ['rim_fl','rim_fr','rim_rl','rim_rr','trim'])model.getObjectByName(name).material=details;model.getObjectByName('body').material=paint;model.getObjectByName('glass').material=glass;
 const wheels=[],steering=[];
 for(const name of ['wheel_fl','wheel_fr','wheel_rl','wheel_rr']){const wheel=model.getObjectByName(name);const pivot=new T.Group();pivot.position.copy(wheel.position);model.add(pivot);pivot.add(wheel);wheel.position.set(0,0,0);wheels.push(wheel);if(name==='wheel_fl'||name==='wheel_fr')steering.push(pivot);}
 root.updateMatrixWorld(true);const bounds=new T.Box3().setFromObject(root),size=bounds.getSize(new T.Vector3());orientation.position.y=-bounds.min.y+.035;
 const driverSeat=new T.Object3D();driverSeat.position.set(.35,-.37,.12);body.add(driverSeat);
 for(const x of [-.68,.68]){const light=new T.SpotLight('#fff0d0',25,40,.5,.7,1.5);light.position.set(x,.55,2);light.target.position.set(x,.15,28);body.add(light,light.target);}
 const brakes=model.getObjectByName('lights_red');if(brakes?.material){brakes.material=brakes.material.clone();brakes.material.emissive=new T.Color('#f22216');}
 const steeringWheel=model.getObjectByName('steering_wheel'),steeringBase=steeringWheel.quaternion.clone();
 const colors={body:paint,details,glass};for(const [name,material] of Object.entries(colors)){const input=document.querySelector('#car-'+name);input?.addEventListener('input',()=>material.color.set(input.value));}
 document.querySelector('#car-status').textContent='Ferrari 458 Italia';
 return {root,body,wheels,steering,driverSeat,length:size.z,wheelRadius:.35,wheelDirection:-1,driverScale:.78,environment:reflection.texture,updateVisuals(input,day){paint.envMapIntensity=.22+.78*day;details.envMapIntensity=.2+.8*day;glass.envMapIntensity=.2+.8*day;if(brakes)brakes.material.emissiveIntensity=input.brake?2:.2;steeringWheel.quaternion.copy(steeringBase).multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(0,0,1),input.steer*.45));},dimensions:size};
}
