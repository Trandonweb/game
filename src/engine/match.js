export function simulateMatch({ player, mode = "simulation", matchType = "cpu" }) {
  const pace = mode === "simulation" ? 1 : mode === "highlight" ? 2 : 3;
  const batting = player.role === "pitcher" ? (player.pitcherAttributes?.control || 60) : (player.attributes?.contact || 60);
  const power = player.role === "pitcher" ? (player.pitcherAttributes?.stuff || 60) : (player.attributes?.power || 60);
  const edge = (batting + power) / 2 + player.level * 0.7;
  const runs = Math.max(0, Math.round((edge - 45) / 18 + Math.random() * 5));
  const opponent = Math.max(0, Math.round(2 + Math.random() * 5));
  return {
    mode, matchType, innings: 9, runs, opponent, won: runs >= opponent,
    playerImpact: Math.round(edge), exp: Math.round(8 * pace + edge / 8),
    summary: runs >= opponent ? "팀이 승리했습니다." : "아쉽게 패배했습니다."
  };
}

export function getMatchModeLabel(mode) {
  return ({ simulation:"시뮬레이션", highlight:"하이라이트", full:"풀 플레이" })[mode] || "시뮬레이션";
}


export function createLiveMatch(player, controlMode = "player") {
  return {
    inning: 1, half: "top", outs: 0, balls: 0, strikes: 0,
    userRuns: 0, opponentRuns: 0, bases: [false, false, false],
    pitches: 0, hits: 0, strikeouts: 0, homeRuns: 0,
    controlMode, role: player.role, phase: player.role === "pitcher" ? "pitch" : "bat",
    lastResult: "플레이 볼! 첫 공을 준비하세요.", lastPitch: null,
    finished: false, log: ["1회 초 경기 시작"]
  };
}

function advanceRunner(match, bases, runs) {
  const next = [false, false, false];
  let scored = runs;
  if (bases[2]) scored++;
  if (bases[1]) next[2] = true;
  if (bases[0]) next[1] = true;
  next[0] = true;
  match.bases = next;
  return scored;
}

function nextAtBat(match, player) {
  match.balls = 0; match.strikes = 0;
  match.phase = player.role === "pitcher" ? "pitch" : "bat";
}

function finishHalf(match, player) {
  match.outs = 0; match.balls = 0; match.strikes = 0; match.bases = [false,false,false];
  if (match.half === "top") {
    match.half = "bottom";
    const cpuRuns = Math.floor(Math.random() * 3);
    if (player.role === "pitcher") match.userRuns += cpuRuns;
    else match.opponentRuns += cpuRuns;
    match.lastResult += " 이닝 교대. 상대 팀 공격 결과 "+cpuRuns+"점.";
    match.phase = "break";
  } else {
    match.half = "top";
    match.inning++;
    if (match.inning > 3 || (match.inning === 4 && match.userRuns !== match.opponentRuns)) {
      match.finished = true; match.phase = "finished";
      match.lastResult += match.userRuns > match.opponentRuns ? " 경기 종료: 승리!" : match.userRuns < match.opponentRuns ? " 경기 종료: 패배." : " 경기 종료: 무승부.";
      return;
    }
    match.phase = "break";
    match.lastResult += " "+match.inning+"회 시작.";
  }
}

export function resolveBatterAction(match, player, action) {
  if (match.finished || match.phase !== "bat") return match;
  match.pitches++;
  const contact = player.attributes?.contact ?? 60;
  const power = player.attributes?.power ?? 60;
  const eye = player.attributes?.eye ?? 60;
  const inZone = Math.random() < 0.68;
  const x = inZone ? 42 + Math.random()*16 : 25 + Math.random()*50;
  const y = inZone ? 38 + Math.random()*25 : 18 + Math.random()*65;
  match.lastPitch = {x,y,inZone};
  if (action === "take") {
    if (inZone) {
      match.strikes++;
      match.lastResult = "스트라이크! 공을 지켜봤습니다.";
    } else {
      match.balls++;
      match.lastResult = "볼! 공을 잘 골랐습니다.";
    }
  } else {
    const timing = action === "good" ? 0.28 : action === "early" || action === "late" ? 0.08 : -0.05;
    const chance = Math.max(0.12, Math.min(0.82, 0.35 + (contact-60)*0.004 + timing));
    if (Math.random() < chance) {
      const quality = Math.random() + (power-60)*0.004 + (action==="good"?0.22:0);
      if (quality > 0.91) {
        const scored = match.bases.filter(Boolean).length + 1;
        match.userRuns += scored; match.bases=[false,false,false]; match.hits++; match.homeRuns++;
        match.lastResult = "홈런! "+scored+"점 득점!";
      } else if (quality > 0.63) {
        const scored = advanceRunner(match,match.bases,0); match.userRuns += scored; match.hits++;
        match.lastResult = "장타! 주자 "+scored+"명 홈인.";
      } else {
        const scored = advanceRunner(match,match.bases,0); match.userRuns += scored; match.hits++;
        match.lastResult = "안타! 주자 "+scored+"명 득점.";
      }
      match.balls=0; match.strikes=0;
    } else if (Math.random() < 0.2 && match.strikes < 2) {
      match.strikes++; match.lastResult = "파울! 스트라이크 "+match.strikes+"개.";
    } else {
      match.strikes++; match.lastResult = "헛스윙! 스트라이크 "+match.strikes+".";
    }
  }
  if (match.balls >= 4) {
    const scored=advanceRunner(match,match.bases,0); match.userRuns+=scored;
    match.lastResult="볼넷! 주자가 진루합니다."; match.balls=0;match.strikes=0;
  } else if (match.strikes >= 3) {
    match.outs++; match.strikeouts++; match.lastResult="삼진 아웃!"; match.balls=0;match.strikes=0;
  }
  if (match.outs >= 3) finishHalf(match,player);
  return match;
}

export function resolvePitchAction(match, player, pitchType, target) {
  if (match.finished || match.phase !== "pitch") return match;
  match.pitches++;
  const control=player.pitcherAttributes?.control ?? player.attributes?.control ?? 60;
  const stuff=player.pitcherAttributes?.stuff ?? player.attributes?.stuff ?? 60;
  const velocity=player.pitcherAttributes?.velocity ?? player.attributes?.velocity ?? 60;
  const zone=Math.random() < Math.min(.9,.55+(control-50)*.006);
  const swing=Math.random() < Math.min(.85,.42+(stuff-50)*.004);
  const x=target==="inside"?36:target==="outside"?64:50;
  const y=target==="high"?34:target==="low"?67:50;
  match.lastPitch={x,y,inZone:zone,type:pitchType};
  if (!zone) {
    match.balls++; match.lastResult="볼! 제구가 조금 벗어났습니다.";
  } else if (!swing) {
    match.strikes++; match.lastResult="루킹 스트라이크! 타자가 지켜봤습니다.";
  } else if (Math.random() < .28+(stuff-60)*.003+(pitchType==="slider"?.08:0)) {
    match.strikes++; match.lastResult="헛스윙! "+pitchType+"로 타자를 속였습니다."; match.strikeouts++;
  } else if (Math.random() < .22+(velocity-60)*.002) {
    match.outs++; match.lastResult="타구! 수비수가 잡아 아웃 처리했습니다.";
  } else {
    const runs=Math.random()<.13?2:Math.random()<.45?1:0;
    match.opponentRuns+=runs; match.lastResult=runs?"안타 허용. "+runs+"점 실점.":"타자가 출루했습니다.";
  }
  if (match.balls>=4) { match.outs++;match.lastResult="볼넷 허용. 주자가 출루했습니다.";match.balls=0;match.strikes=0; }
  else if (match.strikes>=3) { match.outs++;match.lastResult="삼진! 타자를 돌려세웠습니다.";match.strikeouts++;match.balls=0;match.strikes=0; }
  if (match.outs>=3) finishHalf(match,player);
  return match;
}

export function continueLiveMatch(match, player) {
  if (match.finished || match.phase !== "break") return match;
  nextAtBat(match,player);
  match.lastResult = match.half==="top" ? match.inning+"회 초 시작. 공격을 준비하세요." : match.inning+"회 말 시작.";
  return match;
}
