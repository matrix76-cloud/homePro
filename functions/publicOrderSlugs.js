/**
 * 공개 오더리스트(/orders/...) 주소 표 — 업종 · 지역 slug (대표 리뷰 11/21 "공개 오더리스트")
 *
 * 주소 꼴
 *   /orders                      전체
 *   /orders/{업종}               업종별          예) /orders/move-cleaning
 *   /orders/{시도}               시·도별         예) /orders/gyeonggi
 *   /orders/{시도}/{업종}        시·도 × 업종    예) /orders/gyeonggi/move-cleaning
 *
 * - 업종 id · 이름 · 설명 · 대표 세부 항목은 src/config/homeproConfig.js(CATEGORIES) · orderFormConfig.js(subGroups)
 *   에 있는 값을 그대로 옮겼다. 앱 쪽 카테고리를 더하거나 이름을 바꾸면 여기도 같이 고친다.
 *   (functions 는 src 를 불러 쓸 수 없어 표를 따로 둔다. 공동중개는 오더 카테고리가 아니라 없다.)
 * - slug 는 한 번 검색에 잡히면 주소가 되므로 바꾸지 않는다. 이름만 바뀌면 name 만 고친다.
 * - 업종 slug 와 지역 slug 는 서로 겹치지 않게 짓는다(한 마디짜리 주소에서 둘을 구분한다).
 * - 시·군·구 단계(예: /orders/seoul-gangnam/…)는 아직 없다 — 오더가 쌓이면 SIDO 항목에 하위 표를 더한다.
 */

// 시·도 17곳. aliases = 주소 맨 앞 마디로 올 수 있는 표기 전부.
const SIDO = [
  { slug: "seoul", name: "서울", full: "서울특별시", aliases: ["서울", "서울시", "서울특별시"], areas: ["강남", "송파", "강서", "마포", "노원"] },
  { slug: "gyeonggi", name: "경기", full: "경기도", aliases: ["경기", "경기도"], areas: ["수원", "성남", "용인", "화성", "고양"] },
  { slug: "incheon", name: "인천", full: "인천광역시", aliases: ["인천", "인천시", "인천광역시"], areas: ["부평", "남동", "서구", "연수"] },
  { slug: "busan", name: "부산", full: "부산광역시", aliases: ["부산", "부산시", "부산광역시"], areas: ["해운대", "부산진", "사하", "동래"] },
  { slug: "daegu", name: "대구", full: "대구광역시", aliases: ["대구", "대구시", "대구광역시"], areas: ["수성구", "달서구", "북구"] },
  { slug: "daejeon", name: "대전", full: "대전광역시", aliases: ["대전", "대전시", "대전광역시"], areas: ["유성구", "서구", "동구", "중구", "대덕구"] },
  { slug: "gwangju", name: "광주", full: "광주", aliases: ["광주", "광주시", "광주광역시"], areas: ["광산구", "북구", "서구", "남구", "동구"] },
  { slug: "ulsan", name: "울산", full: "울산광역시", aliases: ["울산", "울산시", "울산광역시"], areas: ["남구", "중구", "북구", "울주군"] },
  { slug: "sejong", name: "세종", full: "세종특별자치시", aliases: ["세종", "세종시", "세종특별자치시"], areas: [] },
  { slug: "gangwon", name: "강원", full: "강원특별자치도", aliases: ["강원", "강원도", "강원특별자치도"], areas: ["춘천", "원주", "강릉"] },
  { slug: "chungbuk", name: "충북", full: "충청북도", aliases: ["충북", "충청북도"], areas: ["청주", "충주", "제천"] },
  { slug: "chungnam", name: "충남", full: "충청남도", aliases: ["충남", "충청남도"], areas: ["천안", "아산", "서산", "논산"] },
  { slug: "jeonbuk", name: "전북", full: "전북특별자치도", aliases: ["전북", "전라북도", "전북특별자치도"], areas: ["전주", "익산", "군산"] },
  { slug: "jeonnam", name: "전남", full: "전남", aliases: ["전남", "전라남도"], areas: ["여수", "순천", "목포"] },
  { slug: "gyeongbuk", name: "경북", full: "경상북도", aliases: ["경북", "경상북도"], areas: ["포항", "구미", "경주"] },
  { slug: "gyeongnam", name: "경남", full: "경상남도", aliases: ["경남", "경상남도"], areas: ["창원", "김해", "진주", "양산"] },
  { slug: "jeju", name: "제주", full: "제주특별자치도", aliases: ["제주", "제주도", "제주특별자치도"], areas: ["제주시", "서귀포시"] },
];

// 주소 검색이 "전남광주통합특별시 남구 …" 처럼 통합 이름으로 주는 경우 — 둘째 마디(구)로 광주 · 전남을 가른다.
const MERGED_GWANGJU_JEONNAM = ["전남광주통합특별시", "광주전남통합특별시", "전남광주특별시", "광주전남특별시"];
const GWANGJU_GU = ["동구", "서구", "남구", "북구", "광산구"];

// 업종 26개. items = 그 업종 접수폼의 대표 세부 항목(검색어가 되는 실제 항목명).
// listName 이 있으면 제목의 "{업종} 실시간 예약 오더공유 리스트" 자리에 그 말을 쓴다.
const CATS = [
  { id: "move_cleaning", slug: "move-cleaning", name: "입주청소", desc: "이사·입주·거주청소, 부분청소, 정리수납 등 홈클리닝", items: ["이사청소", "입주청소(신축)", "거주청소", "원룸청소", "인테리어 후 청소", "빈집정리"] },
  { id: "special_cleaning", slug: "special-cleaning", name: "특수청소", desc: "유품정리·고독사·쓰레기집 등 특수청소와 화재청소", items: ["유품정리 고독사 청소", "쓰레기집 청소", "그을음 제거청소", "냄새제거·탈취"] },
  { id: "regular_cleaning", slug: "regular-cleaning", name: "정기청소", desc: "건물 공용부·상업시설·주거공간 월 단위 정기 청소", items: ["계단청소", "화장실관리", "유리창청소", "바닥왁스관리", "카페트세척"] },
  { id: "business_cleaning", slug: "business-cleaning", name: "사업장청소", desc: "상업·매장청소, 바닥 전문청소, 준공청소, 외벽·고소청소", items: ["상업.매장청소", "바닥 전문청소", "준공청소", "외벽.고소청소"] },
  { id: "drain_pipe", slug: "plumbing", name: "설비.하수구.배관", desc: "하수구, 배관, 설비 시공·수리", items: ["싱크대 하수구 막힘", "변기막힘", "배관 고압세척", "하수구 악취", "급수설비", "동파 해동"] },
  { id: "leak_detection", slug: "leak-detection", name: "누수탐지공사", desc: "누수 탐지 및 누수 공사", items: ["천장누수", "벽체누수", "욕실누수의심", "배관보수", "방수공사"] },
  { id: "aircon_install", slug: "aircon", name: "에어컨 설치.수리", desc: "에어컨 신규/이전 설치, 실외기, 고장 점검", items: ["벽걸이형", "스탠드형", "2in1", "냉난방기", "냉매작업", "A/S 및 점검"] },
  { id: "appliance_cleaning", slug: "appliance-cleaning", name: "가전분해 청소", desc: "에어컨, 세탁기, 냉장고, 주방후드 분해 청소", items: ["에어컨청소", "세탁기청소", "주방후드", "냉장고청소", "비데분해세척"] },
  { id: "mattress_care", slug: "mattress-carpet-cleaning", name: "침대.카페트 청소", desc: "침대매트리스, 소파, 카펫 전문 케어", items: ["침대매트리스", "소파청소", "카페트.러그"] },
  { id: "worker_call", slug: "workers", name: "팀원.기술자 구인", listName: "현장구인 · 기술자 구인 실시간 리스트", desc: "현장 작업 인력/기술자/장비 요청", items: ["청소작업", "도배공", "타일공", "목공", "전기공", "철거공", "보통인부", "스페어기사"] },
  { id: "home_repair", slug: "home-repair", name: "집수리", desc: "창호, 욕실, 주방, 도어락 등 각종 소수리/보수", items: ["창호 소수리", "욕실 소수리", "주방 소수리", "전기.조명", "도어락.보안 소수리", "벽.천장 부분보수"] },
  { id: "partial_interior", slug: "interior", name: "부분 인테리어", desc: "벽면, 바닥, 필름, 주방, 욕실 등 부분 인테리어", items: ["도배(합지·실크)", "장판시공", "마루시공", "필름 인테리어", "주방 인테리어", "욕실 인테리어"] },
  { id: "full_remodel", slug: "remodeling", name: "종합 리모델링", desc: "욕실, 주방, 전체, 상가 리모델링", items: ["욕실 리모델링", "주방 리모델링", "전체 리모델링", "상가.사무실 리모델링", "창호 리모델링"] },
  { id: "demolition", slug: "demolition", name: "철거", desc: "내부/부분/원상복구 철거 등", items: ["내부철거", "부분철거", "원상복구 철거", "욕실.주방 철거", "상가.사무실 철거"] },
  { id: "waste", slug: "waste", name: "폐기물처리", desc: "생활/인테리어/대형/사업장 폐기물 처리", items: ["가정생활 폐기물", "인테리어.건설 폐기물", "혼합 폐기물", "대형.중량 폐기물", "사업장 폐기물"] },
  { id: "electrical_work", slug: "electrical", name: "전기공사", desc: "배선, 증설, 콘센트/스위치, 조명 공사 등", items: ["배선공사", "전기 용량.증설", "콘센트.스위치 신설", "조명공사", "상가.사무실 전기공사"] },
  { id: "heavy_equipment", slug: "equipment", name: "스카이차.건설장비", desc: "스카이차, 크레인, 사다리차, 굴삭기 등 건설장비", items: ["스카이차", "카고크레인", "사다리차", "유압크레인", "굴삭기", "지게차"] },
  { id: "appliance_install", slug: "appliance-install", name: "가전설치", desc: "세탁기, 냉장고, TV, 비데 등 가전 설치", items: ["세탁기/건조기", "TV.가구.벽걸이", "인덕션/후드", "냉장고", "비데.정수기", "CCTV.네트워크"] },
  { id: "boiler", slug: "boiler", name: "난방.보일러", desc: "가스/기름/전기 보일러, 지역난방, 온수기", items: ["가스보일러", "기름보일러", "전기식보일러", "지역난방", "온수기"] },
  { id: "appliance_rental", slug: "appliance-rental", name: "가전렌탈", desc: "생활/대형/주방/IT 가전 렌탈", items: ["생활.위생가전", "대형가전", "주방.소형가전", "IT.디지털 가전"] },
  { id: "pest_control", slug: "pest-control", name: "해충방역", desc: "바퀴벌레, 개미, 쥐 등 해충 방역", items: ["바퀴벌레", "개미", "쥐", "살균.소독서비스", "위생.해충 정기관리", "특수방역"] },
  { id: "mold", slug: "mold-insulation", name: "곰팡이.단열시공", desc: "곰팡이 제거, 차단코팅, 단열 시공", items: ["외벽과 맞닿은 벽", "천장", "창가.창틀.샷시", "욕실", "베란다.다용도실"] },
  { id: "paint_waterproof", slug: "painting-waterproofing", name: "페인트.도장.방수", desc: "내외부 페인트, 도장, 방수 시공", items: ["내부 페인트", "외부 페인트", "철재 도장", "옥상방수", "욕실방수", "외벽방수"] },
  { id: "moving", slug: "moving", name: "용달.포장이사", desc: "용달, 가정/사무실/특수/보관 이사", items: ["포장이사", "반포장이사", "원룸·투룸 이사", "사무실 이전", "용달이사", "보관이사"] },
  { id: "computer", slug: "computer", name: "컴퓨터.프린터", desc: "컴퓨터/프린터 수리, 네트워크, 렌탈", items: ["컴퓨터 점검.수리", "프린터 설치.연결", "네트워크.공유 설정", "프린터.복합기 렌탈"] },
  { id: "auto", slug: "auto", name: "자동차", desc: "세차, 정비, 구매상담, 렌트 등", items: ["방문 세차.관리", "출장정비", "배터리 출장", "장기렌트 상담", "내차팔기", "폐차"] },
];

const SIDO_BY_SLUG = new Map(SIDO.map((s) => [s.slug, s]));
const SIDO_BY_ALIAS = new Map(SIDO.flatMap((s) => s.aliases.map((a) => [a, s])));
const CAT_BY_SLUG = new Map(CATS.map((c) => [c.slug, c]));
const CAT_BY_ID = new Map(CATS.map((c) => [c.id, c]));

/** 주소 앞 두 마디 → 시·도 항목 (못 알아보면 null) */
function sidoOf(first, second) {
  const f = String(first || "").trim();
  if (!f) return null;
  if (MERGED_GWANGJU_JEONNAM.includes(f)) {
    return SIDO_BY_SLUG.get(GWANGJU_GU.includes(String(second || "").trim()) ? "gwangju" : "jeonnam");
  }
  return SIDO_BY_ALIAS.get(f) || null;
}

module.exports = { SIDO, CATS, SIDO_BY_SLUG, CAT_BY_SLUG, CAT_BY_ID, sidoOf };
