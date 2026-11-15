import { CARD_TYPES, createCard, addCardAwardBonus } from "./cards.js";
import { gainExperience } from "./player.js";
import { getTeam } from "../data/teams.js";

export function createCareer(player, teamId, initialCard) {
  return {
    id: crypto.randomUUID(),
    player,
    teamId,
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

  const national = qualifies && performance.quality >= 74 && next.nationalSelectionsThisYear < 2;
  if (national) {
    next.nationalSelectionsThisYear++;
    if (!next.cards.some(card => card.typeId === "national")) next.cards.push(createCard(next.player, "national", next.season));
    else {
      const card = next.cards.find(c => c.typeId === "national");
      card.selectionCount++;
      card.maxEnhancement = 15 + card.selectionCount;
      next.cards = next.cards.map(c => c.id === card.id ? addCardAwardBonus(c, 2) : c);
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
  next.season++;
  next.player.season = next.season;
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
