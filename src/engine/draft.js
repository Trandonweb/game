import { TEAMS } from "../data/teams.js";
import { positionFit, calculateOverall } from "./player.js";

export function evaluateTeamFit(player, team) {
  const need = team.needs[player.position] || 0;
  const fit = positionFit(player, player.position);
  const archetypeBonus = player.isTwp ? 3 : 0;
  const score = Math.round(calculateOverall(player) * 0.55 + need * 7 + archetypeBonus);
  return { teamId: team.id, need, score, chance: Math.min(95, Math.max(8, 28 + need * 12 + score * 0.25)) };
}

export function runDraft(player) {
  const rankings = TEAMS.map(team => ({ team, ...evaluateTeamFit(player, team) }))
    .sort((a,b) => b.score - a.score);
  const roll = Math.random() * 100;
  const selected = rankings.find(item => roll <= item.chance) || rankings[0];
  return {
    team: selected.team,
    rankings,
    resultText: selected.team.name + "이(가) " + player.name + " 선수를 지명했습니다."
  };
}
