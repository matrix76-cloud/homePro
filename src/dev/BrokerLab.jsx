/* eslint-disable */
/**
 * 공동중개 매물 상세 시안 — 0번이 지금 화면(아래에서 올라오는 시트) (대표 9/17)
 * 대표 지시: 시트 말고 별도 페이지로.
 */
import React from "react";

const P = "#00963F";
const P_DEEP = "#007A33";
const BTN = "#00B84A";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";
const MUTED = "#8A93A0";

const Phone = ({ children, bg = "#fff" }) => (
  <div style={{ border: `1px solid ${LINE}`, background: bg, minHeight: 520, display: "flex", flexDirection: "column" }}>{children}</div>
);
const Bar = ({ title }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${LINE}`, background: "#fff" }}>
    <span style={{ fontSize: 18, color: TXT }}>‹</span>
    <span style={{ fontSize: 17, fontWeight: 700, color: TXT }}>{title}</span>
  </div>
);
const Rows = ({ rows }) => (
  <div>
    {rows.map(([k, v]) => (
      <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "12px 0", borderBottom: `1px solid #F0F2F5` }}>
        <span style={{ fontSize: 15, color: MUTED }}>{k}</span>
        <span style={{ fontSize: 15, fontWeight: 700, color: TXT, textAlign: "right" }}>{v}</span>
      </div>
    ))}
  </div>
);
const ROWS = [["지역", "성동구 성수동"], ["매물 종류", "아파트/주상복합"], ["거래 형태", "매매"], ["금액", "매매가 14억 5천"], ["등록", "한강뷰공인 · 7/23"]];
const DESC = "입주 2년차, 한강뷰 라인. 실입주/투자 모두 가능. 공동중개 환영합니다.";
const NOTE = "전화·채팅으로 연결되는 순간부터는 중개사 간 자율 협의이며, 계약 진행과 중개 사고의 책임은 당사자에게 있습니다.";

const Btns = ({ stick }) => (
  <div style={{ display: "flex", gap: 8, padding: stick ? "12px 16px" : "12px 0", borderTop: stick ? `1px solid ${LINE}` : "none", background: "#fff", marginTop: stick ? "auto" : 0 }}>
    <span style={{ flex: 1, textAlign: "center", border: `1px solid ${LINE}`, borderRadius: 8, padding: "14px 0", fontSize: 15, color: TXT }}>전화하기</span>
    <span style={{ flex: 1.2, textAlign: "center", background: BTN, color: "#fff", borderRadius: 8, padding: "14px 0", fontSize: 15, fontWeight: 700 }}>채팅하기</span>
  </div>
);

export const BrokerDetailCases = [
  {
    no: 0, name: "현재 (아래에서 올라오는 시트)", note: "목록 위에 시트가 덮여 뒤 화면이 어둡게 깔립니다. 뒤로가기와 닫기가 따로 놀고 주소를 공유할 수 없습니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, minHeight: 520, position: "relative", background: "#EDEFF3", overflow: "hidden" }}>
        <div style={{ padding: 12, opacity: 0.45 }}>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: 12, marginBottom: 8, fontSize: 14 }}>성수 신축 주상복합 로열층 급매</div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: 12, fontSize: 14 }}>다른 매물</div>
        </div>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#fff", borderRadius: "16px 16px 0 0", padding: "10px 16px 16px", boxShadow: "0 -4px 16px rgba(0,0,0,0.12)" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: "#D1D5DB", margin: "0 auto 12px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ background: BTN, color: "#fff", fontSize: 13, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>매물공유</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: MUTED }}>닫기</span>
          </div>
          <div style={{ fontSize: 18, fontWeight: 700, color: TXT, margin: "10px 0 6px" }}>성수 신축 주상복합 로열층 급매</div>
          <Rows rows={ROWS.slice(0, 4)} />
          <Btns />
        </div>
      </div>
    ),
  },
  {
    no: 1, name: "별도 페이지 · 버튼은 아래 고정", note: "시트를 걷어내고 화면 하나를 씁니다. 뒤로가기로 목록에 돌아오고, 전화·채팅 버튼은 늘 화면 아래에 붙어 있습니다.",
    render: () => (
      <Phone>
        <Bar title="매물 상세" />
        <div style={{ padding: 16, flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ background: BTN, color: "#fff", fontSize: 13, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>매물공유</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: P }}>진행중</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: TXT, margin: "10px 0 14px", lineHeight: 1.4, wordBreak: "keep-all" }}>성수 신축 주상복합 로열층 급매</div>
          <Rows rows={ROWS} />
          <div style={{ fontSize: 15, color: SUB, lineHeight: 1.65, marginTop: 14, wordBreak: "keep-all" }}>{DESC}</div>
        </div>
        <Btns stick />
      </Phone>
    ),
  },
  {
    no: 2, name: "금액을 맨 위로", note: "중개사가 가장 먼저 보는 금액과 거래 형태를 제목 위에 크게 둡니다. 나머지 항목은 그 아래 표로 이어집니다.",
    render: () => (
      <Phone>
        <Bar title="매물 상세" />
        <div style={{ padding: 16, flex: 1 }}>
          <div style={{ fontSize: 14, color: MUTED }}>매매 · 성동구 성수동</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: P_DEEP, margin: "4px 0 10px" }}>14억 5천</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: TXT, lineHeight: 1.45, marginBottom: 14, wordBreak: "keep-all" }}>성수 신축 주상복합 로열층 급매</div>
          <Rows rows={ROWS.slice(1)} />
          <div style={{ fontSize: 15, color: SUB, lineHeight: 1.65, marginTop: 14, wordBreak: "keep-all" }}>{DESC}</div>
        </div>
        <Btns stick />
      </Phone>
    ),
  },
  {
    no: 3, name: "책임 안내를 버튼 옆에", note: "연결하기 전에 읽어야 할 책임 안내를 버튼 바로 위에 둡니다. 스크롤을 안 내려도 보입니다.",
    render: () => (
      <Phone>
        <Bar title="매물 상세" />
        <div style={{ padding: 16, flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span style={{ background: BTN, color: "#fff", fontSize: 13, fontWeight: 700, padding: "3px 9px", borderRadius: 6 }}>매물공유</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: P }}>진행중</span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: TXT, margin: "10px 0 14px", lineHeight: 1.4, wordBreak: "keep-all" }}>성수 신축 주상복합 로열층 급매</div>
          <Rows rows={ROWS} />
          <div style={{ fontSize: 15, color: SUB, lineHeight: 1.65, marginTop: 14, wordBreak: "keep-all" }}>{DESC}</div>
        </div>
        <div style={{ marginTop: "auto", borderTop: `1px solid ${LINE}`, background: "#fff", padding: "12px 16px" }}>
          <div style={{ fontSize: 13, color: MUTED, lineHeight: 1.55, marginBottom: 10, wordBreak: "keep-all" }}>{NOTE}</div>
          <div style={{ display: "flex", gap: 8 }}>
            <span style={{ flex: 1, textAlign: "center", border: `1px solid ${LINE}`, borderRadius: 8, padding: "14px 0", fontSize: 15, color: TXT }}>전화하기</span>
            <span style={{ flex: 1.2, textAlign: "center", background: BTN, color: "#fff", borderRadius: 8, padding: "14px 0", fontSize: 15, fontWeight: 700 }}>채팅하기</span>
          </div>
        </div>
      </Phone>
    ),
  },
];

const BrokerLab = () => null;
export default BrokerLab;
