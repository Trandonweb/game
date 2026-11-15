import { BATTER_ATTRIBUTES, PITCHER_ATTRIBUTES, POSITION_GROUPS } from "../data/config.js";

const BATTER_PROFILES = {
  "교타형": [78, 45, 72, 55, 48, 37],
  "거포형": [50, 90, 42, 40, 58, 55],
  "출루형": [60, 48, 90, 45, 47, 45],
  "호타준족형": [62, 60, 48, 78, 47, 40]
};
const PITCHER_PROFILES = {
  "강속구형": [85, 50, 72, 55, 35, 38],
  "제구형": [65, 85, 58, 50, 35, 42],
  "변화구형": [65, 55, 80, 48, 55, 32],
  "완급조절형": [65, 68, 60, 68, 35, 39]
};

export function canBeTwp(position) {
  return ["SP", "RP", "CP", "DH"].includes(position);
}

export function getPlayerAttributes(player) {
  if (player.isTwp) return [...BATTER_ATTRIBUTES, ...PITCHER_ATTRIBUTES];
  return player.role === "pitcher" ? PITCHER_ATTRIBUTES : BATTER_ATTRIBUTES;
}

function makeStats(attributes, profile) {
  return Object.fromEntries(attributes.map((attribute, index) => [attribute.key, profile[index]]));
}

export function createPlayerProfile(input) {
  const isPitcher = ["SP", "RP", "CP"].includes(input.position);
  const role = isPitcher ? "pitcher" : "batter";
  const isTwp = Boolean(input.isTwp);
  if (isTwp && !canBeTwp(input.position)) {
    throw new Error("TWP는 투수 또는 DH 포지션에서만 선택할 수 있습니다.");
  }
  const batterStats = makeStats(BATTER_ATTRIBUTES, BATTER_PROFILES[input.batterType] || BATTER_PROFILES["교타형"]);
  const pitcherStats = makeStats(PITCHER_ATTRIBUTES, PITCHER_PROFILES[input.pitcherType] || PITCHER_PROFILES["강속구형"]);
  const primaryStats = isPitcher ? pitcherStats : batterStats;
  const secondaryStats = isTwp ? (isPitcher ? batterStats : pitcherStats) : null;
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    age: 18,
    position: input.position,
    originalPosition: input.position,
    role,
    isTwp,
    batterType: input.batterType || null,
    pitcherType: input.pitcherType || null,
    archetype: isPitcher ? input.pitcherType : input.batterType,
    level: 1,
    experience: 0,
    attributes: primaryStats,
    pitcherAttributes: isTwp ? pitcherStats : null,
    secondaryAttributes: secondaryStats,
    developmentChoices: [],
    developmentConfirmed: false,
    overall: 0,
    teamId: null,
    careerYear: 1,
    season: 2026,
    careerStats: { games: 0, hits: 0, homeRuns: 0, rbi: 0, wins: 0, strikeouts: 0 },
    awards: [],
    retired: false
  };
}

export function applyDevelopment(player, choices) {
  if (player.developmentConfirmed) throw new Error("초기 능력치 배분은 이미 확정되었습니다.");
  if (choices.length !== 3) throw new Error("능력치 배분 기회는 총 3회입니다.");
  const allowed = new Set(getPlayerAttributes(player).map(attribute => attribute.key));
  const next = structuredClone(player);
  for (const key of choices) {
    if (!allowed.has(key)) throw new Error("선택할 수 없는 능력치입니다.");
    if (Object.hasOwn(next.attributes, key)) next.attributes[key] += 5;
    else if (next.secondaryAttributes && Object.hasOwn(next.secondaryAttributes, key)) next.secondaryAttributes[key] += 5;
  }
  if (next.isTwp) next.pitcherAttributes = next.role === "pitcher" ? next.attributes : next.secondaryAttributes;
  next.developmentChoices = [...choices];
  next.developmentConfirmed = true;
  next.overall = calculateOverall(next);
  return next;
}

export function calculateOverall(player) {
  const values = [
    ...Object.values(player.attributes || {}),
    ...Object.values(player.secondaryAttributes || {})
  ];
  return Math.round(values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length));
}

export function positionFit(player, position) {
  if (position === player.originalPosition) return 1;
  const original = player.originalPosition;
  if ((POSITION_GROUPS.OF.includes(original) && POSITION_GROUPS.OF.includes(position))
    || (POSITION_GROUPS.CORNERS.includes(original) && POSITION_GROUPS.CORNERS.includes(position))
    || (POSITION_GROUPS.MIDDLE.includes(original) && POSITION_GROUPS.MIDDLE.includes(position))) return 0.97;
  if (["SP", "RP", "CP"].includes(original) && ["SP", "RP", "CP"].includes(position)) {
    if (original === "SP" && ["RP", "CP"].includes(position)) return 0.94;
    if (original === "CP" && position === "RP") return 0.96;
    if (original === "RP" && position !== "RP") return 0.82;
  }
  if (original === "C" || position === "C") return 0.78;
  return 0.86;
}

export function gainExperience(player, amount) {
  const next = structuredClone(player);
  next.experience += amount;
  const gained = [];
  while (next.experience >= next.level * 100 && next.level < 30) {
    next.experience -= next.level * 100;
    next.level += 1;
    gained.push(next.level);
  }
  next.overall = calculateOverall(next);
  return { player: next, gained };
}

export function getEligiblePositions(player) {
  const pos = player.originalPosition;
  if (pos === "DH") return ["DH"];
  if (POSITION_GROUPS.OF.includes(pos)) return [...POSITION_GROUPS.OF];
  if (POSITION_GROUPS.CORNERS.includes(pos)) return [...POSITION_GROUPS.CORNERS];
  if (POSITION_GROUPS.MIDDLE.includes(pos)) return [...POSITION_GROUPS.MIDDLE];
  if (pos === "SP") return ["SP", "RP", "CP"];
  if (pos === "CP") return ["CP", "RP"];
  if (pos === "RP") return ["RP"];
  return [pos];
}

export function getPositionAdjustedOverall(player, position = player.position) {
  return Math.round(calculateOverall(player) * positionFit(player, position));
}

export function switchPosition(player, position) {
  if (!getEligiblePositions(player).includes(position)) {
    throw new Error("이 선수는 해당 포지션으로 변경할 수 없습니다.");
  }
  const next = structuredClone(player);
  next.position = position;
  next.positionPenalty = positionFit(next, position);
  return next;
}