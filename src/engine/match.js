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
