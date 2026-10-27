/**
 * 배상책임보험 화면 조각 — 소개 · 가입 · 완료 · 내 보험이 같이 쓴다 (시안 랩 insurance-* 형 선택 10/27)
 */
import React, { useState } from "react";
import { IoChevronDown, IoCheckmark, IoConstructOutline, IoHomeOutline, IoWaterOutline } from "react-icons/io5";
import { LIMITS, DEDUCT, DEDUCT_NOTE, SCOPE, SCOPE_SPECIAL, groupPriceText } from "./insuranceGroups";

export const C = {
  P: "#00963F", TINT: "#E6F7EE", TXT: "#14181F", SUB: "#2b2f36", LINE: "#D9DDE3", SOFT: "#F7F8FA", RED: "#C62828",
};

export const Box = ({ children, style }) => (
  <div style={{ background: "#fff", border: `1px solid ${C.LINE}`, borderRadius: 8, padding: 16, ...style }}>{children}</div>
);
export const H = ({ icon: I, children, sub }) => (
  <div style={{ marginBottom: 10 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 600, color: C.TXT }}>{I && <I size={22} color={C.P} />}{children}</div>
    {sub && <div style={{ fontSize: 14, color: C.SUB, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>}
  </div>
);
/** 이름 · 값 한 줄. 값 없이 설명만 있으면(v === "") 이름 아래 설명을 전폭으로 */
export const Row = ({ k, v, sub, last }) => (v === "" ? (
  <div style={{ padding: "11px 0", borderBottom: last ? "none" : "1px solid #EEF0F3" }}>
    <div style={{ fontSize: 15, color: C.TXT, fontWeight: 600 }}>{k}</div>
    <div style={{ fontSize: 14, color: C.SUB, marginTop: 4, lineHeight: 1.5 }}>{sub}</div>
  </div>
) : (
  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 0", borderBottom: last ? "none" : "1px solid #EEF0F3" }}>
    <span style={{ fontSize: 15, color: C.SUB, flexShrink: 0 }}>{k}</span>
    <span style={{ fontSize: 15, color: C.TXT, textAlign: "right", fontWeight: 500 }}>{v}{sub && <div style={{ fontSize: 13, color: C.SUB, fontWeight: 400, marginTop: 2 }}>{sub}</div>}</span>
  </div>
));
export const Txt = ({ children, style }) => <div style={{ fontSize: 15, color: C.SUB, lineHeight: 1.6, ...style }}>{children}</div>;
export const Btn = ({ children, ghost, small, danger, style, ...rest }) => (
  <button type="button" {...rest} style={{
    height: small ? 46 : 54, width: "100%", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
    fontSize: small ? 15 : 17, fontWeight: 600, fontFamily: "inherit", cursor: rest.disabled ? "default" : "pointer",
    background: ghost ? "#fff" : danger ? C.RED : C.P, color: ghost ? (danger ? C.RED : C.TXT) : "#fff",
    border: ghost ? `1px solid ${C.LINE}` : "none", opacity: rest.disabled ? 0.45 : 1, ...style,
  }}>{children}</button>
);

/* 방패 그림 — 메인 비주얼 · 엠블럼 · 내 보험 상태 */
export const Shield = ({ size = 96, label = "1억" }) => (
  <svg width={size} height={size} viewBox="0 0 96 96" fill="none" aria-hidden="true">
    <path d="M48 8 L80 20 V44 C80 66 66 80 48 88 C30 80 16 66 16 44 V20 Z" fill="#fff" stroke={C.P} strokeWidth="3" />
    <path d="M48 18 L71 27 V45 C71 61 61 72 48 78 C35 72 25 61 25 45 V27 Z" fill={C.TINT} />
    <path d="M36 47 l8 8 l16 -18" stroke={C.P} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
    {label && <text x="48" y="70" textAnchor="middle" fontSize="11" fontWeight="700" fill={C.P}>{label}</text>}
  </svg>
);

/* 메인 비주얼 — 옅은 그라디언트 + 왼쪽 글 + 오른쪽 방패 (시안 2번 compact) */
export const Hero = ({ minPrice = 5900 }) => (
  <div style={{ borderRadius: 10, padding: "18px 16px", background: "linear-gradient(135deg, #EAF7EF 0%, #F6FBF8 60%, #FFFFFF 100%)", border: "1px solid #D5EBDD", display: "flex", gap: 10, alignItems: "center" }}>
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 19, fontWeight: 700, color: C.TXT, lineHeight: 1.4, wordBreak: "keep-all" }}>월 {groupPriceText(minPrice)}으로 지키는<br />현장 재물 사고 걱정 끝!</div>
      <div style={{ fontSize: 14, color: C.SUB, marginTop: 8, lineHeight: 1.55, wordBreak: "keep-all" }}>하루 100원대로 '1억 배상책임 가입 업체' 타이틀 달고 고객 신뢰와 견적 수주율을 올리세요.</div>
    </div>
    <Shield size={80} />
  </div>
);

/* 업종별 월 요금 2×2 */
export const GroupPriceGrid = ({ groups, recId }) => (
  <Box>
    <H sub="카드 1회 등록 시 매월 자동 정기결제 · 보장 연속 유지. 복수 업종 수행 시 가장 위험도가 높은 상위 그룹으로 가입합니다.">업종별 월 요금</H>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
      {groups.map((g) => {
        const rec = recId ? g.id === recId : g.rec;
        return (
          <div key={g.id} style={{ border: `1px solid ${rec ? C.P : C.LINE}`, borderRadius: 8, padding: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.TXT }}>{g.id}그룹{rec && <span style={{ color: C.P, fontSize: 13, marginLeft: 6 }}>{recId ? "내 업종" : "대표 업종"}</span>}</div>
            <div style={{ fontSize: 19, fontWeight: 700, color: rec ? C.P : C.TXT, marginTop: 4 }}>월 {groupPriceText(g.price)}</div>
            <div style={{ fontSize: 13, color: C.SUB, marginTop: 6, lineHeight: 1.45, wordBreak: "keep-all" }}>{g.cats}</div>
          </div>
        );
      })}
    </div>
  </Box>
);

/* 눌러서 펼치는 줄 */
export const Fold = ({ title, defaultOpen = false, open: openProp, onToggle, children }) => {
  const [inner, setInner] = useState(defaultOpen);
  const open = openProp ?? inner;
  return (
    <div style={{ borderTop: "1px solid #EEF0F3" }}>
      <button type="button" onClick={() => (onToggle ? onToggle(!open) : setInner(!open))}
        style={{ width: "100%", display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, padding: "14px 0", fontSize: 16, fontWeight: open ? 600 : 500, color: C.TXT, background: "none", border: "none", fontFamily: "inherit", cursor: "pointer", textAlign: "left" }}>
        <span style={{ flex: 1 }}>{title}</span>
        <IoChevronDown size={20} style={{ transform: open ? "rotate(180deg)" : "none", flexShrink: 0 }} />
      </button>
      {open && <div style={{ paddingBottom: 12 }}>{children}</div>}
    </div>
  );
};

export const LimitRows = () => LIMITS.map(([k, v, d], i) => <Row key={k} k={k} v={v} sub={d} last={i === LIMITS.length - 1} />);
export const DeductRows = () => (
  <>
    {DEDUCT.map(([k, v], i) => <Row key={k} k={k} v={v} last={i === DEDUCT.length - 1} />)}
    <Txt style={{ fontSize: 14, marginTop: 6 }}>{DEDUCT_NOTE}</Txt>
  </>
);
const SCOPE_ICON = { 1: IoConstructOutline, 2: IoHomeOutline, 3: IoWaterOutline };
export const ScopeRows = () => (
  <>
    {SCOPE.map((s) => {
      const I = SCOPE_ICON[s.n];
      return (
        <div key={s.n} style={{ display: "flex", gap: 12, padding: "12px 0", borderBottom: "1px solid #EEF0F3" }}>
          <div style={{ width: 44, height: 44, borderRadius: 8, background: s.ok ? C.TINT : "#F3F4F6", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <I size={24} color={s.ok ? C.P : "#6B7280"} />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.TXT }}>[{s.n}] {s.title}</div>
            <div style={{ fontSize: 15, color: s.ok ? C.P : C.RED, fontWeight: 600, marginTop: 2 }}>{s.res}</div>
            <div style={{ fontSize: 14, color: C.SUB, marginTop: 4, lineHeight: 1.5 }}>예: {s.ex}</div>
            {s.guide && <div style={{ fontSize: 14, color: C.SUB, marginTop: 2, lineHeight: 1.5 }}>{s.guide}</div>}
          </div>
        </div>
      );
    })}
    <Txt style={{ fontSize: 14, marginTop: 8 }}>{SCOPE_SPECIAL}</Txt>
  </>
);

/* 네모 체크 */
export const CheckMark = ({ on }) => (
  <span style={{ width: 22, height: 22, borderRadius: 4, border: `1.5px solid ${on ? C.P : "#9CA3AF"}`, background: on ? C.P : "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
    {on && <IoCheckmark size={16} color="#fff" />}
  </span>
);
export const CheckLine = ({ on, onChange, children }) => (
  <label style={{ display: "flex", gap: 10, alignItems: "flex-start", fontSize: 15, color: C.TXT, lineHeight: 1.5, cursor: "pointer" }} onClick={(e) => { e.preventDefault(); onChange(!on); }}>
    <span style={{ marginTop: 1 }}><CheckMark on={on} /></span><span>{children}</span>
  </label>
);
