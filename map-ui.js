import {mapData,groundHeight,BASE_ELEVATION,BOUNDS} from './geography.js';
export function createMapUI(destinations,onTravel){
 const mini=document.querySelector('#mini-map'),large=document.querySelector('#city-map'),base=document.createElement('canvas');base.width=1400;base.height=1220;
 const ctx=base.getContext('2d'),spanX=BOUNDS.maxX-BOUNDS.minX,spanZ=BOUNDS.maxZ-BOUNDS.minZ;
 const px=x=>(x-BOUNDS.minX)/spanX*base.width,pz=z=>(z-BOUNDS.minZ)/spanZ*base.height;
 // Height tint, hillshade, and 25 m contours are derived from the same terrain.
 const grid=110,values=[];
 for(let j=0;j<=grid;j++){values[j]=[];for(let i=0;i<=grid;i++){const x=BOUNDS.minX+spanX*i/grid,z=BOUNDS.minZ+spanZ*j/grid;values[j][i]=groundHeight(x,z)+BASE_ELEVATION;if(i===grid||j===grid)continue;const shade=(groundHeight(x+25,z)-groundHeight(x-25,z))*.28+(groundHeight(x,z+25)-groundHeight(x,z-25))*.2;const h=values[j][i];ctx.fillStyle=`hsl(${34+(h-400)*.018} 34% ${Math.max(49,Math.min(81,72+(h-530)*.025-shade))}%)`;ctx.fillRect(i*base.width/grid,j*base.height/grid,base.width/grid+1,base.height/grid+1);}}
 ctx.strokeStyle='#896b4240';ctx.lineWidth=.7;
 for(let j=0;j<grid;j++)for(let i=0;i<grid;i++){
  const corners=[[i,j,values[j][i]],[i+1,j,values[j][i+1]],[i+1,j+1,values[j+1][i+1]],[i,j+1,values[j+1][i]]],min=Math.min(...corners.map(c=>c[2])),max=Math.max(...corners.map(c=>c[2]));
  for(let level=Math.ceil(min/25)*25;level<max;level+=25){const hits=[];for(let k=0;k<4;k++){const a=corners[k],b=corners[(k+1)%4];if((a[2]<level)!==(b[2]<level)){const t=(level-a[2])/(b[2]-a[2]);hits.push([(a[0]+(b[0]-a[0])*t)*base.width/grid,(a[1]+(b[1]-a[1])*t)*base.height/grid]);}}if(hits.length>=2){ctx.beginPath();ctx.moveTo(...hits[0]);ctx.lineTo(...hits[1]);if(hits.length===4){ctx.moveTo(...hits[2]);ctx.lineTo(...hits[3]);}ctx.stroke();}}
 }
 function path(points){ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(px(p[0]),pz(p[1])):ctx.moveTo(px(p[0]),pz(p[1])));}
 ctx.fillStyle='#96a08070';for(const p of mapData.parks){path(p.p);ctx.fill();}
 ctx.fillStyle='#737b7e';for(const p of mapData.facilities?.parking||[])if(p.polygon){path(p.polygon);ctx.fill();}ctx.fillStyle='#36b5ce';for(const p of mapData.facilities?.pools||[]){path(p.polygon);ctx.fill();}
 ctx.fillStyle='#997c5750';for(const b of mapData.buildings){path(b.p);ctx.fill();}
 for(const road of mapData.roads){const foot=['path','track','footway','steps'].includes(road.kind);ctx.strokeStyle=foot?'#b1987360':'#fff3d8';ctx.lineWidth=foot?.8:['trunk','primary','secondary'].includes(road.kind)?2.8:1.3;path(road.p);ctx.stroke();}
 ctx.font='bold 16px Arial';ctx.textAlign='center';ctx.fillStyle='#675b47';ctx.direction='rtl';for(const n of mapData.neighborhoods)ctx.fillText(n.name,px(n.p[0]),pz(n.p[1]));
 document.querySelector('#destination-count').textContent=destinations.length;const list=document.querySelector('#destination-list');destinations.forEach((d,i)=>{const button=document.createElement('button');button.className='destination';button.setAttribute('aria-label','מעבר אל '+d.name);const number=document.createElement('span');number.className='number';number.textContent=String(i+1).padStart(2,'0');const text=document.createElement('span'),name=document.createElement('strong'),sub=document.createElement('small');name.textContent=d.name;sub.textContent=d.subtitle;text.append(name,sub);const arrow=document.createElement('span');arrow.className='arrow';arrow.textContent='↖';button.append(number,text,arrow);button.onclick=()=>onTravel(d);list.append(button);});
 large.addEventListener('click',event=>{const r=large.getBoundingClientRect(),scale=Math.min(r.width/large.width,r.height/large.height),width=large.width*scale,height=large.height*scale,x=(event.clientX-r.left-(r.width-width)/2)/width*base.width,z=(event.clientY-r.top-(r.height-height)/2)/height*base.height;let hit=null,distance=Infinity;for(const d of destinations){const gap=Math.hypot(px(d.p[0])-x,pz(d.p[1])-z);if(gap<distance){distance=gap;hit=d;}}if(hit&&distance<32)onTravel(hit);});
 function draw(canvas,player,yaw,local){const c=canvas.getContext('2d'),w=canvas.width,h=canvas.height;c.clearRect(0,0,w,h);let sx=0,sy=0,sw=base.width,sh=base.height;if(local){sw=1150/spanX*base.width;sh=sw*h/w;sx=px(player.x)-sw/2;sy=pz(player.z)-sh/2;}c.fillStyle='#d5ba92';c.fillRect(0,0,w,h);c.drawImage(base,sx,sy,sw,sh,0,0,w,h);const x2=x=>(px(x)-sx)/sw*w,z2=z=>(pz(z)-sy)/sh*h;
  for(let i=0;i<destinations.length;i++){const d=destinations[i],x=x2(d.p[0]),z=z2(d.p[1]);if(x<0||z<0||x>w||z>h)continue;c.beginPath();c.arc(x,z,local?9:15,0,Math.PI*2);c.fillStyle='#fff0d0';c.fill();c.strokeStyle='#af7950';c.lineWidth=2;c.stroke();c.font=`bold ${local?11:14}px Arial`;c.textAlign='center';c.textBaseline='middle';c.fillStyle='#98653f';c.fillText(i+1,x,z+.5);}
  const x=x2(player.x),z=z2(player.z);c.save();c.translate(x,z);c.rotate(-yaw);c.beginPath();c.moveTo(0,-12);c.lineTo(7,9);c.lineTo(0,5);c.lineTo(-7,9);c.closePath();c.fillStyle='#b85f38';c.shadowColor='#fff7df';c.shadowBlur=6;c.fill();c.restore();
  c.fillStyle='#705d42';c.font='bold 17px Arial';c.textAlign='left';c.fillText('N ↑',14,23);
  const scaleLength=(local?200:1000)/spanX*base.width/sw*w;c.strokeStyle='#7c6647';c.lineWidth=2;c.beginPath();c.moveTo(16,h-34);c.lineTo(16+scaleLength,h-34);c.stroke();c.font='13px Arial';c.fillText(local?'200 m':'1 km',16,h-46);
 }
 return {update(player,yaw){draw(mini,player,yaw,true);if(document.querySelector('#map-dialog').open)draw(large,player,yaw,false);}};
}
