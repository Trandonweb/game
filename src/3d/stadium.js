import * as THREE from "three";

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const mat=(color,roughness=.82,metalness=0,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
const add=(parent,geometry,material,position=[0,0,0],rotation=[0,0,0])=>{
  const mesh=new THREE.Mesh(geometry,material);mesh.position.set(...position);mesh.rotation.set(...rotation);parent.add(mesh);return mesh;
};
const box=(parent,material,x,y,z,w,h,d,rotationY=0)=>{
  const mesh=add(parent,new THREE.BoxGeometry(w,h,d),material,[x,y,z],[0,rotationY,0]);return mesh;
};
function polygonRadius(angle,shape){
  if(shape==="circle")return 1;
  const step=Math.PI/4,offset=Math.PI/8;
  const local=((angle-offset)%step+step)%step-step/2;
  return Math.cos(Math.PI/8)/Math.cos(local);
}
function makeGrassTexture(){
  const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=1024;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#397a40";ctx.fillRect(0,0,1024,1024);
  for(let i=0;i<16;i++){
    ctx.fillStyle=i%2?"#438849":"#34733b";ctx.fillRect(i*64,0,64,1024);
  }
  for(let i=0;i<18000;i++){
    const x=Math.random()*1024,y=Math.random()*1024;
    ctx.fillStyle=Math.random()>.5?"#ffffff0b":"#071b0710";ctx.fillRect(x,y,1.5,1.5);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(2,2);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;return texture;
}
function makeSignTexture(team){
  const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext("2d");
  const gradient=ctx.createLinearGradient(0,0,1024,0);gradient.addColorStop(0,"#101a29");gradient.addColorStop(.5,"#26394b");gradient.addColorStop(1,"#101a29");
  ctx.fillStyle=gradient;ctx.fillRect(0,0,1024,256);ctx.fillStyle=team.primary;ctx.fillRect(0,0,18,256);
  ctx.strokeStyle="#ffffff28";ctx.lineWidth=4;ctx.strokeRect(20,20,984,216);
  ctx.fillStyle="#f4f7fb";ctx.font="900 76px system-ui";ctx.fillText(team.name,58,118);
  ctx.fillStyle="#c2d0dc";ctx.font="34px system-ui";ctx.fillText(team.city+"  /  "+team.stadium,62,180);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function addLine(scene,points,material,radius=.12){
  const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)));
  return add(scene,new THREE.TubeGeometry(curve,Math.max(24,points.length*8),radius,6,false),material);
}
function addBowl(scene,team){
  const shape=team.parkShape||"octagon",base=team.parkStyle==="dome"?112:103;
  const sections=shape==="circle"?96:8;
  const seatGeometry=new THREE.BoxGeometry(2.45,.62,1.7);
  const seatMaterials=[mat(team.primary,.72),mat(team.secondary,.72),mat("#526474",.85),mat("#d4dbe0",.82)];
  const seats=new THREE.InstancedMesh(seatGeometry,seatMaterials[0],sections*18*4);
  seats.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  const dummy=new THREE.Object3D(),palette=[0,1,2,0,2,1,3,0];
  let index=0;
  for(let section=0;section<sections;section++){
    const angle=section/sections*Math.PI*2;
    const radiusScale=polygonRadius(angle,shape);
    for(let tier=0;tier<2;tier++)for(let row=0;row<9;row++){
      const r=base+row*1.95+tier*25;
      const y=13+row*.82+tier*9;
      const x=Math.cos(angle)*r*radiusScale,z=Math.sin(angle)*r*radiusScale;
      dummy.position.set(x,y,z);dummy.rotation.set(-.08,-angle+Math.PI/2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
      seats.setMatrixAt(index,dummy.matrix);seats.setColorAt(index,new THREE.Color([team.primary,team.secondary,"#526474","#d4dbe0"][palette[(section*3+row+tier*2)%palette.length]]));index++;
    }
  }
  seats.count=index;seats.instanceMatrix.needsUpdate=true;scene.add(seats);
  const concrete=mat("#aeb8bd",.92),darkConcrete=mat("#64737d",.88),steel=mat("#354754",.62,.45);
  // Tier fascia, concourses and roof trusses.
  for(let tier=0;tier<3;tier++){
    const radius=base+20+tier*24,height=22+tier*9,points=[];
    const count=shape==="circle"?128:8;
    for(let i=0;i<=count;i++){const a=i/count*Math.PI*2,r=radius*polygonRadius(a,shape);points.push([Math.cos(a)*r,height,Math.sin(a)*r])}
    addLine(scene,points,tier===1?darkConcrete:concrete,2.3);
    const fascia=[];
    for(let i=0;i<=count;i++){const a=i/count*Math.PI*2,r=(radius+3)*polygonRadius(a,shape);fascia.push([Math.cos(a)*r,height-2,Math.sin(a)*r])}
    addLine(scene,fascia,steel,1.05);
  }
  for(let i=0;i<sections;i++){
    const a=i/sections*Math.PI*2,r=(base+60)*polygonRadius(a,shape);
    const support=box(scene,steel,Math.cos(a)*r,26,Math.sin(a)*r,2.2,30,2.2);
    support.rotation.z=Math.cos(a)*-.06;
  }
  if(team.parkStyle!=="open"){
    const roofOuter=base+65,roofInner=base+19;
    const roofShape=new THREE.Shape(),hole=new THREE.Path(),steps=shape==="circle"?96:8;
    for(let i=0;i<=steps;i++){const a=i/steps*Math.PI*2,r=roofOuter*polygonRadius(a,shape),x=Math.cos(a)*r,y=Math.sin(a)*r;i===0?roofShape.moveTo(x,y):roofShape.lineTo(x,y)}
    for(let i=steps;i>=0;i--){const a=i/steps*Math.PI*2,r=roofInner*polygonRadius(a,shape),x=Math.cos(a)*r,y=Math.sin(a)*r;i===steps?hole.moveTo(x,y):hole.lineTo(x,y)}
    roofShape.holes.push(hole);
    const roof=add(scene,new THREE.ShapeGeometry(roofShape,2),mat("#d8e1e5",.48,.18,{side:THREE.DoubleSide}),[0,team.parkStyle==="dome"?49:39,0],[-Math.PI/2,0,0]);
    roof.receiveShadow=true;
    const rim=[];
    for(let i=0;i<=steps;i++){const a=i/steps*Math.PI*2,r=roofOuter*polygonRadius(a,shape);rim.push([Math.cos(a)*r,team.parkStyle==="dome"?49:39,Math.sin(a)*r])}
    addLine(scene,rim,steel,1.6);
    if(team.parkStyle==="dome"){
      const shell=add(scene,new THREE.SphereGeometry(roofOuter,64,24,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:"#b8d1dc",roughness:.22,metalness:.08,transparent:true,opacity:.22,side:THREE.DoubleSide}),[0,38,0]);
      shell.scale.y=.38;
    }
  }
  // Small light strips and vomitory portals make the stands read as real architecture.
  const portalMat=mat("#182733",.8),lightMat=new THREE.MeshBasicMaterial({color:"#f5e6b4"});
  for(let i=0;i<sections;i+=Math.max(1,Math.floor(sections/16))){
    const a=i/sections*Math.PI*2,r=(base+18)*polygonRadius(a,shape);
    box(scene,portalMat,Math.cos(a)*r,19,Math.sin(a)*r,8,5,1.2,-a);
    const strip=box(scene,lightMat,Math.cos(a)*(r+4),27,Math.sin(a)*(r+4),10,.25,.35,-a);
  }
}
function interpolateFence(angle,fence){
  const t=(Math.cos(angle)+1)/2;
  return t<.5?fence.left+(fence.center-fence.left)*t*2:fence.center+(fence.right-fence.center)*(t-.5)*2;
}
function interpolateHeight(angle,fence){
  const t=(Math.cos(angle)+1)/2;
  return t<.5?fence.leftHeight+(fence.centerHeight-fence.leftHeight)*t*2:fence.centerHeight+(fence.rightHeight-fence.centerHeight)*(t-.5)*2;
}
function addFence(scene,team){
  const fence=team.fence||{left:78,center:92,right:78,leftHeight:8,centerHeight:10,rightHeight:8};
  const dark=mat("#1e4939",.68),cap=mat(team.primary,.45,.25),segments=96,posts=[];
  for(let i=0;i<=segments;i++){
    const a=Math.PI+Math.PI*i/segments,r=interpolateFence(a,fence),h=interpolateHeight(a,fence);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    posts.push([x,h,z]);
    if(i%4===0)box(scene,cap,x,h/2,z,.55,h,.7,-a);
  }
  for(let i=0;i<segments;i++){
    const a=Math.PI+Math.PI*(i+.5)/segments,r=interpolateFence(a,fence),h=interpolateHeight(a,fence);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const panel=box(scene,dark,x,h/2,z,r*Math.PI/segments+1,h,.55,-a);
    panel.material.side=THREE.DoubleSide;
  }
  addLine(scene,posts.map(p=>[p[0],p[1],p[2]]),cap,.55);
  addLine(scene,posts.map(p=>[p[0],.4,p[2]]),cap,.35);
  // Foul poles mark the two ends of the outfield wall.
  for(const a of [Math.PI,Math.PI*2]){
    const r=interpolateFence(a,fence),x=Math.cos(a)*r,z=Math.sin(a)*r,h=interpolateHeight(a,fence)+13;
    box(scene,mat("#f5d46f",.4),x,h/2,z,.65,h,.65);
    box(scene,mat("#f5d46f",.4),x,h,z,4,.35,.35);
  }
}
function addField(scene,team){
  const grass=mat("#ffffff",.96,0,{map:makeGrassTexture()});
  const dirt=mat("#b8875a",.96),chalk=mat("#f0ead8",.9),rubber=mat("#e4e0d4",.9);
  const field=add(scene,new THREE.PlaneGeometry(260,260),grass,[0,-.25,0],[-Math.PI/2,0,0]);field.receiveShadow=true;
  const infield=add(scene,new THREE.CircleGeometry(21,64),dirt,[0,.025,10],[-Math.PI/2,0,0]);infield.scale.set(1,1.15,1);
  const mound=add(scene,new THREE.CylinderGeometry(3.6,4.1,.7,32),dirt,[0,.35,-1]);
  add(scene,new THREE.BoxGeometry(1.8,.18,.5),rubber,[0,.73,-1]);
  const basePositions=[[0,.12,22],[-10,.12,11],[0,.12,0],[10,.12,11]];
  const bases=basePositions.map(([x,y,z])=>add(scene,new THREE.BoxGeometry(2.1,.3,2.1),rubber,[x,y,z],[0,Math.PI/4,0]));
  addLine(scene,[[0,.08,22],[-10,.08,11],[0,.08,0],[10,.08,11],[0,.08,22]],chalk,.14);
  addLine(scene,[[0,.08,22],[-92,.08,-70]],chalk,.12);
  addLine(scene,[[0,.08,22],[92,.08,-70]],chalk,.12);
  // Warning track around the outfield.
  const trackPoints=[];
  for(let i=0;i<=96;i++){const a=Math.PI+Math.PI*i/96,r=interpolateFence(a,team.fence||{left:78,center:92,right:78})-4;trackPoints.push([Math.cos(a)*r,.03,Math.sin(a)*r])}
  addLine(scene,trackPoints,dirt,2.1);
  // Dugouts and backstop.
  const dugoutMat=mat("#52616a",.76),roofMat=mat(team.primary,.48,.18);
  for(const side of [-1,1]){
    const x=side*24,z=17;
    box(scene,dugoutMat,x,1.5,z,17,3,8);
    box(scene,roofMat,x,3.3,z,18,.55,9);
    for(let j=-2;j<=2;j++)box(scene,mat("#263744"),x+j*2.6,1.45,z-4.1,.25,2.6,.25);
  }
  const backstop=add(scene,new THREE.TorusGeometry(16,.24,8,64,Math.PI),capMaterial(team),[0,5,29],[Math.PI/2,0,Math.PI]);
  // Bullpens: two separate warm-up areas beyond the foul territory.
  const bullpenFloor=mat("#a97850",.96),bullpenRail=mat("#344b59",.62,.25);
  for(const side of [-1,1]){
    const bx=side*48,bz=-30;
    const floor=add(scene,new THREE.CircleGeometry(11,32),bullpenFloor,[bx,.035,bz],[-Math.PI/2,0,0]);
    floor.scale.set(1.25,.72,1);
    box(scene,bullpenRail,bx,1.15,bz-9,29,2.3,.55);
    box(scene,bullpenRail,bx,1.15,bz+9,29,2.3,.55);
    for(let j=-1;j<=1;j++){
      const warmup=add(scene,new THREE.CylinderGeometry(1.25,1.25,.25,20),dirt,[bx+j*6,.18,bz]);
      box(scene,rubber,bx+j*6,.34,bz,.75,.12,.28);
    }
    box(scene,roofMat,bx,4.2,bz-9,30,.45,3);
    for(let j=-2;j<=2;j++)box(scene,dugoutMat,bx+j*5,2,bz-9,.35,3.5,.35);
  }
  // Visible player benches inside each dugout.
  for(const side of [-1,1]){
    const x=side*24,z=16.2;
    for(let row=0;row<2;row++){
      box(scene,mat("#9b7652"),x,1.05+row*.45,z+row*1.2,12,.22,.55);
      for(let j=-2;j<=2;j++)box(scene,mat("#344653"),x+j*2.4,1.65+row*.45,z+row*1.2,.18,.85,.18);
    }
  }
  return {grass,dirt};
}
function capMaterial(team){return mat(team.primary,.5,.2)}
function addStadiumDetails(scene,team){
  const steel=mat("#52616a",.55,.45),dark=mat("#17232d",.82),lamp=mat("#fff2cf",.25,.15,{emissive:"#fff0c4",emissiveIntensity:1.5});
  const sign=add(scene,new THREE.PlaneGeometry(48,11),new THREE.MeshBasicMaterial({map:makeSignTexture(team)}),[0,34,-112]);
  for(const x of [-132,132])for(const z of [-88,64]){
    box(scene,steel,x,29,z,1.6,52,1.6);
    const truss=box(scene,steel,x,55,z,17,1.4,3);truss.rotation.z=.08;
    for(let i=0;i<5;i++)box(scene,lamp,x-7+i*3.5,54,z,1.5,.6,1.2);
  }
  // Scoreboard and continuous LED ribbon.
  box(scene,dark,0,43,-122,55,15,3);
  add(scene,new THREE.PlaneGeometry(48,10),new THREE.MeshBasicMaterial({map:makeSignTexture(team)}),[0,43,-120]);
  const ribbonMat=mat(team.primary,.42,.25,{emissive:team.primary,emissiveIntensity:.35});
  const pts=[];for(let i=0;i<=96;i++){const a=i/96*Math.PI*2,r=team.parkShape==="circle"?124:124*polygonRadius(a,"octagon");pts.push([Math.cos(a)*r,29,Math.sin(a)*r])}
  addLine(scene,pts,ribbonMat,.65);
  // Urban backdrop with varied heights and rooftop silhouettes.
  const cityMats=[mat("#647985"),mat("#80939a"),mat("#526672")];
  for(let i=0;i<52;i++){
    const h=12+(i*19%47),w=7+(i*11%13),x=-220+i*8.6,z=-185-(i%5)*10;
    box(scene,cityMats[i%3],x,h/2,z,w,h,8);
    if(i%4===0)box(scene,steel,x,h+1,z,w*.35,2,8);
  }
}
function addCrowd(scene,team){
  const count=2400,geometry=new THREE.SphereGeometry(.22,5,4);
  const crowd=new THREE.InstancedMesh(geometry,mat("#ffffff",.95),count);
  const dummy=new THREE.Object3D(),colors=[team.primary,team.secondary,"#d9dce0","#b4a38a","#34485c"];
  for(let i=0;i<count;i++){
    const angle=Math.random()*Math.PI*2,rad=108+Math.random()*32,y=14+Math.random()*22;
    dummy.position.set(Math.cos(angle)*rad,y,Math.sin(angle)*rad);
    dummy.scale.set(.8,1.4,.8);dummy.updateMatrix();crowd.setMatrixAt(i,dummy.matrix);
    crowd.setColorAt(i,new THREE.Color(colors[Math.floor(Math.random()*colors.length)]));
  }
  crowd.instanceMatrix.needsUpdate=true;scene.add(crowd);
}
function createPark(team){
  const scene=new THREE.Scene();scene.background=new THREE.Color("#9fb9c9");scene.fog=new THREE.Fog("#9fb9c9",260,560);
  scene.add(new THREE.HemisphereLight("#e5f2ff","#4d594b",1.55));
  const ambient=new THREE.AmbientLight("#ffffff",.35);scene.add(ambient);
  const sun=new THREE.DirectionalLight("#fff0d4",3.1);sun.position.set(-100,150,85);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-170;sun.shadow.camera.right=170;sun.shadow.camera.top=170;sun.shadow.camera.bottom=-170;sun.shadow.bias=-.00025;scene.add(sun);
  const field=addField(scene,team);
  addFence(scene,team);addBowl(scene,team);addStadiumDetails(scene,team);addCrowd(scene,team);
  if(team.parkStyle==="coastal"){
    const water=add(scene,new THREE.PlaneGeometry(420,160),mat("#397e91",.34,.12),[0,-1,-245],[-Math.PI/2,0,0]);
    const horizon=mat("#c0d2d6",.9);for(let i=0;i<8;i++)box(scene,horizon,-190+i*54,4,-235-i%2*9,38,1,4);
  }
  if(team.parkStyle==="dome"){
    const roofShell=add(scene,new THREE.SphereGeometry(190,48,24,0,Math.PI*2,0,Math.PI/2),new THREE.MeshPhysicalMaterial({color:"#d8e8ef",roughness:.2,metalness:.08,transparent:true,opacity:.12,side:THREE.DoubleSide}),[0,5,0]);
    roofShell.scale.y=.62;
  }
  return scene;
}
export async function mountStadium(host,teams,selectedId,onSelect){
  if(!host)return()=>{};
  host.innerHTML='<section class="stadium-shell"><div class="stadium-head"><div><div class="eyebrow">BALLPARK COLLECTION · ARCHITECTURAL PREVIEW</div><h2>다이아몬드의 무대</h2></div><p>구장 구조·관중석·펜스·조명을 구단별로 설계한 3D 볼파크</p></div><div class="stadium-canvas-wrap"><div class="stadium-loading">3D 볼파크 렌더링 중…</div><div class="stadium-hint">드래그: 회전 · 스크롤: 확대/축소</div></div><div class="park-team-picker"></div></section>';
  const wrap=host.querySelector(".stadium-canvas-wrap"),picker=host.querySelector(".park-team-picker");
  picker.innerHTML=teams.map(t=>'<button class="park-team '+(t.id===selectedId?"selected":"")+'" data-team="'+t.id+'" style="--team-color:'+t.primary+'"><i></i><span>'+t.city+'<small>'+t.name+'</small></span></button>').join("");
  let renderer,scene,camera,frame=0,disposed=false,activeTeam=teams.find(t=>t.id===selectedId)||teams[0],dragging=false,lastX=0,lastY=0,yaw=.22,pitch=.38,distance=225;
  const canvas=document.createElement("canvas");wrap.append(canvas);
  const resize=()=>{if(!renderer||disposed)return;const w=Math.max(1,wrap.clientWidth),h=Math.max(1,wrap.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
  const showTeam=team=>{
    activeTeam=team;if(!renderer)return;
    if(scene)scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];list.forEach(m=>{m.map?.dispose?.();m.dispose?.()})}});
    scene=createPark(team);camera.position.set(Math.sin(yaw)*distance*Math.cos(pitch),Math.sin(pitch)*distance,Math.cos(yaw)*distance*Math.cos(pitch));camera.lookAt(0,16,-8);
  };
  const init=()=>{
    const mobile=window.matchMedia("(max-width: 700px)").matches;
    renderer=new THREE.WebGLRenderer({canvas,antialias:!mobile,alpha:false,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1.25:1.65));renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    camera=new THREE.PerspectiveCamera(42,1,.1,800);showTeam(activeTeam);resize();
    const loading=wrap.querySelector(".stadium-loading");if(loading)loading.remove();
    const clock=new THREE.Clock();
    const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);const dt=Math.min(clock.getDelta(),.05);if(!dragging){yaw+=dt*.018;camera.position.set(Math.sin(yaw)*distance*Math.cos(pitch),Math.sin(pitch)*distance,Math.cos(yaw)*distance*Math.cos(pitch));camera.lookAt(0,16,-8)}renderer.render(scene,camera)};
    animate();
  };
  const pointerDown=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId)};
  const pointerMove=e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw-=dx*.006;pitch=clamp(pitch+dy*.004,.12,.95)};
  const pointerUp=()=>{dragging=false};
  const wheel=e=>{distance=clamp(distance+e.deltaY*.14,155,320)};
  const choose=e=>{const button=e.target.closest("[data-team]");if(!button)return;selectedId=button.dataset.team;picker.querySelectorAll("[data-team]").forEach(el=>el.classList.toggle("selected",el===button));const team=teams.find(t=>t.id===selectedId);if(team){onSelect?.(team.id);showTeam(team)}};
  picker.addEventListener("click",choose);canvas.addEventListener("pointerdown",pointerDown);canvas.addEventListener("pointermove",pointerMove);canvas.addEventListener("pointerup",pointerUp);canvas.addEventListener("pointercancel",pointerUp);canvas.addEventListener("wheel",wheel,{passive:true});
  const observer=new ResizeObserver(resize);observer.observe(wrap);
  try{init()}catch(error){const loading=wrap.querySelector(".stadium-loading");if(loading)loading.textContent="이 브라우저에서는 3D 구장을 표시할 수 없습니다.";throw error}
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();picker.removeEventListener("click",choose);canvas.removeEventListener("pointerdown",pointerDown);canvas.removeEventListener("pointermove",pointerMove);canvas.removeEventListener("pointerup",pointerUp);canvas.removeEventListener("pointercancel",pointerUp);canvas.removeEventListener("wheel",wheel);if(scene)scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];list.forEach(m=>{m.map?.dispose?.();m.dispose?.()})}});renderer?.dispose();renderer?.forceContextLoss()};
}
