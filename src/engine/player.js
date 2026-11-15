import { BATTER_ATTRIBUTES, PITCHER_ATTRIBUTES, POSITION_GROUPS } from "../data/config.js";

export function getPlayerAttributes(player) {
  if (player.isTwp) return [...BATTER_ATTRIBUTES, ...PITCHER_ATTRIBUTES];
  return player.role === "pitcher" ? PITCHER_ATTRIBUTES : BATTER_ATTRIBUTES;
}

export function createPlayerProfile(input) {
  const isPitcher = ["SP", "RP", "CP"].includes(input.position);
  const role = isPitcher ? "pitcher" : "batter";
  const primary = role === "pitcher" ? PITCHER_ATTRIBUTES : BATTER_ATTRIBUTES;
  const secondary = role === "pitcher" ? BATTER_ATTRIBUTES : PITCHER_ATTRIBUTES;
  const bases = [60, 60, 40, 70, 65, 40];
  const primaryStats = Object.fromEntries(primary.map((a, i) => [a.key, bases[i]]));
  const secondaryStats = input.isTwp
    ? Object.fromEntries(secondary.map((a, i) => [a.key, bases[i]]))
    : null;
  return {
    id: crypto.randomUUID(),
    name: input.name.trim(),
    age: 18,
    position: input.position,
    originalPosition: input.position,
    role,
    isTwp: Boolean(input.isTwp),
    batterType: input.batterType || null,
    pitcherType: input.pitcherType || null,
    archetype: isPitcher ? input.pitcherType : input.batterType,
    level: 1,
    experience: 0,
    attributes: primaryStats,
    pitcherAttributes: input.isTwp ? (isPitcher ? primaryStats : secondaryStats) : null,
    secondaryAttributes: input.isTwp ? secondaryStats : null,
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
  const allowed = new Set(getPlayerAttributes(player).map(a => a.key));
  const next = structuredClone(player);
  for (const key of choices) {
    if (!allowed.has(key)) throw new Error("선택할 수 없는 능력치입니다.");
    if (Object.hasOwn(next.attributes, key)) next.attributes[key] += 5;
    else if (next.secondaryAttributes && Object.hasOwn(next.secondaryAttributes, key)) next.secondaryAttributes[key] += 5;
  }
  if (next.isTwp && next.secondaryAttributes) {
    next.pitcherAttributes = next.role === "pitcher" ? next.attributes : next.secondaryAttributes;
  }
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
