/* eslint-disable */
/**
 * 홈 맨 위 "차수 · 포인트" 줄 강조 시안 (형 9/17 "포인트 부분 좀 강조되면 좋겠는데")
 * 실제 크기(폭 390 기준)로 헤더·포인트 줄·탭·필터 줄까지 그려 어울림을 본다. 0번이 지금 화면.
 */
import React from "react";
import { IoLocationOutline, IoSearchOutline, IoCalendarOutline, IoNotificationsOutline, IoChevronForward, IoChevronDown, IoWalletOutline } from "react-icons/io5";

const P = "#5A2E77";
const P_DEEP = "#4A2663";
const P_TINT = "#F1EAF6";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";

const Phone = ({ children }) => (
  <div style={{ width: 390, maxWidth: "100%", border: `1px solid ${LINE}`, background: "#F7F8FA", fontFamily: "inherit" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 16px", background: "#fff", borderBottom: "1px solid #F2F4F7" }}>
      <span style={{ width: 30, height: 30, borderRadius: 8, background: P, color: "#fff", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>홈</span>
      <IoLocationOutline size={17} color={TXT} />
      <span style={{ fontSize: 17, fontWeight: 600, color: TXT }}>서울시 마포구</span>
      <span style={{ marginLeft: "auto", display: "flex", gap: 14, color: TXT }}>
        <IoSearchOutline size={21} /><IoCalendarOutline size={21} /><IoNotificationsOutline size={21} />
      </span>
    </div>
    {children}
    <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #EFF1F4" }}>
      {["오더목록", "나의오더현황", "AI견적", "보유자산"].map((t, i) => (
        <div key={t} style={{ flex: t === "나의오더현황" ? 1.3 : 1, textAlign: "center", padding: "12px 2px", fontSize: 15, fontWeight: i === 0 ? 700 : 600, color: i === 0 ? P : TXT, borderBottom: `3px solid ${i === 0 ? P : "transparent"}` }}>{t}</div>
      ))}
    </div>
    <div style={{ display: "flex", alignItems: "center", padding: "20px 16px 12px" }}>
      <span style={{ border: `1px solid #F0F0F4`, background: "#fff", padding: "7px 10px 7px 12px", fontSize: 14, fontWeight: 600, borderRadius: 8, display: "inline-flex", alignItems: "center", gap: 4 }}>필터 <IoChevronDown size={16} /></span>
      <span style={{ marginLeft: "auto", fontSize: 14, color: TXT }}>9건</span>
    </div>
    <div style={{ margin: "0 12px 14px", background: "#fff", border: "1px solid #EFF1F4" }}>
      {[["08/19", "대기", "홈클리닝 이사청소"], ["07/31", "접수", "준공청소 기타"]].map((r) => (
        <div key={r[0]} style={{ display: "flex", fontSize: 15, padding: "12px", borderTop: "1px solid #F2F4F7", color: TXT }}>
          <span style={{ flex: 1 }}>{r[0]}</span>
          <span style={{ flex: 1, color: r[1] === "접수" ? P : "#8A93A0" }}>{r[1]}</span>
          <span style={{ flex: 2 }}>{r[2]}</span>
        </div>
      ))}
    </div>
  </div>
);

const Row = ({ children, style }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 16px", background: "#fff", borderBottom: "1px solid #F2F4F7", ...style }}>{children}</div>
);

export const PointLineCases = [
  {
    no: 0, name: "지금 화면", note: "차수는 보통 글씨, 포인트는 보라 굵은 숫자 하나. 누를 수 있는지 잘 안 보입니다.",
    render: () => (
      <Phone>
        <Row>
          <span style={{ fontSize: 15, color: SUB }}>2차수 회원 · 구독</span>
          <b style={{ fontSize: 17, color: P_DEEP }}>7,500P</b>
        </Row>
      </Phone>
    ),
  },
  {
    no: 1, name: "라벨 + 큰 숫자", note: "숫자 앞에 '보유 포인트'를 붙이고 숫자를 키웁니다. 줄 높이는 거의 그대로입니다.",
    render: () => (
      <Phone>
        <Row style={{ padding: "11px 16px" }}>
          <span style={{ fontSize: 15, color: SUB }}>2차수 회원 · 구독</span>
          <span style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span style={{ fontSize: 14, color: SUB }}>보유 포인트</span>
            <b style={{ fontSize: 22, color: P, letterSpacing: "-0.01em" }}>7,500P</b>
          </span>
        </Row>
      </Phone>
    ),
  },
  {
    no: 2, name: "연보라 띠", note: "줄 전체를 연보라 면으로 깔아 헤더와 탭 사이에서 한 덩어리로 보이게 합니다.",
    render: () => (
      <Phone>
        <Row style={{ background: P_TINT, borderBottom: "none", padding: "12px 16px" }}>
          <span style={{ fontSize: 15, color: TXT, fontWeight: 600 }}>2차수 회원 · 구독</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, color: SUB }}>보유</span>
            <b style={{ fontSize: 20, color: P_DEEP }}>7,500P</b>
            <IoChevronForward size={17} color={P_DEEP} />
          </span>
        </Row>
      </Phone>
    ),
  },
  {
    no: 3, name: "포인트만 테두리 칸", note: "숫자를 얇은 보라 테두리 칸에 넣고 화살표를 붙여 눌러서 보유자산으로 가는 버튼처럼 보이게 합니다.",
    render: () => (
      <Phone>
        <Row style={{ padding: "9px 16px" }}>
          <span style={{ fontSize: 15, color: SUB }}>2차수 회원 · 구독</span>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6, border: `1px solid ${P}`, borderRadius: 8, padding: "6px 10px 6px 12px", background: "#fff" }}>
            <IoWalletOutline size={18} color={P} />
            <b style={{ fontSize: 18, color: P_DEEP }}>7,500P</b>
            <IoChevronForward size={16} color={P_DEEP} />
          </span>
        </Row>
      </Phone>
    ),
  },
  {
    no: 4, name: "아이콘 + 숫자", note: "지갑 아이콘을 앞에 두어 포인트라는 걸 글 없이 알게 합니다. 테두리 없이 가볍습니다.",
    render: () => (
      <Phone>
        <Row style={{ padding: "11px 16px" }}>
          <span style={{ fontSize: 15, color: SUB }}>2차수 회원 · 구독</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ width: 28, height: 28, borderRadius: 14, background: P_TINT, display: "flex", alignItems: "center", justifyContent: "center" }}><IoWalletOutline size={17} color={P} /></span>
            <b style={{ fontSize: 20, color: P_DEEP }}>7,500P</b>
          </span>
        </Row>
      </Phone>
    ),
  },
  {
    no: 5, name: "두 칸 나눔", note: "왼쪽 차수, 오른쪽 포인트를 세로선으로 나눈 두 칸. 둘 다 누를 수 있다는 게 분명합니다.",
    render: () => (
      <Phone>
        <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #F2F4F7" }}>
          <div style={{ flex: 1, padding: "10px 16px" }}>
            <div style={{ fontSize: 13, color: SUB }}>회원 등급</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: TXT, marginTop: 2 }}>2차수 · 구독</div>
          </div>
          <div style={{ width: 1, background: "#EFF1F4", margin: "10px 0" }} />
          <div style={{ flex: 1, padding: "10px 16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 13, color: SUB }}>보유 포인트</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: P, marginTop: 1 }}>7,500P</div>
            </div>
            <IoChevronForward size={17} color={SUB} />
          </div>
        </div>
      </Phone>
    ),
  },
  {
    no: 6, name: "보라 면 한 줄", note: "가장 강하게. 줄 전체를 보라 면 + 흰 글씨로 채웁니다. 화면에서 진한 면이 여기 하나가 됩니다.",
    render: () => (
      <Phone>
        <Row style={{ background: P, borderBottom: "none", padding: "12px 16px" }}>
          <span style={{ fontSize: 15, color: "#fff", fontWeight: 600 }}>2차수 회원 · 구독</span>
          <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 14, color: "#EFE7F5" }}>보유</span>
            <b style={{ fontSize: 20, color: "#fff" }}>7,500P</b>
            <IoChevronForward size={17} color="#fff" />
          </span>
        </Row>
      </Phone>
    ),
  },
];
