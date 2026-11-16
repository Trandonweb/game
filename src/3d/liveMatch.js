import * as THREE from "three";
import { createGamePark } from "./stadium.js";

const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const esc=v=>String(v??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
const material=(color,roughness=.78,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});
const addMesh=(parent,geometry,mat,pos=[0,0,0])=>{const m=new THREE.Mesh(geometry,mat);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};

function makePlayer(teamColor="#315c82",number="7",kind="fielder"){
  const root=new THREE.Group();
  const jersey=material(teamColor),pants=material("#e5e8e8"),skin=material("#bd8d6a"),shoe=material("#18222a"),helmet=material("#182b40",.38,.18),glove=material("#76533a");
  const torso=addMesh(root,new THREE.CapsuleGeometry(.34,.66,6,12),jersey,[0,1.34,0]);torso.rotation.z=-.025;
  const neck=addMesh(root,new THREE.CylinderGeometry(.09,.12,.22,12),skin,[0,1.88,0]);
  const head=addMesh(root,new THREE.SphereGeometry(.22,18,14),skin,[0,2.08,0]);
  const cap=addMesh(root,new THREE.SphereGeometry(.235,18,10,0,Math.PI*2,0,Math.PI/2),helmet,[0,2.2,0]);
  const brim=addMesh(root,new THREE.BoxGeometry(.34,.035,.2),helmet,[0,2.17,-.16]);
  const pelvis=addMesh(root,new THREE.BoxGeometry(.48,.28,.3),pants,[0,.91,0]);
  const legs=[];
  for(const side of [-1,1]){
    const hip=new THREE.Group();hip.position.set(side*.15,.82,0);root.add(hip);
    addMesh(hip,new THREE.CapsuleGeometry(.105,.55,5,9),pants,[0,-.31,0]);
    addMesh(hip,new THREE.BoxGeometry(.2,.13,.36),shoe,[0,-.67,-.055]);
    legs.push(hip);
  }
  const arms=[];
  for(const side of [-1,1]){
    const shoulder=new THREE.Group();shoulder.position.set(side*.34,1.63,0);root.add(shoulder);
    addMesh(shoulder,new THREE.CapsuleGeometry(.095,.42,5,9),jersey,[0,-.25,0]);
    const elbow=new THREE.Group();elbow.position.set(0,-.48,0);shoulder.add(elbow);
    addMesh(elbow,new THREE.CapsuleGeometry(.075,.39,5,9),skin,[0,-.22,0]);
    addMesh(elbow,new THREE.SphereGeometry(.09,10,8),glove,[0,-.45,-.02]);
    arms.push({shoulder,elbow,side});
  }
  const belt=addMesh(root,new THREE.BoxGeometry(.49,.07,.32),material("#26323c"),[0,1.01,0]);
  const batPivot=new THREE.Group();batPivot.position.set(.28,1.47,-.34);batPivot.rotation.x=-.25;batPivot.visible=kind==="batter";root.add(batPivot);
  const batGrip=addMesh(batPivot,new THREE.CylinderGeometry(.035,.04,.42,10),material("#765033"),[0,.2,0]);
  const batBarrel=addMesh(batPivot,new THREE.CylinderGeometry(.065,.115,.88,12),material("#c89a5e"),[0,.82,0]);
  batBarrel.rotation.z=-.035;
  root.userData={torso,head,arms,legs,batPivot,kind,walkPhase:Math.random()*6,targetPosition:new THREE.Vector3(0,0,22)};
  return root;
}

function addStrikeZone(scene){
  const group=new THREE.Group(),w=2.55,h=2.55,z=19.5,y=2.45;
  const points=[[-w/2,y-h/2,z],[w/2,y-h/2,z],[w/2,y+h/2,z],[-w/2,y+h/2,z],[-w/2,y-h/2,z]].map(p=>new THREE.Vector3(...p));
  const geo=new THREE.BufferGeometry().setFromPoints(points);
  const line=new THREE.Line(geo,new THREE.LineBasicMaterial({color:"#f6e6a7",transparent:true,opacity:.85}));
  group.add(line);
  const fill=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:"#f2e8c9",transparent:true,opacity:.035,side:THREE.DoubleSide}));
  fill.position.set(0,y,z);group.add(fill);
  for(let i=1;i<3;i++){
    const x=-w/2+w*i/3;
    const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x,y-h/2,z-.008),new THREE.Vector3(x,y+h/2,z-.008)]);
    group.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:"#f6e6a7",transparent:true,opacity:.18})));
  }
  for(let i=1;i<3;i++){
    const yy=y-h/2+h*i/3;
    const g=new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(-w/2,yy,z-.008),new THREE.Vector3(w/2,yy,z-.008)]);
    group.add(new THREE.Line(g,new THREE.LineBasicMaterial({color:"#f6e6a7",transparent:true,opacity:.18})));
  }
  scene.add(group);return group;
}

function makeScoreboard(scene,team,opponent){
  const board=document.createElement("canvas");board.width=1024;board.height=256;
  const ctx=board.getContext("2d");ctx.fillStyle="#101b2a";ctx.fillRect(0,0,1024,256);
  ctx.fillStyle=team.primary;ctx.fillRect(0,0,18,256);ctx.fillStyle="#fff";ctx.font="900 54px system-ui";ctx.fillText(team.name,48,92);
  ctx.fillStyle="#aebdca";ctx.font="34px system-ui";ctx.fillText("VS  "+opponent.name,50,155);
  const tex=new THREE.CanvasTexture(board);tex.colorSpace=THREE.SRGBColorSpace;
  const mesh=addMesh(scene,new THREE.PlaneGeometry(30,7),new THREE.MeshBasicMaterial({map:tex}),[0,23,-105]);
  mesh.lookAt(0,18,0);
  return {canvas:board,ctx,texture:tex,mesh};
}

const PITCHES={
  fastball:{label:"직구",speed:40,breakX:0,breakY:0,stamina:1.0},
  slider:{label:"슬라이더",speed:34,breakX:2.2,breakY:-.25,stamina:1.1},
  curve:{label:"커브",speed:29,breakX:-.8,breakY:-2.5,stamina:1.15},
  sinker:{label:"싱커",speed:36,breakX:1.1,breakY:-1.6,stamina:1.05},
  changeup:{label:"체인지업",speed:30,breakX:-.5,breakY:-.8,stamina:.9}
};
const BASE_POSITIONS={first:new THREE.Vector3(10,.5,11),second:new THREE.Vector3(0,.5,0),third:new THREE.Vector3(-10,.5,11),home:new THREE.Vector3(0,.5,22)};
function getFenceStatus(position,fence={}){
  const a0=Math.atan2(position.z,position.x),angle=a0<0?a0+Math.PI*2:a0;
  if(angle<Math.PI||angle>Math.PI*2)return {wall:false,over:false};
  const shape={left:78,center:92,right:78,leftHeight:8,centerHeight:10,rightHeight:8,...fence};
  const t=(Math.cos(angle)+1)/2;
  const radius=t<.5?shape.left+(shape.center-shape.left)*t*2:shape.center+(shape.right-shape.center)*(t-.5)*2;
  const height=t<.5?shape.leftHeight+(shape.centerHeight-shape.leftHeight)*t*2:shape.centerHeight+(shape.rightHeight-shape.centerHeight)*(t-.5)*2;
  const distance=Math.hypot(position.x,position.z);
  return {wall:distance>=radius,over:distance>=radius&&position.y>height};
}

export async function mountLiveMatch(host,team,player,match,onChange,onFinish,opponentTeam=null){
  if(!host)return()=>{};
  const opponent=opponentTeam||{name:"원정 구단",primary:"#9c4a4b",secondary:"#f0d8c8"};
  host.innerHTML='<section class="diamond-live"><header class="diamond-live-head"><div class="diamond-live-brand"><span class="diamond-live-dot"></span><div><b>DIAMOND · LIVE BASEBALL</b><small>'+esc(team.name)+' vs '+esc(opponent.name)+'</small></div></div><div class="diamond-scoreboard" id="diamond-scoreboard"></div><button class="diamond-exit" id="diamond-exit" type="button">경기 나가기</button></header><div class="diamond-game-view"><canvas id="diamond-canvas"></canvas><div class="diamond-view-caption" id="diamond-caption">선수단 입장</div><div class="diamond-intro-card" id="diamond-intro"><span>OPENING CEREMONY</span><strong>'+esc(team.name)+' vs '+esc(opponent.name)+'</strong><small>'+esc(player.name)+' 선수와 선발 라인업 입장</small><button id="diamond-skip-intro" type="button">입장 연출 건너뛰기</button></div><div class="diamond-pitch-speed" id="diamond-speed"></div></div><section class="diamond-game-panel"><div class="diamond-play-info"><div><span class="diamond-kicker" id="diamond-phase-label">GAME START</span><strong id="diamond-result">선수단이 입장하고 있습니다.</strong></div><div class="diamond-count" id="diamond-count">B 0　S 0　O 0</div></div><div class="diamond-control-area" id="diamond-controls"></div><div class="diamond-bottom-bar"><span id="diamond-hint">화면의 조작 버튼 또는 키보드를 사용하세요.</span><div><button class="diamond-utility" id="diamond-bench" type="button">벤치 관전</button><button class="diamond-utility" id="diamond-camera" type="button">중계 시점</button></div></div></section></section>';

  const canvas=host.querySelector("#diamond-canvas"),view=host.querySelector(".diamond-game-view"),controls=host.querySelector("#diamond-controls");
  const scoreboard=host.querySelector("#diamond-scoreboard"),caption=host.querySelector("#diamond-caption"),intro=host.querySelector("#diamond-intro"),resultText=host.querySelector("#diamond-result"),countText=host.querySelector("#diamond-count"),phaseLabel=host.querySelector("#diamond-phase-label"),hint=host.querySelector("#diamond-hint"),speedText=host.querySelector("#diamond-speed");
  const pausedState={value:false};
  let renderer,scene,camera,resizeObserver,raf=0,disposed=false,last=performance.now(),clock=0,introClock=0,phase="intro",viewMode="broadcast",activeControl="auto",pitchKind="fastball",aim={x:0,y:0},pitchClock=0,swingClock=0,swingPressed=false,swingAttempted=false,pendingBunt=false,ball=null,ballVelocity=new THREE.Vector3(),ballSpin=0,battingPlayer=null,pitchingPlayer=null,catcher=null,umpire=null,activeFielder=null,activeFielderIndex=0,fielders=[],benchView=false,ballInPlay=false,playResolved=false,selectedSteal=0,scoreRuns=match.userRuns||0,opponentRuns=match.opponentRuns||0,outs=match.outs||0,balls=match.balls||0,strikes=match.strikes||0,hits=match.hits||0,homeRuns=match.homeRuns||0,strikeouts=match.strikeouts||0,userHits=match.userHits||0,userHomeRuns=match.userHomeRuns||0,userStrikeouts=match.userStrikeouts||0,pitches=match.pitches||0,inning=match.inning||1,half=match.half||"top",bases=Array.isArray(match.bases)?match.bases.slice(0,3):[false,false,false],userAtBatDone=false,finished=false,autoTimer=0,throwTarget=null,throwClock=0,throwResult=null,batterRunTimer=0,fieldingResult=null,atBatResult="",runLog=[],introPlayers=[],pitchTarget={x:0,y:2.45},selectedPitch="fastball",catcherLead=match.catcherLead||"center",isTouchingZone=false,zonePointer=null,manualFielding=false;
  let nextRunnerId=1,runnerTokens=bases.map(occupied=>occupied?"runner-"+nextRunnerId++:null);
  const players=[],fieldObjects=[],fieldMaterial=material("#3e7b42"),ballMaterial=material("#f8f7ef",.32),whiteMaterial=material("#f4f1e9");
  const baseColors=["#f1eee4","#f1eee4","#f1eee4"];
  const playerRole=match.playerRole||(player.role==="pitcher"?"pitcher":"batter");
  const batterStats=player.isTwp?(player.role==="pitcher"?player.secondaryAttributes:player.attributes):(player.role==="pitcher"?null:player.attributes);
  const pitcherStats=player.isTwp?(player.role==="pitcher"?player.attributes:player.pitcherAttributes):(player.role==="pitcher"?player.attributes:null);
  const isTeamControl=match.controlMode==="team";
  const getUserHalfMode=()=>isTeamControl?(half==="bottom"?"bat":"pitch"):(half==="bottom"?"bat":"field");
  const currentTeamScore=()=>scoreRuns;
  const addRun=()=>{if(half==="bottom")scoreRuns++;else opponentRuns++};
  const setResult=t=>{resultText.textContent=t;caption.textContent=t;match.lastResult=t};
  const syncRunners=()=>{
    const home=scene?.userData?.homeRunners||[],away=scene?.userData?.awayRunners||[];
    const active=half==="bottom"?home:away,inactive=half==="bottom"?away:home,used=new Set();
    for(let index=0;index<3;index++){
      const token=runnerTokens[index];if(!token)continue;
      let runner=active.find(item=>item?.userData?.runnerToken===token);
      if(!runner){runner=active.find(item=>item&&!used.has(item)&&!item.visible)||active.find(item=>item&&!used.has(item));if(!runner)continue;runner.userData.runnerToken=token;runner.position.set(0,0,22)}
      runner.visible=true;runner.userData.targetPosition=BASE_POSITIONS[["first","second","third"][index]].clone();runner.userData.targetPosition.y=0;used.add(runner);
    }
    active.forEach(runner=>{if(runner&&!used.has(runner))runner.visible=false});
    inactive.forEach(runner=>{if(runner)runner.visible=false});
  };
  const updateMatch=()=>{
    syncRunners();
    match.inning=inning;match.half=half;match.outs=outs;match.balls=balls;match.strikes=strikes;match.userRuns=scoreRuns;match.opponentRuns=opponentRuns;match.bases=bases.slice();match.pitches=pitches;match.hits=hits;match.homeRuns=homeRuns;match.strikeouts=strikeouts;match.userHits=userHits;match.userHomeRuns=userHomeRuns;match.userStrikeouts=userStrikeouts;match.phase=phase;match.finished=finished;match.catcherLead=catcherLead;match.lastResult=resultText.textContent;
    scoreboard.innerHTML='<span class="diamond-inning">'+inning+'회 '+(half==="top"?"초":"말")+'</span><span class="diamond-team-score"><i class="away-dot"></i>'+opponentRuns+'</span><span class="diamond-team-score"><i class="home-dot"></i>'+scoreRuns+'</span><span class="diamond-bases"><i class="'+(bases[1]?"on":"")+'"></i><i class="'+(bases[2]?"on":"")+'"></i><i class="'+(bases[0]?"on":"")+'"></i></span><span class="diamond-out-count">'+outs+' OUT</span>';
    countText.textContent="B "+balls+"　S "+strikes+"　O "+outs;
    onChange?.(match);
  };
  const updateSides=()=>{
    const homeBatting=half==="bottom";
    const userBatter=scene?.userData?.userBatter,awayBatter=scene?.userData?.awayBatter;
    const userPitcher=scene?.userData?.userPitcher,awayPitcher=scene?.userData?.awayPitcher;
    const homeCatcher=scene?.userData?.homeCatcher,awayCatcher=scene?.userData?.awayCatcher;
    battingPlayer=homeBatting?userBatter:awayBatter;
    pitchingPlayer=homeBatting?awayPitcher:userPitcher;
    catcher=homeBatting?awayCatcher:homeCatcher;
    if(userBatter)userBatter.visible=homeBatting;if(awayBatter)awayBatter.visible=!homeBatting;
    if(userPitcher)userPitcher.visible=!homeBatting;if(awayPitcher)awayPitcher.visible=homeBatting;
    if(homeCatcher)homeCatcher.visible=!homeBatting;if(awayCatcher)awayCatcher.visible=homeBatting;
    fielders=homeBatting?scene.userData.awayFielders:scene.userData.homeFielders;
    scene.userData.homeFielders.forEach(f=>f.visible=!homeBatting);
    scene.userData.awayFielders.forEach(f=>f.visible=homeBatting);
    syncRunners();
  };
  const setPhaseMode=()=>{
    activeControl=getUserHalfMode();
    if(phase==="intro"||phase==="fielding"||phase==="hit-flight"||phase==="pitch-flight")return;
    if(activeControl==="auto"){runAutoHalf();return}
    if(activeControl==="bat")startBattingTurn();else if(activeControl==="pitch")startPitchingTurn();else if(activeControl==="field")startCpuFieldAtBat();
  };
  const makeBall=pos=>{
    if(ball){scene.remove(ball);ball.geometry.dispose()}
    ball=addMesh(scene,new THREE.SphereGeometry(.19,20,16),ballMaterial,pos);
    ball.castShadow=true;return ball;
  };
  const clearBall=()=>{if(ball){scene.remove(ball);ball.geometry.dispose();ball.material.dispose();ball=null}};
  const setCamera=mode=>{
    viewMode=mode;
    if(!camera)return;
    if(mode==="batter"){camera.position.set(-4.2,5.2,38);camera.lookAt(0,2.7,2);caption.textContent="타석 시점"}
    else if(mode==="pitcher"){camera.position.set(0,6.2,-18);camera.lookAt(0,2.5,20);caption.textContent="투수 시점"}
    else if(mode==="field"){camera.position.set(27,18,-30);camera.lookAt(0,1,-20);caption.textContent="수비 중계 시점"}
    else if(mode==="bench"){camera.position.set(33,7,32);camera.lookAt(0,3,0);caption.textContent="덕아웃 관전 시점"}
    else {camera.position.set(0,65,110);camera.lookAt(0,0,-10);caption.textContent="중계 카메라"}
  };
  const setPlayerMode=()=>{
    const mode=getUserHalfMode();
    if(mode==="bat"){setCamera("batter");phase="ready";phaseLabel.textContent="BATTING";setResult("투구를 기다리세요. 공을 끝까지 보고 스윙하세요.");renderControls()}
    else if(mode==="pitch"){setCamera("pitcher");phase="ready";phaseLabel.textContent="PITCHING";setResult("구종을 선택하고 투구 위치를 지정하세요.");renderControls()}
    else runAutoHalf();
    updateMatch();
  };
  const updateCount=()=>{countText.textContent="B "+balls+"　S "+strikes+"　O "+outs};
  const renderControls=()=>{
    if(pausedState.value){controls.innerHTML='<div class="diamond-result-controls"><b>타임아웃 · 일시 정지</b><button class="diamond-primary" data-control="resume">경기 계속하기</button></div>';return}
    if(finished){controls.innerHTML='<div class="diamond-finished"><b>경기가 종료되었습니다.</b><button class="diamond-primary" data-control="finish">경기 결과 반영</button></div>';return}
    if(phase==="intro"){controls.innerHTML='<div class="diamond-wait">경기 시작 · 선발 라인업</div>';return}
    if(phase==="auto"){controls.innerHTML='<div class="diamond-wait">팀의 다른 타석을 진행하고 있습니다.</div>';return}
    if(phase==="ready"&&activeControl==="bat"){
      hint.textContent="SPACE 스윙 · B 번트 · W/A/S/D 구종·코스 예측 · 1/2/3 도루";
      controls.innerHTML='<div class="diamond-batter-controls"><div class="diamond-guess"><small>구종·코스 예측</small><div class="diamond-guess-pad"><button data-guess="high">↑</button><button data-guess="inside">←</button><button data-guess="low">↓</button><button data-guess="outside">→</button></div><span id="diamond-guess-label">예측 없음</span></div><div class="diamond-swing-area"><button class="diamond-swing" data-control="swing">SWING</button><button class="diamond-secondary" data-control="bunt">번트</button></div><div class="diamond-runner-controls"><small>주루 작전</small><button data-steal="1">1루 도루</button><button data-steal="2">2루 도루</button><button data-steal="3">3루 도루</button></div></div>';
    }else if(phase==="pitch-flight"&&activeControl==="bat"){
      hint.textContent="공이 타격 구간에 들어올 때 스윙하세요. 타이밍과 공의 위치가 타구에 영향을 줍니다.";
      controls.innerHTML='<div class="diamond-batter-controls"><div class="diamond-guess"><small>공을 확인하세요</small><span>투구 궤적을 읽고 타이밍을 맞추세요.</span></div><div class="diamond-swing-area"><button class="diamond-swing" data-control="swing">SWING</button><button class="diamond-secondary" data-control="bunt">번트</button></div><div class="diamond-runner-controls"><small>주루 작전</small><button data-steal="1">1루 도루</button><button data-steal="2">2루 도루</button><button data-steal="3">3루 도루</button></div></div>';
    }else if(phase==="ready"&&activeControl==="pitch"){
      hint.textContent="SPACE 투구 · E/W/A/Z/X 구종 · 방향키/스트라이크 존 코스 · S 포수 리드 · B 고의사구 · 1/2/3 견제";
      controls.innerHTML='<div class="diamond-pitch-controls"><div class="diamond-pitch-select"><small>구종 선택</small>'+Object.entries(PITCHES).map(([key,p])=>'<button data-pitch="'+key+'" class="'+(selectedPitch===key?"selected":"")+'">'+p.label+'</button>').join("")+'</div><div class="diamond-pitch-zone-wrap"><small>투구 위치 지정 · 드래그</small><div class="diamond-pitch-zone" id="diamond-aim-zone"><div class="diamond-zone-target" id="diamond-zone-target"></div></div><span id="diamond-aim-label">가운데</span></div><div class="diamond-pitch-actions"><button class="diamond-primary" data-control="pitch">투구</button><button class="diamond-secondary" data-control="lead">포수 리드: '+({center:"중앙",inside:"몸쪽",outside:"바깥쪽"}[catcherLead])+'</button><button class="diamond-secondary" data-control="intentional">고의사구</button><div class="diamond-pickoff"><button data-pickoff="first">1루 견제</button><button data-pickoff="second">2루 견제</button><button data-pickoff="third">3루 견제</button></div></div></div>';
      positionAimMarker();
    }else if(phase==="fielding"&&!manualFielding){
      hint.textContent="상대 수비가 자동으로 타구를 처리합니다.";
      controls.innerHTML='<div class="diamond-wait">수비수가 타구를 쫓고 있습니다. 타구 방향과 결과를 확인하세요.</div>';
    }else if(phase==="fielding"){
      hint.textContent="WASD/방향키로 수비수 이동 · 공 가까이에서 SPACE 포구 · 1/2/3/4 송구";
      controls.innerHTML='<div class="diamond-field-controls"><div class="diamond-move-pad"><button data-move="0,-1">↑</button><button data-move="-1,0">←</button><button data-move="1,0">→</button><button data-move="0,1">↓</button></div><div class="diamond-field-actions"><small>수비수 이동 · 공에 접근해 포구</small><button class="diamond-primary" data-control="catch">포구</button><div class="diamond-throw-grid"><button data-throw="first">1루 송구</button><button data-throw="second">2루 송구</button><button data-throw="third">3루 송구</button><button data-throw="home">홈 송구</button></div></div></div>';
    }else if(phase==="result"){
      hint.textContent="플레이 결과를 확인하고 다음 타석으로 진행하세요.";
      controls.innerHTML='<div class="diamond-result-controls"><b>'+esc(atBatResult||"플레이 종료")+'</b><button class="diamond-primary" data-control="next">다음 플레이</button></div>';
    }else{
      controls.innerHTML='<div class="diamond-wait">경기 흐름을 확인하고 있습니다.</div>';
    }
  };
  function positionAimMarker(){
    const zone=host.querySelector("#diamond-aim-zone"),marker=host.querySelector("#diamond-zone-target"),label=host.querySelector("#diamond-aim-label");
    if(!zone||!marker)return;
    marker.style.left=(50+aim.x*36)+"%";marker.style.top=(50-aim.y*36)+"%";
    if(label)label.textContent=(aim.x<-.25?"몸쪽":aim.x>.25?"바깥쪽":"가운데")+" · "+(aim.y>.25?"높게":aim.y<-.25?"낮게":"중앙");
  }
  const animatePlayer=(model,dt,now)=>{
    if(!model)return;const u=model.userData;u.walkPhase+=dt*3.5;
    if((u.kind==="runner"||(model===battingPlayer&&u.running))&&model.visible&&u.targetPosition){const delta=u.targetPosition.clone().sub(model.position),distance=delta.length();if(distance>.18){const direction=delta.normalize();const runSpeed=8.5+((model===battingPlayer?(half==="bottom"?(batterStats?.speed??65):65):65)*.035);model.position.add(direction.multiplyScalar(Math.min(distance,dt*runSpeed)));model.rotation.y=Math.atan2(direction.x,-direction.z);u.legs[0].rotation.x=Math.sin(now*.014)*.48;u.legs[1].rotation.x=-Math.sin(now*.014)*.48;}else{if(u.kind==="batter")u.running=false;u.legs[0].rotation.x=lerp(u.legs[0].rotation.x,0,dt*5);u.legs[1].rotation.x=lerp(u.legs[1].rotation.x,0,dt*5)}}
    if(phase==="intro"){u.legs[0].rotation.x=0;u.legs[1].rotation.x=0}
    else if(u.kind!=="runner"&&!(u.kind==="batter"&&u.running)){u.legs.forEach(l=>l.rotation.x=lerp(l.rotation.x,0,dt*6));u.arms.forEach(a=>{a.shoulder.rotation.x=lerp(a.shoulder.rotation.x,0,dt*5);a.elbow.rotation.x=lerp(a.elbow.rotation.x,0,dt*5)})}
    if(model===pitchingPlayer&&phase==="pitch-flight"){u.arms[1].shoulder.rotation.x=Math.sin(pitchClock*11)*.75;u.torso.rotation.z=Math.sin(pitchClock*8)*.06}
    if(model===battingPlayer&&swingClock>0){const t=clamp(swingClock/.28,0,1),arc=Math.sin(t*Math.PI);u.batPivot.rotation.x=lerp(-.25,pendingBunt?-.78:-1.25,arc);u.batPivot.rotation.z=lerp(-.15,pendingBunt?-.42:-.95,arc);u.arms[0].shoulder.rotation.x=-.75*arc;u.arms[1].shoulder.rotation.x=-.55*arc}
  };
  const advanceBatter=steps=>{
    if(steps>=4){const runs=runnerTokens.filter(Boolean).length+1;if(half==="bottom")scoreRuns+=runs;else opponentRuns+=runs;runnerTokens=[null,null,null];bases=[false,false,false];homeRuns++;hits++;if(half==="bottom"){userHits++;userHomeRuns++}return}
    const next=[null,null,null];
    runnerTokens.forEach((token,index)=>{if(!token)return;const destination=index+steps;if(destination>=3){if(half==="bottom")scoreRuns++;else opponentRuns++}else next[destination]=token});
    next[steps-1]="runner-"+nextRunnerId++;runnerTokens=next;bases=next.map(Boolean);hits++;if(half==="bottom")userHits++;
  };
  const resetCount=()=>{balls=0;strikes=0;updateCount()};
  const nextPitch=()=>{
    if(finished||phase==="fielding")return;
    swingPressed=false;swingAttempted=false;swingClock=0;if(battingPlayer){battingPlayer.userData.batPivot.rotation.x=-.25;battingPlayer.userData.batPivot.rotation.z=-.15}
    if(activeControl==="bat"){
      phase="ready";pitchClock=0;makeBall(new THREE.Vector3(0,2.3,-1));setResult("다음 공을 기다리세요.");renderControls();
      autoTimer=window.setTimeout(()=>{if(!disposed&&phase==="ready"&&activeControl==="bat")throwCpuPitch()},700);
    }else if(activeControl==="pitch"){phase="ready";setResult("다음 투구를 준비하세요.");renderControls()}
    else if(activeControl==="field"){phase="ready";pitchClock=0;setResult("다음 타자를 상대합니다.");renderControls();autoTimer=window.setTimeout(()=>{if(!disposed&&phase==="ready"&&activeControl==="field")throwPitch(true)},700)}
    updateMatch();
  };
  const classifyPitch=(target)=>{
    const x=target.x,y=target.y;
    return Math.abs(x)<1.25&&y>1.25&&y<3.65;
  };
  const throwPitch=(isCpu=false)=>{
    if(finished||phase!=="ready"||activeControl!=="pitch"&&!isCpu)return;
    const type=isCpu?Object.keys(PITCHES)[Math.floor(Math.random()*Object.keys(PITCHES).length)]:selectedPitch;
    const data=PITCHES[type],baseControl=isCpu?67:(pitcherStats?.control??60),baseVelocity=isCpu?70:(pitcherStats?.velocity??70),maxStamina=pitcherStats?.stamina??72;
    let stamina=Number.isFinite(match.pitcherStamina)?match.pitcherStamina:maxStamina;
    if(!isCpu){stamina=Math.max(0,stamina-data.stamina*.65);match.pitcherStamina=stamina}
    const fatigue=isCpu?1:clamp(stamina/Math.max(1,maxStamina),.32,1);
    const effectiveControl=baseControl*(.72+.28*fatigue),speed=clamp(data.speed+(baseVelocity-70)*.12,23,46)*(.88+.12*fatigue);
    const spread=clamp(1.65-(effectiveControl-40)*.018+(1-fatigue)*.72,.22,2.4);
    const leadOffset=catcherLead==="inside"?-.24:catcherLead==="outside"?.24:0;
    const intended=isCpu?{x:(Math.random()-.5)*2.8,y:1.15+Math.random()*2.65}:{x:aim.x*1.8+leadOffset,y:2.45+aim.y*1.6};
    const target={x:intended.x+(Math.random()-.5)*spread,y:intended.y+(Math.random()-.5)*spread};
    pitchKind=type;pitchTarget=target;pitches++;pitchClock=0;speedText.textContent=Math.round(speed*3.6)+" km/h · "+data.label;phase="pitch-flight";ballInPlay=false;playResolved=false;
    const start=new THREE.Vector3(0,2.15,-1.4);makeBall(start);
    const travel=21.2,seconds=travel/speed,breakFactor=clamp((pitcherStats?.breaking??65)/65,.55,1.5);
    ballVelocity.set((target.x-start.x)/seconds+data.breakX*.18*breakFactor,(target.y-start.y)/seconds+4.9*seconds+data.breakY*.18*breakFactor,speed);
    ballSpin=type==="curve"?2.8:type==="slider"?1.9:1.1;
    pitchingPlayer.userData.arms[1].shoulder.rotation.x=-1.1;
    setResult(isCpu?"투수가 "+data.label+"를 던졌습니다.":"투구! 타자의 반응을 확인하세요.");
    phaseLabel.textContent=isCpu?"BATTER":"PITCHING";
    renderControls();updateMatch();
  };
  const throwCpuPitch=()=>{if(activeControl==="bat"&&phase==="ready")throwPitch(true)};
  const contactQuality=()=>{
    if(!ball)return {quality:0,grade:"헛스윙",inZone:false};
    const earlyOffset=(pitchTarget.x<-.3||pitchTarget.y>3)?-.55:(pitchTarget.x>.3||pitchTarget.y<1.9)?.55:0;
    const targetZ=19.4+earlyOffset,dist=Math.abs(ball.position.z-targetZ),zone=ball.position.x>-.95&&ball.position.x<.95&&ball.position.y>1.15&&ball.position.y<3.75;
    const timingScore=clamp(1-dist/3.8,0,1),locationScore=zone?clamp(1-Math.abs(ball.position.x)/1.9,0,1):.1;
    const skill=clamp(((batterStats?.contact??60)-45)/65,.25,1);
    const guess=match.guess,actual=pitchTarget.x<-.3?"inside":pitchTarget.x>.3?"outside":pitchTarget.y>3?"high":pitchTarget.y<1.9?"low":null;
    const guessBonus=(guess&&guess===actual)?0.07:0;
    const quality=clamp(timingScore*.67+locationScore*.2+skill*.13+guessBonus,0,1);
    const grade=quality>.83?"완벽":quality>.62?"좋음":quality>.42?(ball.position.z>targetZ?"조금 늦음":"조금 빠름"):"헛스윙";
    return {quality,grade,inZone:zone};
  };
  const startHitBall=(quality,fromAi=false)=>{
    if(!ball)return;
    phase="hit-flight";ballInPlay=true;playResolved=false;pitchClock=0;batterRunTimer=0;throwResult=null;battingPlayer.userData.running=true;battingPlayer.userData.targetPosition=BASE_POSITIONS.first.clone();battingPlayer.userData.targetPosition.y=0;clearTimeout(autoTimer);
    const x=ball.position.x,y=ball.position.y;
    const sweet=quality>.72,launchAngle=sweet?(.38+quality*.52):(.08+quality*.18),batterPower=fromAi?65:(batterStats?.power??65),powerFactor=.85+batterPower/400,speed=(sweet?38+quality*15:20+quality*10)*powerFactor;
    const insideOrHigh=pitchTarget.x<-.3||pitchTarget.y>3,outsideOrLow=pitchTarget.x>.3||pitchTarget.y<1.9,pullSide=player.bats==="L"?1:-1,pitchDirection=insideOrHigh?pullSide*.3:outsideOrLow?-pullSide*.24:0;
    const direction=clamp((x*.42)+pitchDirection+(Math.random()-.5)*.32,-.9,.9);
    ballVelocity.set(direction*speed*.42,Math.sin(launchAngle)*speed,-Math.cos(direction*.35)*speed);
    ballSpin=quality*8;
    setResult(quality>.82?"완벽한 타구! 외야로 뻗어갑니다.":quality>.58?"정타! 타구가 필드로 향합니다.":"빗맞은 타구! 수비가 처리합니다.");
    phaseLabel.textContent="BALL IN PLAY";
    battingPlayer.userData.batPivot.rotation.z=-1.8;
    setCamera("field");
    activeFielder=fielders.reduce((best,f)=>!best||f.position.distanceTo(ball.position)<best.position.distanceTo(ball.position)?f:best,null);
    activeFielderIndex=fielders.indexOf(activeFielder);manualFielding=half==="top"&&(isTeamControl||match.controlMode==="player");
    renderControls();updateMatch();
  };
  const swing=(bunt=false)=>{
    if(activeControl!=="bat"||phase!=="pitch-flight"||finished||!ball||swingPressed||swingAttempted)return;
    swingClock=.001;swingPressed=true;pendingBunt=bunt;setResult(bunt?"번트를 시도합니다.":"스윙! 타이밍을 맞춥니다.");
  };
  const pitchResultForAi=()=>{
    if(!ball)return;
    const inZone=classifyPitch(pitchTarget),control=pitcherStats?.control??60;
    const stuff=pitcherStats?.stuff??60;
    const swingChance=inZone?0.64:0.24;
    const swings=Math.random()<swingChance+(stuff-60)*.002;
    if(!swings){
      if(inZone){strikes++;setResult("루킹 스트라이크!")}
      else{balls++;setResult("볼! 공이 존을 벗어났습니다.")}
      if(strikes>=3){strikeouts++;if(half==="top")userStrikeouts++;atBatResult="삼진";resetCount();finishAtBat(true)}
      else if(balls>=4){atBatResult="볼넷";addBatterToBase();resetCount();finishAtBat(false)}
      else nextPitch();
      return;
    }
    const quality=clamp(Math.random()*.58+(65-control)*.002+(inZone?0.22:0)-(stuff-60)*.001,.05,.95);
    if(quality>.63){startHitBall(quality,true)}
    else{strikes++;setResult("타자가 헛스윙했습니다.");if(strikes>=3){strikeouts++;if(half==="top")userStrikeouts++;atBatResult="삼진";resetCount();finishAtBat(true)}else nextPitch()}
  };
  const addBatterToBase=()=>{
    const next=[null,null,null];
    runnerTokens.forEach((token,index)=>{if(!token)return;if(index===2)addRun();else next[index+1]=token});
    next[0]="runner-"+nextRunnerId++;runnerTokens=next;bases=next.map(Boolean);
  };
  const finishAtBat=(isOut)=>{
    if(isOut&&outs<3)outs++;
    resetCount();
    if(outs>=3){finishHalf();return}
    userAtBatDone=true;
    if(activeControl==="bat"&&!isTeamControl){
      runAutoRemaining();
      return;
    }
    phase="result";renderControls();updateMatch();
  };
  const simulateRemainingHalf=()=>{
    let runs=0,appearances=0;
    const advanceSimulatedRunners=steps=>{
      if(steps>=4){runs+=runnerTokens.filter(Boolean).length+1;runnerTokens=[null,null,null];bases=[false,false,false];return}
      const next=[null,null,null];
      runnerTokens.forEach((token,index)=>{if(!token)return;const destination=index+steps;if(destination>=3)runs++;else next[destination]=token});
      next[steps-1]="runner-"+nextRunnerId++;runnerTokens=next;bases=next.map(Boolean);
    };
    const simulateWalk=()=>{
      const next=runnerTokens.slice();
      if(next[0]){if(next[1]){if(next[2])runs++;next[2]=next[1]}next[1]=next[0]}
      next[0]="runner-"+nextRunnerId++;runnerTokens=next;bases=next.map(Boolean);
    };
    while(outs<3&&appearances<18){
      appearances++;const roll=Math.random();
      if(roll<.64){outs++;if(outs<3&&runnerTokens.some(Boolean)&&Math.random()<.09){outs++;const occupied=runnerTokens.findIndex(Boolean);if(occupied>=0)runnerTokens[occupied]=null;bases=runnerTokens.map(Boolean)}}
      else if(roll<.73)simulateWalk();
      else if(roll<.91)advanceSimulatedRunners(1);
      else if(roll<.97)advanceSimulatedRunners(2);
      else if(roll<.985)advanceSimulatedRunners(3);
      else advanceSimulatedRunners(4);
    }
    if(half==="top")opponentRuns+=runs;else scoreRuns+=runs;
    outs=3;finishHalf();
  };
  const runAutoRemaining=()=>{
    phase="auto";phaseLabel.textContent="INNING SIMULATION";setResult("팀의 나머지 타석을 진행하고 있습니다.");renderControls();
    autoTimer=window.setTimeout(()=>{if(!disposed)simulateRemainingHalf()},1200);
  };
  const runAutoHalf=()=>{
    if(finished||disposed)return;
    phase="auto";phaseLabel.textContent="AUTO PLAY";setResult("팀의 공격/수비가 자동으로 진행됩니다.");renderControls();
    autoTimer=window.setTimeout(()=>{if(!disposed)simulateRemainingHalf()},1250);
  };
  const finishHalf=()=>{
    phase="result";clearBall();outs=0;balls=0;strikes=0;bases=[false,false,false];runnerTokens=[null,null,null];userAtBatDone=false;
    if(half==="top"){half="bottom";setResult("공수 교대! "+inning+"회 말 공격입니다.");}
    else if(inning>=(match.inningsLimit||9)){
      finished=true;phase="finished";phaseLabel.textContent="FINAL";
      setResult(scoreRuns===opponentRuns?"경기 종료 · 무승부":scoreRuns>opponentRuns?"경기 종료 · 승리!":"경기 종료 · 패배");
      renderControls();updateMatch();return;
    }else{half="top";inning++;setResult("이닝 종료! "+inning+"회 초 수비입니다.");}
    updateSides();updateMatch();setPhaseMode();
  };
  const resolveHitPlay=()=>{
    if(playResolved||!ball)return;playResolved=true;
    const fence=getFenceStatus(ball.position,team.fence);
    if(fence.over||fieldingResult==="homer"){atBatResult="홈런";advanceBatter(4);setResult("홈런! 타구가 담장을 넘어갑니다.");}
    else if(fence.wall||fieldingResult==="wall"){atBatResult="2루타";advanceBatter(2);setResult("담장을 맞혔습니다! 2루타!");}
    else if(fieldingResult==="caught"||fieldingResult==="out"){outs++;atBatResult="아웃";setResult(fieldingResult==="caught"?"포구 성공! 플라이 아웃입니다.":"송구 아웃! 주자를 잡았습니다.");}
    else if(fieldingResult==="safe"){atBatResult="세이프";advanceBatter(1);setResult("송구보다 주자가 먼저 도착했습니다. 세이프!");}
    else if(fieldingResult==="ground"){atBatResult="안타";advanceBatter(ball.position.z< -42?2:1);setResult(ball.position.z< -42?"장타! 2루타!":"안타! 주자가 진루합니다.");}
    else{fieldingResult="ground";atBatResult="안타";advanceBatter(ball.position.z< -42?2:1);setResult("야수가 타구를 처리하지 못했습니다. 주자가 진루합니다.");}
    battingPlayer.userData.running=false;battingPlayer.visible=false;battingPlayer.userData.targetPosition.set(0,0,22);batterRunTimer=0;
    clearBall();phase="result";renderControls();updateMatch();
    if(outs>=3){finishHalf();return}
    if(activeControl==="bat"&&!isTeamControl){runAutoRemaining();}
  };
  const moveFielder=(dx,dz)=>{
    if(!activeFielder||phase!=="fielding")return;
    activeFielder.position.x=clamp(activeFielder.position.x+dx*1.45,-82,82);
    activeFielder.position.z=clamp(activeFielder.position.z+dz*1.45,-84,20);
    activeFielder.rotation.y=Math.atan2(dx,-dz);
  };
  const catchBall=()=>{
    if(phase!=="fielding"||!ball||!activeFielder)return;
    const distance=activeFielder.position.distanceTo(ball.position);
    if(distance<4.3&&ball.position.y<8){fieldingResult=ball.position.y<=.65?"ground-caught":"caught";ball.position.copy(activeFielder.position).add(new THREE.Vector3(0,1,0));ballVelocity.set(0,0,0);setResult("포구 성공! 송구할 베이스를 선택하세요.");}
    else setResult("공과 거리가 있습니다. 수비수를 더 이동하세요.");
  };
  const throwToBase=base=>{
    if(phase!=="fielding"||!ball||!activeFielder)return;
    if(fieldingResult!=="caught"&&fieldingResult!=="ground-caught")return setResult("먼저 수비수를 공 가까이 이동시켜 포구하세요.");
    throwTarget=BASE_POSITIONS[base];throwClock=0;
    const baseIndex={first:0,second:1,third:2,home:3}[base],occupied=base==="first"?true:base==="home"?!!bases[2]:!!bases[baseIndex];
    const runnerSpeed=8.5+((half==="bottom"?(batterStats?.speed??65):65)*.035),firstBaseTime=17.4/runnerSpeed,targetTime=base==="first"?firstBaseTime:1.05+baseIndex*.62,throwTravel=ball.position.distanceTo(throwTarget)/54;
    throwResult=fieldingResult==="caught"||occupied&&batterRunTimer+throwTravel<targetTime?"out":"safe";
    ballVelocity.copy(throwTarget.clone().sub(ball.position).normalize().multiplyScalar(54));
    phase="throw-flight";fieldingResult="throwing";setResult(({first:"1루",second:"2루",third:"3루",home:"홈"})[base]+"로 송구합니다.");
    renderControls();
  };
  const toggleBench=()=>{
    benchView=!benchView;setCamera(benchView?"bench":phase==="fielding"?"field":activeControl==="bat"?"batter":activeControl==="pitch"?"pitcher":"broadcast");
    host.querySelector("#diamond-bench").textContent=benchView?"플레이 시점":"벤치 관전";
  };
  const startBattingTurn=()=>{
    activeControl="bat";userAtBatDone=false;swingPressed=false;swingAttempted=false;swingClock=0;battingPlayer.visible=true;battingPlayer.position.set(-1.2,0,21.6);battingPlayer.userData.running=false;battingPlayer.userData.targetPosition.set(0,0,22);battingPlayer.userData.batPivot.rotation.x=-.25;battingPlayer.userData.batPivot.rotation.z=-.15;setCamera("batter");phase="ready";pitchClock=0;makeBall(new THREE.Vector3(0,2.3,-1));phaseLabel.textContent="AT BAT";setResult("타석에 들어섰습니다. 투구를 기다리세요.");renderControls();
    autoTimer=window.setTimeout(()=>{if(!disposed&&phase==="ready")throwCpuPitch()},800);
  };
  const startPitchingTurn=()=>{
    activeControl="pitch";battingPlayer.visible=true;battingPlayer.position.set(-1.2,0,21.6);battingPlayer.userData.running=false;battingPlayer.userData.targetPosition.set(0,0,22);setCamera("pitcher");phase="ready";pitchClock=0;makeBall(new THREE.Vector3(0,2.3,-1));phaseLabel.textContent="ON THE MOUND";setResult("투수 시점입니다. 구종과 코스를 정하세요.");renderControls();
  };
  const startCpuFieldAtBat=()=>{
    activeControl="field";swingPressed=false;swingAttempted=false;swingClock=0;
    battingPlayer.visible=true;battingPlayer.position.set(-1.2,0,21.6);battingPlayer.userData.running=false;battingPlayer.userData.targetPosition.set(0,0,22);
    setCamera("broadcast");phase="ready";pitchClock=0;makeBall(new THREE.Vector3(0,2.3,-1));phaseLabel.textContent="DEFENSE";setResult("상대 타자가 타석에 들어섰습니다. 타구가 나오면 직접 수비하세요.");renderControls();
    autoTimer=window.setTimeout(()=>{if(!disposed&&phase==="ready"&&activeControl==="field")throwPitch(true)},850);
  };
  const onKey=e=>{
    if(disposed||finished)return;
    const key=e.key.toLowerCase();
    if(key==="escape"&&phase!=="auto"){pausedState.value=!pausedState.value;if(pausedState.value)setResult("타임아웃 · 일시 정지");else setResult("경기를 재개합니다.");renderControls();return}
    if(pausedState.value)return;
    if([" ","arrowup","arrowdown","arrowleft","arrowright"].includes(key))e.preventDefault();
    if(phase==="fielding"){
      if(key===" "||key==="enter")catchBall();
      if(key==="arrowup"||key==="w")moveFielder(0,-1);if(key==="arrowdown"||key==="s")moveFielder(0,1);
      if(key==="arrowleft"||key==="a")moveFielder(-1,0);if(key==="arrowright"||key==="d")moveFielder(1,0);
      if(key==="1")throwToBase("first");if(key==="2")throwToBase("second");if(key==="3")throwToBase("third");if(key==="4")throwToBase("home");
    }else if(activeControl==="bat"){
      if(key===" "||key==="enter")swing(false);
      if(key==="b")swing(true);
      if(key==="w")setGuess("high");if(key==="a")setGuess("inside");if(key==="s")setGuess("low");if(key==="d")setGuess("outside");
      if(["1","2","3"].includes(key))steal(Number(key));
    }else if(activeControl==="pitch"){
      if(key===" "||key==="enter")throwPitch(false);
      if(key==="w")selectedPitch="slider";if(key==="e")selectedPitch="fastball";if(key==="a")selectedPitch="curve";if(key==="z")selectedPitch="sinker";if(key==="x")selectedPitch="changeup";if(key==="s")cycleCatcherLead();
      if(key==="arrowleft")aim.x=clamp(aim.x-.12,-1,1);if(key==="arrowright")aim.x=clamp(aim.x+.12,-1,1);if(key==="arrowup")aim.y=clamp(aim.y+.12,-1,1);if(key==="arrowdown")aim.y=clamp(aim.y-.12,-1,1);pitchTarget={x:aim.x*1.8,y:2.45+aim.y*1.6};positionAimMarker();
      if(key==="b"){balls=4;addBatterToBase();resetCount();atBatResult="고의사구";finishAtBat(false)}
      if(["1","2","3"].includes(key))pickoff(["first","second","third"][Number(key)-1]);
      renderControls();
    }
  };
  function cycleCatcherLead(){
    catcherLead=catcherLead==="center"?"inside":catcherLead==="inside"?"outside":"center";
    setResult("포수 리드: "+({center:"중앙",inside:"몸쪽",outside:"바깥쪽"})[catcherLead]);
    const button=host.querySelector('[data-control="lead"]');if(button)button.textContent="포수 리드: "+({center:"중앙",inside:"몸쪽",outside:"바깥쪽"})[catcherLead];
    updateMatch();
  }
  function setGuess(value){
    const label=host.querySelector("#diamond-guess-label");if(label)label.textContent=({high:"높은 공",inside:"몸쪽",low:"낮은 공",outside:"바깥쪽"})[value]||"예측 없음";
    match.guess=value;
  }
  function steal(base){
    if(!bases[base-1]||phase!=="ready")return setResult("해당 베이스에 주자가 없습니다.");
    selectedSteal=base;setResult(base+"루 주자가 도루를 시도합니다.");const chance=.55+(batterStats?.speed??60)*.003-(pitcherStats?.control??60)*.001,index=base-1,destination=index+1;
    if(Math.random()<chance&&(destination>=3||!runnerTokens[destination])){const token=runnerTokens[index];runnerTokens[index]=null;if(destination>=3)addRun();else runnerTokens[destination]=token;bases=runnerTokens.map(Boolean);setResult("도루 성공! 주자가 진루했습니다.");}
    else{outs++;runnerTokens[index]=null;bases=runnerTokens.map(Boolean);setResult("도루 실패! 주자가 태그 아웃되었습니다.");if(outs>=3)finishHalf()}
    updateMatch();
  }
  function pickoff(base){
    if(phase!=="ready"||activeControl!=="pitch")return;
    const index=base==="first"?0:base==="second"?1:2;
    if(!bases[index])return setResult("견제할 주자가 없습니다.");
    const chance=.12+(pitcherStats?.control??60)*.002;
    if(Math.random()<chance){runnerTokens[index]=null;bases=runnerTokens.map(Boolean);outs++;setResult("견제 성공! 주자를 잡았습니다.");if(outs>=3)finishHalf()}
    else setResult("견제구! 주자가 귀루했습니다.");
    updateMatch();
  }
  const onControl=e=>{
    const b=e.target.closest("[data-control],[data-pitch],[data-guess],[data-steal],[data-move],[data-throw],[data-pickoff]");
    if(!b)return;
    if(b.dataset.pitch){selectedPitch=b.dataset.pitch;renderControls();return}
    if(b.dataset.guess){setGuess(b.dataset.guess);return}
    if(b.dataset.steal){steal(Number(b.dataset.steal));return}
    if(b.dataset.move){const [dx,dz]=b.dataset.move.split(",").map(Number);moveFielder(dx,dz);return}
    if(b.dataset.throw){throwToBase(b.dataset.throw);return}
    if(b.dataset.pickoff){pickoff(b.dataset.pickoff);return}
    switch(b.dataset.control){
      case"swing":swing(false);break;
      case"bunt":swing(true);break;
      case"pitch":throwPitch(false);break;
      case"intentional":balls=4;addBatterToBase();resetCount();atBatResult="고의사구";finishAtBat(false);break;
      case"lead":cycleCatcherLead();renderControls();break;
      case"catch":catchBall();break;
      case"next":if(outs>=3)finishHalf();else if(activeControl==="bat")startBattingTurn();else if(activeControl==="field")startCpuFieldAtBat();else startPitchingTurn();break;
      case"finish":onFinish?.(match);break;
      case"resume":pausedState.value=false;setResult("경기를 재개합니다.");renderControls();updateMatch();break;
    }
  };
  const onAimPointer=e=>{
    const zone=e.target.closest("#diamond-aim-zone");if(!zone)return;
    isTouchingZone=true;zonePointer=e.pointerId;zone.setPointerCapture?.(e.pointerId);updateAim(e,zone);
  };
  const onAimMove=e=>{if(!isTouchingZone)return;const zone=host.querySelector("#diamond-aim-zone");if(zone)updateAim(e,zone)};
  const onAimUp=()=>{isTouchingZone=false;zonePointer=null};
  const updateAim=(e,zone)=>{
    const r=zone.getBoundingClientRect(),x=clamp((e.clientX-r.left)/r.width,0,1),y=clamp((e.clientY-r.top)/r.height,0,1);
    aim={x:(x-.5)*2,y:(.5-y)*2};pitchTarget={x:aim.x*1.8,y:2.45+aim.y*1.6};positionAimMarker();
  };
  const onCanvasTap=e=>{if(activeControl==="bat"&&phase==="pitch-flight")swing(false);};
  const resize=()=>{
    if(!renderer||disposed)return;const w=Math.max(1,view.clientWidth),h=Math.max(1,view.clientHeight);
    renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();
  };
  const init=()=>{
    const mobile=window.matchMedia("(max-width:700px)").matches;
    renderer=new THREE.WebGLRenderer({canvas,antialias:!mobile,alpha:false,powerPreference:"high-performance"});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,mobile?1.15:1.4));renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.06;
    renderer.shadowMap.enabled=!mobile;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
    scene=createGamePark(team);camera=new THREE.PerspectiveCamera(48,1,.1,650);
    const home=team.primary||"#315c82";
    const userBatter=makePlayer(home,player.number||"7","batter");userBatter.position.set(-1.2,0,21.6);userBatter.rotation.y=0;scene.add(userBatter);
    const awayBatter=makePlayer(opponent.primary,"1","batter");awayBatter.position.set(-1.2,0,21.6);awayBatter.rotation.y=0;scene.add(awayBatter);
    const userPitcher=makePlayer(home,"1","pitcher");userPitcher.position.set(0,0,-1.3);userPitcher.rotation.y=Math.PI;scene.add(userPitcher);
    const awayPitcher=makePlayer(opponent.primary,"1","pitcher");awayPitcher.position.set(0,0,-1.3);awayPitcher.rotation.y=Math.PI;scene.add(awayPitcher);
    const homeCatcher=makePlayer(home,"2","catcher");homeCatcher.position.set(0,0,25.8);homeCatcher.rotation.y=0;scene.add(homeCatcher);
    const awayCatcher=makePlayer(opponent.primary,"2","catcher");awayCatcher.position.set(0,0,25.8);awayCatcher.rotation.y=0;scene.add(awayCatcher);
    const umpireModel=makePlayer("#242c34","0","umpire");umpireModel.scale.set(.88,.95,.88);umpireModel.position.set(0,0,27.4);scene.add(umpireModel);umpire=umpireModel;
    players.push(userBatter,awayBatter,userPitcher,awayPitcher,homeCatcher,awayCatcher,umpireModel);
    const positions=[[-10,0,11],[10,0,11],[-8,0,2],[8,0,2],[-34,0,-32],[0,0,-57],[34,0,-32],[0,0,-18]];
    const homeFielders=[],awayFielders=[],homeRunners=[],awayRunners=[];
    positions.forEach((p,i)=>{
      const hf=makePlayer(home,String(i+3),"fielder");hf.position.set(p[0],0,p[2]);scene.add(hf);homeFielders.push(hf);players.push(hf);
      const af=makePlayer(opponent.primary,String(i+3),"fielder");af.position.set(p[0],0,p[2]);scene.add(af);awayFielders.push(af);players.push(af);
    });
    for(let i=0;i<3;i++){
      const hr=makePlayer(home,"R"+(i+1),"runner");hr.visible=false;scene.add(hr);homeRunners.push(hr);players.push(hr);
      const ar=makePlayer(opponent.primary,"R"+(i+1),"runner");ar.visible=false;scene.add(ar);awayRunners.push(ar);players.push(ar);
    }
    scene.userData.userBatter=userBatter;scene.userData.awayBatter=awayBatter;scene.userData.userPitcher=userPitcher;scene.userData.awayPitcher=awayPitcher;scene.userData.homeCatcher=homeCatcher;scene.userData.awayCatcher=awayCatcher;scene.userData.homeFielders=homeFielders;scene.userData.awayFielders=awayFielders;scene.userData.homeRunners=homeRunners;scene.userData.awayRunners=awayRunners;
    updateSides();
    addStrikeZone(scene);
    makeBall(new THREE.Vector3(0,2.3,-1));
    resizeObserver=new ResizeObserver(resize);resizeObserver.observe(view);resize();
    introPlayers.push(...players);
    setCamera("broadcast");
    const board=makeScoreboard(scene,team,opponent);
    setResult("선수단 입장 · 선발 라인업 소개");
    renderControls();updateMatch();
  };
  const beginLivePlay=()=>{
    intro?.classList.add("hidden");setPhaseMode();
  };
  const onSkip=()=>{introClock=2.5;beginLivePlay()};
  const onBench=()=>toggleBench();
  const onCamera=()=>{benchView=false;const next=viewMode==="broadcast"?(phase==="fielding"?"field":activeControl==="pitch"?"pitcher":"batter"):"broadcast";setCamera(next);host.querySelector("#diamond-camera").textContent=next==="broadcast"?"타석 시점":"중계 시점"};
  const onExit=()=>{if(window.confirm("현재 경기를 종료하고 커리어 화면으로 돌아갈까요?"))onFinish?.(match)};
  host.addEventListener("click",onControl);host.querySelector("#diamond-skip-intro").addEventListener("click",onSkip);host.querySelector("#diamond-bench").addEventListener("click",onBench);host.querySelector("#diamond-camera").addEventListener("click",onCamera);host.querySelector("#diamond-exit").addEventListener("click",onExit);
  controls.addEventListener("pointerdown",onAimPointer);controls.addEventListener("pointermove",onAimMove);controls.addEventListener("pointerup",onAimUp);controls.addEventListener("pointercancel",onAimUp);canvas.addEventListener("pointerdown",onCanvasTap);window.addEventListener("keydown",onKey);

  const animate=()=>{
    if(disposed)return;raf=requestAnimationFrame(animate);const now=performance.now(),dt=Math.min((now-last)/1000,.04);last=now;if(pausedState.value){renderer.render(scene,camera);return}clock+=dt;
    if(phase==="intro"){
      introClock+=dt;camera.position.lerp(new THREE.Vector3(Math.sin(introClock*.17)*95,52+Math.sin(introClock*.45)*4,Math.cos(introClock*.17)*100),.018);camera.lookAt(0,2,-10);
      players.forEach(p=>animatePlayer(p,dt,now));
      if(introClock>2.4)beginLivePlay();
    }
    if(phase==="ready"&&activeControl==="bat"&&pitchClock>1.8)throwCpuPitch();
    if(phase==="pitch-flight"){
      if(ball){ball.position.addScaledVector(ballVelocity,dt);ballVelocity.y-=9.81*dt;ballVelocity.x+=Math.sin(pitchClock*ballSpin)*.04;pitchClock+=dt;
        if(swingPressed&&activeControl==="bat"){
          swingClock+=dt;const t=clamp(swingClock/.28,0,1),arc=Math.sin(t*Math.PI),pivot=battingPlayer.userData.batPivot;
          pivot.rotation.x=lerp(-.25,pendingBunt?-.78:-1.25,arc);pivot.rotation.z=lerp(-.15,pendingBunt?-.42:-.95,arc);
          battingPlayer.userData.arms[0].shoulder.rotation.x=-.75*arc;battingPlayer.userData.arms[1].shoulder.rotation.x=-.55*arc;
          battingPlayer.updateMatrixWorld(true);const sweetSpot=pivot.localToWorld(new THREE.Vector3(0,1.12,0)),separation=sweetSpot.distanceTo(ball.position);
          if(ball.position.z>17&&ball.position.z<21.5&&separation<2.2){
            const base=contactQuality(),collision=clamp(1-separation/2.6,.15,1),quality=clamp(base.quality*(.58+.42*collision),.05,.98);
            swingPressed=false;swingAttempted=false;swingClock=0;pivot.rotation.x=-1.25;pivot.rotation.z=-.95;
            atBatResult=(pendingBunt?"번트":base.grade)+" 타구";startHitBall(pendingBunt?Math.min(.58,quality):quality);
          }else if(swingClock>.28){swingPressed=false;swingAttempted=true;swingClock=0;pivot.rotation.x=-.25;pivot.rotation.z=-.15;}
        }
        if(phase==="pitch-flight"&&activeControl==="bat"&&ball.position.z>19.8){if(swingPressed||swingAttempted){strikes++;atBatResult="헛스윙";setResult("헛스윙! 스트라이크 "+strikes+"개.")}else{const inZone=ball.position.x>-.95&&ball.position.x<.95&&ball.position.y>1.2&&ball.position.y<3.7;if(inZone){strikes++;setResult("스트라이크! 타자가 공을 지켜봤습니다.")}else{balls++;setResult("볼! 공을 골랐습니다.")}}if(strikes>=3){strikeouts++;atBatResult="루킹 삼진";resetCount();finishAtBat(true)}else if(balls>=4){addBatterToBase();atBatResult="볼넷";resetCount();finishAtBat(false)}else nextPitch()}
        else if(phase==="pitch-flight"&&(activeControl==="pitch"||activeControl==="field")&&ball.position.z>19.8){pitchResultForAi()}
        if(ball&&ball.position.y<.12&&ball.position.z>17){ball.position.y=.12;ballVelocity.set(0,0,0)}
      }
    }
    if(phase==="hit-flight"||phase==="fielding"||phase==="throw-flight"){
      batterRunTimer+=dt;pitchClock+=dt;
      if(ball){
        ball.position.addScaledVector(ballVelocity,dt);ballVelocity.y-=9.81*dt;ball.rotation.x+=dt*ballSpin;ball.rotation.z+=dt*ballSpin*.7;
        if(phase==="hit-flight"&&pitchClock>0.18){phase="fielding";phaseLabel.textContent="FIELDING";renderControls()}
        if(phase==="fielding"){
          if(activeFielder&&!manualFielding){const target=ball.position.clone();target.y=0;const delta=target.sub(activeFielder.position);const distance=delta.length();if(distance>0.01)activeFielder.position.add(delta.normalize().multiplyScalar(Math.min(distance,dt*18)));const horizontal=Math.hypot(activeFielder.position.x-ball.position.x,activeFielder.position.z-ball.position.z);if(horizontal<2.7&&ball.position.y<6&&ballVelocity.y<0){fieldingResult="caught";ball.position.copy(activeFielder.position).add(new THREE.Vector3(0,1,0));ballVelocity.set(0,0,0);resolveHitPlay()}}
          if(ball&&phase==="fielding"&&ball.position.y<=.22&&ballVelocity.y<0){ball.position.y=.22;ballVelocity.y=Math.abs(ballVelocity.y)*.27;ballVelocity.multiplyScalar(.78);if(manualFielding){fieldingResult="loose";if(ballVelocity.length()<1.1)ballVelocity.set(0,0,0)}else if(ballVelocity.length()<2){fieldingResult="ground";resolveHitPlay()}}
          if(ball&&phase==="fielding"){const fence=getFenceStatus(ball.position,team.fence);if(fence.over){fieldingResult="homer";resolveHitPlay()}else if(fence.wall){fieldingResult="wall";resolveHitPlay()}else if(ball.position.x>105||ball.position.x< -105){fieldingResult="ground";resolveHitPlay()}}
          if(ball&&phase==="fielding"&&pitchClock>7&&!playResolved){fieldingResult="ground";resolveHitPlay()}
        }
        if(phase==="throw-flight"){
          throwClock+=dt;
          if(ball.position.distanceTo(throwTarget)<1.3||throwClock>1.2){fieldingResult=throwResult||"safe";setResult(fieldingResult==="out"?"송구 아웃!":"세이프! 송구가 늦었습니다.");resolveHitPlay()}
        }
      }
    }
    if(viewMode==="field"&&phase==="fielding"&&ball){const target=activeFielder?.position||ball.position;const desired=target.clone().add(new THREE.Vector3(24,15,20));camera.position.lerp(desired,Math.min(1,dt*1.8));camera.lookAt(ball.position)}
    if(phase==="fielding"&&activeFielder){const d=activeFielder.position.distanceTo(ball.position);if(d<3.8&&ball.position.y<5)hint.textContent="포구할 수 있습니다 · 스페이스 또는 포구 버튼";else hint.textContent="수비수를 공 쪽으로 이동하세요 · WASD"}
    players.forEach(p=>{if(p!==activeFielder)animatePlayer(p,dt,now)});
    if(phase==="result"&&outs>=3){finishHalf()}
    renderer.render(scene,camera);
  };
  try{init();animate()}catch(error){const loading=host.querySelector(".diamond-intro-card");if(loading)loading.textContent="3D 경기장을 불러오지 못했습니다. WebGL 지원을 확인해 주세요.";throw error}
  return()=>{
    disposed=true;cancelAnimationFrame(raf);clearTimeout(autoTimer);resizeObserver?.disconnect();window.removeEventListener("keydown",onKey);
    host.removeEventListener("click",onControl);host.querySelector("#diamond-skip-intro")?.removeEventListener("click",onSkip);host.querySelector("#diamond-bench")?.removeEventListener("click",onBench);host.querySelector("#diamond-camera")?.removeEventListener("click",onCamera);host.querySelector("#diamond-exit")?.removeEventListener("click",onExit);
    controls.removeEventListener("pointerdown",onAimPointer);controls.removeEventListener("pointermove",onAimMove);controls.removeEventListener("pointerup",onAimUp);controls.removeEventListener("pointercancel",onAimUp);canvas.removeEventListener("pointerdown",onCanvasTap);
    scene?.traverse(o=>{o.geometry?.dispose?.();if(o.material){const list=Array.isArray(o.material)?o.material:[o.material];list.forEach(m=>{m.map?.dispose?.();m.dispose?.()})}});renderer?.dispose();renderer?.forceContextLoss();
  };
}
