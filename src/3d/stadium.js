import * as THREE from "three";

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const hex=c=>new THREE.Color(c||"#557b91");

function addBox(group,material,x,y,z,w,h,d){
  const mesh=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),material);
  mesh.position.set(x,y,z);group.add(mesh);return mesh;
}
function makeLabelTexture(title,subtitle,color){
  const canvas=document.createElement("canvas");canvas.width=1024;canvas.height=256;
  const ctx=canvas.getContext("2d");
  ctx.fillStyle="#101d2b";ctx.fillRect(0,0,1024,256);
  ctx.fillStyle=color;ctx.fillRect(0,0,18,256);
  ctx.fillStyle="#f4f7fb";ctx.font="bold 78px system-ui";ctx.fillText(title,54,116);
  ctx.fillStyle="#9eb3c7";ctx.font="34px system-ui";ctx.fillText(subtitle,58,177);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;return texture;
}
function makeSeatBlock(scene,team){
  const geometry=new THREE.BoxGeometry(1.45,.7,1.1);
  const material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.85});
  const total=2100,mesh=new THREE.InstancedMesh(geometry,material,total);
  const dummy=new THREE.Object3D();let n=0;
  const colors=[hex(team.primary),hex(team.secondary),new THREE.Color("#667887")];
  const add=(x,y,z,index)=>{
    if(n>=total)return;
    dummy.position.set(x,y,z);dummy.rotation.y=(x>0?-.12:x<0?.12:0);dummy.updateMatrix();
    mesh.setMatrixAt(n,dummy.matrix);
    mesh.setColorAt(n,colors[(index*7+n)%colors.length]);n++;
  };
  for(let row=0;row<13;row++){
    const y=13+row*.72,z=-48+row*2.3;
    for(let x=-62;x<=62;x+=2.1)add(x,y,z,row);
    for(let side of [-1,1])for(let zz=-42;zz<=38;zz+=2.2)add(side*(57+row*.55),y,zz,row+1);
  }
  mesh.count=n;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;scene.add(mesh);
}
function createPark(team){
  const scene=new THREE.Scene();scene.background=new THREE.Color("#9bb8c7");scene.fog=new THREE.Fog("#9bb8c7",170,360);
  const accent=hex(team.primary),secondary=hex(team.secondary);
  const ambient=new THREE.HemisphereLight("#dceeff","#53634e",2.1);scene.add(ambient);
  const sun=new THREE.DirectionalLight("#fff2d8",2.2);sun.position.set(-70,130,70);scene.add(sun);
  const fieldMat=new THREE.MeshStandardMaterial({color:"#397c45",roughness:1});
  const dirtMat=new THREE.MeshStandardMaterial({color:"#b58a5d",roughness:1});
  const concrete=new THREE.MeshStandardMaterial({color:"#9aa7ad",roughness:.9});
  const darkConcrete=new THREE.MeshStandardMaterial({color:"#52616a",roughness:.95});
  const accentMat=new THREE.MeshStandardMaterial({color:accent,roughness:.65});
  const roofMat=new THREE.MeshStandardMaterial({color:"#d8e0e4",roughness:.7,metalness:.15});
  const grass=new THREE.Mesh(new THREE.PlaneGeometry(155,145),fieldMat);grass.rotation.x=-Math.PI/2;grass.position.y=-.2;scene.add(grass);
  // Outfield grass stripes are a small repeated set of low-cost planes.
  for(let i=0;i<9;i++){
    const stripe=new THREE.Mesh(new THREE.PlaneGeometry(8,120),new THREE.MeshBasicMaterial({color:i%2?"#43884a":"#367640"}));
    stripe.rotation.x=-Math.PI/2;stripe.position.set(-32+i*8,.01,-7);scene.add(stripe);
  }
  const infield=new THREE.Mesh(new THREE.CircleGeometry(21,48),dirtMat);infield.rotation.x=-Math.PI/2;infield.position.set(0,.04,11);infield.scale.set(1,1.12,1);scene.add(infield);
  const mound=new THREE.Mesh(new THREE.CylinderGeometry(3.2,3.6,.55,24),dirtMat);mound.position.set(0,.32,-1);scene.add(mound);
  const baseGeo=new THREE.BoxGeometry(2.1,.22,2.1),baseMat=new THREE.MeshStandardMaterial({color:"#f5f2e8"});
  [[0,0,22],[-10,0,11],[0,0,0],[10,0,11]].forEach(([x,_,z])=>{const b=new THREE.Mesh(baseGeo,baseMat);b.position.set(x,.25,z);b.rotation.y=Math.PI/4;scene.add(b)});
  const fenceCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-53,2,18),new THREE.Vector3(-46,2,-19),new THREE.Vector3(-25,2,-48),new THREE.Vector3(0,2,-58),new THREE.Vector3(25,2,-48),new THREE.Vector3(46,2,-19),new THREE.Vector3(53,2,18)]);
  const fence=new THREE.Mesh(new THREE.TubeGeometry(fenceCurve,70,1.15,8,false),accentMat);scene.add(fence);
  // Three-sided stands with two tiers; seat geometry is instanced.
  addBox(scene,concrete,0,9,-66,150,18,20);
  addBox(scene,concrete,-70,8,-9,20,16,112);addBox(scene,concrete,70,8,-9,20,16,112);
  addBox(scene,darkConcrete,0,21,-67,145,5,18);
  addBox(scene,darkConcrete,-70,19,-9,17,5,108);addBox(scene,darkConcrete,70,19,-9,17,5,108);
  makeSeatBlock(scene,team);
  if(team.parkStyle!=="open"){
    const roofDepth=team.parkStyle==="dome"?36:19;
    addBox(scene,roofMat,0,36,-60,160,3,roofDepth);
    addBox(scene,roofMat,-74,31,-8,5,3,105);addBox(scene,roofMat,74,31,-8,5,3,105);
    if(team.parkStyle==="dome"){
      const arch=new THREE.Mesh(new THREE.TorusGeometry(65,2.4,8,80,Math.PI),roofMat);
      arch.rotation.z=Math.PI;arch.position.set(0,31,-30);scene.add(arch);
    }
  }
  // Scoreboard and floodlight masts.
  const board=new THREE.Mesh(new THREE.PlaneGeometry(34,9),new THREE.MeshBasicMaterial({map:makeLabelTexture(team.name,team.city+" · "+team.stadium,team.primary)}));
  board.position.set(0,27,-77);scene.add(board);
  for(const x of [-79,79])for(const z of [-54,29]){
    addBox(scene,darkConcrete,x,30,z,1.1,43,1.1);
    const lamp=new THREE.Mesh(new THREE.BoxGeometry(10,1,2),new THREE.MeshBasicMaterial({color:"#f8f0d0"}));
    lamp.position.set(x,52,z);scene.add(lamp);
  }
  // Small player silhouettes to give scale without loading character assets.
  const bodyGeo=new THREE.CapsuleGeometry(.65,1.7,3,6),bodyMat=new THREE.MeshStandardMaterial({color:secondary});
  const headGeo=new THREE.SphereGeometry(.48,8,6),headMat=new THREE.MeshStandardMaterial({color:"#d7b08b"});
  const positions=[[0,1.2,-1],[-10,1.2,11],[10,1.2,11],[-25,1.2,-20],[25,1.2,-20],[0,1.2,22]];
  for(const [x,y,z] of positions){const body=new THREE.Mesh(bodyGeo,bodyMat);body.position.set(x,y,z);scene.add(body);const head=new THREE.Mesh(headGeo,headMat);head.position.set(x,y+1.4,z);scene.add(head)}
  if(team.parkStyle==="coastal"){
    const water=new THREE.Mesh(new THREE.PlaneGeometry(260,70),new THREE.MeshStandardMaterial({color:"#347d91",roughness:.45,metalness:.12}));
    water.rotation.x=-Math.PI/2;water.position.set(0,-1,-132);scene.add(water);
    for(let i=0;i<5;i++)addBox(scene,roofMat,-95+i*47,3,-92,18,2,8);
  }
  // Low-poly skyline backdrop.
  const cityMat=new THREE.MeshStandardMaterial({color:"#718895",roughness:1});
  for(let i=0;i<25;i++){
    const h=8+(i*17%29),w=5+(i*7%8),x=-135+i*11,z=-110-(i%3)*9;
    addBox(scene,cityMat,x,h/2,z,w,h,7);
  }
  return scene;
}

export async function mountStadium(host,teams,selectedId,onSelect){
  if(!host)return()=>{};
  host.innerHTML='<section class="stadium-shell"><div class="stadium-head"><div><div class="eyebrow">BALLPARK COLLECTION · 10 ORIGINAL PARKS</div><h2>다이아몬드의 무대</h2></div><p>구장을 선택하고 드래그해 둘러보세요</p></div><div class="stadium-canvas-wrap"><div class="stadium-loading">3D 구장을 준비하고 있습니다…</div><div class="stadium-hint">드래그: 회전 · 스크롤: 확대/축소</div></div><div class="park-team-picker"></div></section>';
  const wrap=host.querySelector(".stadium-canvas-wrap"),picker=host.querySelector(".park-team-picker");
  picker.innerHTML=teams.map(t=>'<button class="park-team '+(t.id===selectedId?"selected":"")+'" data-team="'+t.id+'" style="--team-color:'+t.primary+'"><i></i><span>'+t.city+'<small>'+t.name+'</small></span></button>').join("");
  picker.addEventListener("click",e=>{
    const button=e.target.closest("[data-team]");if(!button)return;
    selectedId=button.dataset.team;picker.querySelectorAll("[data-team]").forEach(el=>el.classList.toggle("selected",el===button));
    const team=teams.find(t=>t.id===selectedId);if(team){onSelect?.(team.id);showTeam(team)}
  });
  const loading=wrap.querySelector(".stadium-loading");
  let renderer,scene,camera,frame=0,disposed=false,activeTeam=teams.find(t=>t.id===selectedId)||teams[0],dragging=false,lastX=0,lastY=0,yaw=0.18,pitch=.48,distance=185;
  const canvas=document.createElement("canvas");wrap.append(canvas);
  const resize=()=>{
    if(!renderer||disposed)return;
    const w=Math.max(1,wrap.clientWidth),h=Math.max(1,wrap.clientHeight);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  };
  const showTeam=team=>{
    activeTeam=team;
    if(!renderer)return;
    if(scene)scene.traverse(o=>{if(o.geometry)o.geometry.dispose?.();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{if(m.map)m.map.dispose?.();m.dispose?.()})}});
    scene=createPark(team);camera.position.set(Math.sin(yaw)*distance*Math.cos(pitch),Math.sin(pitch)*distance,Math.cos(yaw)*distance*Math.cos(pitch));camera.lookAt(0,10,-14);
  };
  const init=async()=>{
    const THREE=await import("three");
    if(disposed)return;
    const mobile=matchMedia("(max-width: 700px)").matches;
    renderer=new THREE.WebGLRenderer({canvas,antialias:!mobile,alpha:false,powerPreference:"low-power"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.35));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure=1.05;
    camera=new THREE.PerspectiveCamera(43,1,.1,500);
    showTeam(activeTeam);resize();loading.remove();
    const animate=()=>{
      if(disposed)return;
      frame=requestAnimationFrame(animate);
      if(!dragging){yaw+=.00045;camera.position.set(Math.sin(yaw)*distance*Math.cos(pitch),Math.sin(pitch)*distance,Math.cos(yaw)*distance*Math.cos(pitch));camera.lookAt(0,10,-14)}
      renderer.render(scene,camera);
    };
    animate();
  };
  const pointerDown=e=>{dragging=true;lastX=e.clientX;lastY=e.clientY;canvas.setPointerCapture?.(e.pointerId)};
  const pointerMove=e=>{if(!dragging)return;const dx=e.clientX-lastX,dy=e.clientY-lastY;lastX=e.clientX;lastY=e.clientY;yaw-=dx*.006;pitch=clamp(pitch+dy*.004,.18,1.02)};
  const pointerUp=()=>{dragging=false};
  const wheel=e=>{distance=clamp(distance+e.deltaY*.12,125,245)};
  canvas.addEventListener("pointerdown",pointerDown);canvas.addEventListener("pointermove",pointerMove);canvas.addEventListener("pointerup",pointerUp);canvas.addEventListener("pointercancel",pointerUp);canvas.addEventListener("wheel",wheel,{passive:true});
  const observer=new ResizeObserver(resize);observer.observe(wrap);
  try{await init()}catch(error){loading.textContent="3D 렌더링을 시작할 수 없습니다. WebGL을 지원하는 브라우저에서 다시 시도해 주세요.";throw error}
  return()=>{
    disposed=true;cancelAnimationFrame(frame);observer.disconnect();
    canvas.removeEventListener("pointerdown",pointerDown);canvas.removeEventListener("pointermove",pointerMove);canvas.removeEventListener("pointerup",pointerUp);canvas.removeEventListener("pointercancel",pointerUp);canvas.removeEventListener("wheel",wheel);
    if(scene)scene.traverse(o=>{o.geometry?.dispose?.();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{m.map?.dispose?.();m.dispose?.()})}});
    renderer?.dispose();renderer?.forceContextLoss();
  };
}
