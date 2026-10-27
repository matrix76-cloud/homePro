/**
 * 도급업자 배상책임보험 — 업종 그룹(A~D) 월 정기결제 (대표 기획안 10/26, 시안 랩 insurance-* 형 선택 10/27)
 *  · 가입은 월 정기결제만 (건당 · 연간 결제는 생략 — 대표 10/26)
 *  · 금액은 settings/insurance.groupPlans 로 관리자가 바꿀 수 있고, 없으면 아래 기본값. 서버(functions/tossPay.js)도 같은 기본값을 쓴다
 *  · 문구는 대표 기획안 그대로 — 세부 약관 · 안내 문구는 바뀔 수 있다고 대표가 밝힘
 */
export const INSURANCE_GROUPS = [
  { id: "A", price: 5900, cats: "홈클리닝, 준공청소, 상업매장청소, 바닥전문청소, 정기청소, 침대·카페트 청소, 가전설치, 집수리, 해충방역, 컴퓨터·프린터, 자동차", note: "저위험 · 일상 케어 & 단순 보수" },
  { id: "B", price: 7900, cats: "하수구·배관·설비, 가전분해청소, 에어컨 설치·수리, 누수탐지, 특수청소, 화재청소, 곰팡이·단열시공, 페인트·도장·방수(소규모), 용달·포장이사, 부분인테리어", note: "중위험 · 설비 · 부분시공 & 운반", rec: true },
  { id: "C", price: 18000, cats: "누수공사(대형 배관 교체), 난방·보일러, 전기공사, 종합리모델링, 폐기물처리", note: "고위험 · 누수공사 & 전기" },
  { id: "D", price: 37000, cats: "외벽·고소청소, 철거, 스카이차·크레인·사다리차·포크레인·지게차", note: "초고위험 · 고소작업 · 철거 & 중장비" },
];
export const GROUP_RANK = { A: 1, B: 2, C: 3, D: 4 };

// 홈프로 카테고리 → 그룹 (대표 10/27 카톡 그룹표). 가전렌탈 · 팀원 구인 · 공동중개는 표에 없어 배정하지 않는다
export const CATEGORY_GROUP = {
  professional_cleaning: "A", regular_cleaning: "A", mattress_care: "A", appliance_install: "A", home_repair: "A",
  pest_control: "A", computer: "A", auto: "A",
  drain_pipe: "B", appliance_cleaning: "B", aircon_install: "B", leak_detection: "B", mold: "B", paint_waterproof: "B",
  moving: "B", partial_interior: "B",
  boiler: "C", electrical_work: "C", full_remodel: "C", waste: "C",
  demolition: "D", heavy_equipment: "D",
};
// 세부 항목이 카테고리 기본과 다른 그룹인 것 — 전문청소 · 누수탐지공사는 세부 항목마다 갈린다
export const SUB_GROUP = {
  professional_cleaning: { "특수청소": "B", "화재청소": "B", "외벽.고소청소": "D" },
  leak_detection: { "누수공사": "C" },
};

/** 파트너 업종 하나의 그룹 — 고른 세부 항목 중 가장 높은 그룹, 세부 항목이 없으면 카테고리 기본 */
const proGroup = (categoryId, subs = []) => {
  const base = CATEGORY_GROUP[categoryId];
  if (!base) return "";
  const over = SUB_GROUP[categoryId] || {};
  const list = subs.length ? subs.map((s) => over[s] || base) : [base];
  return list.reduce((best, g) => (GROUP_RANK[g] > GROUP_RANK[best] ? g : best));
};

/** 여러 업종이면 가장 위험한(높은) 그룹 — "복수 업종 수행 시 가장 위험도가 높은 상위 그룹"
 *  항목은 categoryId 문자열 또는 파트너 등록 문서({ categoryId, detail: { subcategories } }) */
export const recommendGroup = (items = []) => {
  let best = "";
  items.forEach((it) => {
    const g = typeof it === "string" ? proGroup(it) : proGroup(it?.categoryId, it?.detail?.subcategories || []);
    if (g && (!best || GROUP_RANK[g] > GROUP_RANK[best])) best = g;
  });
  return best || "B";
};

/** settings/insurance.groupPlans 로 금액 덮어쓰기 */
export const groupsWithSettings = (settings) => INSURANCE_GROUPS.map((g) => {
  const o = settings?.groupPlans?.[g.id];
  return { ...g, price: Number(o?.price) > 0 ? Number(o.price) : g.price };
});

export const LIMITS = [
  ["대인 배상", "1억 원", "고객·제3자 신체 상해 사고"],
  ["대물 배상", "1,000만 원", "아랫집 누수·도배·천장 피해 (제3자)"],
  ["물적확대 (EPD)", "500만 원", "작업 현장 내 손님 집 마루·가구 파손"],
  ["파트너 연간 총한도", "1억 원", "1인당 1년 보상 총액"],
];
export const LIMIT_SHORT = "대인 1억 / 대물 1,000만 / EPD 500만";
// 자기부담금 — 대표 10/26 15:42 (사고 1건마다)
export const DEDUCT = [["일반 작업", "30만원"], ["사다리차 · 스카이카 작업", "50만원"], ["이사 관련 작업", "100만원"]];
export const DEDUCT_NOTE = "자기부담금은 사고 1건마다 적용되며, 손해액에서 공제한 후 보험금이 지급됩니다. 예를 들어 손해액 80만원인 일반 작업 사고는 30만원을 공제한 50만원이 지급됩니다.";
export const SCOPE = [
  { n: 1, title: "작업 대상물 자체", res: "면책 (보상 불가)", ok: false, ex: "청소 중인 에어컨 본체/PCB 쇼트, 교체 중인 배관 파손", guide: "소액 부품 실수는 작업자 조심 영역으로 두고, 월 최저가 단가를 유지하기 위한 표준 면책 조건입니다." },
  { n: 2, title: "작업 현장 내부 재물", res: "EPD 500만 원 한도 보상", ok: true, ex: "장비 이동 중 긁힌 손님 집 마루, 세척제가 튄 고가 가구·소파" },
  { n: 3, title: "작업 현장 밖 제3자 재물", res: "대물 1,000만 원 한도 보상", ok: true, ex: "세척수 유출 / 배관 터짐으로 인한 아랫집 천장·도배 누수 피해" },
];
export const SCOPE_SPECIAL = "약관 명기 특약: \"아랫집 누수 등 현장 밖 제3자 손해는 면책을 적용하지 않으며, 대물배상 1,000만 원 한도에서 전액 정상 보상합니다.\"";
export const START_TEXT = "카드 결제 완료 후, 앱에서 작업 전/후 사진 등록 · GPS 체크인 · 체크아웃을 한 작업에 적용됩니다.";
export const START_REQ = [
  ["구독 유효", "해당 그룹의 월 구독이 가입되어 있고 보험료가 완납 상태일 것"],
  ["앱 체크인", "GPS 좌표와 시각이 기록된 상태로 앱에서 체크인할 것"],
  ["작업 전 사진 등록", "현장 상태 사진을 등록할 것. 사다리차·스카이카는 장비 세팅 사진을 포함"],
];
export const START_END = "담보는 체크아웃 시점에 종료됩니다. 체크아웃하지 않은 작업은 원수사와 협의한 기준에 따라 자동 종료됩니다.";
export const NOT_COVERED = [
  "앱에 등재하지 않고 수행한 작업 — 플랫폼을 통해 받은 일감이든 개인적으로 받은 일감이든 동일합니다.",
  "사고가 발생한 뒤에 앱에 등재한 작업 — 작업 전 사진이 존재할 수 없으므로 소급 등재는 확인됩니다.",
  "구독하지 않은 그룹의 작업 — 예를 들어 A그룹만 구독한 파트너가 전기공사를 수행한 경우.",
  "도로 운행 중 발생한 사고 — 자동차보험(건설기계 의무보험 포함)에서 처리됩니다.",
];
export const NOT_COVERED_NOTE = "외부 오더도 앱에 등재하면 동일하게 보장됩니다. 다만 작업 시작 전에 등재와 체크인, 사진 등록이 완료되어야 합니다.";
export const EXCLUDE = [
  ["화재배상책임", "전기공사 합선, 에어컨 설치 중 용접, 보일러 작업으로 인한 화재는 보상되지 않습니다. C그룹의 가장 큰 위험이 담보에서 제외되므로 파트너 고지가 특히 중요합니다."],
  ["파트너 본인 및 소속 작업자의 상해", "작업 중 파트너 본인이나 함께 일한 일용 작업자가 다친 경우는 이 보험으로 보상되지 않습니다. 단체상해보험 또는 노무제공자 산재 가입을 별도로 검토하셔야 합니다."],
  ["구조물의 붕괴 · 폭발 · 지하매설물 손상", "철거·종합리모델링·배관공사에서 건물 구조에 발생하는 손해는 제외됩니다."],
  ["분진 및 소음", "철거·리모델링 시 인접세대의 분진·소음 민원은 제외됩니다. 국내 아파트에서 빈발하는 항목입니다."],
  ["오염", "해충방역 살충제, 특수청소 약품, 폐기물 처리 과정의 오염·악취·인체 반응은 제외됩니다."],
  ["진단·점검 오류", "누수탐지 오진으로 불필요한 공사를 하게 된 경우의 손해는 제외됩니다. 작업 중 발생한 물리적 손해만 보상됩니다."],
  ["작업 대상물 자체", "시공한 부분 자체를 다시 시공하는 비용은 보상되지 않습니다."],
  ["계약상 가중책임", "플랫폼 약관이나 파트너가 고객과 맺은 약정으로 법률상 책임을 넘어 부담하기로 한 부분은 제외됩니다."],
  ["기타", "고의사고 · 전쟁 및 테러 · 석면·규사·납 · 곰팡이 · 사이버 · 감염병 · 생산물 회수비용 · 간접손해 및 순수 재정손실 · 징벌적 손해배상"],
];
export const EXCLUDE_NOTE = "작업자에 의한 고객 귀중품 절도는 고의사고로 면책입니다.";
export const ACCIDENT_STEPS = [
  "사고 현장 및 파손 부위 사진/동영상 촬영",
  "피해 고객 연락처 및 아랫집 누수 여부 확인",
  "아래 [사고접수] 버튼 클릭 후 파손 내역 제출",
];
export const groupPriceText = (n) => `${Number(n || 0).toLocaleString("ko-KR")}원`;
