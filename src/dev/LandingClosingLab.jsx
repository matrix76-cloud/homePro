/**
 * 랜딩(/intro) 마무리 구역 — "사업자의 일과 수익을 연결합니다" 검은 띠 시안 (형 10/1 "이 부분도 시안으로").
 * PC 실제 크기. 0번이 지금 화면. 글은 대표 초안 그대로 두고 배치 · 면 · 사진만 바꾼다(줄바꿈만 달라질 수 있다).
 * 사진은 시안용 무료 사진(public/assets/landing/photo) — 실제 현장 사진을 받으면 바꾼다.
 */
import React from "react";
import { ART } from "../page/landing/LandingArt";

const { P, P_DEEP, TINT, INK, BODY, LINE } = ART;
const PH = "/assets/landing/photo/";
const DARK = "#1b1f27";

const LINES = ["오더를 받는 곳에서", "오더를 만들고,", "수익을 만들고,", "결제하고,", "위험까지 관리하는 곳으로."];
const TITLE = "사업자의 일과 수익을 연결합니다.";
const CTA = "지금 홈프로에서 시작하세요.";

const Frame = ({ children, bg = "#fff", style }) => (
  <div style={{ border: `1px solid ${LINE}`, background: bg, wordBreak: "keep-all", overflow: "hidden", ...style }}>{children}</div>
);
const Btn = ({ light, children = "로그인 하기" }) => (
  <span style={{ display: "inline-block", background: light ? "#fff" : P, color: light ? INK : "#fff", fontSize: 19, fontWeight: 800, padding: "18px 40px", borderRadius: 10 }}>{children}</span>
);
// 다섯 줄을 세로로 (지금 화면과 같은 줄바꿈)
const Stack = ({ color, size = 22 }) => (
  <p style={{ fontSize: size, fontWeight: 700, lineHeight: 1.75, color, margin: 0 }}>{LINES.map((l) => <React.Fragment key={l}>{l}<br /></React.Fragment>)}</p>
);

export const LandingClosingCases = [
  {
    no: 0, name: "현재 — 먹색 띠에 가운데 정렬", note: "먹색 면 전폭에 흰 글씨, 다섯 줄을 세로로 쌓았습니다. 높이 671px. 랜딩에서 유일하게 진한 면입니다.",
    render: () => (
      <Frame bg={DARK} style={{ padding: "96px 0", textAlign: "center", color: "#fff" }}>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>홈프로</div>
        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: 30 }}>{TITLE}</div>
        <div style={{ marginBottom: 36 }}><Stack color="#eef0f3" /></div>
        <div style={{ fontSize: 21, fontWeight: 600, color: "#eef0f3", marginBottom: 20 }}>{CTA}</div>
        <Btn light />
      </Frame>
    ),
  },
  {
    no: 1, name: "현장 사진을 깔고 어둡게 덮기", note: "먹색 면 대신 현장 사진을 전폭으로 깔고 어둡게 덮습니다. 글 배치는 지금과 같습니다. 검은 벽 느낌이 줄고 '일하는 사람들의 서비스'로 끝납니다. 사진 품질에 좌우됩니다.",
    render: () => (
      <Frame style={{ padding: "96px 0", textAlign: "center", color: "#fff", backgroundImage: `linear-gradient(rgba(20,24,31,0.72), rgba(20,24,31,0.72)), url(${PH}tools.jpg)`, backgroundSize: "cover", backgroundPosition: "center 40%" }}>
        <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 12 }}>홈프로</div>
        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: 30 }}>{TITLE}</div>
        <div style={{ marginBottom: 36 }}><Stack color="#fff" /></div>
        <div style={{ fontSize: 21, fontWeight: 600, color: "#fff", marginBottom: 20 }}>{CTA}</div>
        <Btn light />
      </Frame>
    ),
  },
  {
    no: 2, name: "왼쪽 글 · 오른쪽 사진 (흰 바탕)", note: "진한 면을 없애고 01~04 구역과 같은 좌우 2단으로. 왼쪽에 글과 초록 버튼, 오른쪽에 현장 사진. 랜딩 전체가 한 문법으로 이어지지만 '끝'이라는 무게는 약해집니다.",
    render: () => (
      <Frame style={{ padding: "92px 56px" }}>
        <div style={{ maxWidth: 1168, margin: "0 auto", display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 72, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: P, marginBottom: 10 }}>홈프로</div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.02em", color: INK, marginBottom: 26 }}>{TITLE}</div>
            <div style={{ marginBottom: 34 }}><Stack color={INK} /></div>
            <div style={{ fontSize: 21, fontWeight: 700, color: INK, marginBottom: 18 }}>{CTA}</div>
            <Btn />
          </div>
          <div style={{ height: 520, borderRadius: 16, backgroundImage: `url(${PH}clean-sofa.jpg)`, backgroundSize: "cover", backgroundPosition: "center" }} />
        </div>
      </Frame>
    ),
  },
  {
    no: 3, name: "연초록 면 + 먹색 글씨", note: "먹색 띠를 연한 초록 면으로 바꾸고 글씨는 먹색, 버튼만 초록. 화면이 밝아지고 브랜드 색으로 끝납니다. 배치는 지금과 같습니다.",
    render: () => (
      <Frame bg={TINT} style={{ padding: "96px 0", textAlign: "center" }}>
        <div style={{ fontSize: 26, fontWeight: 800, color: P_DEEP, marginBottom: 12 }}>홈프로</div>
        <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.02em", color: INK, marginBottom: 30 }}>{TITLE}</div>
        <div style={{ marginBottom: 36 }}><Stack color={INK} /></div>
        <div style={{ fontSize: 21, fontWeight: 700, color: INK, marginBottom: 20 }}>{CTA}</div>
        <Btn />
      </Frame>
    ),
  },
  {
    no: 4, name: "먹색 유지 · 낮게 — 왼쪽 글, 오른쪽 버튼", note: "먹색 띠는 두되 높이를 절반으로. 다섯 줄을 두 줄로 이어 붙여 왼쪽에 두고, 오른쪽에 안내 한 줄과 버튼. 세로로 길게 늘어선 느낌이 사라집니다(글은 그대로, 줄바꿈만 바뀝니다).",
    render: () => (
      <Frame bg={DARK} style={{ padding: "72px 56px", color: "#fff" }}>
        <div style={{ maxWidth: 1168, margin: "0 auto", display: "flex", alignItems: "center", gap: 56 }}>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.02em", marginBottom: 18 }}>{TITLE}</div>
            <p style={{ fontSize: 20, fontWeight: 600, lineHeight: 1.7, color: "#eef0f3", margin: 0 }}>
              {LINES[0]}<br />{LINES.slice(1).join(" ")}
            </p>
          </div>
          <div style={{ flex: "0 0 auto", textAlign: "center" }}>
            <div style={{ fontSize: 19, fontWeight: 600, color: "#eef0f3", marginBottom: 16 }}>{CTA}</div>
            <Btn light />
          </div>
        </div>
      </Frame>
    ),
  },
  {
    no: 5, name: "흰 바탕 · 다섯 줄을 표처럼", note: "진한 면 없이 흰 바탕. 왼쪽에 제목과 버튼, 오른쪽에 다섯 줄을 가는 선으로 나눠 한 줄씩 놓습니다. 위쪽 '홈프로 하나로' 표와 같은 모양이라 담백하게 끝납니다.",
    render: () => (
      <Frame style={{ padding: "92px 56px" }}>
        <div style={{ maxWidth: 1168, margin: "0 auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 72, alignItems: "center" }}>
          <div>
            <div style={{ fontSize: 22, fontWeight: 800, color: P, marginBottom: 10 }}>홈프로</div>
            <div style={{ fontSize: 40, fontWeight: 800, lineHeight: 1.3, letterSpacing: "-0.02em", color: INK, marginBottom: 30 }}>사업자의 일과 수익을<br />연결합니다.</div>
            <div style={{ fontSize: 21, fontWeight: 700, color: INK, marginBottom: 18 }}>{CTA}</div>
            <Btn />
          </div>
          <div style={{ borderTop: `2px solid ${INK}` }}>
            {LINES.map((l, i) => (
              <div key={l} style={{ padding: "20px 4px", borderBottom: `1px solid ${LINE}`, fontSize: 22, fontWeight: 700, color: i === 0 || i === LINES.length - 1 ? INK : BODY }}>{l}</div>
            ))}
          </div>
        </div>
      </Frame>
    ),
  },
];
