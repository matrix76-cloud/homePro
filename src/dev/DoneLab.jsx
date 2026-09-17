/* eslint-disable */
/**
 * 가입 완료 화면 시안 — /lab 의 "가입 완료" 탭.
 * 지금은 완료 화면 없이 바로 메인으로 들어간다. 아래는 그 자리에 넣을 후보다. (대표 9/17)
 */
import React from "react";

const P = "#00963F";       // 확정 포인트 색
const P_DEEP = "#007A33";
const P_TINT = "#E6F7EE";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";

const Screen = ({ children }) => (
  <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", minHeight: 440, display: "flex", flexDirection: "column", padding: 18, gap: 12, boxSizing: "border-box" }}>{children}</div>
);
const Check = ({ size = 64 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: P_TINT, display: "flex", alignItems: "center", justifyContent: "center", margin: "6px auto 2px" }}>
    <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none">
      <path d="M5 13l4.5 4.5L19 7" stroke={P} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  </div>
);
const Big = ({ children }) => <div style={{ fontSize: 20, fontWeight: 700, color: TXT, textAlign: "center" }}>{children}</div>;
const Sub = ({ children }) => <div style={{ fontSize: 15, color: SUB, textAlign: "center", lineHeight: 1.6 }}>{children}</div>;
const Btn = ({ children, $ghost }) => (
  <div style={{ background: $ghost ? "#fff" : P, color: $ghost ? TXT : "#fff", border: $ghost ? `1px solid ${LINE}` : "none", padding: "14px 12px", textAlign: "center", fontSize: 16, fontWeight: 700 }}>{children}</div>
);
const PointCard = ({ children }) => (
  <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: 16, textAlign: "center" }}>{children}</div>
);
const TodoRow = ({ title, desc, reward }) => (
  <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: 14, display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: TXT }}>{title}</div>
      <div style={{ fontSize: 13, color: SUB, marginTop: 3 }}>{desc}</div>
    </div>
    <div style={{ fontSize: 14, fontWeight: 700, color: P, whiteSpace: "nowrap" }}>{reward}</div>
  </div>
);

export const DoneCases = [
  {
    no: 9, name: "완료 화면 없음 (예전)", note: "예전에는 완료를 누르면 안내 없이 바로 목록으로 들어갔습니다.",
    render: () => (
      <Screen>
        <div style={{ background: "#fff", padding: "12px 14px", fontSize: 15, fontWeight: 700 }}>오더목록 · 나의오더현황 · AI견적</div>
        <div style={{ background: "#fff", border: `1px solid ${LINE}` }}>
          {["08/19 · 접수 · 홈클리닝", "오늘 · 대기 · 누수탐지", "07/31 · 접수 · 준공청소"].map((t) => (
            <div key={t} style={{ padding: "12px 14px", borderBottom: `1px solid #F2F4F7`, fontSize: 14, color: TXT }}>{t}</div>
          ))}
        </div>
        <div style={{ marginTop: "auto", fontSize: 13, color: SUB, textAlign: "center" }}>가입이 끝났다는 안내가 없습니다.</div>
      </Screen>
    ),
  },
  {
    no: 1, name: "간단한 완료 안내", note: "끝났다는 것과 받은 포인트만 알리고 바로 시작하게 합니다.",
    render: () => (
      <Screen>
        <Check />
        <Big>가입이 끝났습니다</Big>
        <Sub>이제 오더를 보고 바로 지원할 수 있습니다.</Sub>
        <PointCard>
          <div style={{ fontSize: 14, color: SUB }}>가입 환영 포인트</div>
          <div style={{ fontSize: 26, fontWeight: 700, color: P, marginTop: 4 }}>1,000P</div>
        </PointCard>
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn>오더 둘러보기</Btn>
        </div>
      </Screen>
    ),
  },
  {
    no: 0, name: "현재 (다음 할 일 안내 · 적용됨)", note: "9월 17일 확정해 적용한 화면입니다. 받은 포인트와 다음 할 일을 함께 보여 줍니다.",
    render: () => (
      <Screen>
        <Check size={54} />
        <Big>가입이 끝났습니다</Big>
        <Sub>1,000P를 드렸습니다. 아래를 채우면 포인트를 더 받습니다.</Sub>
        <TodoRow title="비즈프로필 등록" desc="평점·인증·포트폴리오를 보여 줍니다" reward="+2,000P" />
        <TodoRow title="전문분야 등록" desc="맞는 오더를 먼저 받아 봅니다" reward="필수" />
        <TodoRow title="친구 초대" desc="초대 코드를 공유합니다" reward="+3,000P" />
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn>비즈프로필 채우기</Btn>
          <Btn $ghost>나중에 하고 오더 보기</Btn>
        </div>
      </Screen>
    ),
  },
  {
    no: 3, name: "환영 인사 강조", note: "이름을 불러 주고 시작 버튼 하나만 둡니다. 가장 단순합니다.",
    render: () => (
      <Screen>
        <div style={{ marginTop: 40 }} />
        <Check size={72} />
        <Big>클린클린님, 환영합니다</Big>
        <Sub>홈프로 회원이 되셨습니다.{"\n"}가입 환영 포인트 1,000P를 드렸습니다.</Sub>
        <div style={{ marginTop: "auto" }}><Btn>시작하기</Btn></div>
      </Screen>
    ),
  },
];

const DoneLab = () => null;
export default DoneLab;
