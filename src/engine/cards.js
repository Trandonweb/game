import { CARD_RULES } from "../data/config.js";

export const CARD_TYPES = [
  { id:"star1", name:"1성", group:"star", description:"최초 지명 카드" },
  { id:"star2", name:"2성", group:"star", description:"선수 레벨 5 달성" },
  { id:"star3", name:"3성", group:"star", description:"선수 레벨 10 달성" },
  { id:"star4", name:"4성", group:"star", description:"선수 레벨 15 달성" },
  { id:"star5", name:"5성", group:"star", description:"선수 레벨 20 달성" },
  { id:"national", name:"국대", group:"national", description:"국가대표 소집 및 경기 출전" },
  { id:"allstar", name:"올스타", group:"allstar", description:"올스타 선정 및 올스타전 출전" },
  { id:"top", name:"TOP", group:"top", description:"해당 시즌 팀 내 TOP 3 활약" },
  { id:"icon", name:"ICON", group:"icon", description:"3년 연속 팀 내 TOP 3 및 리그 상위권" },
  { id:"goldglove", name:"골든글러브", group:"goldglove", description:"골든글러브 수상" }
];

function baseStatsFor(player, typeId) {
  const source = { ...player.attributes, ...(player.secondaryAttributes || {}) };
  // 국가대표는 올스타보다 상위 등급의 카드가 되도록 기본 능력치 보정을 확실히 높인다.
  const modifier = ({ star1:0, star2:1, star3:2, star4:3, star5:4, national:7, allstar:3, top:4, icon:7, goldglove:5 })[typeId] || 0;
  const result = {};
  for (const [key, value] of Object.entries(source)) {
    let specialty = 0;
    if (typeId === "goldglove" && ["fielding","throwing","composure"].includes(key)) specialty = 5;
    if (typeId === "allstar" && ["contact","power","velocity","stuff"].includes(key)) specialty = 3;
    if (typeId === "icon" && ["contact","power","velocity","control"].includes(key)) specialty = 2;
    result[key] = Math.max(1, value + modifier + specialty);
  }
  return result;
}

export function createCard(player, typeId, season, options = {}) {
  const type = CARD_TYPES.find(item => item.id === typeId);
  if (!type) throw new Error("알 수 없는 카드 종류입니다.");
  const rule = CARD_RULES[type.group];
  const card = {
    id: crypto.randomUUID(), playerId: player.id, typeId,
    variant: typeId === "allstar" ? (options.variant || "dream") : null,
    name: type.name, season,
    baseAttributes: baseStatsFor(player, typeId),
    permanentBonus: {}, training: {}, enhancement: 0,
    maxEnhancement: typeof rule.maxEnhancement === "function" ? rule.maxEnhancement(options.count || 0) : rule.maxEnhancement,
    selectionCount: options.count || 0, consecutiveCount: options.consecutiveCount || 0,
    lastReviewedSeason: season, reviewHistory: [], acquiredAt: Date.now()
  };
  const keys = Object.keys(card.baseAttributes);
  card.permanentBonus = Object.fromEntries(keys.map(key => [key, 0]));
  card.training = Object.fromEntries(keys.map(key => [key, 0]));
  return card;
}

export function cardOverall(card) {
  const values = Object.keys(card.baseAttributes).map(key => card.baseAttributes[key] + (card.permanentBonus[key] || 0) + (card.training[key] || 0));
  return Math.round(values.reduce((a,b) => a+b, 0) / Math.max(values.length,1));
}
export function cardFinalAttributes(card) {
  return Object.fromEntries(Object.keys(card.baseAttributes).map(key => [key,card.baseAttributes[key]+(card.permanentBonus[key]||0)+(card.training[key]||0)]));
}
export function trainCard(card, amount = 1) {
  const next = structuredClone(card);
  if (next.enhancement >= next.maxEnhancement) throw new Error("이 카드의 최대 강화 단계에 도달했습니다.");
  next.enhancement += amount;
  const keys = Object.keys(next.training),key=keys[(next.enhancement-1)%keys.length];
  next.training[key] += 2;
  return next;
}
export function addCardAwardBonus(card, amount) {
  const next = structuredClone(card);
  for (const key of Object.keys(next.permanentBonus)) next.permanentBonus[key] += amount;
  return next;
}
export function reviewCard(card, newBaseAttributes, season) {
  const next = structuredClone(card);
  next.reviewHistory.push({ season: next.season, attributes: { ...next.baseAttributes } });
  next.baseAttributes = { ...newBaseAttributes };next.season=season;next.lastReviewedSeason=season;
  return next;
}
export function cardType(typeId) { return CARD_TYPES.find(item => item.id === typeId); }
