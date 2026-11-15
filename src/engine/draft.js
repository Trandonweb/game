import { TEAMS } from "../data/teams.js";
import { positionFit, calculateOverall } from "./player.js";

export function evaluateTeamFit(player, team) {
  const need = team.needs[player.position] || 0;
  const fit = positionFit(player, player.position);
  const overall = calculateOverall(player);
  // 필요도는 평가에 반영하되, 지명 결과를 사실상 결정하지 않도록 비중을 제한한다.
  const score = Math.round(overall * 0.72 + need * 2.2 + (fit * 4) + (player.isTwp ? 2 : 0));
  return { teamId: team.id, need, score, chance: 0 };
}

export function runDraft(player, preferredTeamId = null) {
  const evaluations = TEAMS.map(team => {
    const evaluation = evaluateTeamFit(player, team);
    // 선호 구단 보너스는 분명히 주되, 지명을 보장하지는 않는다.
    const preferenceMultiplier = team.id === preferredTeamId ? 1.7 : 1;
    const needMultiplier = 1 + evaluation.need * 0.045;
    const qualityMultiplier = 0.85 + Math.max(0, evaluation.score) / 150;
    return {
      team,
      ...evaluation,
      weight: preferenceMultiplier * needMultiplier * qualityMultiplier,
      preferenceBonus: team.id === preferredTeamId ? 1 : 0
    };
  });
  const totalWeight = evaluations.reduce((sum, item) => sum + item.weight, 0);
  let roll = Math.random() * totalWeight;
  let selected = evaluations[evaluations.length - 1];
  for (const item of evaluations) {
    roll -= item.weight;
    if (roll <= 0) { selected = item; break; }
  }
  const rankings = evaluations
    .map(item => ({ ...item, chance: Math.round(item.weight / totalWeight * 1000) / 10 }))
    .sort((a, b) => b.chance - a.chance);
  const selectedTeam = TEAMS.find(team => team.id === selected.team.id) || selected.team;
  return {
    team: selectedTeam,
    rankings,
    resultText: selectedTeam.name + "이(가) " + player.name + " 선수를 지명했습니다."
  };
}