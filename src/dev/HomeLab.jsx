/* eslint-disable */
/**
 * 홈 화면 시안 — /lab 의 "홈 화면" 탭.
 *   홈은 여러 섹션이 쌓여 만들어진다. 섹션마다 후보를 나란히 두어 섹션별로 고를 수 있게 했다. (대표 9/17)
 *   각 섹션의 0번이 지금 화면이다.
 */
import React from "react";

const P = "#00963F";
const P_DEEP = "#007A33";
const P_TINT = "#E6F7EE";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";
const MUTED = "#8A93A0";

const ORDERS = [
  { date: "08/19", state: "접수", way: "빠른", svc: "홈클리닝 이사청소", area: "서울 강남구", price: "시공금액 450,000원" },
  { date: "오늘", state: "대기", way: "지정", svc: "실내하수구 변기막힘", area: "대구 수성구", price: "현장견적" },
  { date: "07/31", state: "접수", way: "빠른", svc: "준공청소 기타", area: "경기 화성시", price: "잔금 400,000원" },
];

const Box = ({ children, pad = 0 }) => (
  <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", padding: pad, minHeight: 120 }}>{children}</div>
);
const StateText = ({ s }) => <span style={{ color: s === "접수" ? P_DEEP : MUTED, fontWeight: s === "접수" ? 700 : 500 }}>{s}</span>;

/* ───────── 섹션별 후보 ───────── */
export const HomeSections = [
  {
    group: "① 상단 (지역 · 차수 · 포인트)",
    items: [
      { no: 0, name: "현재", note: "지역 줄 아래에 차수와 포인트를 한 줄로 둡니다.", render: () => (
        <Box>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "#fff", fontSize: 16, fontWeight: 700 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: P, color: "#fff", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>홈</span>
            충남 논산시
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "9px 14px", background: "#fff", fontSize: 14, borderTop: `1px solid #F2F4F7` }}>
            <b>2차수 회원 · 구독</b><b style={{ color: P_DEEP }}>6,925P</b>
          </div>
        </Box>
      ) },
      { no: 1, name: "인사말 추가", note: "누구로 들어와 있는지 이름을 함께 보여 줍니다.", render: () => (
        <Box>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "#fff", fontSize: 16, fontWeight: 700 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: P, color: "#fff", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>홈</span>
            충남 논산시
          </div>
          <div style={{ padding: "12px 14px", background: "#fff", borderTop: `1px solid #F2F4F7` }}>
            <div style={{ fontSize: 17, fontWeight: 700, color: TXT }}>클린클린 사장님</div>
            <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>2차수 회원 · 구독 중 · 보유 6,925P</div>
          </div>
        </Box>
      ) },
      { no: 2, name: "포인트를 크게", note: "포인트를 눈에 띄게 두고 눌러서 내역으로 가게 합니다.", render: () => (
        <Box>
          <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 14px", background: "#fff", fontSize: 16, fontWeight: 700 }}>
            <span style={{ width: 26, height: 26, borderRadius: 8, background: P, color: "#fff", fontSize: 13, display: "flex", alignItems: "center", justifyContent: "center" }}>홈</span>
            충남 논산시
          </div>
          <div style={{ margin: "10px 12px", background: P, color: "#fff", padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 14 }}>보유 포인트</span><b style={{ fontSize: 22 }}>6,925P</b>
          </div>
        </Box>
      ) },
    ],
  },
  {
    group: "② 탭 줄 (오더목록 · 나의오더현황 · AI견적 · 보유자산)",
    items: [
      { no: 0, name: "현재", note: "네 개를 같은 폭으로 늘어놓고 선택된 탭에 밑줄을 둡니다.", render: () => (
        <Box>
          <div style={{ display: "flex", background: "#fff" }}>
            {["오더목록", "나의오더현황", "AI견적", "보유자산"].map((t, i) => (
              <div key={t} style={{ flex: i === 1 ? 1.6 : 1, textAlign: "center", padding: "12px 2px", fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? P_DEEP : MUTED, borderBottom: `2px solid ${i === 0 ? P : "transparent"}` }}>{t}</div>
            ))}
          </div>
        </Box>
      ) },
      { no: 1, name: "묶음 상자", note: "탭을 한 상자로 묶고 선택된 칸에 연회색을 깝니다.", render: () => (
        <Box pad={12}>
          <div style={{ display: "flex", border: `1px solid ${LINE}`, background: "#fff" }}>
            {["오더목록", "나의오더", "AI견적", "보유자산"].map((t, i) => (
              <div key={t} style={{ flex: 1, textAlign: "center", padding: "12px 2px", fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: TXT, background: i === 0 ? "#E9ECF1" : "#fff", borderLeft: i === 0 ? "none" : `1px solid ${LINE}` }}>{t}</div>
            ))}
          </div>
        </Box>
      ) },
      { no: 2, name: "두 줄로", note: "이름을 줄이지 않고 두 줄로 나눠 글자를 크게 둡니다.", render: () => (
        <Box pad={12}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
            {["오더목록", "나의오더현황", "AI견적", "보유자산"].map((t, i) => (
              <div key={t} style={{ textAlign: "center", padding: "12px 4px", fontSize: 15, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? "#fff" : TXT, background: i === 0 ? P : "#fff", border: `1px solid ${i === 0 ? P : LINE}` }}>{t}</div>
            ))}
          </div>
        </Box>
      ) },
    ],
  },
  {
    group: "③ 필터 줄",
    items: [
      { no: 0, name: "현재", note: "등록순·상태·거리·기간·카테고리를 작은 칩으로 늘어놓습니다.", render: () => (
        <Box pad={12}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["등록순", "상태", "거리", "기간", "카테고리", "마감·취소 숨김"].map((t, i) => (
              <span key={t} style={{ border: `1px solid ${i === 2 ? P : LINE}`, color: i === 2 ? P_DEEP : SUB, background: "#fff", padding: "6px 10px", fontSize: 13 }}>{t}</span>
            ))}
          </div>
        </Box>
      ) },
      { no: 1, name: "고른 것만 보이기", note: "평소엔 필터 버튼 하나만 두고, 고른 조건만 칩으로 보여 줍니다.", render: () => (
        <Box pad={12}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ border: `1px solid ${LINE}`, background: "#fff", padding: "8px 12px", fontSize: 14, fontWeight: 700 }}>필터</span>
            <span style={{ border: `1px solid ${P}`, color: P_DEEP, background: P_TINT, padding: "8px 12px", fontSize: 13 }}>내 동네 ×</span>
            <span style={{ fontSize: 13, color: SUB }}>3건</span>
          </div>
        </Box>
      ) },
      { no: 2, name: "자주 쓰는 것 먼저", note: "내 분야, 내 동네, 오늘 같은 단축 버튼을 앞에 둡니다.", render: () => (
        <Box pad={12}>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["내 분야", "내 동네", "오늘"].map((t) => (
              <span key={t} style={{ border: `1px solid ${P}`, color: "#fff", background: P, padding: "6px 12px", fontSize: 13, fontWeight: 700 }}>{t}</span>
            ))}
            {["상태", "기간", "더보기"].map((t) => (
              <span key={t} style={{ border: `1px solid ${LINE}`, color: SUB, background: "#fff", padding: "6px 10px", fontSize: 13 }}>{t}</span>
            ))}
          </div>
        </Box>
      ) },
    ],
  },
  {
    group: "④ 오더 목록",
    items: [
      { no: 0, name: "현재 (표)", note: "날짜·상태·요청방식·서비스를 표로 보여 줍니다. 많이 들어갑니다.", render: () => (
        <Box pad={12}>
          <div style={{ background: "#fff", border: `1px solid #EFF1F4` }}>
            <div style={{ display: "flex", background: "#2C3340", color: "#fff", fontSize: 12, padding: "8px 10px" }}>
              <span style={{ flex: 1 }}>날짜</span><span style={{ flex: 1 }}>상태</span><span style={{ flex: 1 }}>요청</span><span style={{ flex: 2 }}>서비스</span>
            </div>
            {ORDERS.map((o) => (
              <div key={o.svc} style={{ display: "flex", fontSize: 13, padding: "11px 10px", borderTop: `1px solid #F2F4F7`, color: TXT }}>
                <span style={{ flex: 1 }}>{o.date}</span><span style={{ flex: 1 }}><StateText s={o.state} /></span>
                <span style={{ flex: 1, color: SUB }}>{o.way}</span><span style={{ flex: 2 }}>{o.svc.slice(0, 8)}</span>
              </div>
            ))}
          </div>
        </Box>
      ) },
      { no: 1, name: "카드형", note: "한 건씩 카드로. 지역과 금액까지 보이고 누르기 쉽습니다.", render: () => (
        <Box pad={12}>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {ORDERS.map((o) => (
              <div key={o.svc} style={{ background: "#fff", border: `1px solid ${LINE}`, padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: SUB }}>
                  <span><StateText s={o.state} /> · {o.way}배정</span><span>{o.date}</span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: TXT, margin: "6px 0 4px" }}>{o.svc}</div>
                <div style={{ fontSize: 13, color: SUB }}>{o.area}</div>
                <div style={{ fontSize: 15, fontWeight: 700, color: P_DEEP, marginTop: 6 }}>{o.price}</div>
              </div>
            ))}
          </div>
        </Box>
      ) },
      { no: 2, name: "두 줄 목록", note: "표보다 글자를 키우고, 한 건을 두 줄로 보여 줍니다.", render: () => (
        <Box pad={12}>
          <div style={{ background: "#fff", border: `1px solid ${LINE}` }}>
            {ORDERS.map((o) => (
              <div key={o.svc} style={{ padding: "12px 12px", borderBottom: `1px solid #F2F4F7` }}>
                <div style={{ fontSize: 15, fontWeight: 700, color: TXT }}>{o.svc}</div>
                <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>
                  <StateText s={o.state} /> · {o.area} · {o.date} · {o.price}
                </div>
              </div>
            ))}
          </div>
        </Box>
      ) },
    ],
  },
  {
    group: "⑤ 목록 위 요약",
    items: [
      { no: 0, name: "현재 (없음)", note: "요약 없이 바로 목록이 나옵니다.", render: () => (
        <Box pad={12}><div style={{ fontSize: 14, color: SUB }}>요약 줄이 없습니다.</div></Box>
      ) },
      { no: 1, name: "오늘 들어온 건수", note: "오늘 새 오더와 내 분야 건수를 한 줄로 알려 줍니다.", render: () => (
        <Box pad={12}>
          <div style={{ background: P_TINT, border: `1px solid ${P}`, padding: "10px 12px", fontSize: 14, color: TXT }}>
            오늘 새로 올라온 오더 <b style={{ color: P_DEEP }}>3건</b> · 내 분야 <b style={{ color: P_DEEP }}>2건</b>
          </div>
        </Box>
      ) },
      { no: 2, name: "내 분야 오더 먼저", note: "내 분야 오더를 위에 따로 모아 주고 아래에 전체를 둡니다.", render: () => (
        <Box pad={12}>
          <div style={{ fontSize: 15, fontWeight: 700, color: TXT, marginBottom: 8 }}>내 분야 오더 2건</div>
          <div style={{ display: "flex", gap: 8 }}>
            {ORDERS.slice(0, 2).map((o) => (
              <div key={o.svc} style={{ flex: 1, background: "#fff", border: `1px solid ${P}`, padding: 10 }}>
                <div style={{ fontSize: 12, color: P_DEEP, fontWeight: 700 }}>{o.state} · {o.date}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: TXT, marginTop: 4 }}>{o.svc.slice(0, 8)}</div>
              </div>
            ))}
          </div>
        </Box>
      ) },
    ],
  },
  {
    group: "⑥ 예약접수 버튼",
    items: [
      { no: 0, name: "현재", note: "화면 오른쪽 아래에 떠 있는 작은 버튼입니다.", render: () => (
        <Box pad={12}>
          <div style={{ position: "relative", height: 90, background: "#fff", border: `1px solid ${LINE}` }}>
            <div style={{ position: "absolute", right: 12, bottom: 12, background: P, color: "#fff", padding: "10px 16px", fontSize: 14, fontWeight: 700 }}>+ 예약접수</div>
          </div>
        </Box>
      ) },
      { no: 1, name: "아래 꽉 찬 버튼", note: "화면 아래에 가로로 꽉 채웁니다. 누르기 가장 쉽습니다.", render: () => (
        <Box pad={12}>
          <div style={{ height: 90, background: "#fff", border: `1px solid ${LINE}`, display: "flex", alignItems: "flex-end", padding: 10, boxSizing: "border-box" }}>
            <div style={{ width: "100%", background: P, color: "#fff", padding: "13px 0", textAlign: "center", fontSize: 15, fontWeight: 700 }}>+ 예약접수</div>
          </div>
        </Box>
      ) },
      { no: 2, name: "동그란 버튼", note: "글자 없이 더하기 표시만 있는 동그란 버튼입니다.", render: () => (
        <Box pad={12}>
          <div style={{ position: "relative", height: 90, background: "#fff", border: `1px solid ${LINE}` }}>
            <div style={{ position: "absolute", right: 12, bottom: 12, width: 52, height: 52, borderRadius: "50%", background: P, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 26 }}>+</div>
          </div>
        </Box>
      ) },
    ],
  },
  {
    group: "⑦ 맨 아래 사업자 정보",
    items: [
      { no: 0, name: "현재", note: "약관 링크와 사업자 정보를 모두 펼쳐 둡니다.", render: () => (
        <Box pad={12}>
          <div style={{ fontSize: 13, color: SUB, lineHeight: 1.8 }}>
            <div style={{ color: TXT, fontWeight: 700, marginBottom: 6 }}>이용약관 · 개인정보 처리방침 · 위치기반서비스 이용약관</div>
            상호명 : (주)윈플래닛<br />대표이사 : 박신영  개인정보책임관리자 : 박성우<br />주소 : 서울시 종로구 종로19, B동 1422호<br />사업자등록번호 : 696-87-02440
          </div>
        </Box>
      ) },
      { no: 1, name: "접어 두기", note: "약관 줄만 두고, 사업자 정보는 눌러야 펼쳐집니다.", render: () => (
        <Box pad={12}>
          <div style={{ fontSize: 13, color: TXT, fontWeight: 700, marginBottom: 8 }}>이용약관 · 개인정보 처리방침 · 위치기반서비스 이용약관</div>
          <div style={{ border: `1px solid ${LINE}`, background: "#fff", padding: "10px 12px", fontSize: 13, color: SUB, display: "flex", justifyContent: "space-between" }}>
            <span>사업자 정보</span><span>펼치기</span>
          </div>
        </Box>
      ) },
    ],
  },
];

const HomeLab = () => null;
export default HomeLab;
