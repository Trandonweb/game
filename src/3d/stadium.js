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
  const canvas=document.createElement("canvas");canvas.width=2048;canvas.height=2048;
  const ctx=canvas.getContext("2d");
  const base=ctx.createLinearGradient(0,0,2048,2048);base.addColorStop(0,"#397a40");base.addColorStop(.55,"#2f6d38");base.addColorStop(1,"#285f32");
  ctx.fillStyle=base;ctx.fillRect(0,0,2048,2048);
  // Alternating precision-mowed bands, with a subtle cross-grain and fine turf variation.
  for(let i=0;i<16;i++){
    ctx.fillStyle=i%2?"#4b8c4b":"#34753c";ctx.fillRect(i*128,0,128,2048);
  }
  const shade=ctx.createLinearGradient(0,0,0,2048);shade.addColorStop(0,"#ffffff08");shade.addColorStop(.5,"#00000000");shade.addColorStop(1,"#07170720");
  ctx.fillStyle=shade;ctx.fillRect(0,0,2048,2048);
  for(let i=0;i<32000;i++){
    const x=Math.random()*2048,y=Math.random()*2048;
    ctx.fillStyle=Math.random()>.5?"#ffffff12":"#071b0718";ctx.fillRect(x,y,1+Math.random()*2,1+Math.random()*2);
  }
  const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;
  texture.repeat.set(2.4,2.4);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=8;return texture;
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
  // Baseball seating wraps the outfield and stops before the area directly behind home plate.
  // The first lower-deck row begins just beyond the outfield wall, instead of leaving a wide empty gap.
  const start=Math.PI+.2,end=Math.PI*2-.2,sections=128;
  const lowerRows=15,upperRows=9,tiers=2,totalRows=lowerRows+upperRows;
  const count=sections*totalRows;
  const seatGeometry=new THREE.BoxGeometry(2.25,.48,1.45);
  const seatBackGeometry=new THREE.BoxGeometry(2.2,.72,.2);
  const seats=new THREE.InstancedMesh(seatGeometry,mat("#ffffff",.78),count);
  const seatBacks=new THREE.InstancedMesh(seatBackGeometry,mat("#ffffff",.78),count);
  const bodies=new THREE.InstancedMesh(new THREE.CapsuleGeometry(.17,.34,3,6),mat("#ffffff",.94),count);
  const heads=new THREE.InstancedMesh(new THREE.SphereGeometry(.135,7,6),mat("#ffffff",.9),count);
  const dummy=new THREE.Object3D(),seatColors=[team.primary,team.secondary,"#657784","#d5d9dc","#b8a58b"];
  const shirtColors=[team.primary,team.secondary,"#e3e5e6","#a9b4bb","#35495c","#927b67"];
  const skinColors=["#bd8d6a","#d4a47d","#8b604b","#e0b99a"];
  let index=0;
  for(let tier=0;tier<tiers;tier++){
    const rows=tier===0?lowerRows:upperRows;
    for(let row=0;row<rows;row++){
      const radius=96+row*1.9+tier*31;
      const y=8+row*.72+tier*13;
      for(let section=0;section<sections;section++){
        const angle=start+(end-start)*section/(sections-1);
        const x=Math.cos(angle)*radius,z=Math.sin(angle)*radius;
        dummy.position.set(x,y,z);dummy.rotation.set(-.04,-angle-Math.PI/2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
        seats.setMatrixAt(index,dummy.matrix);
        dummy.position.set(x+Math.cos(angle)*.62,y+.42,z+Math.sin(angle)*.62);dummy.updateMatrix();
        seatBacks.setMatrixAt(index,dummy.matrix);
        seats.setColorAt(index,new THREE.Color(seatColors[(section*3+row*5+tier)%seatColors.length]));
        // Seated spectators are placed on the matching seat row, not in a separate overlapping ring.
        dummy.position.set(x,y+.34,z);dummy.rotation.set(0,-angle-Math.PI/2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();
        bodies.setMatrixAt(index,dummy.matrix);
        bodies.setColorAt(index,new THREE.Color(shirtColors[(section*7+row*3)%shirtColors.length]));
        dummy.position.set(x,y+.78,z);dummy.scale.set(.9,.9,.9);dummy.updateMatrix();
        heads.setMatrixAt(index,dummy.matrix);
        heads.setColorAt(index,new THREE.Color(skinColors[(section+row*2)%skinColors.length]));
        index++;
      }
    }
  }
  seats.count=seatBacks.count=bodies.count=heads.count=index;
  seats.instanceMatrix.needsUpdate=true;seatBacks.instanceMatrix.needsUpdate=true;bodies.instanceMatrix.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;
  scene.add(seats,seatBacks,bodies,heads);

  const concrete=mat("#aeb8bd",.92),darkConcrete=mat("#64737d",.88),steel=mat("#354754",.62,.45);
  const arcLine=(radius,height,material,thickness)=>{
    const points=[];
    for(let i=0;i<=96;i++){const a=start+(end-start)*i/96;points.push([Math.cos(a)*radius,height,Math.sin(a)*radius])}
    addLine(scene,points,material,thickness);
  };
  // Two visible deck fronts and a concourse divide the lower and upper seating bowls.
  arcLine(126,23,concrete,2.0);arcLine(129,21,steel,.9);
  arcLine(158,38,darkConcrete,2.2);arcLine(161,36,steel,1.0);
  // Open vomitories interrupt the seating at regular intervals.
  const portalMat=mat("#182733",.8),lightMat=new THREE.MeshBasicMaterial({color:"#f5e6b4"});
  for(let i=0;i<=12;i++){
    const angle=start+(end-start)*i/12,r=127;
    const x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    box(scene,portalMat,x,18,z,5.5,4.5,1.4,-angle);
    box(scene,lightMat,x,25,z,6,.22,.3,-angle);
  }
  // Roof canopy covers the outfield seating only; it does not form a ring behind home plate.
  if(team.parkStyle!=="open"){
    const outer=176,inner=99,shape=new THREE.Shape();
    const steps=96;
    for(let i=0;i<=steps;i++){
      const angle=start+(end-start)*i/steps,x=Math.cos(angle)*outer,y=Math.sin(angle)*outer;
      i===0?shape.moveTo(x,y):shape.lineTo(x,y);
    }
    for(let i=steps;i>=0;i--){
      const angle=start+(end-start)*i/steps,x=Math.cos(angle)*inner,y=Math.sin(angle)*inner;
      shape.lineTo(x,y);
    }
    shape.closePath();
    const roof=add(scene,new THREE.ShapeGeometry(shape,2),mat("#d8e1e5",.48,.18,{side:THREE.DoubleSide}),[0,team.parkStyle==="dome"?52:43,0],[-Math.PI/2,0,0]);
    roof.receiveShadow=true;
    arcLine(outer,team.parkStyle==="dome"?52:43,steel,1.5);
  }
  // Roof supports remain behind the seats, clear of the playable field.
  for(let i=0;i<=10;i++){
    const angle=start+(end-start)*i/10,r=170,x=Math.cos(angle)*r,z=Math.sin(angle)*r;
    box(scene,steel,x,25,z,1.8,30,1.8,-angle);
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
  const dark=mat("#203b35",.78),cap=mat(team.primary,.42,.28),postMat=mat("#d5dadd",.52,.32),segments=128;
  const points=[],gridPoints=[],topPoints=[],basePoints=[];
  const at=(a,offset=0)=>{const r=interpolateFence(a,fence)+offset;return [Math.cos(a)*r,0,Math.sin(a)*r]};
  for(let i=0;i<=segments;i++){
    const a=Math.PI+Math.PI*i/segments,r=interpolateFence(a,fence),h=interpolateHeight(a,fence),x=Math.cos(a)*r,z=Math.sin(a)*r;
    points.push([x,h,z]);topPoints.push([x,h,z]);basePoints.push([x,.08,z]);
    if(i%4===0){
      const post=box(scene,postMat,x,h/2,z,.38,h,.42,-a-Math.PI/2);
      post.castShadow=true;
    }
    // Fine vertical mesh wires; the lower impact wall remains opaque and much shorter.
    if(i%2===0){
      for(let y=1.35;y<h-.1;y+=.9){
        const p=[x,y,z];gridPoints.push(new THREE.Vector3(...p),new THREE.Vector3(...p.map((v,j)=>j===0?v: j===1?y+.9:v)));
      }
    }
  }
  for(let i=0;i<segments;i++){
    const a=Math.PI+Math.PI*(i+.5)/segments,r=interpolateFence(a,fence),h=interpolateHeight(a,fence);
    const x=Math.cos(a)*r,z=Math.sin(a)*r;
    const a0=Math.PI+Math.PI*i/segments,a1=Math.PI+Math.PI*(i+1)/segments;
    const p0=at(a0),p1=at(a1),dx=p1[0]-p0[0],dz=p1[2]-p0[2],length=Math.hypot(dx,dz);
    const yaw=Math.atan2(-dz,dx);
    const lower=box(scene,dark,x,.68,z,length+.08,1.25,.48,yaw);
    lower.castShadow=true;
    for(let y=1.45;y<h-.15;y+=1.25){
      const p=[x,y,z];gridPoints.push(new THREE.Vector3(p[0]-Math.cos(a)*length/2,p[1],p[2]-Math.sin(a)*length/2),new THREE.Vector3(p[0]+Math.cos(a)*length/2,p[1],p[2]+Math.sin(a)*length/2));
    }
  }
  const gridGeo=new THREE.BufferGeometry().setFromPoints(gridPoints);
  const mesh=new THREE.LineSegments(gridGeo,new THREE.LineBasicMaterial({color:"#b9c9c1",transparent:true,opacity:.48}));
  mesh.frustumCulled=false;scene.add(mesh);
  addLine(scene,topPoints,cap,.22);
  addLine(scene,basePoints,cap,.16);
  // Foul poles mark the two ends of the outfield wall.
  for(const a of [Math.PI,Math.PI*2]){
    const r=interpolateFence(a,fence),x=Math.cos(a)*r,z=Math.sin(a)*r,h=interpolateHeight(a,fence)+12;
    box(scene,mat("#f5d46f",.4),x,h/2,z,.42,h,.42);
    box(scene,mat("#f5d46f",.4),x,h,z,3,.3,.3);
  }
}

function addField(scene,team){
  const grass=mat("#ffffff",.96,0,{map:makeGrassTexture()});
  const dirt=mat("#b8875a",.96),chalk=mat("#f0ead8",.9),rubber=mat("#e4e0d4",.9);
  const field=add(scene,new THREE.PlaneGeometry(260,260),grass,[0,-.25,0],[-Math.PI/2,0,0]);field.receiveShadow=true;

  // Regulation-proportioned diamond: 90 ft between bases and 60 ft 6 in to the rubber.
  const home=[0,.12,34],first=[24.25,.12,9.75],second=[0,.12,-14.5],third=[-24.25,.12,9.75];
  const basePositions=[home,third,second,first];
  const infield=add(scene,new THREE.CircleGeometry(35,96),dirt,[0,.018,11],[-Math.PI/2,0,0]);
  infield.scale.set(1,1.04,1);
  for(const [x,,z] of basePositions){
    const cutout=add(scene,new THREE.CircleGeometry(4.6,40),dirt,[x,.035,z],[-Math.PI/2,0,0]);
    cutout.scale.set(1,1.08,1);
  }

  // Home-plate circle, batter boxes and coach boxes.
  const homeDirt=add(scene,new THREE.CircleGeometry(8.2,56),dirt,[0,.045,34],[-Math.PI/2,0,0]);
  homeDirt.scale.set(1.35,.9,1);
  for(const side of [-1,1]){
    const bx=side*1.45,bz=34,halfW=.78,halfL=1.18;
    addLine(scene,[[bx-halfW,.08,bz-halfL],[bx+halfW,.08,bz-halfL],[bx+halfW,.08,bz+halfL],[bx-halfW,.08,bz+halfL],[bx-halfW,.08,bz-halfL]],chalk,.045);
    const cx=side*36,cz=5,cw=2.5,cl=1.0;
    addLine(scene,[[cx-cw,.08,cz-cl],[cx+cw,.08,cz-cl],[cx+cw,.08,cz+cl],[cx-cw,.08,cz+cl],[cx-cw,.08,cz-cl]],chalk,.05);
  }

  // Pitcher's mound and regulation-distance rubber.
  add(scene,new THREE.CylinderGeometry(3.4,4.0,.65,40),dirt,[0,.325,11]);
  add(scene,new THREE.BoxGeometry(1.8,.16,.5),rubber,[0,.72,11]);
  for(const [x,y,z] of basePositions){
    add(scene,new THREE.BoxGeometry(.9,.18,.9),rubber,[x,y,z],[0,Math.PI/4,0]);
  }
  addLine(scene,[[home[0],.08,home[2]],[third[0],.08,third[2]],[second[0],.08,second[2]],[first[0],.08,first[2]],[home[0],.08,home[2]]],chalk,.12);

  // Foul lines continue from home through first and third to the outfield wall.
  const fence=team.fence||{left:78,center:92,right:78};
  const foulEnd=side=>{
    const radius=side<0?(fence.left||78):(fence.right||78);
    const dz=-1/Math.SQRT2,dx=side/Math.SQRT2,dot=34*dz;
    const distance=-dot+Math.sqrt(dot*dot+radius*radius-34*34);
    return [dx*distance,.08,34+dz*distance];
  };
  for(const side of [-1,1]){
    const end=foulEnd(side);
    addLine(scene,[[0,.08,34],end],chalk,.13);
  }

  // Dirt service strips occupy foul territory beside the two dugouts.
  for(const side of [-1,1]){
    const foulLane=add(scene,new THREE.PlaneGeometry(12,44),dirt,[side*48,.012,20],[-Math.PI/2,0,0]);
    foulLane.receiveShadow=true;
  }

  // Warning track follows the outfield wall.
  const trackPoints=[];
  for(let i=0;i<=96;i++){
    const a=Math.PI+Math.PI*i/96,r=interpolateFence(a,fence)-4;
    trackPoints.push([Math.cos(a)*r,.03,Math.sin(a)*r]);
  }
  addLine(scene,trackPoints,dirt,2.1);

  // Sunken dugouts are beyond the foul lines, with the open side facing the field.
  const dugoutMat=mat("#52616a",.76),roofMat=mat(team.primary,.48,.18),benchMetal=mat("#344653"),uniform=mat(team.primary),skin=mat("#bd8d6a"),cap=mat("#172a3c");
  for(const side of [-1,1]){
    const x=side*48,z=17,innerX=x-side*9.6;
    box(scene,dugoutMat,x+side*9.5,.65,z,.7,1.3,8.5);
    box(scene,dugoutMat,x,.65,z-4.1,19,1.3,.65);
    box(scene,dugoutMat,x,.65,z+4.1,19,1.3,.65);
    box(scene,roofMat,x,2.0,z,20,.35,9.5);
    box(scene,benchMetal,innerX+side*4.5,1.0,z,.45,.16,12);
    for(let j=-2;j<=2;j++){
      const pz=z+j*2.1,px=innerX+side*4.5;
      box(scene,benchMetal,px,.55,pz,.16,.8,.16);
      const torso=add(scene,new THREE.CapsuleGeometry(.3,.48,4,8),uniform,[px,.78,pz]);torso.rotation.y=side*Math.PI/2;torso.rotation.x=-.16;
      add(scene,new THREE.SphereGeometry(.2,10,8),skin,[px,1.42,pz]);
      add(scene,new THREE.SphereGeometry(.22,10,8,0,Math.PI*2,0,Math.PI/2),cap,[px,1.53,pz]);
    }
  }

  // Backstop behind home plate.
  add(scene,new THREE.TorusGeometry(18,.24,8,64,Math.PI),capMaterial(team),[0,5,47],[Math.PI/2,0,Math.PI]);

  // Bullpens sit in foul ground beyond the outfield corners, not on the live field.
  const bullpenFloor=mat("#a97850",.96),bullpenRail=mat("#344b59",.62,.25);
  for(const side of [-1,1]){
    const bx=side*75,bz=-25;
    const floor=add(scene,new THREE.CircleGeometry(9,32),bullpenFloor,[bx,.035,bz],[-Math.PI/2,0,0]);floor.scale.set(1.25,.72,1);
    box(scene,bullpenRail,bx,1.15,bz-8,24,2.3,.55);box(scene,bullpenRail,bx,1.15,bz+8,24,2.3,.55);
    for(let j=-1;j<=1;j++){add(scene,new THREE.CylinderGeometry(1.25,1.25,.25,20),dirt,[bx+j*5,.18,bz]);box(scene,rubber,bx+j*5,.34,bz,.75,.12,.28)}
    box(scene,roofMat,bx,4.2,bz-8,25,.45,3);
    for(let j=-2;j<=2;j++)box(scene,dugoutMat,bx+j*4,2,bz-8,.35,3.5,.35);
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
  // Keep the LED ribbon on the outfield concourse; do not draw a ring through the infield-side seating.
  const pts=[];for(let i=0;i<=96;i++){const a=Math.PI+.2+(Math.PI-.4)*i/96;pts.push([Math.cos(a)*130,24.5,Math.sin(a)*130])}
  addLine(scene,pts,ribbonMat,.55);
  // Urban backdrop with varied heights and rooftop silhouettes.
  const cityMats=[mat("#647985"),mat("#80939a"),mat("#526672")];
  for(let i=0;i<52;i++){
    const h=12+(i*19%47),w=7+(i*11%13),x=-220+i*8.6,z=-185-(i%5)*10;
    box(scene,cityMats[i%3],x,h/2,z,w,h,8);
    if(i%4===0)box(scene,steel,x,h+1,z,w*.35,2,8);
  }
}
function addCrowd(scene,team){
  // Separate torso and head instances create readable seated spectators instead of a ring of dots.
  const rows=15,sections=96,count=rows*sections;
  const bodyGeometry=new THREE.CapsuleGeometry(.19,.42,3,6),headGeometry=new THREE.SphereGeometry(.145,7,6);
  const body=new THREE.InstancedMesh(bodyGeometry,mat("#ffffff",.94),count);
  const heads=new THREE.InstancedMesh(headGeometry,mat("#bd8d6a",.9),count);
  const dummy=new THREE.Object3D(),skinColors=["#bd8d6a","#d4a47d","#8b604b","#e0b99a"];
  const colors=[team.primary,team.secondary,"#d9dce0","#b4a38a","#34485c","#8b9ba6"];
  let index=0;
  for(let row=0;row<rows;row++)for(let section=0;section<sections;section++){
    const angle=section/sections*Math.PI*2,rad=106+row*2.45,y=14+row*.9;
    const x=Math.cos(angle)*rad,z=Math.sin(angle)*rad;
    dummy.position.set(x,y,z);dummy.rotation.set(0,-angle+Math.PI/2,0);dummy.scale.set(1,1,1);dummy.updateMatrix();body.setMatrixAt(index,dummy.matrix);
    body.setColorAt(index,new THREE.Color(colors[(section*7+row*3)%colors.length]));
    dummy.position.set(x,y+.42,z);dummy.scale.set(.9,.9,.9);dummy.updateMatrix();heads.setMatrixAt(index,dummy.matrix);
    heads.setColorAt(index,new THREE.Color(skinColors[(section+row*2)%skinColors.length]));
    index++;
  }
  body.instanceMatrix.needsUpdate=true;heads.instanceMatrix.needsUpdate=true;scene.add(body,heads);
}
function createPark(team){
  const scene=new THREE.Scene();scene.background=new THREE.Color("#9fb9c9");scene.fog=new THREE.Fog("#9fb9c9",260,560);
  scene.add(new THREE.HemisphereLight("#e5f2ff","#4d594b",1.55));
  const ambient=new THREE.AmbientLight("#ffffff",.35);scene.add(ambient);
  const sun=new THREE.DirectionalLight("#fff0d4",3.1);sun.position.set(-100,150,85);sun.castShadow=true;
  sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-170;sun.shadow.camera.right=170;sun.shadow.camera.top=170;sun.shadow.camera.bottom=-170;sun.shadow.bias=-.00025;scene.add(sun);
  const field=addField(scene,team);
  addFence(scene,team);addBowl(scene,team);addStadiumDetails(scene,team);
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

// 경기 장면에서도 동일한 오리지널 볼파크 지오메트리를 재사용합니다.
export function createGamePark(team){return createPark(team)}

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
