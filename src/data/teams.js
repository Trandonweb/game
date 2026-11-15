// 모든 구단·구장·색상은 이 게임을 위해 새로 만든 가상 설정입니다.
// 실제 구단의 명칭, 로고, 유니폼, 선수 명단을 사용하지 않습니다.
export const TEAMS = [
  { id:"seoul-north", name:"서울 스카이라인", city:"서울", primary:"#3978b8", secondary:"#d8e8f5", stadium:"한강 스카이파크", parkStyle:"open", needs:{ C:2, SS:3, SP:5, CF:2 }, style:"투수진 중심" },
  { id:"seoul-south", name:"서울 레드폭스", city:"서울", primary:"#bd514c", secondary:"#f0c7a8", stadium:"남산 레드필드", parkStyle:"canopy", needs:{ '1B':3, LF:2, SP:3, CP:2 }, style:"장타력 중심" },
  { id:"busan", name:"부산 마리너스", city:"부산", primary:"#147c83", secondary:"#f0a85b", stadium:"오션 브리즈 파크", parkStyle:"coastal", needs:{ '1B':3, LF:2, SP:3, CP:2 }, style:"장타력 중심" },
  { id:"daegu", name:"대구 파운더스", city:"대구", primary:"#923d4c", secondary:"#e6c7a0", stadium:"선라이트 볼파크", parkStyle:"open", needs:{ '2B':3, '3B':2, RP:4, RF:2 }, style:"불펜 중심" },
  { id:"incheon", name:"인천 하버스", city:"인천", primary:"#287caa", secondary:"#b7d9df", stadium:"웨이브돔", parkStyle:"dome", needs:{ CF:4, SS:2, SP:3, C:2 }, style:"수비와 기동력" },
  { id:"gwangju", name:"광주 피닉스", city:"광주", primary:"#c99a35", secondary:"#292d38", stadium:"빛고을 필드", parkStyle:"open", needs:{ '1B':2, '3B':3, SP:4, RP:2 }, style:"선발진 중심" },
  { id:"daejeon", name:"대전 오비터스", city:"대전", primary:"#765bb0", secondary:"#d9d0ee", stadium:"센트럴 스타디움", parkStyle:"canopy", needs:{ RF:3, '2B':2, CP:3, SP:2 }, style:"균형 잡힌 전력" },
  { id:"suwon", name:"수원 스파크", city:"수원", primary:"#b94c43", secondary:"#e7d4c7", stadium:"포레스트 파크", parkStyle:"open", needs:{ SS:3, CF:3, SP:3, RP:2 }, style:"기동력과 밸런스" },
  { id:"changwon", name:"창원 그린웨일", city:"창원", primary:"#36856c", secondary:"#c7e1d2", stadium:"그린웨일 필드", parkStyle:"coastal", needs:{ C:2, '3B':3, SP:3, CP:2 }, style:"수비와 장타력" },
  { id:"seoul-east", name:"서울 나이트폴", city:"서울", primary:"#657184", secondary:"#e0b5bd", stadium:"이스트 나이트파크", parkStyle:"dome", needs:{ '2B':3, LF:2, SP:4, RP:3 }, style:"안정적인 마운드" }
];

export function getTeam(teamId) {
  return TEAMS.find(team => team.id === teamId) || TEAMS[0];
}
