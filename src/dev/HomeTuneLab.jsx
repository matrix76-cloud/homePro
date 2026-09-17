/* eslint-disable */
/**
 * 홈 화면 다듬기 시안 — 지금 적용된 홈(0번)이 무거워 보인다는 의견에 대한 후보. (대표 9/17)
 * 보라 면을 얼마나 쓸지, 탭과 요약 줄을 어떻게 줄일지를 비교한다.
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
  ["08/19", "대기", "빠른", "홈클리닝 이사청소"],
  ["오늘", "대기", "-", "실내하수구 변기막힘"],
  ["07/31", "접수", "빠른", "준공청소 기타"],
  ["07/21", "접수", "0/3", "도배"],
];

const Frame = ({ children }) => (
  <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", minHeight: 470, display: "flex", flexDirection: "column" }}>{children}</div>
);
const Header = () => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "11px 14px", background: "#fff", fontSize: 15, fontWeight: 700 }}>
    <span style={{ width: 24, height: 24, borderRadius: 7, background: P, color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>홈</span>
    서울시 중구
  </div>
);
const Table = ({ rows = ORDERS }) => (
  <div style={{ margin: "0 12px", background: "#fff", border: `1px solid #EFF1F4` }}>
    <div style={{ display: "flex", background: P_DEEP, color: "#fff", fontSize: 12, padding: "7px 10px" }}>
      <span style={{ flex: 1 }}>날짜</span><span style={{ flex: 1 }}>상태</span><span style={{ flex: 1 }}>요청</span><span style={{ flex: 2 }}>서비스</span>
    </div>
    {rows.map((r) => (
      <div key={r[3]} style={{ display: "flex", fontSize: 13, padding: "10px", borderTop: `1px solid #F2F4F7`, color: TXT }}>
        <span style={{ flex: 1 }}>{r[0]}</span>
        <span style={{ flex: 1, color: r[1] === "접수" ? P_DEEP : MUTED, fontWeight: r[1] === "접수" ? 700 : 500 }}>{r[1]}</span>
        <span style={{ flex: 1, color: SUB }}>{r[2]}</span>
        <span style={{ flex: 2 }}>{r[3].slice(0, 9)}</span>
      </div>
    ))}
  </div>
);
const Nav = () => (
  <div style={{ display: "flex", background: "#fff", borderTop: `1px solid #EFF1F4`, marginTop: "auto" }}>
    {["홈", "공동중개", "채팅", "안심케어", "마이"].map((t, i) => (
      <div key={t} style={{ flex: 1, textAlign: "center", padding: "9px 0", fontSize: 11, color: i === 0 ? P_DEEP : MUTED, fontWeight: i === 0 ? 700 : 500 }}>{t}</div>
    ))}
  </div>
);
const Cta = ({ wide = true }) => (
  <div style={{ padding: "10px 12px" }}>
    <div style={{ background: P, color: "#fff", textAlign: "center", padding: "12px 0", fontSize: 15, fontWeight: 700, borderRadius: 8 }}>+ 예약접수</div>
  </div>
);

export const HomeTuneCases = [
  {
    no: 0, name: "현재 (적용됨)", note: "포인트 카드·탭·요약 줄이 모두 커서 목록이 아래로 밀립니다.",
    render: () => (
      <Frame>
        <Header />
        <div style={{ margin: "10px 12px 12px", background: P, color: "#fff", padding: "14px 16px", borderRadius: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: 13, opacity: 0.9 }}>보유 포인트</div><div style={{ fontSize: 13, fontWeight: 700, textDecoration: "underline", marginTop: 3 }}>2차수 회원 · 구독</div></div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>0P</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, padding: "0 12px 12px" }}>
          {["오더목록", "나의오더현황", "AI견적", "보유자산"].map((t, i) => (
            <div key={t} style={{ padding: "13px 4px", textAlign: "center", fontSize: 14, borderRadius: 10, border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P : "#fff", color: i === 0 ? "#fff" : TXT, fontWeight: i === 0 ? 700 : 500 }}>{t}</div>
          ))}
        </div>
        <div style={{ margin: "0 12px 10px", background: P_TINT, border: `1px solid ${P}`, borderRadius: 10, padding: "10px 12px", fontSize: 14, color: TXT }}>오늘 새로 올라온 오더 <b style={{ color: P_DEEP }}>0건</b></div>
        <Table rows={ORDERS.slice(0, 2)} />
        <Cta /><Nav />
      </Frame>
    ),
  },
  {
    no: 1, name: "가볍게 (포인트 한 줄)", note: "포인트 카드를 한 줄 글자로 줄이고 탭도 낮춥니다. 목록이 위로 올라옵니다.",
    render: () => (
      <Frame>
        <Header />
        <div style={{ display: "flex", justifyContent: "space-between", padding: "10px 14px", background: "#fff", fontSize: 14, borderBottom: `1px solid #F2F4F7` }}>
          <span style={{ color: SUB }}>2차수 회원 · 구독</span>
          <b style={{ color: P_DEEP }}>0P</b>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, padding: "10px 12px" }}>
          {["오더목록", "나의오더현황", "AI견적", "보유자산"].map((t, i) => (
            <div key={t} style={{ padding: "9px 4px", textAlign: "center", fontSize: 14, border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : TXT, fontWeight: i === 0 ? 700 : 500 }}>{t}</div>
          ))}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "0 14px 8px", fontSize: 13, color: SUB }}>
          <span>필터</span><span>9건</span>
        </div>
        <Table /><Cta /><Nav />
      </Frame>
    ),
  },
  {
    no: 2, name: "탭은 줄 하나로", note: "탭을 한 줄 밑줄 방식으로 되돌리고 포인트는 오른쪽 위에 작게 둡니다.",
    render: () => (
      <Frame>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700 }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: P, color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>홈</span>
            서울시 중구
          </div>
          <b style={{ fontSize: 14, color: P_DEEP }}>0P</b>
        </div>
        <div style={{ display: "flex", background: "#fff", borderBottom: `1px solid #EFF1F4` }}>
          {["오더목록", "나의오더현황", "AI견적", "보유자산"].map((t, i) => (
            <div key={t} style={{ flex: 1, textAlign: "center", padding: "11px 2px", fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? P_DEEP : MUTED, borderBottom: `2px solid ${i === 0 ? P : "transparent"}` }}>{t}</div>
          ))}
        </div>
        <div style={{ display: "flex", gap: 6, padding: "10px 12px" }}>
          {["필터", "내 동네", "오늘"].map((t, i) => (
            <span key={t} style={{ border: `1px solid ${i === 0 ? LINE : P}`, color: i === 0 ? TXT : P_DEEP, background: "#fff", padding: "6px 10px", fontSize: 13 }}>{t}</span>
          ))}
        </div>
        <Table /><Cta /><Nav />
      </Frame>
    ),
  },
  {
    no: 3, name: "목록 먼저", note: "포인트와 요약을 접어 두고 목록을 가장 위로 올립니다. 오더를 보러 온 사람에게 맞습니다.",
    render: () => (
      <Frame>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "11px 14px", background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 15, fontWeight: 700 }}>
            <span style={{ width: 24, height: 24, borderRadius: 7, background: P, color: "#fff", fontSize: 12, display: "flex", alignItems: "center", justifyContent: "center" }}>홈</span>
            서울시 중구
          </div>
          <span style={{ fontSize: 13, color: SUB }}>2차수 · <b style={{ color: P_DEEP }}>0P</b></span>
        </div>
        <div style={{ display: "flex", background: "#fff", borderBottom: `1px solid #EFF1F4` }}>
          {["오더목록", "나의오더현황", "AI견적", "보유자산"].map((t, i) => (
            <div key={t} style={{ flex: 1, textAlign: "center", padding: "10px 2px", fontSize: 13, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? P_DEEP : MUTED, borderBottom: `2px solid ${i === 0 ? P : "transparent"}` }}>{t}</div>
          ))}
        </div>
        <Table rows={ORDERS} />
        <Cta /><Nav />
      </Frame>
    ),
  },
];

const HomeTuneLab = () => null;
export default HomeTuneLab;
