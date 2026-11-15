export const TEAMS = [
  { id:"seoul", name:"서울 유니온즈", city:"서울", needs:{ C:2, SS:3, SP:5, CF:2 }, style:"투수진 중심" },
  { id:"busan", name:"부산 웨이브스", city:"부산", needs:{ 1B:3, LF:2, SP:3, CP:2 }, style:"장타력 중심" },
  { id:"daegu", name:"대구 파이어즈", city:"대구", needs:{ 2B:3, 3B:2, RP:4, RF:2 }, style:"불펜 중심" },
  { id:"incheon", name:"인천 마리너스", city:"인천", needs:{ CF:4, SS:2, SP:3, C:2 }, style:"수비와 기동력" },
  { id:"gwangju", name:"광주 타이탄즈", city:"광주", needs:{ 1B:2, 3B:3, SP:4, RP:2 }, style:"선발진 중심" },
  { id:"daejeon", name:"대전 스톰", city:"대전", needs:{ RF:3, 2B:2, CP:3, SP:2 }, style:"균형 잡힌 전력" }
];

export function getTeam(teamId) {
  return TEAMS.find(team => team.id === teamId) || TEAMS[0];
}
