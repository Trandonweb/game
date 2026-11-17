import { TEAMS, getTeam } from "./data/teams.js";
import { mountLiveMatch } from "./3d/liveMatch.js";
import { createPlayerProfile, applyDevelopment, gainExperience, switchPosition, canBeTwp } from "./engine/player.js";
import { runDraft } from "./engine/draft.js";
import { createCard, trainCard } from "./engine/cards.js";
import { createCareer, finishSeason, addCareerLog, renewContract, openFreeAgency, signFreeAgency, requestTrade, releasePlayer, retirePlayer } from "./engine/career.js";
import { simulateMatch, createLiveMatch, resolveBatterAction, resolvePitchAction, continueLiveMatch } from "./engine/match.js";
import { renderHome, renderCreate, renderDevelopment, renderDraft, renderCareer, renderSeasonResult, renderResume, renderLiveMatch } from "./ui/render.js";

const root=document.querySelector("#screen");
const state={screen:"home",mode:null,player:null,choices:[],draft:null,career:null,careerScreen:"dashboard",seasonResult:null,favoriteTeamId:null,liveMatch:null};
const SESSION_KEY="diamond-career-session-v1";
let savedSession=null;
try{
  const raw=sessionStorage.getItem(SESSION_KEY);
  if(raw){savedSession=JSON.parse(raw);if(savedSession&&typeof savedSession==="object") {state.screen="resume";state.resumeSnapshot=savedSession;}}
}catch(error){console.warn("세션 저장 데이터를 읽지 못했습니다.",error);}
let stadiumCleanup=null;
let liveMatchCleanup=null;
function toast(message){const region=document.querySelector("#toast-region"),item=document.createElement("div");item.className="toast";item.textContent=message;region.append(item);setTimeout(()=>item.remove(),2600)}
function disposeStadium(){if(stadiumCleanup){stadiumCleanup();stadiumCleanup=null}}
function disposeLiveMatch(){if(liveMatchCleanup){liveMatchCleanup();liveMatchCleanup=null}}
function saveSession(){try{if(state.screen==="resume"||state.screen==="home")return;const snapshot={screen:state.screen,mode:state.mode,player:state.player,choices:state.choices,draft:state.draft,career:state.career,careerScreen:state.careerScreen,seasonResult:state.seasonResult,favoriteTeamId:state.favoriteTeamId,liveMatch:state.liveMatch};sessionStorage.setItem(SESSION_KEY,JSON.stringify(snapshot));}catch(error){console.warn("커리어 임시 저장에 실패했습니다.",error);toast("브라우저 저장 공간을 사용할 수 없습니다.");}}
function render(){
  disposeStadium();
  disposeLiveMatch();
  switch(state.screen){
    case"resume":root.innerHTML=renderResume(state.resumeSnapshot);break;
    case"live-match":root.innerHTML=renderLiveMatch(state.liveMatch,state.career.player);break;
    case"create":root.innerHTML=renderCreate();break;
    case"development":root.innerHTML=renderDevelopment(state.player,state.choices);break;
    case"draft":root.innerHTML=renderDraft(state.player,state.draft);break;
    case"career":root.innerHTML=renderCareer(state.career,state.careerScreen);break;
    case"season-result":root.innerHTML=renderSeasonResult(state.seasonResult,state.career);break;
    default:
      root.innerHTML='<div id="stadium-showcase"></div>'+renderHome(state.favoriteTeamId);
      const schedule=window.requestIdleCallback||((fn)=>setTimeout(fn,450));
      schedule(async()=>{
        if(state.screen!=="home")return;
        try{
          const module=await Promise.race([import("./3d/stadium.js"),new Promise((_,reject)=>setTimeout(()=>reject(new Error("3D 모듈 로딩 시간 초과")),12000))]);
          if(state.screen!=="home")return;
          stadiumCleanup=await module.mountStadium(document.querySelector("#stadium-showcase"),TEAMS,state.favoriteTeamId,id=>{
            state.favoriteTeamId=id;
            const preferenceSelect=document.querySelector("#preferred-team");if(preferenceSelect)preferenceSelect.value=id;
            document.querySelectorAll("[data-favorite-team]").forEach(el=>el.classList.toggle("selected",el.dataset.favoriteTeam===id));
            const picked=TEAMS.find(t=>t.id===id);
            toast("선호 구단을 "+picked.name+"으로 선택했습니다.");
          });
        }catch(error){
          const host=document.querySelector("#stadium-showcase");
          if(host)host.innerHTML='<div class="stadium-fallback"><b>3D 구장을 불러오지 못했습니다.</b><span>기본 게임 화면은 계속 이용할 수 있습니다. 네트워크 연결을 확인해 주세요.</span></div>';
          console.warn("3D stadium unavailable",error);
        }
      });
  }
  if(state.screen==="live-match"){
    const host=document.querySelector("#live-game-host");
    if(host){
      mountLiveMatch(host,getTeam(state.career.teamId),state.career.player,state.liveMatch,updated=>{state.liveMatch=updated;saveSession()},updated=>{state.liveMatch=updated;finishLiveMatch()},getTeam(state.liveMatch.opponentTeamId))
        .then(cleanup=>{if(state.screen==="live-match")liveMatchCleanup=cleanup;else cleanup()})
        .catch(error=>{host.innerHTML='<div class="stadium-fallback"><b>3D 경기장을 불러오지 못했습니다.</b><span class="stadium-error-detail"></span><button class="btn btn-primary" type="button" data-retry-3d>다시 시도</button></div>';const detail=host.querySelector(".stadium-error-detail");if(detail)detail.textContent=(error?.message||String(error)||"알 수 없는 오류")+" · 브라우저의 WebGL 지원 및 Three.js 모듈 연결을 확인해 주세요.";host.querySelector("[data-retry-3d]")?.addEventListener("click",()=>{if(state.screen==="live-match")render()},{once:true});console.error("3D live match failed",error)});
    }
  }
  if(state.screen==="create")syncTwpOption();
  saveSession();
}
function syncTwpOption(){
  const position=document.querySelector('[name="position"]');
  const twp=document.querySelector('[name="twp"] option[value="yes"]');
  const select=document.querySelector('[name="twp"]');
  if(!position||!twp||!select)return;
  const allowed=canBeTwp(position.value);
  twp.disabled=!allowed;
  twp.hidden=!allowed;
  if(!allowed)select.value="no";
}
function startNew(){try{sessionStorage.removeItem(SESSION_KEY)}catch{};delete state.resumeSnapshot;Object.assign(state,{mode:"player",player:null,choices:[],draft:null,career:null,careerScreen:"dashboard",seasonResult:null,liveMatch:null});state.screen="create";render()}
function handleCreate(form){const data=new FormData(form),position=String(data.get("position")),twp=data.get("twp")==="yes"&&canBeTwp(position);if(twp&&!canBeTwp(position))return toast("TWP는 투수 또는 DH 포지션에서만 선택할 수 있습니다.");state.player=createPlayerProfile({name:String(data.get("name")||"신인").trim(),position,isTwp:twp,batterType:String(data.get("batterType")),pitcherType:String(data.get("pitcherType"))});state.choices=[];state.screen="development";render()}
function addPoint(key){const max=state.player?.isTwp?6:3;if(state.choices.length>=max)return;state.choices.push(key);render()}
function removePoint(key){const i=state.choices.lastIndexOf(key);if(i>=0)state.choices.splice(i,1);render()}
function confirmDevelopment(){const max=state.player?.isTwp?6:3;if(state.choices.length!==max)return toast("능력치 배분을 "+max+"회 완료해 주세요.");try{state.player=applyDevelopment(state.player,state.choices);state.draft=runDraft(state.player,state.favoriteTeamId);state.player.teamId=state.draft.team.id;state.screen="draft";render()}catch(e){toast(e.message)}}
function enterCareer(){const first=createCard(state.player,"star1",state.player.season);state.career=createCareer(state.player,state.draft.team.id,first);state.screen="career";state.careerScreen="dashboard";render();toast("프로 선수 생활을 시작했습니다.")}
function selectCard(id){const c=state.career.cards.find(x=>x.id===id);if(!c)return;state.career.activeCardId=id;render();toast(c.name+" 카드를 주력 카드로 선택했습니다.")}
function enhanceCard(id){const i=state.career.cards.findIndex(x=>x.id===id);if(i<0)return;try{state.career.cards[i]=trainCard(state.career.cards[i]);render();toast("카드별 독립 육성이 저장되었습니다.")}catch(e){toast(e.message)}}
function startLiveMatch(){if(state.career.retired||state.career.released||!state.career.teamId)return toast("소속 구단이 있는 현역 선수만 경기에 출전할 수 있습니다.");const playStyle=document.querySelector("#match-play-style")?.value||"full";if(playStyle==="simulation"){playMatch();return}const controlMode=document.querySelector("#match-control-mode")?.value||"player";state.liveMatch=createLiveMatch(state.career.player,controlMode);state.liveMatch.playerRole=controlMode==="player"?"batter":state.career.player.role;state.liveMatch.playStyle=playStyle;state.liveMatch.inningsLimit=Number(document.querySelector("#match-innings")?.value||3);const opponents=TEAMS.filter(t=>t.id!==state.career.teamId);state.liveMatch.opponentTeamId=opponents[Math.floor(Math.random()*opponents.length)]?.id||TEAMS[0].id;state.screen="live-match";render()}
function actLiveMatch(action){if(!state.liveMatch||!state.career)return;resolveBatterAction(state.liveMatch,state.career.player,action);render()}
function pitchLiveMatch(button){if(!state.liveMatch||!state.career)return;resolvePitchAction(state.liveMatch,state.career.player,button.dataset.type,button.dataset.target);render()}
function finishLiveMatch(){const m=state.liveMatch,p=state.career.player;if(!m||m.recorded)return;const won=m.userRuns>m.opponentRuns;const gained=gainExperience(p,Math.round(18+m.hits*4+m.strikeouts*3+m.homeRuns*8));state.career.player=gained.player;const stats=state.career.player.careerStats,matchRole=m.playerRole||p.role;stats.games++;if(matchRole==="pitcher"||matchRole==="two-way"){if(won)stats.wins++;stats.strikeouts+=(m.userStrikeouts??m.strikeouts);}if(matchRole==="batter"||matchRole==="two-way"){stats.hits+=(m.userHits??m.hits);stats.homeRuns+=(m.userHomeRuns??m.homeRuns);stats.rbi+=m.userRuns;}m.recorded=true;addCareerLog(state.career,"실전 경기",m.userRuns+":"+m.opponentRuns+" · "+m.pitches+"구 · "+(won?"승리":"경기 종료"));state.liveMatch=null;state.screen="career";state.careerScreen="dashboard";render();toast("경기 기록과 경험치를 커리어에 반영했습니다.");}
function playMatch(){if(state.career.retired||state.career.released||!state.career.teamId)return toast("소속 구단이 있는 현역 선수만 경기에 출전할 수 있습니다.");const mode=document.querySelector("#match-play-style")?.value||"simulation",matchType=document.querySelector("#match-type")?.value||"cpu",controlMode=document.querySelector("#match-control-mode")?.value||"player";if(matchType!=="cpu")return toast("온라인 대전은 서버와 매칭 시스템이 준비된 뒤 활성화됩니다.");const result=simulateMatch({player:state.career.player,mode,matchType}),before=state.career.player,gained=gainExperience(before,result.exp);state.career.player=gained.player;const stats=state.career.player.careerStats;stats.games++;if(before.role==="pitcher"){if(result.won)stats.wins++;stats.strikeouts+=Math.round(result.playerImpact/5)}else{stats.hits+=result.won?1:0;stats.homeRuns+=result.playerImpact>=80?1:0;stats.rbi+=result.runs}addCareerLog(state.career,"경기 결과", (controlMode==="team"?"팀 컨트롤":"내 선수 플레이")+" · 빠른 시뮬레이션"+" · "+result.summary+" "+result.runs+":"+result.opponent+" · 경험치 +"+result.exp);render();toast((controlMode==="team"?"팀 컨트롤 모드":"내 선수 플레이")+" 시뮬레이션 결과: "+result.runs+":"+result.opponent+(gained.gained.length?" · 레벨 상승!":""))}
function advanceSeason(){if(state.career.retired||state.career.released||!state.career.teamId)return toast("현역으로 소속 구단에 등록된 선수만 시즌을 진행할 수 있습니다.");const result=finishSeason(state.career);state.career=result.career;state.seasonResult={performance:result.performance,exp:Math.round(55+result.performance.quality*1.4),gainedLevels:result.gainedLevels};state.screen="season-result";render()}
function handleAction(b){switch(b.dataset.action){case"home":state.screen="home";render();break;case"choose-player":startNew();break;case"resume-session":{const snap=state.resumeSnapshot;if(!snap)return startNew();delete state.resumeSnapshot;Object.assign(state,snap);render();break;}case"discard-session":startNew();break;case"select-favorite":state.favoriteTeamId=b.dataset.team;render();break;case"set-preferred-team":{const selected=document.querySelector("#preferred-team")?.value;if(!selected)return toast("희망 구단을 먼저 선택해 주세요.");state.favoriteTeamId=selected;render();toast("희망 구단이 설정되었습니다. 드래프트 지명 확률에 반영됩니다.");break;}case"remove-point":removePoint(b.dataset.key);break;case"add-point":addPoint(b.dataset.key);break;case"confirm-development":confirmDevelopment();break;case"enter-career":enterCareer();break;case"nav":state.screen="career";state.careerScreen=b.dataset.screen||"dashboard";render();break;case"select-card":selectCard(b.dataset.card);break;case"train-card":enhanceCard(b.dataset.card);break;case"apply-position":try{if(state.career.retired)return toast("은퇴 선수는 포지션을 변경할 수 없습니다.");const value=document.querySelector("#position-switch")?.value;state.career.player=switchPosition(state.career.player,value);render();toast("포지션이 변경되었습니다.");}catch(e){toast(e.message)}break;
case"open-fa":try{openFreeAgency(state.career);state.careerScreen="competition";render();toast("구단별 영입 제안이 도착했습니다.");}catch(e){toast(e.message)}break;
case"renew-contract":try{renewContract(state.career,document.querySelector("#contract-years")?.value||2);render();toast("새 계약을 체결했습니다.");}catch(e){toast(e.message)}break;
case"request-trade":try{const result=requestTrade(state.career,document.querySelector("#trade-team")?.value);render();toast(result.accepted?"트레이드가 성사되었습니다.":"상대 구단이 협상을 거절했습니다.");}catch(e){toast(e.message)}break;
case"release-player":try{releasePlayer(state.career);state.careerScreen="fa";render();toast("방출 처리되었습니다. 이제 FA에 참가할 수 있습니다.");}catch(e){toast(e.message)}break;
case"sign-offer":try{signFreeAgency(state.career,b.dataset.team);state.careerScreen="dashboard";render();toast("새 구단과 계약했습니다.");}catch(e){toast(e.message)}break;
case"retire-player":try{retirePlayer(state.career);state.careerScreen="retire";render();toast("현역 은퇴가 처리되었습니다.");}catch(e){toast(e.message)}break;
case"play-match":playMatch();break;case"start-live-match":startLiveMatch();break;case"bat-swing":actLiveMatch(b.dataset.timing||"good");break;case"bat-take":actLiveMatch("take");break;case"pitch-ball":pitchLiveMatch(b);break;case"continue-live-match":if(state.liveMatch){continueLiveMatch(state.liveMatch,state.career.player);render()}break;case"leave-live-match":state.liveMatch=null;state.screen="career";state.careerScreen="match";render();break;case"finish-live-match":finishLiveMatch();break;case"finish-season":advanceSeason();break;}}
root.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(b)handleAction(b)});
root.addEventListener("change",e=>{if(e.target.matches('[name="position"]'))syncTwpOption()});
root.addEventListener("submit",e=>{if(e.target.id==="create-form"){e.preventDefault();handleCreate(e.target)}});
render();
