/* eslint-disable */
/**
 * 카테고리 고르는 화면 시안 — AI 견적·예약접수 첫 단계. 0번이 지금 화면. (대표 9/17)
 * 지금은 회색 줄이 스무 개 넘게 이어져 길다.
 */
import React from "react";

const P = "#00963F";
const P_DEEP = "#007A33";
const BTN = "#00B84A";
const P_TINT = "#E6F7EE";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";
const MUTED = "#8A93A0";

const CATS = ["전문청소", "정기청소", "설비.하수구", "누수탐지", "에어컨", "가전분해", "침대.카페트", "팀원구인", "집수리", "부분 인테리어", "종합 리모델링", "철거", "폐기물처리", "전기공사"];
const GROUPS = [
  ["청소", ["전문청소", "정기청소", "가전분해 청소", "침대.카페트 청소"]],
  ["설비 · 수리", ["설비.하수구.배관", "누수탐지공사", "집수리", "전기공사"]],
  ["시공 · 철거", ["부분 인테리어", "종합 리모델링", "철거", "폐기물처리"]],
];

const Box = ({ children }) => (
  <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", padding: 14, minHeight: 400, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
);
const Label = ({ children }) => <div style={{ fontSize: 15, fontWeight: 700, color: TXT }}>{children}</div>;

export const CatCases = [
  {
    no: 0, name: "현재 (회색 줄 나열)", note: "카테고리 스무 개가 회색 줄로 이어져 화면이 아주 길어집니다.",
    render: () => (
      <Box>
        <Label>카테고리 선택</Label>
        {CATS.slice(0, 8).map((t) => (
          <div key={t} style={{ background: "#EFF1F4", padding: "13px 14px", borderRadius: 8, fontSize: 14, color: TXT, display: "flex", justifyContent: "space-between" }}>
            <span>{t}</span><span style={{ color: MUTED }}>▾</span>
          </div>
        ))}
        <div style={{ fontSize: 13, color: MUTED, textAlign: "center" }}>… 아래로 계속</div>
      </Box>
    ),
  },
  {
    no: 1, name: "큰 분류부터", note: "청소·설비·시공처럼 큰 갈래를 먼저 고르고, 그 안에서 세부 항목을 고릅니다.",
    render: () => (
      <Box>
        <Label>어떤 일인가요</Label>
        {GROUPS.map(([g, items], gi) => (
          <div key={g} style={{ background: "#fff", border: `1px solid ${gi === 0 ? P : LINE}`, borderRadius: 10, padding: 12 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: gi === 0 ? P_DEEP : TXT }}>{g}</div>
            {gi === 0 && (
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 10 }}>
                {items.map((t, i) => (
                  <span key={t} style={{ border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : SUB, padding: "8px 12px", fontSize: 14, borderRadius: 8 }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        ))}
      </Box>
    ),
  },
  {
    no: 2, name: "네모 칸으로 한눈에", note: "한 줄에 세 개씩 놓아 스크롤을 크게 줄입니다. 아이콘을 넣으면 더 빨리 찾습니다.",
    render: () => (
      <Box>
        <Label>카테고리 선택</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8 }}>
          {CATS.map((t, i) => (
            <div key={t} style={{ background: "#fff", border: `1px solid ${i === 0 ? P : LINE}`, borderRadius: 10, padding: "14px 6px", textAlign: "center", fontSize: 13, color: i === 0 ? P_DEEP : TXT, fontWeight: i === 0 ? 700 : 500, wordBreak: "keep-all" }}>{t}</div>
          ))}
        </div>
      </Box>
    ),
  },
  {
    no: 3, name: "검색으로 찾기", note: "자주 쓰는 것을 위에 두고, 나머지는 검색으로 찾습니다. 항목이 더 늘어나도 괜찮습니다.",
    render: () => (
      <Box>
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 14px", fontSize: 14, color: MUTED }}>무슨 일을 찾으세요</div>
        <Label>자주 찾는 일</Label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["이사청소", "누수탐지", "에어컨 청소", "도배", "변기막힘"].map((t, i) => (
            <span key={t} style={{ border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : SUB, padding: "8px 12px", fontSize: 14, borderRadius: 999 }}>{t}</span>
          ))}
        </div>
        <Label>전체 분류</Label>
        {GROUPS.map(([g]) => (
          <div key={g} style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 8, padding: "12px 14px", fontSize: 14, color: TXT, display: "flex", justifyContent: "space-between" }}>
            <span>{g}</span><span style={{ color: MUTED }}>˃</span>
          </div>
        ))}
      </Box>
    ),
  },
];

export const StepFrameCases = [
  {
    no: 0, name: "현재 (카드 안에 단계)", note: "단계 내용이 흰 카드 안에 들어가 있어 갇혀 보입니다.",
    render: () => (
      <Box>
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: 14, display: "flex", flexDirection: "column", gap: 10 }}>
          <Label>공간유형</Label>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {["아파트", "빌라", "상가"].map((t, i) => (
              <span key={t} style={{ border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : SUB, padding: "8px 12px", fontSize: 14, borderRadius: 8 }}>{t}</span>
            ))}
          </div>
          <Label>면적</Label>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "12px", fontSize: 14, color: MUTED, borderRadius: 8 }}>예: 32평</div>
          <div style={{ background: BTN, color: "#fff", textAlign: "center", padding: "12px 0", borderRadius: 8, fontSize: 15, fontWeight: 700, marginTop: 6 }}>다음</div>
        </div>
      </Box>
    ),
  },
  {
    no: 1, name: "카드 없이 화면 전체", note: "카드를 없애고 화면 전체를 씁니다. 버튼은 아래에 고정합니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#fff", minHeight: 400, display: "flex", flexDirection: "column", padding: 16 }}>
        <div style={{ fontSize: 13, color: MUTED, marginBottom: 4 }}>2단계 / 3단계</div>
        <div style={{ fontSize: 19, fontWeight: 700, color: TXT, marginBottom: 14 }}>어떤 공간인가요</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {["아파트", "빌라", "상가", "사무실"].map((t, i) => (
            <span key={t} style={{ border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : SUB, padding: "10px 14px", fontSize: 15, borderRadius: 8 }}>{t}</span>
          ))}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: TXT, marginBottom: 8 }}>면적</div>
        <div style={{ border: `1px solid ${LINE}`, padding: "13px 12px", fontSize: 15, color: MUTED, borderRadius: 8 }}>예: 32평</div>
        <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
          <div style={{ flex: 1, border: `1px solid ${LINE}`, textAlign: "center", padding: "13px 0", borderRadius: 8, fontSize: 15 }}>이대로 견적</div>
          <div style={{ flex: 1.4, background: BTN, color: "#fff", textAlign: "center", padding: "13px 0", borderRadius: 8, fontSize: 15, fontWeight: 700 }}>다음</div>
        </div>
      </div>
    ),
  },
  {
    no: 2, name: "위에 진행 막대", note: "화면 맨 위에 어디까지 왔는지 막대로 보여 주고, 내용은 카드 없이 펼칩니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#fff", minHeight: 400, display: "flex", flexDirection: "column", padding: 16 }}>
        <div style={{ height: 4, background: "#EFF1F4", borderRadius: 2, marginBottom: 14 }}>
          <div style={{ width: "66%", height: "100%", background: P, borderRadius: 2 }} />
        </div>
        <div style={{ fontSize: 19, fontWeight: 700, color: TXT, marginBottom: 14 }}>어떤 공간인가요</div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 18 }}>
          {["아파트", "빌라", "상가", "사무실"].map((t, i) => (
            <span key={t} style={{ border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : SUB, padding: "10px 14px", fontSize: 15, borderRadius: 8 }}>{t}</span>
          ))}
        </div>
        <div style={{ fontSize: 15, fontWeight: 700, color: TXT, marginBottom: 8 }}>면적</div>
        <div style={{ border: `1px solid ${LINE}`, padding: "13px 12px", fontSize: 15, color: MUTED, borderRadius: 8 }}>예: 32평</div>
        <div style={{ marginTop: "auto", background: BTN, color: "#fff", textAlign: "center", padding: "14px 0", borderRadius: 8, fontSize: 16, fontWeight: 700 }}>다음</div>
      </div>
    ),
  },
];


const SUBS = ["입주청소", "이사청소", "준공청소", "거주청소", "새집증후군", "리모델링 후 청소"];

export const SubChipCases = [
  {
    no: 0, name: "현재 (작은 글씨·두 칸)", note: "글씨가 작고 칸이 좁아 긴 이름이 답답하게 붙습니다.",
    render: () => (
      <Box>
        <Label>세부 항목 선택</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          {SUBS.map((t, i) => (
            <div key={t} style={{ border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : TXT, padding: "8px 10px", fontSize: 13, borderRadius: 6, whiteSpace: "nowrap", overflow: "hidden" }}>{t}</div>
          ))}
        </div>
      </Box>
    ),
  },
  {
    no: 1, name: "크게 두 칸 (적용됨)", note: "글씨 15px, 높이 52px, 긴 이름은 두 줄로 접힙니다. 지금 이 모양으로 올려 두었습니다.",
    render: () => (
      <Box>
        <Label>세부 항목 선택</Label>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          {SUBS.map((t, i) => (
            <div key={t} style={{ border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : TXT, fontWeight: i === 0 ? 700 : 500, minHeight: 52, padding: "13px 14px", fontSize: 15, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", wordBreak: "keep-all", lineHeight: 1.35 }}>{t}</div>
          ))}
        </div>
      </Box>
    ),
  },
  {
    no: 2, name: "한 줄에 하나 · 체크 표시", note: "여러 개 고르는 자리라 한 줄에 하나씩 두고 고른 것에 체크를 답니다. 손가락으로 누르기 가장 쉽습니다.",
    render: () => (
      <Box>
        <Label>세부 항목 선택 · 여러 개 가능</Label>
        {SUBS.map((t, i) => (
          <div key={t} style={{ border: `1px solid ${i === 0 ? P : LINE}`, background: "#fff", color: TXT, padding: "15px 16px", fontSize: 16, borderRadius: 8, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: i === 0 ? 700 : 500 }}>{t}</span>
            <span style={{ width: 22, height: 22, borderRadius: 4, border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P : "#fff", color: "#fff", fontSize: 14, display: "flex", alignItems: "center", justifyContent: "center" }}>{i === 0 ? "✓" : ""}</span>
          </div>
        ))}
      </Box>
    ),
  },
  {
    no: 3, name: "글자 길이대로 흘려 놓기", note: "칸을 반씩 나누지 않고 글자 길이대로 놓아 빈자리가 안 생깁니다.",
    render: () => (
      <Box>
        <Label>세부 항목 선택</Label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
          {SUBS.map((t, i) => (
            <span key={t} style={{ border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : TXT, fontWeight: i === 0 ? 700 : 500, padding: "13px 16px", fontSize: 15, borderRadius: 8 }}>{t}</span>
          ))}
        </div>
      </Box>
    ),
  },
];

const CatLab = () => null;
export default CatLab;
