import { TEAMS } from "./data/teams.js";
import { createPlayerProfile, applyDevelopment, gainExperience, switchPosition } from "./engine/player.js";
import { runDraft } from "./engine/draft.js";
import { createCard, trainCard } from "./engine/cards.js";
import { createCareer, finishSeason, finishTeamSeason, addCareerLog } from "./engine/career.js";
import { simulateMatch } from "./engine/match.js";
import { renderHome, renderCreate, renderDevelopment, renderDraft, renderCareer, renderTeamMode, renderSeasonResult } from "./ui/render.js";

const root=document.querySelector("#screen");
const state={screen:"home",mode:null,player:null,choices:[],draft:null,career:null,careerScreen:"dashboard",teamState:null,seasonResult:null,favoriteTeamId:null};
let stadiumCleanup=null;
function toast(message){const region=document.querySelector("#toast-region"),item=document.createElement("div");item.className="toast";item.textContent=message;region.append(item);setTimeout(()=>item.remove(),2600)}
function disposeStadium(){if(stadiumCleanup){stadiumCleanup();stadiumCleanup=null}}
function render(){
  disposeStadium();
  switch(state.screen){
    case"create":root.innerHTML=renderCreate();break;
    case"development":root.innerHTML=renderDevelopment(state.player,state.choices);break;
    case"draft":root.innerHTML=renderDraft(state.player,state.draft);break;
    case"career":root.innerHTML=renderCareer(state.career,state.careerScreen);break;
    case"team":root.innerHTML=renderTeamMode(state.teamState);break;
    case"season-result":root.innerHTML=renderSeasonResult(state.seasonResult,state.career);break;
    default:
      root.innerHTML='<div id="stadium-showcase"></div>'+renderHome();
      const schedule=window.requestIdleCallback||((fn)=>setTimeout(fn,450));
      schedule(async()=>{
        if(state.screen!=="home")return;
        try{
          const module=await import("./3d/stadium.js");
          if(state.screen!=="home")return;
          stadiumCleanup=await module.mountStadium(document.querySelector("#stadium-showcase"),TEAMS,state.favoriteTeamId,id=>{
            state.favoriteTeamId=id;
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
}
function startNew(mode){Object.assign(state,{mode,player:null,choices:[],draft:null,career:null,careerScreen:"dashboard",seasonResult:null,teamState:null});if(mode==="player")state.screen="create";else{const team=TEAMS.find(t=>t.id===state.favoriteTeamId)||TEAMS[Math.floor(Math.random()*TEAMS.length)];state.teamState={team,season:2026,wins:0,losses:0,lastResult:null};state.screen="team"}render()}
function handleCreate(form){const data=new FormData(form),position=String(data.get("position")),twp=data.get("twp")==="yes";state.player=createPlayerProfile({name:String(data.get("name")||"신인").trim(),position,isTwp:twp,batterType:String(data.get("batterType")),pitcherType:String(data.get("pitcherType"))});state.choices=[];state.screen="development";render()}
function addPoint(key){if(state.choices.length>=3)return;state.choices.push(key);render()}
function removePoint(key){const i=state.choices.lastIndexOf(key);if(i>=0)state.choices.splice(i,1);render()}
function confirmDevelopment(){if(state.choices.length!==3)return toast("능력치 배분을 3회 완료해 주세요.");try{state.player=applyDevelopment(state.player,state.choices);state.draft=runDraft(state.player,state.favoriteTeamId);state.player.teamId=state.draft.team.id;state.screen="draft";render()}catch(e){toast(e.message)}}
function enterCareer(){const first=createCard(state.player,"star1",state.player.season);state.career=createCareer(state.player,state.draft.team.id,first);state.screen="career";state.careerScreen="dashboard";render();toast("프로 선수 생활을 시작했습니다.")}
function selectCard(id){const c=state.career.cards.find(x=>x.id===id);if(!c)return;state.career.activeCardId=id;render();toast(c.name+" 카드를 주력 카드로 선택했습니다.")}
function enhanceCard(id){const i=state.career.cards.findIndex(x=>x.id===id);if(i<0)return;try{state.career.cards[i]=trainCard(state.career.cards[i]);render();toast("카드별 독립 육성이 저장되었습니다.")}catch(e){toast(e.message)}}
function playMatch(){const mode=document.querySelector("#match-length")?.value||"simulation",matchType=document.querySelector("#match-type")?.value||"cpu";if(matchType!=="cpu")return toast("온라인 대전은 서버와 매칭 시스템이 준비된 뒤 활성화됩니다.");const result=simulateMatch({player:state.career.player,mode,matchType}),before=state.career.player,gained=gainExperience(before,result.exp);state.career.player=gained.player;const stats=state.career.player.careerStats;stats.games++;if(before.role==="pitcher"){if(result.won)stats.wins++;stats.strikeouts+=Math.round(result.playerImpact/5)}else{stats.hits+=result.won?1:0;stats.homeRuns+=result.playerImpact>=80?1:0;stats.rbi+=result.runs}addCareerLog(state.career,"경기 결과",result.summary+" "+result.runs+":"+result.opponent+" · 경험치 +"+result.exp);render();toast(result.summary+" 스코어 "+result.runs+":"+result.opponent+(gained.gained.length?" · 레벨 상승!":""))}
function advanceSeason(){const result=finishSeason(state.career);state.career=result.career;state.seasonResult={performance:result.performance,exp:Math.round(55+result.performance.quality*1.4),gainedLevels:result.gainedLevels};state.screen="season-result";render()}
function advanceTeamSeason(){state.teamState=finishTeamSeason(state.teamState);render();toast(state.teamState.lastResult)}
function handleAction(b){switch(b.dataset.action){case"home":state.screen="home";render();break;case"choose-player":startNew("player");break;case"choose-team":startNew("team");break;case"select-favorite":state.favoriteTeamId=b.dataset.team;render();break;case"remove-point":removePoint(b.dataset.key);break;case"add-point":addPoint(b.dataset.key);break;case"confirm-development":confirmDevelopment();break;case"enter-career":enterCareer();break;case"nav":state.screen="career";state.careerScreen=b.dataset.screen||"dashboard";render();break;case"select-card":selectCard(b.dataset.card);break;case"train-card":enhanceCard(b.dataset.card);break;case"apply-position":try{const value=document.querySelector("#position-switch")?.value;state.career.player=switchPosition(state.career.player,value);render();toast("포지션이 변경되었습니다.");}catch(e){toast(e.message)}break;case"play-match":playMatch();break;case"finish-season":advanceSeason();break;case"team-season":advanceTeamSeason();break}}
root.addEventListener("click",e=>{const b=e.target.closest("[data-action]");if(b)handleAction(b)});
root.addEventListener("submit",e=>{if(e.target.id==="create-form"){e.preventDefault();handleCreate(e.target)}});
render();
