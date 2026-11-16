import * as THREE from "three";

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const mat=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const make=(parent,geo,material,pos=[0,0,0])=>{const m=new THREE.Mesh(geo,material);m.position.set(...pos);parent.add(m);return m;};

function makePlayer(teamColor="#e9edf2",skin="#d2a27c"){
  const root=new THREE.Group();
  const jersey=mat(teamColor),pants=mat("#263344"),skinMat=mat(skin),shoe=mat("#101820"),cap=mat(teamColor);
  const torso=make(root,new THREE.CapsuleGeometry(.34,.62,5,10),jersey,[0,1.35,0]);torso.rotation.z=-.04;
  make(root,new THREE.SphereGeometry(.22,14,12),skinMat,[0,2.03,0]);
  make(root,new THREE.CylinderGeometry(.23,.25,.12,14),cap,[0,2.22,0]);
  make(root,new THREE.CylinderGeometry(.08,.1,.56,10),pants,[-.15,.55,0]);
  make(root,new THREE.CylinderGeometry(.08,.1,.56,10),pants,[.15,.55,0]);
  make(root,new THREE.BoxGeometry(.2,.12,.34),shoe,[-.15,.25,.05]);
  make(root,new THREE.BoxGeometry(.2,.12,.34),shoe,[.15,.25,.05]);
  const arms=[];
  for(const side of [-1,1]){
    const pivot=new THREE.Group();pivot.position.set(side*.36,1.68,0);root.add(pivot);
    const upper=make(pivot,new THREE.CapsuleGeometry(.09,.42,4,8),jersey,[0,-.25,0]);
    const elbow=new THREE.Group();elbow.position.set(0,-.48,0);pivot.add(elbow);
    make(elbow,new THREE.CapsuleGeometry(.075,.38,4,8),skinMat,[0,-.22,0]);
    arms.push({pivot,elbow,side});
  }
  root.userData={arms,torso};
  return root;
}

function buildPark(scene,team){
  scene.background=new THREE.Color("#8fb2c6");
  scene.fog=new THREE.Fog("#8fb2c6",130,290);
  scene.add(new THREE.HemisphereLight("#e8f4ff","#34452c",2.1));
  const sun=new THREE.DirectionalLight("#fff0d2",3.1);sun.position.set(-55,90,35);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);scene.add(sun);
  make(scene,new THREE.PlaneGeometry(260,260),mat("#34743d"),[0,-.15,-25]).rotation.x=-Math.PI/2;
  const outfield=make(scene,new THREE.CircleGeometry(104,96),mat("#438b49"),[0,-.08,-12]);outfield.scale.set(1,1.25,1);outfield.rotation.x=-Math.PI/2;
  const dirt=make(scene,new THREE.ShapeGeometry((()=>{const s=new THREE.Shape();s.moveTo(0,28);s.lineTo(-27,0);s.lineTo(0,-28);s.lineTo(27,0);s.closePath();return s})()),mat("#b17a4c"),[0,.015,0]);dirt.rotation.x=-Math.PI/2;
  const mound=make(scene,new THREE.CylinderGeometry(3.1,3.8,.28,32),mat("#b8875a"),[0,.12,0]);
  const baseMat=mat("#f4f2e8");
  const basePositions=[[-27,.12,0],[0,.12,-27],[27,.12,0],[0,.12,27]];
  basePositions.forEach((p,i)=>{const b=make(scene,new THREE.BoxGeometry(1.25,.18,1.25),baseMat,p);b.rotation.y=i*Math.PI/4});
  const foul=mat("#f2e7c8");
  for(const side of [-1,1]){const pts=[new THREE.Vector3(0,.08,27),new THREE.Vector3(side*90,.08,-63)];const line=make(scene,new THREE.CylinderGeometry(.07,.07,pts[0].distanceTo(pts[1]),6),foul);line.position.copy(pts[0]).add(pts[1]).multiplyScalar(.5);line.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),pts[1].sub(pts[0]).normalize());}
  const fence=mat(team.primary||"#315b7c");
  for(let i=0;i<48;i++){const a=Math.PI*(.08+i/47*.84);const r=91;const x=Math.cos(a)*r,z=-12-Math.sin(a)*r*1.12;make(scene,new THREE.BoxGeometry(3.9,3.2,.45),fence,[x,1.5,z]);}
  const seats=mat(team.secondary||"#d7e2ec");
  for(let tier=0;tier<2;tier++)for(let i=0;i<44;i++){
    const a=Math.PI*(.08+i/43*.84),r=108+tier*13,x=Math.cos(a)*r,z=-12-Math.sin(a)*r*1.12;
    const block=make(scene,new THREE.BoxGeometry(5.8,5.5,5.5),seats,[x,8+tier*7,z]);block.rotation.y=-a;
  }
  const sign=make(scene,new THREE.BoxGeometry(35,5,.8),mat("#14283b"),[0,14,-112]);
  const board=document.createElement("canvas");board.width=1024;board.height=160;const ctx=board.getContext("2d");ctx.fillStyle="#13283b";ctx.fillRect(0,0,1024,160);ctx.fillStyle=team.primary||"#8db5d7";ctx.font="bold 76px system-ui";ctx.textAlign="center";ctx.fillText(team.name||"DIAMOND",512,105);
  const tex=new THREE.CanvasTexture(board);tex.colorSpace=THREE.SRGBColorSpace;sign.material= new THREE.MeshBasicMaterial({map:tex});
  for(const x of [-65,65]){const pole=make(scene,new THREE.CylinderGeometry(.18,.3,28,8),mat("#6d7780"),[x,14,-65]);pole.castShadow=true;}
}

function addBat(root){
  const bat=make(root,new THREE.CylinderGeometry(.055,.095,1.65,12),mat("#d7b17a"),[.52,1.28,.22]);
  bat.rotation.z=-.72;return bat;
}

export async function mountLiveMatch(host,team,player,match,onChange,onFinish){
  if(!host)return()=>{};
  host.innerHTML='<section class="game3d-shell"><div class="game3d-top"><div><div class="eyebrow">DIAMOND · 3D GAME</div><h2>'+team.name+' · 홈 경기</h2></div><div class="game3d-score" id="game3d-score">1회 초　0 : 0　0 OUT</div></div><div class="game3d-stage"><div class="game3d-loading" id="game3d-loading">선수단 입장 준비 중…</div><canvas id="game3d-canvas"></canvas><div class="game3d-caption" id="game3d-caption">선수단 입장</div></div><div class="game3d-toolbar"><div class="game3d-modes"><button class="btn active" data-mode="bat">직접 타격</button><button class="btn" data-mode="pitch">직접 투구</button><button class="btn" data-mode="field">직접 수비</button><button class="btn" data-mode="bench">벤치 관전</button></div><div class="game3d-controls" id="game3d-controls"><span>선수단 입장 중입니다.</span></div><div class="game3d-bottom"><span id="game3d-result">플레이 볼!</span><button class="btn btn-primary" id="game3d-finish" type="button">경기 종료</button></div></div></section>';
  const canvas=host.querySelector("#game3d-canvas"),stage=host.querySelector(".game3d-stage"),controls=host.querySelector("#game3d-controls"),caption=host.querySelector("#game3d-caption"),result=host.querySelector("#game3d-result"),score=host.querySelector("#game3d-score"),loading=host.querySelector("#game3d-loading");
  let renderer,scene,camera,raf=0,disposed=false,last=performance.now(),mode=player.role==="pitcher"?"pitch":"bat",phase="intro",introTime=0,ball=null,ballVelocity=new THREE.Vector3(),pitchClock=0,swingWindow=0,fielding=false,scoreRuns=match.userRuns||0,opponentRuns=match.opponentRuns||0,outs=match.outs||0,balls=match.balls||0,strikes=match.strikes||0,pitches=match.pitches||0,hits=match.hits||0,homeRuns=match.homeRuns||0,strikeouts=match.strikeouts||0,atBat=0,move={x:0,z:0},lastResult="선수단 입장",lastSwing=0,finished=false;
  const players=[],mix={};let batter,pitcher,umpire,bat,fielder,userFielder,cameraTarget;
  const fieldMaterial=mat("#367a3e"),ballMaterial=mat("#f7f4e9"),white=mat("#f4f1e9");
  const clock=new THREE.Clock();
  const setResult=t=>{lastResult=t;result.textContent=t;caption.textContent=t};
  const updateScore=()=>{score.textContent=(match.inning||1)+"회 "+((match.half||"top")==="top"?"초":"말")+"　"+scoreRuns+" : "+opponentRuns+"　"+outs+" OUT　"+balls+"-"+strikes;};
  const updateMatch=()=>{match.userRuns=scoreRuns;match.opponentRuns=opponentRuns;match.outs=outs;match.balls=balls;match.strikes=strikes;match.pitches=pitches;match.hits=hits;match.homeRuns=homeRuns;match.strikeouts=strikeouts;match.phase=phase;match.lastResult=lastResult;onChange?.(match);updateScore()};
  const spawnBall=(pos)=>{if(ball)scene.remove(ball);ball=make(scene,new THREE.SphereGeometry(.19,16,12),ballMaterial,pos);ball.castShadow=true};
  const setMode=m=>{mode=m;host.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===m));fielding=m==="field";if(m==="pitch"&&phase!=="pitch-flight")phase="pitch";if(m==="bat"&&phase!=="pitch-flight")phase="bat";if(m==="field"&&phase!=="fielding"){phase="fielding";if(ball){ball.position.set(0,2,-12);ballVelocity.set(8,6,-12)}}if(m==="bench"){camera.position.set(42,15,34);camera.lookAt(0,4,-10);caption.textContent="벤치에서 경기를 관전하고 있습니다."}else if(m==="pitch"){camera.position.set(0,5,13);camera.lookAt(0,2,-2);caption.textContent="투수 시점 · 클릭하여 투구"}else if(m==="field"){camera.position.set(20,12,-18);camera.lookAt(0,2,-35);caption.textContent="수비 시점 · WASD 또는 방향키로 이동"}else{camera.position.set(0,4,35);camera.lookAt(0,2,-3);caption.textContent="타석 시점 · 스페이스 또는 클릭으로 스윙"}renderControls()};
  const renderControls=()=>{
    if(phase==="intro"){controls.innerHTML='<span>경기 전 선수 소개와 입장 연출이 진행 중입니다.</span><button class="btn" id="skip-intro">입장 연출 건너뛰기</button>';return}
    if(mode==="bat")controls.innerHTML='<span>투구를 기다리세요. 스페이스 / 클릭: 스윙</span><button class="btn btn-primary" id="swing-button">스윙</button><button class="btn" id="take-button">지켜보기</button>';
    else if(mode==="pitch")controls.innerHTML='<span>구종·코스를 선택하고 투구하세요.</span><button class="btn" data-pitch="fastball">직구</button><button class="btn" data-pitch="slider">슬라이더</button><button class="btn" data-pitch="curve">커브</button><button class="btn" data-aim="inside">몸쪽</button><button class="btn" data-aim="center">가운데</button><button class="btn" data-aim="outside">바깥쪽</button><button class="btn" data-aim="high">높게</button><button class="btn" data-aim="low">낮게</button><button class="btn btn-primary" id="throw-button">투구</button>';
    else if(mode==="field")controls.innerHTML='<span>WASD / 방향키 또는 아래 버튼으로 이동</span><button class="btn" data-move="0,-1">↑</button><button class="btn" data-move="-1,0">←</button><button class="btn" data-move="1,0">→</button><button class="btn" data-move="0,1">↓</button><button class="btn btn-primary" id="catch-button">포구</button><button class="btn" id="throw-base">1루 송구</button>';
    else controls.innerHTML='<span>벤치 관전 모드 · 카메라가 경기 흐름을 따라갑니다.</span><button class="btn" id="resume-play">플레이로 복귀</button>';
  };
  const nextPitch=()=>{phase=mode==="pitch"?"pitch":"bat";pitchClock=1.2;swingWindow=0;spawnBall(new THREE.Vector3(0,2.2,-1));renderControls();updateMatch()};
  const resetAtBat=()=>{balls=0;strikes=0;setResult("다음 타석 준비");nextPitch()};
  const makePitch=()=>{
    if(finished||phase!=="bat")return;
    pitches++;phase="pitch-flight";pitchClock=0;const targetX=(Math.random()-.5)*1.7,targetY=1.8+Math.random()*1.1;
    ballVelocity.set(targetX*.22,(targetY-2.2)*.12,40+Math.random()*4);swingWindow=.78;
    setResult("투수가 공을 던졌습니다! 타이밍을 맞추세요.");updateMatch();
  };
  const swing=()=>{
    if(mode!=="bat"||phase!=="pitch-flight"||finished)return;
    const timing=Math.abs(pitchClock-.62),good=timing<.17&&ball.position.z>14&&ball.position.z<30;
    lastSwing=pitchClock;phase="hit-flight";
    if(good){
      const launch=0.32+Math.random()*.42;ballVelocity.set((Math.random()-.5)*13,7+launch*12,-(22+Math.random()*12));
      hits++;const homer=launch>.58&&Math.abs(ballVelocity.x)<8;if(homer){homeRuns++;scoreRuns++;setResult("ホーム런! 타구가 담장을 넘어갑니다!")}else setResult("정타! 타구가 외야로 뻗어갑니다.");
      
    }else{
      strikes++;if(strikes>=3){outs++;strikeouts++;strikes=0;balls=0;setResult("헛스윙 삼진! 다음 타자로 넘어갑니다.")}else setResult(timing<.32?"파울 또는 빗맞은 타구":"헛스윙! 타이밍이 늦었습니다.");phase="miss-flight";ballVelocity.set((Math.random()-.5)*1.5,1,12);
    }
    updateMatch();swingWindow=0;
  };
  const pitchUser=()=>{if(mode!=="pitch"||finished||phase!=="pitch")return;phase="pitch-flight";pitches++;pitchClock=0;const pitch=mix.pitch||"fastball",aim=mix.aim||"center";ballVelocity.set((aim==="inside"?-2.8:aim==="outside"?2.8:0)+(Math.random()-.5)*.5,(pitch==="curve"?-1.8:(aim==="high"?.9:aim==="low"?-1.1:(Math.random()-.5)*.6)),pitch==="fastball"?42:pitch==="slider"?38:35);setResult("투구! 타자의 반응을 확인하세요.");updateMatch()};
  const beginFielding=()=>{mode="field";fielding=true;phase="fielding";host.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode==="field"));camera.position.set(20,12,-18);camera.lookAt(0,2,-25);setResult("타구 발생! 수비수가 공을 향해 이동합니다.");renderControls()};
  const catchBall=()=>{if(phase!=="fielding"||!ball)return;const d=userFielder.position.distanceTo(ball.position);if(d<8){phase="caught";setResult("포구 성공! 타자 주자를 아웃 처리했습니다.");updateMatch()}else setResult("아직 공과 거리가 있습니다. 수비수를 더 이동하세요.")};
  const moveFielder=(dx,dz)=>{if(mode!=="field")return;move.x=dx;move.z=dz;userFielder.position.x=clamp(userFielder.position.x+dx*1.7,-48,48);userFielder.position.z=clamp(userFielder.position.z+dz*1.7,-80,15)};
  const finishAtBat=()=>{if(phase==="caught"||phase==="pitch-flight"){outs=Math.min(3,outs+1);setResult("플레이 종료 · 다음 타자 준비");}else if(phase==="fielding"){setResult("타구 처리 완료 · 다음 타자 준비");}atBat++;if(outs>=3){outs=0;match.inning=(match.inning||1)+1;match.half=match.half==="top"?"bottom":"top";if(match.inning>9){finished=true;phase="finished";match.finished=true;setResult("9이닝 경기 종료");renderControls();updateMatch();onFinish?.(match);return;}}mode=player.role==="pitcher"?"pitch":"bat";host.querySelectorAll("[data-mode]").forEach(b=>b.classList.toggle("active",b.dataset.mode===mode));resetAtBat()};
  const onKey=e=>{if(e.repeat)return;if([" ","ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key))e.preventDefault();if(e.key===" "){if(mode==="bat")swing();else if(mode==="field")catchBall();}if(e.key==="ArrowLeft"||e.key==="a")moveFielder(-1,0);if(e.key==="ArrowRight"||e.key==="d")moveFielder(1,0);if(e.key==="ArrowUp"||e.key==="w")moveFielder(0,-1);if(e.key==="ArrowDown"||e.key==="s")moveFielder(0,1)};
  const onPointer=e=>{if(e.target.closest("button"))return;if(mode==="bat")swing();else if(mode==="pitch")pitchUser()};
  const onControl=e=>{
    const b=e.target.closest("button");if(!b)return;
    if(b.dataset.mode){setMode(b.dataset.mode);return}
    if(b.id==="skip-intro"){phase="bat";introTime=7;loading?.remove();setResult("플레이 볼!");renderControls();resetAtBat();return}
    if(b.id==="swing-button")swing();
    if(b.id==="take-button"){if(phase==="pitch-flight"){if(Math.random()<.42){balls++;setResult("볼을 골랐습니다.")}else{strikes++;setResult("스트라이크를 지켜봤습니다.")}if(balls>=4){balls=0;strikes=0;setResult("볼넷! 주자가 출루했습니다.")}if(strikes>=3){outs++;strikeouts++;balls=0;strikes=0;setResult("루킹 삼진!") }nextPitch()}}
    if(b.dataset.pitch){controls.querySelectorAll("[data-pitch]").forEach(x=>x.classList.toggle("active",x===b));mix.pitch=b.dataset.pitch}
    if(b.dataset.aim){controls.querySelectorAll("[data-aim]").forEach(x=>x.classList.toggle("active",x===b));mix.aim=b.dataset.aim}
    if(b.dataset.move){const [dx,dz]=b.dataset.move.split(",").map(Number);moveFielder(dx,dz)}
    if(b.id==="throw-button")pitchUser();
    if(b.id==="catch-button")catchBall();
    if(b.id==="throw-base"&&phase==="caught"){setResult("1루 송구 완료! 플레이를 마칩니다.");finishAtBat()}
    if(b.id==="resume-play"){setMode("bat");resetAtBat()}
  };
  const resize=()=>{if(!renderer)return;const w=Math.max(1,stage.clientWidth),h=Math.max(1,stage.clientHeight);renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix()};
  const init=()=>{
    renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false,powerPreference:"high-performance"});renderer.setPixelRatio(Math.min(devicePixelRatio||1,1.5));renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.outputColorSpace=THREE.SRGBColorSpace;
    scene=new THREE.Scene();buildPark(scene,team);camera=new THREE.PerspectiveCamera(52,1,.1,400);camera.position.set(0,8,55);camera.lookAt(0,4,-5);
    batter=makePlayer(team.secondary||"#e8edf2");batter.position.set(1,0,28);batter.rotation.y=Math.PI*.1;bat=addBat(batter);scene.add(batter);players.push(batter);
    pitcher=makePlayer(team.primary);pitcher.position.set(0,0,-2);scene.add(pitcher);players.push(pitcher);
    umpire=makePlayer("#202b37");umpire.scale.set(.85,.9,.85);umpire.position.set(-2,0,29);scene.add(umpire);
    fielder=makePlayer(team.primary);fielder.position.set(-24,0,-35);scene.add(fielder);
    userFielder=makePlayer(team.primary);userFielder.position.set(24,0,-35);scene.add(userFielder);
    for(const pos of [[-27,0,0],[27,0,0],[-16,0,-20],[16,0,-20],[0,0,-55]]){const f=makePlayer(team.primary);f.position.set(...pos);scene.add(f);players.push(f)}
    spawnBall(new THREE.Vector3(0,2.2,-1));resize();
    loading?.remove();phase="intro";renderControls();setResult("선수단 입장 · 선발 라인업 소개");
    const observer=new ResizeObserver(resize);observer.observe(stage);mix.observer=observer;
  };
  const animate=()=>{
    if(disposed)return;raf=requestAnimationFrame(animate);const now=performance.now(),dt=Math.min((now-last)/1000,.05);last=now;
    if(phase==="intro"){introTime+=dt;camera.position.set(Math.sin(introTime*.24)*72,24+Math.sin(introTime*.6)*4,Math.cos(introTime*.24)*72-12);camera.lookAt(0,3,-12);if(introTime>2){pitcher.rotation.y=Math.sin(introTime*2)*.12;batter.rotation.y=Math.PI*.1+Math.sin(introTime*2)*.04}if(introTime>7){phase=mode==="pitch"?"pitch":"bat";setResult("플레이 볼! 1회 초 시작");renderControls();resetAtBat()}}
    if(phase==="bat"){pitchClock+=dt;if(pitchClock>1.7){makePitch();pitchClock=0}}
    if(phase==="pitch-flight"||phase==="miss-flight"||phase==="hit-flight"||phase==="fielding"){
      if(ball){ball.position.addScaledVector(ballVelocity,dt);ballVelocity.y-=9.8*dt;if(ball.position.y<.2){ball.position.y=.2;ballVelocity.y*=-.32;if(Math.abs(ballVelocity.y)<1)ballVelocity.y=0}
        pitchClock+=dt;
        if((phase==="pitch-flight"||phase==="miss-flight")&&ball.position.z>26){if(phase==="pitch-flight"){if(mode==="pitch"){const outside=Math.abs(ball.position.x)>1.5||ball.position.y<1.1||ball.position.y>3.4;if(outside){balls++;setResult("볼! 코스가 벗어났습니다.");if(balls>=4){balls=0;strikes=0;setResult("볼넷을 허용했습니다.")}}else if(Math.random()<.24){outs++;strikeouts++;strikes=0;balls=0;setResult("삼진! 타자를 돌려세웠습니다.")}else{setResult("타구 발생! 수비로 전환합니다.");ballVelocity.set((Math.random()-.5)*13,8,-25);beginFielding()}}else{strikes++;setResult("스트라이크!");if(strikes>=3){outs++;strikeouts++;strikes=0;balls=0;setResult("삼진! 타자를 돌려세웠습니다.")}}}if(phase!=="fielding")nextPitch()}
        else if(phase==="hit-flight"&&pitchClock>1.3){beginFielding()}
        else if(phase==="fielding"){const target=ball.position.clone();target.y=0;const dx=target.x-userFielder.position.x,dz=target.z-userFielder.position.z;userFielder.position.x+=clamp(dx,-1,1)*dt*8;userFielder.position.z+=clamp(dz,-1,1)*dt*8;if(ball.position.z>30||ball.position.z< -115||ball.position.x>100||ball.position.x< -100){finishAtBat()}}
      }
    }
    if(mode==="bench"&&phase!=="intro"){camera.position.lerp(new THREE.Vector3(42,15,34),.025);camera.lookAt(0,3,-12)}
    if(pitcher?.userData.arms?.[1])pitcher.userData.arms[1].pivot.rotation.x=Math.sin(now*.006)*.35;
    if(batter?.userData.arms?.[0])batter.userData.arms[0].pivot.rotation.x=phase==="hit-flight"?-1.2:Math.sin(now*.002)*.025;
    renderer.render(scene,camera);
  };
  const onFinishClick=()=>{finished=true;phase="finished";match.finished=true;updateMatch();onFinish?.(match)};
  host.addEventListener("click",onControl);canvas.addEventListener("pointerdown",onPointer);window.addEventListener("keydown",onKey);host.querySelector("#game3d-finish").addEventListener("click",onFinishClick);
  try{init();animate()}catch(error){loading.textContent="3D 경기장을 불러오지 못했습니다. 브라우저의 WebGL 지원을 확인해 주세요.";throw error}
  return()=>{disposed=true;cancelAnimationFrame(raf);window.removeEventListener("keydown",onKey);host.removeEventListener("click",onControl);canvas.removeEventListener("pointerdown",onPointer);mix.observer?.disconnect();scene?.traverse(o=>{o.geometry?.dispose?.();if(o.material){const ms=Array.isArray(o.material)?o.material:[o.material];ms.forEach(m=>{m.map?.dispose?.();m.dispose?.()})}});renderer?.dispose();renderer?.forceContextLoss()};
}
