/* eslint-disable */
/**
 * 앱 아이콘 시안 랩 — /iconlab
 *   대표님이 보내주신 로고(보라)를 기준으로 만든 앱 아이콘 후보.
 *   위 탭으로 하나씩 보고 번호로 고르시면 됩니다. 폰에서 보기 좋게 좌우를 꽉 채웠습니다.
 */
import React, { useState } from "react";

const PURPLE = "#00963F";
const PURPLE_DEEP = "#4E2B65";
const PURPLE_VIVID = "#6B2FA0";

/* 집 모양 (현재 아이콘과 같은 형태) */
const House = ({ color = "#fff", size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path d="M18 48 L50 22 L82 48" stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M26 45 V78 H74 V45" stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M42 78 V60 a8 8 0 0 1 16 0 V78" stroke={color} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const HouseSolid = ({ color = "#fff", size = 120 }) => (
  <svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <path d="M50 20 L84 50 H74 V80 H58 V62 a8 8 0 0 0-16 0 V80 H26 V50 H16 Z" fill={color} />
  </svg>
);

export const IconCases = [
  {
    no: 0, name: "현재 아이콘 (교체 예정)", note: "지금 앱에 들어 있는 아이콘입니다. 3번으로 교체할 예정입니다.",
    bg: "#7B68F5", render: (s) => <><House size={s * 0.62} /><Dot size={s} color="#fff" /></>,
  },
  {
    no: 1, name: "로고 보라 · 집", note: "보내주신 로고 색을 그대로 쓰고 모양은 지금과 같게 했습니다.",
    bg: PURPLE, render: (s) => <><House size={s * 0.62} /><Dot size={s} color="#fff" /></>,
  },
  {
    no: 2, name: "로고 보라 · 집 채움", note: "선이 아니라 면으로 채운 집입니다. 작게 줄여도 또렷합니다.",
    bg: PURPLE, render: (s) => <HouseSolid size={s * 0.64} />,
  },
  {
    no: 3, name: "동전 테두리 · 채택 (적용 준비 중)", note: "이 안으로 확정했습니다. 아이콘 파일을 만들어 앱에 넣으면 0번이 이 모양으로 바뀝니다.",
    bg: PURPLE, render: (s) => (
      <div style={{ position: "relative", width: s * 0.78, height: s * 0.78, borderRadius: "50%", border: `${Math.round(s * 0.05)}px solid #fff`, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <HouseSolid size={s * 0.46} />
      </div>
    ),
  },
  {
    no: 4, name: "흰 바탕 · 보라 집", note: "밝은 배경 안입니다. 폰 배경이 어두울 때 눈에 띕니다.",
    bg: "#FFFFFF", border: true, render: (s) => <><HouseSolid size={s * 0.64} color={PURPLE} /><Dot size={s} color={PURPLE} /></>,
  },
  {
    no: 5, name: "진한 보라", note: "차분하게 가라앉힌 보라입니다.",
    bg: PURPLE_DEEP, render: (s) => <><HouseSolid size={s * 0.64} /><Dot size={s} color="#fff" /></>,
  },
  {
    no: 6, name: "선명한 보라", note: "화면에서 가장 또렷하게 보이는 보라입니다.",
    bg: PURPLE_VIVID, render: (s) => <><HouseSolid size={s * 0.64} /><Dot size={s} color="#fff" /></>,
  },
];

function Dot({ size, color }) {
  const d = Math.round(size * 0.17);
  return <span style={{ position: "absolute", top: size * 0.2, right: size * 0.2, width: d, height: d, borderRadius: "50%", background: color }} />;
}

export const IconTile = ({ c, size, round }) => (
  <div style={{
    position: "relative", width: size, height: size, borderRadius: round,
    background: c.bg, display: "flex", alignItems: "center", justifyContent: "center",
    border: c.border ? "1px solid #D9DDE3" : "none", boxSizing: "border-box", flexShrink: 0,
  }}>
    {c.render(size)}
  </div>
);

const IconLab = ({ embedded = false }) => {
  const [tab, setTab] = useState(0);
  const c = IconCases.find((x) => x.no === tab) || CASES[0];
  return (
    <div style={{ minHeight: "100vh", background: "#F7F8FA", padding: "20px 16px 60px", boxSizing: "border-box", fontFamily: "'Pretendard Variable', Pretendard, -apple-system, 'Malgun Gothic', sans-serif", color: "#14181F" }}>
      {!embedded && <h1 style={{ fontSize: 22, fontWeight: 700, margin: "0 0 6px" }}>홈프로 앱 아이콘 시안</h1>}
      <p style={{ fontSize: 15, lineHeight: 1.6, color: "#2b2f36", margin: "0 0 18px" }}>
        아래 탭을 눌러 하나씩 보시고 번호로 알려 주세요. 0번이 지금 아이콘입니다.
      </p>

      <div style={{ display: "flex", flexWrap: "wrap", border: "1px solid #D9DDE3", background: "#fff", marginBottom: 22 }}>
        {IconCases.map((x) => (
          <button key={x.no} onClick={() => setTab(x.no)} style={{
            flex: "1 0 33%", padding: "12px 6px", fontSize: 14, fontFamily: "inherit", cursor: "pointer",
            border: "none", borderRight: "1px solid #D9DDE3", borderBottom: "1px solid #D9DDE3",
            background: x.no === tab ? "#E9ECF1" : "#fff", color: "#14181F", fontWeight: x.no === tab ? 700 : 500,
          }}>{x.no}. {x.name}</button>
        ))}
      </div>

      <div style={{ background: "#fff", border: "1px solid #D9DDE3", padding: 20 }}>
        <div style={{ fontSize: 19, fontWeight: 700, marginBottom: 6 }}>{c.no}. {c.name}</div>
        <div style={{ fontSize: 15, color: "#2b2f36", marginBottom: 20, lineHeight: 1.6 }}>{c.note}</div>

        <div style={{ display: "flex", gap: 18, alignItems: "flex-end", flexWrap: "wrap", marginBottom: 22 }}>
          <div style={{ textAlign: "center" }}>
            <IconTile c={c} size={132} round={30} />
            <div style={{ fontSize: 13, color: "#2b2f36", marginTop: 8 }}>기본 모양</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <IconTile c={c} size={92} round="50%" />
            <div style={{ fontSize: 13, color: "#2b2f36", marginTop: 8 }}>원형 (삼성)</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <IconTile c={c} size={64} round={14} />
            <div style={{ fontSize: 13, color: "#2b2f36", marginTop: 8 }}>작게</div>
          </div>
        </div>

        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 10 }}>홈 화면에 놓였을 때</div>
        <div style={{ background: "#2B2F36", padding: "18px 14px", display: "flex", gap: 18, alignItems: "flex-start", borderRadius: 10 }}>
          <div style={{ textAlign: "center", width: 64 }}>
            <IconTile c={c} size={56} round={14} />
            <div style={{ fontSize: 12, color: "#fff", marginTop: 6 }}>홈프로</div>
          </div>
          {["전화", "카카오톡", "사진"].map((t, i) => (
            <div key={t} style={{ textAlign: "center", width: 64 }}>
              <div style={{ width: 56, height: 56, borderRadius: 14, background: ["#2FA84F", "#F7E600", "#3A7BD5"][i] }} />
              <div style={{ fontSize: 12, color: "#fff", marginTop: 6 }}>{t}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default IconLab;
