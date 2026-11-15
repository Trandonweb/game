import * as THREE from "three";

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const color=value=>new THREE.Color(value||"#607b91");
const mat=(value,roughness=.85)=>new THREE.MeshStandardMaterial({color:value,roughness});
function box(parent,material,x,y,z,w,h,d){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);parent.add(mesh);return mesh;
}
function labelTexture(title,subtitle,accent){
  const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext("2d");ctx.fillStyle="#101d2b";ctx.fillRect(0,0,1024,256);
  ctx.fillStyle=accent;ctx.fillRect(0,0,18,256);ctx.fillStyle="#f4f7fb";
  ctx.font="bold 78px system-ui";ctx.fillText(title,54,116);
  ctx.fillStyle="#9eb3c7";ctx.font="34px system-ui";ctx.fillText(subtitle,58,177);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}

// Octagonal and circular bowl templates share the same field and fence system.
function outlineRadius(angle,shape){
  if(shape==="circle")return 1;
  const sides=8,step=Math.PI*2/sides,offset=Math.PI/8;
  const local=((angle-offset)%step+step)%step-step/2;
  return Math.cos(Math.PI/sides)/Math.cos(local);
}
function addStands(scene,team,concrete,roofMat){
  const shape=team.parkShape||"octagon",outer=team.parkStyle==="dome"?112:103;
  const sections=shape==="circle"?64:8;
  const seatGeo=new THREE.BoxGeometry(2.8,.65,2.1);
  const seatMat=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.88});
  const total=sections*15, seats=new THREE.InstancedMesh(seatGeo,seatMat,total);
  const dummy=new THREE.Object3D(),palette=[color(team.primary),color(team.secondary),color("#697d8c")];
  let index=0;
  for(let s=0;s<sections;s++){
    const angle=(s/sections)*Math.PI*2;
    for(let row=0;row<15;row++){
      const r=outer+row*1.8,shapeR=outlineRadius(angle,shape);
      const x=Math.cos(angle)*r*shapeR,z=Math.sin(angle)*r*shapeR;
      dummy.position.set(x,12+row*.72,z);dummy.rotation.y=-angle+Math.PI/2;dummy.updateMatrix();
      seats.setMatrixAt(index,dummy.matrix);seats.setColorAt(index,palette[(s+row*3)%palette.length]);index++;
    }
  }
  seats.count=index;seats.instanceMatrix.needsUpdate=true;if(seats.instanceColor)seats.instanceColor.needsUpdate=true;scene.add(seats);
  // Two continuous-looking outer concourses follow the selected bowl template.
  for(let tier=0;tier<2;tier++){
    const radius=outer+28+tier*5,height=24+tier*7;
    const points=[];
    const count=shape==="circle"?80:8;
    for(let i=0;i<=count;i++){
      const a=i/count*Math.PI*2;
      const r=radius*outlineRadius(a,shape);
      points.push(new THREE.Vector3(Math.cos(a)*r,height,Math.sin(a)*r));
    }
    const curve=new THREE.CatmullRomCurve3(points,false,"centripetal");
    const rail=new THREE.Mesh(new THREE.TubeGeometry(curve,shape==="circle"?100:48,1.9,6,false),tier?mat("#435563"):concrete);
    scene.add(rail);
  }
  if(team.parkStyle!=="open"){
    const roofRadius=outer+31;
    const roof=new THREE.Mesh(new THREE.RingGeometry(outer+2,roofRadius,shape==="circle"?64:8),roofMat);
    roof.rotation.x=-Math.PI/2;roof.position.set(0,team.parkStyle==="dome"?43:37,0);scene.add(roof);
    if(team.parkStyle==="dome"){
      const dome=new THREE.Mesh(new THREE.SphereGeometry(roofRadius,32,12,0,Math.PI*2,0,Math.PI/2),roofMat);
      dome.scale.y=.28;dome.position.y=35;scene.add(dome);
    }
  }
}
function fenceRadius(angle,fence){
  // Outfield arc: left field -> center field -> right field.
  const x=Math.cos(angle),t=(x+1)/2;
  const base=t<.5?fence.left+(fence.center-fence.left)*(t*2):fence.center+(fence.right-fence.center)*((t-.5)*2);
  return base;
}
function addOutfieldFence(scene,team){
  const fence=team.fence||{left:77,center:91,right:77,leftHeight:8,centerHeight:10,rightHeight:8};
  const points=[],segments=72;
  for(let i=0;i<=segments;i++){
    const angle=Math.PI+(Math.PI*i/segments),r=fenceRadius(angle,fence);
    points.push(new THREE.Vector3(Math.cos(angle)*r,1.5,Math.sin(angle)*r));
  }
  const line=new THREE.CatmullRomCurve3(points,false,"centripetal");
  const railMat=mat(team.primary,.6);
  scene.add(new THREE.Mesh(new THREE.TubeGeometry(line,segments*2,1.15,8,false),railMat));
  for(let i=0;i<segments;i++){
    const a=Math.PI+Math.PI*i/segments,b=Math.PI+Math.PI*(i+1)/segments;
    const mid=(a+b)/2,r=fenceRadius(mid,fence),height=fenceHeight(mid,fence);
    const panel=new THREE.Mesh(new THREE.BoxGeometry(r*Math.PI/segments+1,height,1.2),mat("#315e4a",.9));
    panel.position.set(Math.cos(mid)*r,height/2,Math.sin(mid)*r);
    panel.rotation.y=-mid+Math.PI/2;scene.add(panel);
  }
}
function fenceHeight(angle,fence){
  const t=(Math.cos(angle)+1)/2;
  return t<.5?fence.leftHeight+(fence.centerHeight-fence.leftHeight)*(t*2):fence.centerHeight+(fence.rightHeight-fence.centerHeight)*((t-.5)*2);
}
function createPark(team){
  const scene=new THREE.Scene();scene.background=new THREE.Color("#9bb8c7");scene.fog=new THREE.Fog("#9bb8c7",190,390);
  scene.add(new THREE.HemisphereLight("#dceeff","#53634e",2.0));
  const sun=new THREE.DirectionalLight("#fff2d8",2.1);sun.position.set(-70,130,70);scene.add(sun);
  const grass=mat("#397c45",1),dirt=mat("#b58a5d",1),concrete=mat("#9aa7ad"),roof=mat("#d8e0e4",.7);
  const field=new THREE.Mesh(new THREE.PlaneGeometry(190,190),grass);field.rotation.x=-Math.PI/2;field.position.y=-.2;scene.add(field);
  for(let i=0;i<9;i++){
    const stripe=new THREE.Mesh(new THREE.PlaneGeometry(9,145),new THREE.MeshBasicMaterial({color:i%2?"#43884a":"#367640"}));
    stripe.rotation.x=-Math.PI/2;stripe.position.set(-36+i*9,.01,-9);scene.add(stripe);
  }
  const infield=new THREE.Mesh(new THREE.CircleGeometry(21,48),dirt);infield.rotation.x=-Math.PI/2;infield.position.set(0,.04,11);infield.scale.set(1,1.12,1);scene.add(infield);
  const mound=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.6,.55,24),dirt);mound.position.set(0,.32,-1);scene.add(mound);
  const baseGeo=new THREE.BoxGeometry(2.1,.22,2.1),baseMat=mat("#f5f2e8");
  [[0,0,22],[-10,0,11],[0,0,0],[10,0,11]].forEach(([x,,z])=>{const b=new THREE.Mesh(baseGeo,baseMat);b.position.set(x,.25,z);b.rotation.y=Math.PI/4;scene.add(b)});
  addOutfieldFence(scene,team);
  addStands(scene,team,concrete,roof);
  const board=new THREE.Mesh(new THREE.PlaneGeometry(34,9),new THREE.MeshBasicMaterial({map:labelTexture(team.name,team.city+" · "+team.stadium,team.primary)}));
  board.position.set(0,29,-108);scene.add(board);
  const poleMat=mat("#52616a");
  for(const x of [-125,125])for(const z of [-78,70]){
    box(scene,poleMat,x,30,z,1.3,43,1.3);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(11,1,2),new THREE.MeshBasicMaterial({color:"#f8f0d0"}));lamp.position.set(x,52,z);scene.add(lamp);
  }
  const bodyGeo=new THREE.CapsuleGeometry(.65,1.7,3,6),bodyMat=mat(team.secondary);
  const headGeo=new THREE.SphereGeometry(.48,8,6),headMat=mat("#d7b08b");
  [[0,1.2,-1],[-10,1.2,11],[10,1.2,11],[-25,1.2,-20],[25,1.2,-20],[0,1.2,22]].forEach(([x,y,z])=>{
    const body=new THREE.Mesh(bodyGeo,bodyMat);body.position.set(x,y,z);scene.add(body);
    const head=new THREE.Mesh(headGeo,headMat);head.position.set(x,y+1.4,z);scene.add(head);
  });
  if(team.parkStyle==="coastal"){
    const water=new THREE.Mesh(new THREE.PlaneGeometry(300,90),mat("#347d91",.45));water.rotation.x=-Math.PI/2;water.position.set(0,-1,-160);scene.add(water);
  }
  const cityMat=mat("#718895",1);
  for(let i=0;i<30;i++){const h=8+(i*17%29),w=5+(i*7%8),x=-160+i*11,z=-145-(i%3)*9;box(scene,cityMat,x,h/2,z,w,h,7)}
  return scene;
}

export async function mountStadium(host,teams,selectedId,onSelect){
  if(!host)return()=>{};
  host.innerHTML='<section class="stadium-shell"><div class="stadium-head"><div><div class="eyebrow">BALLPARK COLLECTION · ORIGINAL BOWL TEMPLATES</div><h2>다이아몬드의 무대</h2></div><p>팔각형·원형 구장 구조를 바탕으로 구장별 펜스를 조정했습니다</p></div><div class="stadium-canvas-wrap"><div class="stadium-loading">3D 구장을 불러오는 중…</div><div class="stadium-hint">드래그: 회전 · 스크롤: 확대/축소</div></div><div class="park-team-picker"></div></section>';
  const wrap=host.querySelector(".stadium-canvas-wrap"),picker=host.querySelector(".park-team-picker");
  picker.innerHTML=teams.map(t=>'<button class="park-team '+(t.id===selectedId?"selected":"")+'" data-team="'+t.id+'" style="--team-color:'+t.primary+'"><i></i><span>'+t.city+'<small>'+t.name+'</small></span></button>').join("");
  let renderer,scene,camera,frame=0,disposed=false,activeTeam=teams.find(t=>t.id===selectedId)||teams[0],dragging=false,lastX=0,lastY=0,yaw=.18,pitch=.48,distance=205;
  const canvas=document.createElement("canvas");wrap.append(canvas);
  const resize=()=>{if(!renderer||disposed)return;const w=Math.max(1,wrap.clientWidth),h=Math.max(1,wrap.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
  const showTeam=team=>{
    activeTeam=team;if(!renderer)return;
    if(scene)scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];list.forEach(m=>{m.map?.dispose?.();m.dispose?.()})}});
    scene=createPark(team);camera.position.set(Math.sin(yaw)*distance*Math.cos(pitch),Math.sin(pitch)*distance,Math.cos(yaw)*distance*Math.cos(pitch));camera.lookAt(0,12,-8);
  };
  const init=()=>{
    const mobile=window.matchMedia("(max-width: 700px)").matches;
    renderer=new THREE.WebGLRenderer({canvas,antialias:!mobile,alpha:false,powerPreference:"low-power"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.25));renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.05;
    camera=new THREE.PerspectiveCamera(43,1,.1,600);showTeam(activeTeam);resize();
    const loading=wrap.querySelector(".stadium-loading");if(loading)loading.remove();
    const animate=()=>{if(disposed)return;frame=requestAnimationFrame(animate);if(!dragging){yaw+=.00035;camera.position.set(Math.sin(yaw)*distance*Math.cos(pitch),Math.sin(pitch)*distance,Math.cos(yaw)*distance*Math.cos(pitch));camera.lookAt(0,12,-8)}renderer.render(scene,camera)};
    animate();
  };
  const pointerDown=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId)};
  const pointerMove=e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw-=dx*.006;pitch=clamp(pitch+dy*.004,.18,1.02)};
  const pointerUp=()=>{dragging=false};
  const wheel=e=>{distance=clamp(distance+e.deltaY*.12,150,280)};
  const choose=e=>{const button=e.target.closest("[data-team]");if(!button)return;selectedId=button.dataset.team;picker.querySelectorAll("[data-team]").forEach(el=>el.classList.toggle("selected",el===button));const team=teams.find(t=>t.id===selectedId);if(team){onSelect?.(team.id);showTeam(team)}};
  picker.addEventListener("click",choose);canvas.addEventListener("pointerdown",pointerDown);canvas.addEventListener("pointermove",pointerMove);canvas.addEventListener("pointerup",pointerUp);canvas.addEventListener("pointercancel",pointerUp);canvas.addEventListener("wheel",wheel,{passive:true});
  const observer=new ResizeObserver(resize);observer.observe(wrap);
  try{init()}catch(error){const loading=wrap.querySelector(".stadium-loading");if(loading)loading.textContent="이 브라우저에서는 3D 구장을 표시할 수 없습니다.";throw error}
  return()=>{disposed=true;cancelAnimationFrame(frame);observer.disconnect();picker.removeEventListener("click",choose);canvas.removeEventListener("pointerdown",pointerDown);canvas.removeEventListener("pointermove",pointerMove);canvas.removeEventListener("pointerup",pointerUp);canvas.removeEventListener("pointercancel",pointerUp);canvas.removeEventListener("wheel",wheel);if(scene)scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];list.forEach(m=>{m.map?.dispose?.();m.dispose?.()})}});renderer?.dispose();renderer?.forceContextLoss()};
}
