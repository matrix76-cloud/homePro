/* eslint-disable */
/**
 * 색 시안 랩 — /colorlab
 *   대표님이 보내주신 로고(보라)를 포인트 색으로 쓰는 안을 나란히 놓고 고르는 페이지.
 *   0번이 현재 화면(초록)이고, 1번부터가 후보다. 실제 화면 요소(헤더·탭·상태·버튼·하단탭)를 같은 크기로 그린다.
 */
import React, { useState } from "react";

export const ColorCases = [
  { no: 0, name: "현재 (보라 포인트 · 초록 버튼 · 적용됨)", accent: "#00963F", accentDark: "#007A33", btn: "#00B84A", note: "9월 17일 시안 5번으로 확정해 앱 전체에 적용한 색입니다" },
  { no: 1, name: "로고 보라 그대로", accent: "#00963F", accentDark: "#007A33", btn: "#00963F", note: "보내주신 사진에서 뽑은 색" },
  { no: 9, name: "예전 색 (초록)", accent: "#00B84A", accentDark: "#009B3E", btn: "#00B84A", note: "9월 17일 이전에 쓰던 색입니다" },
  { no: 3, name: "보라 (선명하게)", accent: "#6B2FA0", accentDark: "#5A2788", btn: "#6B2FA0", note: "화면에서 또렷하게 보이는 색" },
  { no: 4, name: "보라 + 먹색 버튼", accent: "#00963F", accentDark: "#007A33", btn: "#1B1F27", note: "포인트만 보라, 누르는 버튼은 먹색" },
  { no: 5, name: "보라 포인트 · 초록 유지 (0번과 같음)", accent: "#00963F", accentDark: "#007A33", btn: "#00B84A", note: "이 안으로 확정했습니다" },
];

const ColorLab = ({ embedded = false }) => {
  const [tab, setTab] = useState(0);
  const c = ColorCases.find((x) => x.no === tab) || CASES[0];
  return (
    <Page>
      <Head>
        {!embedded && <h1>홈프로 포인트 색 시안</h1>}
        <p>위 탭을 눌러 하나씩 보시면 됩니다. 0번이 지금 앱 화면이고 1번부터가 후보입니다.</p>
      </Head>

      <TabBar>
        {ColorCases.map((x) => (
          <TabBtn key={x.no} $on={x.no === tab} onClick={() => setTab(x.no)}>
            {x.no}. {x.name}
          </TabBtn>
        ))}
      </TabBar>

      <Stage>
        <Info>
          <InfoTitle>{c.no}. {c.name}</InfoTitle>
          <InfoNote>{c.note}</InfoNote>
          <InfoSwatch>
            <i style={{ background: c.accent }} />
            <span>포인트 색 {c.accent}</span>
          </InfoSwatch>
          <InfoSwatch>
            <i style={{ background: c.btn }} />
            <span>버튼 색 {c.btn}</span>
          </InfoSwatch>
          <InfoHelp>같은 화면을 색만 바꿔 그렸습니다. 헤더 로고, 선택된 탭, 포인트 숫자, 접수 상태 글씨, 선택된 필터, 예약접수 버튼, 하단 메뉴에 적용한 모습입니다.</InfoHelp>
        </Info>
        <PhoneWrap>
          <ColorPhone c={c} />
        </PhoneWrap>
      </Stage>
    </Page>
  );
};

export default ColorLab;

/* ── 화면 미니 재현 ── */
export const ColorPhone = ({ c }) => (
  <PhoneBox>
    <PhoneHeader>
      <Logo style={{ background: c.accent }}>홈</Logo>
      <span>충남 논산시</span>
    </PhoneHeader>

    <TierRow>
      <b>2차수 회원 · 구독</b>
      <span style={{ color: c.accentDark, fontWeight: 700 }}>6,925P</span>
    </TierRow>

    <Tabs>
      {["오더목록", "나의오더현황", "AI견적", "보유자산"].map((t, i) => (
        <Tab key={t} $on={i === 0} style={i === 0 ? { color: c.accentDark, borderBottomColor: c.accent } : undefined}>{t}</Tab>
      ))}
    </Tabs>

    <Chips>
      <Chip>등록순</Chip>
      <Chip>상태</Chip>
      <Chip style={{ color: c.accentDark, borderColor: c.accent }}>거리</Chip>
      <Chip>기간</Chip>
    </Chips>

    <Table>
      <THead><span>날짜</span><span>상태</span><span>서비스</span></THead>
      <TRow><span>08/19</span><span style={{ color: c.accentDark, fontWeight: 700 }}>접수</span><span>홈클리닝</span></TRow>
      <TRow><span>오늘</span><span style={{ color: "#8A93A0" }}>대기</span><span>누수탐지</span></TRow>
      <TRow><span>07/31</span><span style={{ color: c.accentDark, fontWeight: 700 }}>접수</span><span>준공청소</span></TRow>
    </Table>

    <Cta style={{ background: c.btn }}>+ 예약접수</Cta>

    <BottomTabs>
      {["홈", "공동중개", "채팅", "안심케어", "마이"].map((t, i) => (
        <BTab key={t} style={i === 0 ? { color: c.accentDark, fontWeight: 700 } : undefined}>{t}</BTab>
      ))}
    </BottomTabs>
  </PhoneBox>
);

/* ── styles (styled-components 없이 인라인 컴포넌트) ── */
const box = (style) => ({ children, ...rest }) => <div style={{ ...style, ...(rest.style || {}) }} {...rest}>{children}</div>;

const Page = ({ children }) => <div style={{ minHeight: "100vh", background: "#F7F8FA", padding: "20px 16px 60px", boxSizing: "border-box", fontFamily: "'Pretendard Variable', Pretendard, -apple-system, 'Malgun Gothic', sans-serif", color: "#14181F" }}>{children}</div>;
const Head = ({ children }) => <div style={{ maxWidth: 1100, margin: "0 auto 18px" }}>{children}</div>;

const TabBar = ({ children }) => <div style={{ display: "flex", flexWrap: "wrap", maxWidth: 1100, margin: "0 auto 22px", border: "1px solid #D9DDE3", background: "#fff" }}>{children}</div>;
const TabBtn = ({ children, $on, ...rest }) => <button {...rest} style={{ flex: "1 0 33%", padding: "14px 8px", fontSize: 15, fontFamily: "inherit", cursor: "pointer", border: "none", borderRight: "1px solid #D9DDE3", borderBottom: "1px solid #D9DDE3", background: $on ? "#E9ECF1" : "#fff", color: "#14181F", fontWeight: $on ? 700 : 500 }}>{children}</button>;
const Stage = ({ children }) => <div style={{ display: "flex", gap: 24, maxWidth: 1100, margin: "0 auto", alignItems: "flex-start", flexWrap: "wrap" }}>{children}</div>;
const Info = ({ children }) => <div style={{ flex: 1, minWidth: 280 }}>{children}</div>;
const InfoTitle = ({ children }) => <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>{children}</div>;
const InfoNote = ({ children }) => <div style={{ fontSize: 16, color: "#2b2f36", marginBottom: 20 }}>{children}</div>;
const InfoSwatch = ({ children }) => <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 15, marginBottom: 10 }}>{React.Children.map(children, (ch) => (ch?.type === "i" ? <i style={{ ...ch.props.style, width: 26, height: 26, display: "inline-block", border: "1px solid #D9DDE3" }} /> : ch))}</div>;
const InfoHelp = ({ children }) => <div style={{ marginTop: 18, fontSize: 15, lineHeight: 1.7, color: "#2b2f36" }}>{children}</div>;
const PhoneWrap = ({ children }) => <div style={{ width: "100%", maxWidth: 420, flex: "1 1 300px" }}>{children}</div>;
const PhoneBox = ({ children }) => <div style={{ border: "1px solid #E3E7EC", background: "#F7F8FA" }}>{children}</div>;
const PhoneHeader = ({ children }) => <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 12px", background: "#fff", fontSize: 16, fontWeight: 700 }}>{children}</div>;
const Logo = ({ children, style }) => <div style={{ ...style, width: 28, height: 28, borderRadius: 8, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{children}</div>;
const TierRow = ({ children }) => <div style={{ display: "flex", justifyContent: "space-between", padding: "8px 12px", background: "#fff", fontSize: 14 }}>{children}</div>;
const Tabs = ({ children }) => <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #EFF1F4" }}>{children}</div>;
const Tab = ({ children, $on, style }) => <div style={{ flex: 1, textAlign: "center", padding: "10px 4px", fontSize: 13, color: "#8A93A0", borderBottom: "2px solid transparent", fontWeight: $on ? 700 : 500, ...style }}>{children}</div>;
const Chips = ({ children }) => <div style={{ display: "flex", gap: 6, padding: "10px 12px" }}>{children}</div>;
const Chip = ({ children, style }) => <div style={{ border: "1px solid #E3E7EC", background: "#fff", padding: "5px 10px", fontSize: 13, color: "#2b2f36", ...style }}>{children}</div>;
const Table = ({ children }) => <div style={{ background: "#fff", margin: "0 12px", border: "1px solid #EFF1F4" }}>{children}</div>;
const THead = ({ children }) => <div style={{ display: "flex", background: "#2C3340", color: "#fff", fontSize: 13, padding: "8px 10px", justifyContent: "space-between" }}>{children}</div>;
const TRow = ({ children }) => <div style={{ display: "flex", fontSize: 13, padding: "10px", justifyContent: "space-between", borderTop: "1px solid #F2F4F7", color: "#14181F" }}>{children}</div>;
const Cta = ({ children, style }) => <div style={{ ...style, margin: "14px 12px 10px", color: "#fff", textAlign: "center", padding: "12px 0", fontSize: 15, fontWeight: 700, borderRadius: 4 }}>{children}</div>;
const BottomTabs = ({ children }) => <div style={{ display: "flex", background: "#fff", borderTop: "1px solid #EFF1F4" }}>{children}</div>;
const BTab = ({ children, style }) => <div style={{ flex: 1, textAlign: "center", padding: "10px 0", fontSize: 12, color: "#8A93A0", ...style }}>{children}</div>;
