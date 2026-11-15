import { CARD_TYPES, createCard, addCardAwardBonus } from "./cards.js";
import { gainExperience } from "./player.js";
import { getTeam, TEAMS } from "../data/teams.js";

export function createCareer(player, teamId, initialCard) {
  return {
    id: crypto.randomUUID(),
    player,
    teamId,
    contract: { status: "signed", yearsRemaining: 3, salary: Math.round(Math.max(1.2, player.overall * 0.04) * 10) / 10, expiresSeason: player.season + 2 },
    freeAgencyOffers: [],
    released: false,
    season: player.season,
    phase: "rookie",
    cards: [initialCard],
    activeCardId: initialCard.id,
    seasonHistory: [],
    nationalSelectionsThisYear: 0,
    allstarStreak: 0,
    topAwards: 0,
    iconStreak: 0,
    iconAwards: 0,
    goldGloveAwards: 0,
    lastAwards: [],
    logs: [{ season: player.season, title: "프로 입단", detail: "드래프트를 통해 프로 선수 생활을 시작했습니다." }],
    retired: false,
    managerCareer: false
  };
}

export function addCareerLog(career, title, detail) {
  career.logs.unshift({ season: career.season, title, detail });
  career.logs = career.logs.slice(0, 30);
}

export function seasonPerformance(career) {
  const p = career.player;
  const base = p.overall + p.level * 1.8 + Math.random() * 15;
  const games = Math.max(12, Math.round(30 + p.level * 2 + Math.random() * 40));
  const isPitcher = p.role === "pitcher";
  const quality = Math.min(99, Math.max(25, Math.round(base)));
  return {
    games,
    hits: isPitcher ? 0 : Math.round(games * (0.16 + quality / 500)),
    homeRuns: isPitcher ? 0 : Math.round(games * quality / 600),
    rbi: isPitcher ? 0 : Math.round(games * quality / 180),
    wins: isPitcher ? Math.round(games * quality / 260) : 0,
    strikeouts: isPitcher ? Math.round(games * quality / 3) : 0,
    quality
  };
}

function reviewBase(card, performance) {
  const delta = performance.quality >= 80 ? 3 : performance.quality >= 65 ? 1 : performance.quality < 45 ? -3 : -1;
  return Object.fromEntries(Object.entries(card.baseAttributes).map(([key,value]) => [key, Math.max(1, value + delta)]));
}

function award(career, typeId, bonus, count = 0, streak = 0) {
  let existing = career.cards.find(card => card.typeId === typeId);
  if (!existing) {
    existing = createCard(career.player, typeId, career.season, { count, consecutiveCount: streak });
    career.cards.push(existing);
  } else {
    existing.selectionCount += 1;
    existing.maxEnhancement = typeof bonus === "function" ? bonus(existing.selectionCount) : existing.maxEnhancement;
    if (typeof bonus === "number") {
      existing = addCardAwardBonus(existing, bonus);
      career.cards = career.cards.map(card => card.id === existing.id ? existing : card);
    }
    existing.season = career.season;
    existing.baseAttributes = reviewBase(existing, { quality: career.lastPerformance.quality });
  }
  career.lastAwards.push(typeId);
}

export function finishSeason(career) {
  const next = structuredClone(career);
  const performance = seasonPerformance(next);
  next.lastPerformance = performance;
  next.lastAwards = [];
  const isPitcher = next.player.role === "pitcher";
  const qualifies = performance.quality >= 58;
  if (qualifies && next.player.level >= 5) award(next, "star2");
  if (qualifies && next.player.level >= 10) award(next, "star3");
  if (qualifies && next.player.level >= 15) award(next, "star4");
  if (qualifies && next.player.level >= 20) award(next, "star5");

  // 국가대표는 시즌 활약에 따라 연 1~2회 선발될 수 있다.
  // 72점부터 1회, 90점부터 2회 기회를 부여한다.
  const nationalSelections = !qualifies ? 0 : performance.quality >= 90 ? 2 : performance.quality >= 72 ? 1 : 0;
  for (let selection = 0; selection < nationalSelections && next.nationalSelectionsThisYear < 2; selection++) {
    next.nationalSelectionsThisYear++;
    const nationalCard = next.cards.find(card => card.typeId === "national");
    if (!nationalCard) {
      next.cards.push(createCard(next.player, "national", next.season));
    } else {
      nationalCard.selectionCount++;
      nationalCard.maxEnhancement = 15 + nationalCard.selectionCount;
      next.cards = next.cards.map(card => card.id === nationalCard.id ? addCardAwardBonus(card, 2) : card);
    }
    next.lastAwards.push("national");
  }
  if (qualifies && performance.quality >= 72) {
    next.allstarStreak++;
    let card = next.cards.find(c => c.typeId === "allstar");
    if (!card) { card = createCard(next.player, "allstar", next.season, { consecutiveCount: next.allstarStreak, variant: getTeam(next.teamId).allstarDivision }); next.cards.push(card); }
    else {
      card.consecutiveCount = next.allstarStreak;
      card.baseAttributes = reviewBase(card, performance);
      // Consecutive-selection bonus is a persistent base-attribute addition, not training.
      for (const key of Object.keys(card.permanentBonus)) card.permanentBonus[key] = next.allstarStreak;
    }
    next.lastAwards.push("allstar");
  } else next.allstarStreak = 0;

  if (qualifies && performance.quality >= 68 && next.topAwards < 3) {
    next.topAwards++;
    let card = next.cards.find(c => c.typeId === "top");
    if (!card) { card = createCard(next.player, "top", next.season); next.cards.push(card); }
    else { card.selectionCount++; card.maxEnhancement = 11 + card.selectionCount; card.baseAttributes = reviewBase(card, performance); next.cards = next.cards.map(c => c.id === card.id ? addCardAwardBonus(c, 2) : c); }
    next.lastAwards.push("top");
  }

  if (qualifies && performance.quality >= 82) next.iconStreak++;
  else next.iconStreak = 0;
  if (next.iconStreak >= 3 && next.iconAwards < 5) {
    next.iconAwards++;
    let card = next.cards.find(c => c.typeId === "icon");
    if (!card) { card = createCard(next.player, "icon", next.season); next.cards.push(card); }
    else { card.selectionCount++; card.maxEnhancement = 13 + card.selectionCount; card.baseAttributes = reviewBase(card, performance); next.cards = next.cards.map(c => c.id === card.id ? addCardAwardBonus(c, 4) : c); }
    next.lastAwards.push("icon");
  }

  if (qualifies && performance.quality >= 85) {
    next.goldGloveAwards++;
    let card = next.cards.find(c => c.typeId === "goldglove");
    if (!card) { card = createCard(next.player, "goldglove", next.season); next.cards.push(card); }
    else { card.selectionCount++; card.maxEnhancement = 15 + card.selectionCount; card.baseAttributes = reviewBase(card, performance); next.cards = next.cards.map(c => c.id === card.id ? addCardAwardBonus(c, 4) : c); }
    next.lastAwards.push("goldglove");
  }

  for (const card of next.cards) {
    if (["national","allstar","top","icon","goldglove"].includes(card.typeId) && !next.lastAwards.includes(card.typeId)) {
      card.baseAttributes = reviewBase(card, performance);
      card.season = next.season;
    }
  }

  next.player.careerStats.games += performance.games;
  next.player.careerStats.hits += performance.hits;
  next.player.careerStats.homeRuns += performance.homeRuns;
  next.player.careerStats.rbi += performance.rbi;
  next.player.careerStats.wins += performance.wins;
  next.player.careerStats.strikeouts += performance.strikeouts;
  const exp = Math.round(55 + performance.quality * 1.4);
  const gained = gainExperience(next.player, exp);
  next.player = gained.player;
  next.player.age++;
  if (next.contract?.status === "signed" && next.contract.yearsRemaining > 0) {
    next.contract.yearsRemaining--;
    if (next.contract.yearsRemaining === 0) {
      next.contract.status = "expired";
      addCareerLog(next, "계약 만료", "계약이 만료되었습니다. FA 시장에서 새로운 구단을 선택할 수 있습니다.");
    }
  }
  next.season++;
  next.player.season = next.season;
  if (next.contract) next.contract.expiresSeason = next.season + Math.max(0, next.contract.yearsRemaining - 1);
  next.nationalSelectionsThisYear = 0;
  next.phase = next.player.age < 22 ? "rookie" : next.player.age < 28 ? "growth" : next.player.age < 34 ? "prime" : "veteran";
  next.seasonHistory.unshift({ season: next.season - 1, performance, awards: [...next.lastAwards] });
  addCareerLog(next, (next.season - 1) + " 시즌 종료", "활약 지수 " + performance.quality + " · 경험치 +" + exp + (gained.gained.length ? " · 레벨 상승" : ""));
  return { career: next, performance, gainedLevels: gained.gained };
}

export function finishTeamSeason(teamState) {
  const next = structuredClone(teamState);
  next.season++;
  next.wins += Math.round(35 + Math.random() * 35);
  next.losses = Math.max(0, 144 - next.wins);
  next.lastResult = "시즌 종료: " + next.wins + "승 " + next.losses + "패";
  return next;
}


function salaryEstimate(player, need = 0) {
  const ageFactor = player.age >= 34 ? 0.82 : player.age >= 30 ? 0.93 : 1;
  return Math.round(Math.max(0.8, (player.overall * 0.04 + player.level * 0.025 + need * 0.12) * ageFactor) * 10) / 10;
}

export function renewContract(career, years = 2) {
  if (career.retired || career.released || career.contract?.status === "released") throw new Error("현재 상태에서는 계약을 연장할 수 없습니다.");
  const term = Math.max(1, Math.min(5, Number(years) || 1));
  const salary = salaryEstimate(career.player, 1);
  career.contract = {
    status: "signed",
    yearsRemaining: term,
    salary,
    expiresSeason: career.season + term - 1
  };
  addCareerLog(career, "계약 연장", term + "년 · 연봉 " + salary.toFixed(1) + "억 원으로 계약했습니다.");
  return career;
}

export function openFreeAgency(career) {
  if (career.retired) throw new Error("은퇴 선수는 FA 시장에 참가할 수 없습니다.");
  const contractStatus = career.contract?.status;
  if (!career.released && contractStatus !== "expired" && (career.contract?.yearsRemaining ?? 0) > 0) {
    throw new Error("현재 계약이 " + career.contract.yearsRemaining + "년 남아 있어 FA 신청이 불가능합니다.");
  }
  const offers = getTeamOffers(career);
  career.freeAgencyOffers = offers;
  addCareerLog(career, "FA 시장 참가", offers.length + "개 구단에서 영입 제안을 받았습니다."");
  return career;
}

function getTeamOffers(career) {
  return TEAMS_FOR_OFFERS(career).map(team => {
    const need = team.needs[career.player.position] || 0;
    const interest = Math.round(career.player.overall + need * 5 + Math.random() * 16);
    const years = Math.max(1, Math.min(5, 2 + Math.floor(Math.random() * 3) + (interest >= 90 ? 1 : 0)));
    return {
      teamId: team.id,
      teamName: team.name,
      salary: salaryEstimate(career.player, need),
      years,
      interest,
      need
    };
  }).sort((a, b) => b.interest - a.interest).slice(0, 4);
}

function TEAMS_FOR_OFFERS(career) {
  return TEAMS_FOR_OFFERS_DATA.filter(team => team.id !== career.teamId || career.released || career.contract?.status === "expired");
}

const TEAMS_FOR_OFFERS_DATA = TEAMS;

export function signFreeAgency(career, teamId) {
  const offer = (career.freeAgencyOffers || []).find(item => item.teamId === teamId);
  if (!offer) throw new Error("선택할 수 있는 영입 제안이 없습니다. 먼저 FA 시장을 열어 주세요.");
  career.teamId = offer.teamId;
  career.player.teamId = offer.teamId;
  career.contract = {
    status: "signed",
    yearsRemaining: offer.years,
    salary: offer.salary,
    expiresSeason: career.season + offer.years - 1
  };
  career.released = false;
  career.freeAgencyOffers = [];
  addCareerLog(career, "FA 계약 체결", offer.teamName + "과(와) " + offer.years + "년 · 연봉 " + offer.salary.toFixed(1) + "억 원 계약을 맺었습니다.");
  return career;
}

export function requestTrade(career, teamId) {
  if (career.retired || career.released || career.contract?.status !== "signed") throw new Error("현재 상태에서는 트레이드를 요청할 수 없습니다.");
  if (career.teamId === teamId) throw new Error("현재 소속 구단과는 트레이드할 수 없습니다.");
  const target = getTeam(teamId);
  const need = target.needs[career.player.position] || 0;
  const chance = Math.max(8, Math.min(88, 35 + need * 8 + (career.player.overall - 60) * 0.45));
  if (Math.random() * 100 >= chance) {
    addCareerLog(career, "트레이드 협상 결렬", target.name + "이(가) 선수 영입에 합의하지 않았습니다.");
    return { career, accepted: false, chance };
  }
  const previous = getTeam(career.teamId);
  career.teamId = target.id;
  career.player.teamId = target.id;
  addCareerLog(career, "트레이드 이적", previous.name + "에서 " + target.name + "으로 이적했습니다.");
  return { career, accepted: true, chance };
}

export function releasePlayer(career) {
  if (career.retired) throw new Error("은퇴한 선수는 방출할 수 없습니다.");
  if (career.released) throw new Error("이미 방출된 상태입니다.");
  const previous = getTeam(career.teamId);
  career.released = true;
  career.teamId = null;
  career.player.teamId = null;
  career.contract = { status: "released", yearsRemaining: 0, salary: 0, expiresSeason: career.season };
  career.freeAgencyOffers = [];
  addCareerLog(career, "선수 방출", previous.name + "에서 방출되었습니다. FA 시장에서 새 구단을 찾을 수 있습니다.");
  return career;
}

export function retirePlayer(career) {
  if (career.retired) throw new Error("이미 은퇴한 선수입니다.");
  career.retired = true;
  career.player.retired = true;
  career.contract = { ...(career.contract || {}), status: "retired", yearsRemaining: 0 };
  career.phase = "retired";
  addCareerLog(career, "현역 은퇴", "선수 생활을 마무리했습니다. 통산 기록은 커리어 기록에 보존됩니다.");
  return career;
}
