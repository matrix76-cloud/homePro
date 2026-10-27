/* eslint-disable */
/**
 * 배상책임보험 새 화면 시안 — /lab?tab=insurance (대표 10/26 리뷰 16건)
 *   소개 · 가입 1~3단계 · 가입 후 관리를 화면(묶음)마다 후보로 나눴다. 묶음마다 따로 고른다.
 *   문구는 대표 기획안 그대로 두고, 기획안의 이모지는 같은 뜻의 선 아이콘으로 바꿨다.
 *   폰 폭 390 실측 크기, 머리줄 · 아래 고정 버튼까지 같이 그린다.
 */
import React from "react";
import {
  IoChevronBack, IoShieldCheckmarkOutline, IoCardOutline, IoChatbubbleEllipsesOutline, IoAlertCircleOutline,
  IoChevronForward, IoChevronDown, IoCheckmark, IoDocumentTextOutline, IoRibbonOutline, IoSettingsOutline,
  IoCameraOutline, IoCallOutline, IoHomeOutline, IoWaterOutline, IoConstructOutline, IoCloseCircleOutline,
  IoPersonOutline, IoLockClosedOutline, IoDownloadOutline,
} from "react-icons/io5";

const P = "#00963F";
const P_BTN = "#00963F";
const P_TINT = "#E6F7EE";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";
const SOFT = "#F7F8FA";
const RED = "#C62828";

/* ── 데이터 (대표 기획안 10/26) ── */
const GROUPS = [
  { id: "A", price: "5,900", cats: "생활청소, 정리수거, 방충망·열쇠 출장, 단순 소모품 교체", note: "누수 및 대형 재물 손상 위험이 없는 단순 케어 작업" },
  { id: "B", price: "7,900", cats: "에어컨 분해청소/세척, 하수구·배관 뚫음, 입주청소, 줄눈·탄성", note: "세척수 유출 및 배관 작업 누수 리스크 완벽 커버", rec: true },
  { id: "C", price: "18,000", cats: "에어컨 설치/이전, 욕실·주방 부분시공, 타일·방수, 보일러", note: "배관 결속 및 타구작업 등 부분 시공 리스크 커버" },
  { id: "D", price: "37,000", cats: "종합 인테리어, 철거 공사, 외벽/지붕 방수, 고소 장비 작업", note: "종합 철거 및 중대 제3자 재물 손해 방어" },
];
const LIMITS = [
  ["대인 배상", "1억 원", "고객·제3자 신체 상해 사고"],
  ["대물 배상", "1,000만 원", "아랫집 누수·도배·천장 피해 (제3자)"],
  ["물적확대 (EPD)", "500만 원", "작업 현장 내 손님 집 마루·가구 파손"],
  ["파트너 연간 총한도", "1억 원", "1인당 1년 보상 총액"],
];
const DEDUCT = [["일반 작업", "30만원"], ["사다리차 · 스카이카 작업", "50만원"], ["이사 관련 작업", "100만원"]];
const SCOPE = [
  { n: 1, title: "작업 대상물 자체", res: "면책 (보상 불가)", ok: false, ex: "청소 중인 에어컨 본체/PCB 쇼트, 교체 중인 배관 파손", icon: IoConstructOutline },
  { n: 2, title: "작업 현장 내부 재물", res: "EPD 500만 원 한도 보상", ok: true, ex: "장비 이동 중 긁힌 손님 집 마루, 세척제가 튄 고가 가구·소파", icon: IoHomeOutline },
  { n: 3, title: "작업 현장 밖 제3자 재물", res: "대물 1,000만 원 한도 보상", ok: true, ex: "세척수 유출 / 배관 터짐으로 인한 아랫집 천장·도배 누수 피해", icon: IoWaterOutline },
];
const START_REQ = [
  ["구독 유효", "해당 그룹의 월 구독이 가입되어 있고 보험료가 완납 상태일 것"],
  ["앱 체크인", "GPS 좌표와 시각이 기록된 상태로 앱에서 체크인할 것"],
  ["작업 전 사진 등록", "현장 상태 사진을 등록할 것. 사다리차·스카이카는 장비 세팅 사진을 포함"],
];
const NOT_COVERED = [
  "앱에 등재하지 않고 수행한 작업 — 플랫폼을 통해 받은 일감이든 개인적으로 받은 일감이든 동일합니다.",
  "사고가 발생한 뒤에 앱에 등재한 작업 — 작업 전 사진이 존재할 수 없으므로 소급 등재는 확인됩니다.",
  "구독하지 않은 그룹의 작업 — 예를 들어 A그룹만 구독한 파트너가 전기공사를 수행한 경우.",
  "도로 운행 중 발생한 사고 — 자동차보험(건설기계 의무보험 포함)에서 처리됩니다.",
];
const EXCLUDE = [
  ["화재배상책임", "전기공사 합선, 에어컨 설치 중 용접, 보일러 작업으로 인한 화재는 보상되지 않습니다."],
  ["파트너 본인 및 소속 작업자의 상해", "작업 중 파트너 본인이나 함께 일한 일용 작업자가 다친 경우는 보상되지 않습니다."],
  ["구조물의 붕괴 · 폭발 · 지하매설물 손상", "철거·종합리모델링·배관공사에서 건물 구조에 발생하는 손해는 제외됩니다."],
  ["분진 및 소음", "철거·리모델링 시 인접세대의 분진·소음 민원은 제외됩니다."],
  ["오염", "해충방역 살충제, 특수청소 약품, 폐기물 처리 과정의 오염·악취·인체 반응은 제외됩니다."],
  ["진단·점검 오류", "누수탐지 오진으로 불필요한 공사를 하게 된 경우의 손해는 제외됩니다."],
  ["작업 대상물 자체", "시공한 부분 자체를 다시 시공하는 비용은 보상되지 않습니다."],
  ["계약상 가중책임", "약정으로 법률상 책임을 넘어 부담하기로 한 부분은 제외됩니다."],
  ["기타", "고의사고 · 전쟁 및 테러 · 석면·규사·납 · 곰팡이 · 사이버 · 감염병 등"],
];

/* ── 공통 틀 ── */
const Phone = ({ title, children, bottom, bg = SOFT }) => (
  <div style={{ width: 390, border: `1px solid ${LINE}`, background: bg, boxSizing: "border-box", display: "flex", flexDirection: "column", fontFamily: "inherit" }}>
    <div style={{ height: 56, background: "#fff", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", gap: 6, padding: "0 12px", flexShrink: 0 }}>
      <IoChevronBack size={24} color={TXT} />
      <span style={{ fontSize: 18, fontWeight: 600, color: TXT }}>{title}</span>
    </div>
    <div style={{ flex: 1, padding: "16px 18px 22px", display: "flex", flexDirection: "column", gap: 14 }}>{children}</div>
    {bottom && <div style={{ background: "#fff", borderTop: `1px solid ${LINE}`, padding: "12px 18px 16px", flexShrink: 0 }}>{bottom}</div>}
  </div>
);
const Box = ({ children, style }) => <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: 16, ...style }}>{children}</div>;
const H = ({ icon: I, children, sub }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 600, color: TXT }}>{I && <I size={22} color={P} />}{children}</div>
    {sub && <div style={{ fontSize: 14, color: SUB, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
  </div>
);
const Btn = ({ children, ghost, small, style }) => (
  <div style={{ height: small ? 46 : 54, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: small ? 15 : 17, fontWeight: 600,
    background: ghost ? "#fff" : P_BTN, color: ghost ? TXT : "#fff", border: ghost ? `1px solid ${LINE}` : "none", ...style }}>{children}</div>
);
const Row = ({ k, v, sub, last }) => v === "" ? (
  /* 값 없이 설명만 있는 줄 — 이름 아래에 설명을 전폭으로 */
  <div style={{ padding: "11px 0", borderBottom: last ? "none" : `1px solid #EEF0F3` }}>
    <div style={{ fontSize: 15, color: TXT, fontWeight: 600 }}>{k}</div>
    <div style={{ fontSize: 14, color: SUB, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>
  </div>
) : (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 0", borderBottom: last ? "none" : `1px solid #EEF0F3` }}>
    <span style={{ fontSize: 15, color: SUB, flexShrink: 0 }}>{k}</span>
    <span style={{ fontSize: 15, color: TXT, textAlign: "right", fontWeight: 500 }}>{v}{sub && <div style={{ fontSize: 13, color: SUB, fontWeight: 400, marginTop: 2 }}>{sub}</div>}</span>
  </div>
);
const Txt = ({ children, style }) => <div style={{ fontSize: 15, color: SUB, lineHeight: 1.6, ...style }}>{children}</div>;
const Img = ({ src }) => <img src={src} alt="지금 화면" style={{ width: 390, display: "block", border: `1px solid ${LINE}` }} />;

/* 메인 비주얼 — 옅은 그라디언트 + 왼쪽 글 + 오른쪽 방패 그림 (전역 규칙: 글씨 띠 대신 그림 있는 배너) */
const Shield = ({ size = 96 }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" fill="none">
    <path d="M48 8 L80 20 V44 C80 66 66 80 48 88 C30 80 16 66 16 44 V20 Z" fill="#fff" stroke={P} strokeWidth="3" />
    <path d="M48 18 L71 27 V45 C71 61 61 72 48 78 C35 72 25 61 25 45 V27 Z" fill={P_TINT} />
    <path d="M36 47 l8 8 l16 -18" stroke={P} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    <text x="48" y="70" textAnchor="middle" fontSize="11" fontWeight="700" fill={P}>1억</text>
  </svg>
);
const Hero = ({ compact }) => (
  <div style={{ borderRadius: 10, padding: compact ? "18px 16px" : "22px 18px", background: "linear-gradient(135deg, #EAF7EF 0%, #F6FBF8 60%, #FFFFFF 100%)", border: `1px solid #D5EBDD`, display: "flex", gap: 10, alignItems: "center" }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: compact ? 19 : 21, fontWeight: 700, color: TXT, lineHeight: 1.4, wordBreak: "keep-all" }}>월 5,900원으로 지키는<br />현장 재물 사고 걱정 끝!</div>
      {!compact && <div style={{ fontSize: 14, color: SUB, marginTop: 8, lineHeight: 1.55, wordBreak: "keep-all" }}>하루 100원대로 '1억 배상책임 가입 업체' 타이틀 달고 고객 신뢰와 견적 수주율을 올리세요.</div>}
    </div>
    <Shield size={compact ? 80 : 96} />
  </div>
);
const PriceLine = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, color: TXT, padding: "12px 14px", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8 }}>
    <IoCardOutline size={20} color={P} />
    <span><b style={{ fontWeight: 600 }}>월 5,900원~</b> · 카드 1회 등록 시 매월 자동 정기결제 · 보장 연속 유지</span>
  </div>
);
const LimitTable = () => (
  <Box>
    <H icon={IoShieldCheckmarkOutline}>보상 한도 요약 (1사고당)</H>
    {LIMITS.map(([k, v, d], i) => <Row key={k} k={k} v={v} sub={d} last={i === LIMITS.length - 1} />)}
  </Box>
);
const DeductTable = () => (
  <Box>
    <H sub="사고 1건마다 손해액에서 공제한 뒤 보험금이 지급됩니다. 예: 손해액 80만원인 일반 작업 사고는 50만원 지급.">자기부담금 (1사고당)</H>
    {DEDUCT.map(([k, v], i) => <Row key={k} k={k} v={v} last={i === DEDUCT.length - 1} />)}
  </Box>
);
const ScopeList = () => (
  <Box>
    <H sub="수탁물 면책 및 3단계 재물손해 보상 경로">작업 중 사고, 보상 범위가 어떻게 되나요?</H>
    {SCOPE.map((s) => (
      <div key={s.n} style={{ display: "flex", gap: 12, padding: "12px 0", borderTop: `1px solid #EEF0F3` }}>
        <div style={{ width: 44, height: 44, borderRadius: 8, background: s.ok ? P_TINT : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <s.icon size={24} color={s.ok ? P : "#6B7280"} />
        </div>
        <div>
          <div style={{ fontSize: 15, fontWeight: 600, color: TXT }}>[{s.n}] {s.title}</div>
          <div style={{ fontSize: 15, color: s.ok ? P : RED, fontWeight: 600, marginTop: 2 }}>{s.res}</div>
          <div style={{ fontSize: 14, color: SUB, marginTop: 4, lineHeight: 1.5 }}>예: {s.ex}</div>
        </div>
      </div>
    ))}
    <Txt style={{ fontSize: 14, marginTop: 4 }}>약관 명기 특약: "아랫집 누수 등 현장 밖 제3자 손해는 면책을 적용하지 않으며, 대물배상 1,000만 원 한도에서 전액 정상 보상합니다."</Txt>
  </Box>
);
const GroupPrices = ({ grid }) => (
  <Box>
    <H sub="복수 업종 수행 시 가장 위험도가 높은 상위 그룹으로 가입합니다.">업종별 월 요금</H>
    {grid ? (
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {GROUPS.map((g) => (
          <div key={g.id} style={{ border: `1px solid ${g.rec ? P : LINE}`, borderRadius: 8, padding: "12px 12px" }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: TXT }}>{g.id}그룹{g.rec && <span style={{ color: P, fontSize: 13, marginLeft: 6 }}>대표 업종</span>}</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: g.rec ? P : TXT, marginTop: 4 }}>월 {g.price}원</div>
            <div style={{ fontSize: 13, color: SUB, marginTop: 6, lineHeight: 1.45, wordBreak: "keep-all" }}>{g.cats}</div>
          </div>
        ))}
      </div>
    ) : GROUPS.map((g, i) => <Row key={g.id} k={`${g.id}그룹`} v={`월 ${g.price}원`} sub={g.cats} last={i === GROUPS.length - 1} />)}
  </Box>
);
const StartCond = () => (
  <Box>
    <H>보장 개시 조건 및 약관</H>
    <Txt>카드 결제 완료 후, 앱에서 작업 전/후 사진 등록 · GPS 체크인 · 체크아웃을 한 작업에 적용됩니다.</Txt>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 10, fontSize: 15, color: TXT }}>
      <span style={{ display: "flex", alignItems: "center", gap: 6 }}><IoDocumentTextOutline size={20} color={P} /> 도급업자 배상책임보험 약관 전문 보기</span>
      <IoChevronForward size={18} />
    </div>
  </Box>
);
const StickyBar = () => (
  <div style={{ display: "flex", gap: 8 }}>
    <Btn ghost small style={{ flex: "0 0 74px", flexDirection: "column", gap: 0, fontSize: 13, height: 54 }}><IoChatbubbleEllipsesOutline size={20} />1:1 문의</Btn>
    <Btn ghost small style={{ flex: "0 0 74px", flexDirection: "column", gap: 0, fontSize: 13, height: 54, color: RED }}><IoAlertCircleOutline size={20} />사고접수</Btn>
    <Btn style={{ flex: 1 }}>카드 등록하고 1분 만에 가입</Btn>
  </div>
);
const Fold = ({ title, open, children }) => (
  <div style={{ borderTop: `1px solid #EEF0F3` }}>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 0", fontSize: 16, fontWeight: open ? 600 : 500, color: TXT }}>{title}<IoChevronDown size={20} style={{ transform: open ? "rotate(180deg)" : "none" }} /></div>
    {open && <div style={{ paddingBottom: 12 }}>{children}</div>}
  </div>
);

/* ── 가입 단계 공통 ── */
const Steps = ({ now }) => (
  <div style={{ display: "flex", border: `1px solid ${LINE}`, background: "#fff" }}>
    {["그룹 선택", "약관 동의", "카드 결제"].map((t, i) => (
      <div key={t} style={{ flex: 1, textAlign: "center", padding: "10px 4px", fontSize: 14, borderLeft: i ? `1px solid ${LINE}` : "none", background: i + 1 === now ? "#E9ECF1" : "#fff", fontWeight: i + 1 === now ? 600 : 400, color: TXT }}>{i + 1}. {t}</div>
    ))}
  </div>
);
const DoneStep = ({ label, value }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8 }}>
    <IoCheckmark size={20} color={P} />
    <span style={{ fontSize: 15, color: SUB }}>{label}</span>
    <span style={{ fontSize: 15, fontWeight: 600, color: TXT, flex: 1 }}>{value}</span>
    <span style={{ fontSize: 14, color: P }}>수정</span>
  </div>
);
const PartnerInfo = () => (
  <Box>
    <H icon={IoPersonOutline} sub="회원 정보에서 자동으로 채웠습니다.">파트너 기본 정보</H>
    <Row k="파트너명" v="홍길동 (010-1234-5678)" />
    <Row k="사업자등록번호" v="123-45-67890" />
    <Row k="등록 업종" v="에어컨 세척 / 배관" sub="추천 그룹: B그룹" last />
  </Box>
);
const GroupRadio = ({ g, on, big }) => (
  <div style={{ background: "#fff", border: `${on ? 1.5 : 1}px solid ${on ? P : LINE}`, borderRadius: 8, padding: big ? "16px 16px" : "14px 14px", display: "flex", gap: 12 }}>
    <div style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${on ? P : "#9CA3AF"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
      {on && <div style={{ width: 11, height: 11, borderRadius: "50%", background: P }} />}
    </div>
    <div style={{ flex: 1 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: TXT }}>{g.id}그룹{g.rec && <span style={{ fontSize: 13, color: P, marginLeft: 6, fontWeight: 600 }}>대표 업종 추천</span>}</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: on ? P : TXT }}>월 {g.price}원</span>
      </div>
      <div style={{ fontSize: 14, color: SUB, marginTop: 6, lineHeight: 1.5, wordBreak: "keep-all" }}>{g.cats}</div>
      <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>{g.note}</div>
    </div>
  </div>
);
const Check = ({ on, children }) => (
  <div style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, color: TXT, lineHeight: 1.5 }}>
    <div style={{ width: 22, height: 22, borderRadius: 4, border: `1.5px solid ${on ? P : "#9CA3AF"}`, background: on ? P : "#fff", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 1 }}>{on && <IoCheckmark size={16} color="#fff" />}</div>
    <span>{children}</span>
  </div>
);
const Field = ({ label, ph }) => (
  <div>
    <div style={{ fontSize: 14, color: SUB, marginBottom: 6 }}>{label}</div>
    <div style={{ height: 48, border: `1px solid ${LINE}`, borderRadius: 8, background: "#fff", display: "flex", alignItems: "center", padding: "0 12px", fontSize: 15, color: "#9CA3AF" }}>{ph}</div>
  </div>
);
const Certificate = () => (
  <Box>
    <H icon={IoRibbonOutline}>내 가입 보장 증서</H>
    <Row k="파트너명" v="홍길동 (B그룹)" />
    <Row k="보장 기간" v="2026.10.26 ~ 2026.11.25" sub="매월 자동 갱신" />
    <Row k="보장 한도" v="대인 1억 / 대물 1,000만 / EPD 500만" sub="자기부담금 일반 30만원" />
    <Row k="다음 결제일" v="2026.11.26 (7,900원)" last />
  </Box>
);
const DoneHead = () => (
  <div style={{ textAlign: "center", padding: "10px 0 4px" }}>
    <div style={{ width: 64, height: 64, borderRadius: "50%", background: P_TINT, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 10px" }}><IoCheckmark size={36} color={P} /></div>
    <div style={{ fontSize: 21, fontWeight: 700, color: TXT }}>가입이 완료되었습니다</div>
    <Txt style={{ marginTop: 6, textAlign: "center" }}>오늘부터 현장 사고 위험 없이 안전하게 작업하세요.</Txt>
  </div>
);

/* ── 묶음별 후보 ── */
export const InsuranceGroups = [
  {
    key: "insurance-intro", group: "1. 소개 화면 (가입 전)",
    items: [
      { no: 0, name: "지금 화면", note: "건당 · 월 · 1년 세 가지 유형을 고르는 화면입니다. 기획안대로면 월 정기결제 하나만 남습니다.", render: () => <Img src="/lab/ins_now_intro.png" /> },
      {
        no: 1, name: "기획안 순서 그대로", note: "배너 → 보상 한도 → 보상 범위 3단계 → 업종별 요금 → 보장 개시 조건. 아래 고정 줄에 1:1 문의 · 사고접수 · 가입 버튼.",
        render: () => (
          <Phone title="홈프로 도급업자 배상책임보험" bottom={<StickyBar />}>
            <Hero /><PriceLine /><LimitTable /><DeductTable /><ScopeList /><GroupPrices /><StartCond />
          </Phone>
        ),
      },
      {
        no: 2, name: "요금 먼저 · 자세한 건 접기", note: "배너 바로 밑에 그룹 요금을 2×2 칸으로 비교하고, 한도 · 범위 · 자기부담금 · 조건은 눌러서 펼칩니다. 화면이 가장 짧습니다.",
        render: () => (
          <Phone title="홈프로 도급업자 배상책임보험" bottom={<StickyBar />}>
            <Hero compact /><GroupPrices grid />
            <Box style={{ paddingTop: 2, paddingBottom: 2 }}>
              <Fold title="보상 한도 (1사고당)" open>{LIMITS.map(([k, v, d], i) => <Row key={k} k={k} v={v} sub={d} last={i === LIMITS.length - 1} />)}</Fold>
              <Fold title="보상 범위 3단계" />
              <Fold title="자기부담금" />
              <Fold title="보장 개시 조건 · 약관 전문" />
            </Box>
          </Phone>
        ),
      },
      {
        no: 3, name: "탭으로 나누기", note: "배너 아래를 [보상 한도 | 보상 범위 | 요금] 탭으로 나눠, 한 번에 한 가지만 보입니다. 탭 하나에 기능 하나.",
        render: () => (
          <Phone title="홈프로 도급업자 배상책임보험" bottom={<StickyBar />}>
            <Hero /><PriceLine />
            <div style={{ display: "flex", border: `1px solid ${LINE}`, background: "#fff" }}>
              {["보상 한도", "보상 범위", "요금"].map((t, i) => <div key={t} style={{ flex: 1, textAlign: "center", padding: "12px 0", fontSize: 15, borderLeft: i ? `1px solid ${LINE}` : "none", background: i === 0 ? "#E9ECF1" : "#fff", fontWeight: i === 0 ? 600 : 400 }}>{t}</div>)}
            </div>
            <LimitTable /><DeductTable />
          </Phone>
        ),
      },
    ],
  },
  {
    key: "insurance-step1", group: "2. 가입 1단계 — 그룹 선택",
    items: [
      {
        no: 1, name: "기획안 그대로", note: "위에 1 · 2 · 3 단계 표시, 파트너 정보 → 그룹 네 개 → 고른 요율 → [다음 단계로].",
        render: () => (
          <Phone title="가입하기 (1/3 단계)" bottom={<Btn>다음 단계로 (약관 동의)</Btn>}>
            <Steps now={1} /><PartnerInfo />
            <H sub="복수 업종 수행 시 가장 위험도가 높은 상위 그룹으로 가입하셔야 합니다.">작업 업종에 맞는 가입 그룹을 선택하세요</H>
            {GROUPS.map((g) => <GroupRadio key={g.id} g={g} on={g.rec} />)}
            <Box><H icon={IoCardOutline}>선택한 요율 정보</H><Row k="선택 그룹" v="B그룹" sub="가전분해 청소 / 배관하수구" /><Row k="월 정기결제 금액" v="7,900원 (VAT 포함)" last /></Box>
          </Phone>
        ),
      },
      {
        no: 2, name: "한 화면에 질문 하나", note: "단계 표시 없이 질문만. 추천 그룹이 맨 위에 오고, 그룹을 누르면 바로 약관 단계로 넘어갑니다(다음 버튼 없음). 파트너 정보는 결제 단계에서 확인.",
        render: () => (
          <Phone title="가입하기">
            <div style={{ fontSize: 21, fontWeight: 700, color: TXT, lineHeight: 1.4 }}>어떤 일을 주로 하시나요?</div>
            <Txt>등록 업종(에어컨 세척 / 배관)으로 B그룹을 추천합니다. 여러 업종을 하시면 가장 위험한 쪽 그룹으로 가입해 주세요.</Txt>
            {[GROUPS[1], GROUPS[0], GROUPS[2], GROUPS[3]].map((g) => <GroupRadio key={g.id} g={g} on={false} big />)}
          </Phone>
        ),
      },
    ],
  },
  {
    key: "insurance-step2", group: "3. 가입 2단계 — 약관 · 면책 동의",
    items: [
      {
        no: 1, name: "기획안 그대로 (표로 길게)", note: "담보 개시 요건 · 담보되지 않는 경우 · 면책 표를 모두 펼쳐 두고 맨 아래에서 한 번에 동의합니다.",
        render: () => (
          <Phone title="가입하기 (2/3 단계)" bottom={<Btn>약관 동의하고 카드 결제하기</Btn>}>
            <Steps now={2} />
            <Box>
              <H sub="이 보험은 파트너에게 붙는 것이 아니라 앱에 등재된 작업에 붙습니다. 아래 세 가지가 작업 시작 전에 순서대로 완료되어야 담보가 개시됩니다.">보장 조건 및 면책사항 확인 (필수)</H>
              {START_REQ.map(([k, v], i) => <Row key={k} k={`${["①", "②", "③"][i]} ${k}`} v="" sub={v} last={i === 2} />)}
              <Txt style={{ fontSize: 14, marginTop: 6 }}>담보는 체크아웃 시점에 종료됩니다.</Txt>
            </Box>
            <Box><H>담보되지 않는 경우</H>{NOT_COVERED.map((t) => <Txt key={t} style={{ fontSize: 14, padding: "6px 0" }}>· {t}</Txt>)}</Box>
            <Box><H sub="파트너가 보장된다고 오인하기 쉬운 항목을 앞쪽에 두었습니다.">담보하지 않는 손해 (면책사항)</H>{EXCLUDE.map(([k, v], i) => <Row key={k} k={k} v="" sub={v} last={i === EXCLUDE.length - 1} />)}<Txt style={{ fontSize: 14, marginTop: 6 }}>작업자에 의한 고객 귀중품 절도는 고의사고로 면책입니다.</Txt></Box>
            <Check on>위 보장 조건과 면책사항을 모두 확인했습니다</Check>
          </Phone>
        ),
      },
      {
        no: 2, name: "세 줄 확인 체크", note: "세 묶음을 줄 하나씩으로 접고, 펼쳐 읽은 뒤 줄마다 체크합니다. 셋 다 체크해야 버튼이 켜집니다. 면책을 '읽었다'는 기록이 남습니다.",
        render: () => (
          <Phone title="가입하기 (2/3 단계)" bottom={<Btn>약관 동의하고 카드 결제하기</Btn>}>
            <DoneStep label="그룹" value="B그룹 · 월 7,900원" />
            <div style={{ fontSize: 19, fontWeight: 700, color: TXT, marginTop: 4 }}>보장 조건을 확인해 주세요</div>
            <Txt>이 보험은 앱에 등재된 작업에 붙습니다. 작업 시작 전에 체크인과 사진 등록이 끝나야 보장됩니다.</Txt>
            <Box style={{ paddingTop: 4, paddingBottom: 4 }}>
              <Fold title={<Check on>담보 개시 요건 3가지</Check>} open>{START_REQ.map(([k, v], i) => <Txt key={k} style={{ fontSize: 14, padding: "4px 0" }}>{["①", "②", "③"][i]} {k} — {v}</Txt>)}</Fold>
              <Fold title={<Check on>담보되지 않는 경우 4가지</Check>} />
              <Fold title={<Check>면책사항 9가지 (화재 · 본인 상해 등)</Check>} />
            </Box>
          </Phone>
        ),
      },
    ],
  },
  {
    key: "insurance-step3", group: "4. 가입 3단계 — 카드 결제 · 가입 완료",
    items: [
      {
        no: 1, name: "기획안 그대로 (카드 번호 직접 입력)", note: "앱 화면에서 카드 번호 · 유효기간 · 생년월일 · 비밀번호 앞 2자리를 받습니다. 단, 카드 정보를 앱이 직접 받으려면 카드사 보안 심사가 따로 필요해 실제로는 권하지 않습니다.",
        render: () => (
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Phone title="가입하기 (3/3 단계)" bottom={<Btn>결제 및 가입 완료</Btn>}>
              <Steps now={3} />
              <Box><H icon={IoCardOutline}>월 정기결제 카드 정보 입력</H><Row k="결제 상품" v="도급배상책임보험 (B그룹)" /><Row k="월 결제 금액" v="7,900원" sub="매월 오늘 날짜에 자동 결제" last /></Box>
              <Field label="카드 번호" ph="0000 - 0000 - 0000 - 0000" />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}><Field label="유효 기간" ph="MM / YY" /><Field label="카드 비밀번호" ph="앞 2자리" /></div>
              <Field label="생년월일 (법인카드는 사업자번호 10자리)" ph="YYMMDD" />
              <Check on>매월 7,900원 정기 자동결제 이용 약관 동의</Check>
            </Phone>
            <Phone title="가입 완료" bottom={<Btn>보험 홈으로 이동</Btn>}>
              <DoneHead /><Certificate />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><Btn ghost small><IoDownloadOutline size={18} />가입업체 마크</Btn><Btn ghost small><IoDocumentTextOutline size={18} />가입 증명서</Btn></div>
            </Phone>
          </div>
        ),
      },
      {
        no: 2, name: "토스 카드 등록 창으로 넘기기 (추천)", note: "결제 요약과 동의만 앱에서 받고, 카드 정보는 이미 붙어 있는 토스페이먼츠 정기결제 창에서 입력합니다. 카드 정보가 홈프로 서버에 남지 않습니다.",
        render: () => (
          <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
            <Phone title="가입하기 (3/3 단계)" bottom={<Btn>카드 등록하고 가입 완료</Btn>}>
              <DoneStep label="그룹" value="B그룹 · 월 7,900원" /><DoneStep label="약관" value="보장 조건 · 면책 확인" />
              <Box><H icon={IoCardOutline}>결제 내용</H><Row k="결제 상품" v="도급배상책임보험 (B그룹)" /><Row k="월 결제 금액" v="7,900원 (VAT 포함)" /><Row k="결제일" v="매월 오늘 날짜 자동 결제" /><Row k="가입자" v="홍길동 · 123-45-67890" last /></Box>
              <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8 }}>
                <IoLockClosedOutline size={22} color={P} style={{ flexShrink: 0 }} />
                <Txt style={{ fontSize: 14 }}>다음 화면(토스페이먼츠)에서 카드를 한 번 등록하면 매월 자동으로 결제됩니다. 카드 정보는 홈프로에 저장되지 않습니다.</Txt>
              </div>
              <Check on>매월 7,900원 정기 자동결제 이용 약관 동의</Check>
            </Phone>
            <Phone title="가입 완료" bottom={<Btn>보험 홈으로 이동</Btn>}>
              <DoneHead /><Certificate />
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}><Btn ghost small><IoDownloadOutline size={18} />가입업체 마크</Btn><Btn ghost small><IoDocumentTextOutline size={18} />가입 증명서</Btn></div>
            </Phone>
          </div>
        ),
      },
    ],
  },
  {
    key: "insurance-manage", group: "5. 가입 후 관리 (내 보험)",
    items: [
      { no: 0, name: "지금 화면", note: "지금 '내 보험' 화면입니다.", render: () => <Img src="/lab/ins_now_my.png" /> },
      {
        no: 1, name: "기획안 그대로", note: "위에 보장 상태 → 그룹 · 카드 · 다음 결제일 → 버튼 세 개(증명서 · 엠블럼 · 구독 관리) → 사고 대처 3단계 → 사고 접수 · 카카오톡 상담.",
        render: () => (
          <Phone title="내 배상책임보험 관리">
            <Box>
              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: P }}><IoShieldCheckmarkOutline size={24} />보장 중 (정상 유효)</div>
              <Txt style={{ marginTop: 6 }}>홍길동 파트너님은 현재 1억 배상책임보험 보장 중입니다.</Txt>
              <div style={{ marginTop: 6 }}>
                <Row k="가입 그룹" v="B그룹 (월 7,900원)" />
                <Row k="등록 카드" v={<>현대카드 (****-1234) <span style={{ color: P, marginLeft: 4 }}>변경</span></>} />
                <Row k="다음 결제일" v="2026.11.26 (7,900원)" last />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
                <Btn ghost small style={{ fontSize: 14, flexDirection: "column", height: 64, gap: 2 }}><IoDocumentTextOutline size={20} />가입 증명서</Btn>
                <Btn ghost small style={{ fontSize: 14, flexDirection: "column", height: 64, gap: 2 }}><IoRibbonOutline size={20} />홍보 엠블럼</Btn>
                <Btn ghost small style={{ fontSize: 14, flexDirection: "column", height: 64, gap: 2 }}><IoSettingsOutline size={20} />구독 관리</Btn>
              </div>
            </Box>
            <Box>
              <H icon={IoAlertCircleOutline}>현장 사고가 발생했나요?</H>
              {["사고 현장 및 파손 부위 사진 · 동영상 촬영", "피해 고객 연락처 및 아랫집 누수 여부 확인", "아래 [사고접수] 버튼을 눌러 파손 내역 제출"].map((t, i) => <Row key={t} k={`${i + 1}단계`} v={t} last={i === 2} />)}
              <Btn style={{ marginTop: 12, background: RED }}><IoAlertCircleOutline size={20} />사고 즉시 접수하기 (24시간)</Btn>
              <Btn ghost style={{ marginTop: 8 }}><IoChatbubbleEllipsesOutline size={20} />카카오톡 1:1 보상상담원 연결</Btn>
            </Box>
          </Phone>
        ),
      },
      {
        no: 2, name: "사고 접수 먼저 · 관리는 메뉴 줄", note: "사고가 났을 때 가장 먼저 찾는 버튼을 맨 위에 둡니다. 보장 상태는 한 줄 표, 관리 기능은 아이콘 + 이름 + 화살표 메뉴 줄로.",
        render: () => (
          <Phone title="내 보험">
            <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8 }}>
              <Shield size={56} />
              <div><div style={{ fontSize: 18, fontWeight: 700, color: P }}>보장 중</div><Txt style={{ fontSize: 14 }}>B그룹 · 다음 결제 11/26 (7,900원)</Txt></div>
            </div>
            <Btn style={{ background: RED }}><IoAlertCircleOutline size={20} />사고 즉시 접수하기 (24시간)</Btn>
            <Txt style={{ fontSize: 14 }}>사진 · 동영상을 먼저 찍고, 피해 고객 연락처와 아랫집 누수 여부를 확인한 뒤 접수해 주세요.</Txt>
            <Box style={{ padding: "4px 16px" }}>
              {[[IoCameraOutline, "사고 대처 3단계 보기"], [IoChatbubbleEllipsesOutline, "카카오톡 보상상담원 연결"], [IoDocumentTextOutline, "가입 증명서 발급"], [IoRibbonOutline, "홍보용 엠블럼 받기"], [IoCardOutline, "결제 카드 변경 · 현대카드 1234"], [IoSettingsOutline, "구독 관리 · 해지"]].map(([I, t], i, a) => (
                <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 0", borderBottom: i < a.length - 1 ? `1px solid #EEF0F3` : "none", fontSize: 16, color: TXT }}>
                  <I size={24} color={P} /><span style={{ flex: 1 }}>{t}</span><IoChevronForward size={18} color={SUB} />
                </div>
              ))}
            </Box>
          </Phone>
        ),
      },
    ],
  },
];

/* ── 탭 화면 — 묶음마다 고르기 줄 하나 (주제 key = 묶음 key) ── */
import { usePick, PickBar, PickButton } from "./LabPick";
const GroupBlock = ({ g }) => {
  const p = usePick(g.key);
  return (
    <div style={{ marginBottom: 34 }}>
      <div style={{ fontSize: 20, fontWeight: 700, margin: "6px 0 12px", paddingTop: 14, borderTop: `1px solid ${LINE}` }}>{g.group}</div>
      <PickBar p={p} />
      <div style={{ display: "flex", flexWrap: "wrap", gap: 18, alignItems: "flex-start" }}>
        {g.items.map((c) => (
          <div key={c.no} style={{ background: "#fff", border: `1px solid ${c.no === 0 ? TXT : LINE}`, padding: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, marginBottom: 4 }}>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{c.no}. {c.name}</div>
              <PickButton p={p} c={c} />
            </div>
            <div style={{ fontSize: 14, color: SUB, marginBottom: 14, lineHeight: 1.5, maxWidth: 390 * (c.render.length ? 1 : 1) + (g.key === "insurance-step3" ? 404 : 0) }}>{c.note}</div>
            {c.render()}
          </div>
        ))}
      </div>
    </div>
  );
};
export const InsuranceTab = () => (
  <>
    <div style={{ fontSize: 15, color: SUB, marginBottom: 18, lineHeight: 1.6 }}>
      대표님 기획안(10/26)의 배상책임보험 화면입니다. 소개 · 가입 1~3단계 · 가입 후 관리로 묶음을 나눴으니 묶음마다 [이걸로 고르기]를 눌러 주세요. 0번이 지금 화면입니다.
      기획안의 그림 문자는 같은 뜻의 선 아이콘으로 바꿨고, 결제는 월 정기결제만 둡니다(연간 · 건당 없음).
    </div>
    {InsuranceGroups.map((g) => <GroupBlock key={g.key} g={g} />)}
  </>
);
