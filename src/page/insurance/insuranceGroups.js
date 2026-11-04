/**
 * 도급업자 배상책임보험 — 업종 그룹(A~D) 월 정기결제 (대표 기획안 10/26, 시안 랩 insurance-* 형 선택 10/27)
 *  · 가입은 월 정기결제만 (건당 · 연간 결제는 생략 — 대표 10/26)
 *  · 금액은 settings/insurance.groupPlans 로 관리자가 바꿀 수 있고, 없으면 아래 기본값. 서버(functions/tossPay.js)도 같은 기본값을 쓴다
 *  · 문구는 대표 기획안 그대로 — 세부 약관 · 안내 문구는 바뀔 수 있다고 대표가 밝힘
 */
export const INSURANCE_GROUPS = [
  { id: "A", price: 5900, rep: "홈클리닝", cats: "홈클리닝, 준공청소, 상업매장청소, 바닥전문청소, 정기청소, 침대·카페트 청소, 가전설치, 집수리, 해충방역, 컴퓨터·프린터, 자동차", note: "저위험 · 일상 케어 & 단순 보수" },
  { id: "B", price: 7900, rep: "하수구·배관·설비", cats: "하수구·배관·설비, 가전분해청소, 에어컨 설치·수리, 누수탐지, 특수청소, 화재청소, 곰팡이·단열시공, 페인트·도장·방수(소규모), 용달·포장이사, 부분인테리어", note: "중위험 · 설비 · 부분시공 & 운반", rec: true },
  { id: "C", price: 18000, rep: "누수공사", cats: "누수공사(대형 배관 교체), 난방·보일러, 전기공사, 종합리모델링, 폐기물처리", note: "고위험 · 누수공사 & 전기" },
  { id: "D", price: 37000, rep: "외벽·고소작업", cats: "외벽·고소청소, 철거, 스카이차·크레인·사다리차·포크레인·지게차", note: "초고위험 · 고소작업 · 철거 & 중장비" },
];
// rep = 칸에 한 줄로 보이는 대표 업종, cats 는 [업종 전체 보기]로 펼친다 (대표 리뷰 11/02)
export const GROUP_RANK = { A: 1, B: 2, C: 3, D: 4 };

// 홈프로 카테고리 → 그룹 (대표 10/27 카톡 그룹표). 가전렌탈 · 팀원 구인 · 공동중개는 표에 없어 배정하지 않는다
export const CATEGORY_GROUP = {
  move_cleaning: "A", special_cleaning: "B", business_cleaning: "A", regular_cleaning: "A", mattress_care: "A", appliance_install: "A", home_repair: "A",
  pest_control: "A", computer: "A", auto: "A",
  drain_pipe: "B", appliance_cleaning: "B", aircon_install: "B", leak_detection: "B", mold: "B", paint_waterproof: "B",
  moving: "B", partial_interior: "B",
  boiler: "C", electrical_work: "C", full_remodel: "C", waste: "C",
  demolition: "D", heavy_equipment: "D",
};
// 세부 항목이 카테고리 기본과 다른 그룹인 것 — 사업장청소(외벽·고소) · 누수탐지공사는 세부 항목마다 갈린다
// 옛 전문청소를 넷으로 나누며(대표 11/03) 특수 · 화재청소는 특수청소 카테고리 기본 B 로 옮겼다
export const SUB_GROUP = {
  business_cleaning: { "외벽.고소청소": "D" },
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
// 면책사항 — 맨 앞 '미등재 사고' 추가 · 화재배상책임 끝 문장 삭제 (대표 리뷰 11/02)
export const EXCLUDE = [
  ["미등재 사고", "홈프로에 등록(셀프등록)하지 않은 작업 중 일어난 사고는 보상하지 않습니다."],
  ["화재배상책임", "전기공사 합선, 에어컨 설치 중 용접, 보일러 작업으로 인한 화재는 보상되지 않습니다."],
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
// 상품 정보 — 보험 탭 메인 비주얼 아래 · 가입 3단계 결제 내용이 같이 쓴다 (대표 리뷰 11/02 "적당한 곳에")
export const PRODUCT_INFO = {
  name: "홈프로 도급배상책임보험",
  kind: "영업배상책임보험 (도급업자 특별약관 부가)",
  cover: "보장 항목: 시설·작업 중 사고, 완성작업(시공 하자), 작업현장 내 재물손해(EPD)",
};

/* 가입 2단계 '고지 및 면책 동의' (대표 리뷰 10/29 · 11/02 두 번 올라온 원문을 합친 것)
 *  DISCLOSURE: 사전 알릴 의무 Q1~Q5 — opts[0] 이 대표 원문의 (●) 기본값
 *  block: 고르면 가입 진행 불가 · warn: 붉은 경고 · info: 안내만 */
export const DISCLOSURE = [
  { id: "q1", q: "실제 현장에서 수행하는 작업과 선택하신 가입 그룹이 일치합니까?", def: "yes",
    opts: [["yes", "예, 일치합니다"], ["no", "아니오", "누수공사 병행 시 C그룹으로 변경 필요"]] },
  { id: "q2", q: "최근 3년 이내 작업 중 사고로 보험금을 타거나 100만 원 이상 배상한 이력이 있습니까?", def: "none",
    opts: [["none", "없음 (0건)"], ["few", "1~2건 있음"], ["many", "3건 이상 있음", "1:1 보상심사 필요"]] },
  { id: "q3", q: "작업 수행 시 보조 작업자 등 2인 이상이 함께 투입되는 현장이 있습니까?", def: "no",
    opts: [["yes", "예"], ["no", "아니오 (단독 작업 위주)"]],
    note: "2인 이상 작업 시, 참여하는 작업자 전원이 각각 가입되어 있어야 해당 작업자의 과실 사고가 보장됩니다." },
  { id: "q4", q: "가스, 전기, 보일러 등 법률상 면허·자격이 필요한 작업을 수행하십니까?", def: "none",
    opts: [["licensed", "예 (유효한 면허/자격 소지 중)"], ["none", "해당 없음 (일반 청소/세척/배관 작업)"], ["unlicensed", "예 (면허 미소지)"]] },
  { id: "q5", q: "현장 작업 시 [작업 전/후 사진 등록] 및 [GPS 체크인]을 이행하시겠습니까?", def: "yes",
    opts: [["yes", "예, 빠짐없이 이행하겠습니다", "담보개시 필수조건"], ["no", "아니오"]] },
];
export const DISCLOSURE_DEFAULT = Object.fromEntries(DISCLOSURE.map((d) => [d.id, d.def]));
export const DISCLOSURE_TEXT = {
  q2few: "최근 3년 내 사고 접수 1회 이상 발생 파트너는 1:1 심사 후 가입이 진행됩니다.",
  q2many: "최근 3년 내 사고 이력이 3건 이상인 파트너는 손보사 인수 심사 대상입니다. 1:1 문의로 연결합니다.",
  q4unlicensed: "무면허 시공 사고는 보상 불가",
  q5no: "미이행 시 사고 접수가 거절될 수 있습니다",
};
/** 고지 답변 한 줄 요약 (내 보험 고지 · 동의 내역) */
export const answerLabel = (qid, v) => DISCLOSURE.find((d) => d.id === qid)?.opts.find((o) => o[0] === v)?.[1] || "-";

/* B. 필수 면책 및 보장 조건 확인 · C. 약관 동의 — 전부 필수 (b5 는 대표 원문 [확인]이지만 '모두 동의 필요'라 필수로 센다)
 *  b4 자기부담금: 대표 원문은 제목 10만 원 · 본문 30만 원으로 어긋나 DEDUCT 값으로 적는다 */
const deductText = () => DEDUCT.map(([k, v]) => `${k.replace(/ · /g, "/")} ${v.replace("만원", "만 원")}`).join(" · ");
export const CONSENTS = [
  { id: "b1", sec: "B", tag: "필수", title: "작업 대상물 자체 면책 동의", body: "청소 중인 에어컨 본체/PCB 쇼트, 교체 중인 배관 파손 등 '작업 대상물 자체' 손해는 면책사항(보상 불가)임을 확인하고 동의합니다." },
  { id: "b2", sec: "B", tag: "필수", title: "1인당 보험료 및 다인 작업 개별 가입 동의", body: "본 보험료는 1인 기준이며, 2인 이상 공동 작업 시 투입 인원 전원이 각자 보험에 가입되어 있어야 해당 작업자의 보장이 가능함을 확인합니다." },
  { id: "b3", sec: "B", tag: "필수", title: "사고 이력 및 손해율에 따른 개인별 보험료 할증 안내", body: "누적 사고 이력 및 파트너 전체 발생손해율(60% 이상)에 따라 차기 갱신 시 개인별 보험료가 할증되거나 조건이 변경될 수 있음을 확인합니다." },
  { id: "b4", sec: "B", tag: "필수", title: "1사고당 자기부담금 적용 동의", body: `사고 발생 시 손해액 중 자기부담금(${deductText()})은 홈프로(기사) 본인 부담임을 확인합니다.` },
  { id: "b5", sec: "B", tag: "확인", title: "아랫집 누수 대물 1,000만 원 정상 보장 확인", body: "아랫집 천장·도배 누수 등 현장 밖 제3자 손해는 면책이 적용되지 않으며 대물배상 1,000만 원 한도 내에서 보상 됨을 확인합니다." },
  { id: "c1", sec: "C", tag: "필수", title: "영업배상책임보험(도급업자 특약) 단체 규약 및 약관 전체 동의", view: "terms" },
  { id: "c2", sec: "C", tag: "필수", title: "개인정보 제3자 제공 동의 (원수 손해보험사 제출용)", view: "privacy" },
];
export const PRIVACY_ROWS = [
  ["제공받는 자", "원수 손해보험사 (보험 인수사) 및 보험대리점"],
  ["제공 목적", "보험 인수 심사 · 계약 체결 · 사고 접수 및 보상 처리"],
  ["제공 항목", "이름 · 연락처 · 사업자 정보 · 가입 그룹 · 고지 답변 · 작업(오더) 등재 · 체크인 기록"],
  ["보유 기간", "보험 계약 종료 후 관계 법령이 정한 기간까지"],
];

export const groupPriceText = (n) => `${Number(n || 0).toLocaleString("ko-KR")}원`;
