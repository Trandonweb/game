export const GAME = {
  title: "DIAMOND",
  version: "0.1.0",
  saveKey: "diamond-baseball-career-v1",
  attributeUpgradePoints: 3,
  attributeUpgradeValue: 5,
  playerLevelCardMilestones: [5, 10, 15, 20],
  positions: ["C", "1B", "2B", "3B", "SS", "LF", "CF", "RF", "DH", "SP", "RP", "CP"],
  batterTypes: ["교타형", "거포형", "출루형", "호타준족형"],
  pitcherTypes: ["강속구형", "제구형", "변화구형", "완급조절형"],
  modes: ["player", "team"],
  matchLengths: ["simulation", "highlight", "full"],
  matchTypes: ["cpu", "asynchronous", "realtime"]
};

export const POSITION_GROUPS = {
  OF: ["LF", "CF", "RF"],
  CORNERS: ["1B", "3B"],
  MIDDLE: ["SS", "2B"],
  PITCHER: ["SP", "RP", "CP"]
};

export const POSITION_LABELS = {
  C: "포수", "1B": "1루수", "2B": "2루수", "3B": "3루수", SS: "유격수",
  LF: "좌익수", CF: "중견수", RF: "우익수", DH: "지명타자",
  SP: "선발투수", RP: "중계투수", CP: "마무리투수"
};

export const BATTER_ATTRIBUTES = [
  { key: "contact", label: "정확", short: "정" },
  { key: "power", label: "파워", short: "파" },
  { key: "eye", label: "선구", short: "선" },
  { key: "speed", label: "주력", short: "주" },
  { key: "fielding", label: "수비", short: "수" },
  { key: "throwing", label: "송구", short: "송" }
];

export const PITCHER_ATTRIBUTES = [
  { key: "velocity", label: "구속", short: "구" },
  { key: "control", label: "제구", short: "제" },
  { key: "stuff", label: "구위", short: "위" },
  { key: "stamina", label: "체력", short: "체" },
  { key: "breaking", label: "변화구", short: "변" },
  { key: "composure", label: "위기관리", short: "위기" }
];

export const CARD_RULES = {
  star: { maxEnhancement: 10 },
  national: { maxEnhancement: count => 15 + count, bonus: 2, yearlyReview: true, yearlyLimit: 2 },
  allstar: { maxEnhancement: 12, consecutiveBonus: true, yearlyReview: true },
  top: { maxEnhancement: count => 11 + count, bonus: 2, maxAwards: 3, yearlyReview: true },
  icon: { maxEnhancement: count => 13 + count, bonus: 4, maxAwards: 5, yearlyReview: true, initialStreak: 3 },
  goldglove: { maxEnhancement: count => 15 + count, bonus: 4, yearlyReview: true }
};