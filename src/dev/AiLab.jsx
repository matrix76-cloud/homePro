/* eslint-disable */
/**
 * AI 견적 시안 — 입력 화면과 결과 화면. 0번이 지금 화면. (대표 9/17)
 */
import React from "react";
import { IoSparklesOutline, IoChevronForward } from "react-icons/io5";

const P = "#00963F";
const P_DEEP = "#007A33";
const P_TINT = "#E6F7EE";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";
const MUTED = "#8A93A0";

const Box = ({ children }) => (
  <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", padding: 14, minHeight: 380, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
);
const Label = ({ children }) => <div style={{ fontSize: 14, fontWeight: 700, color: TXT }}>{children}</div>;
const Field = ({ children, muted }) => (
  <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "12px 12px", fontSize: 14, color: muted ? MUTED : TXT, borderRadius: 8 }}>{children}</div>
);
const Btn = ({ children, ghost }) => (
  <div style={{ background: ghost ? "#fff" : P, color: ghost ? TXT : "#fff", border: ghost ? `1px solid ${LINE}` : "none", padding: "13px 0", textAlign: "center", fontSize: 15, fontWeight: 700, borderRadius: 8 }}>{children}</div>
);

export const AiInputCases = [
  {
    no: 0, name: "현재 (다음을 눌러 진행 · 적용됨)", note: "한 화면에 칸을 다 펼치지 않고 단계로 넘어갑니다. 2단계에서 바로 견적을 받을 수도 있습니다.",
    render: () => (
      <Box>
        <Label>무엇을 맡기실 건가요</Label>
        <Field muted>전문청소 ˄</Field>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["홈클리닝", "준공청소", "특수청소"].map((t, i) => (
            <span key={t} style={{ border: "1px solid " + (i === 0 ? P : LINE), background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : SUB, padding: "8px 12px", fontSize: 14, borderRadius: 8 }}>{t}</span>
          ))}
        </div>
        <div style={{ fontSize: 13, color: SUB, marginTop: 8 }}>무엇을 맡기실지 고르셨습니다.</div>
        <div style={{ marginTop: "auto" }}><Btn>다음</Btn></div>
        <div style={{ fontSize: 12, color: MUTED, textAlign: "center" }}>다음 단계에서 공간·면적을 넣습니다</div>
      </Box>
    ),
  },
  {
    no: 1, name: "2단계 · 공간과 면적", note: "여기서 바로 견적을 받거나, 한 단계 더 가서 자세히 적을 수 있습니다.",
    render: () => (
      <Box>
        <Label>공간유형</Label>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {["아파트", "빌라", "상가", "사무실"].map((t, i) => (
            <span key={t} style={{ border: "1px solid " + (i === 0 ? P : LINE), background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : SUB, padding: "8px 12px", fontSize: 14, borderRadius: 8 }}>{t}</span>
          ))}
        </div>
        <Label>면적</Label>
        <Field muted>예: 32평</Field>
        <div style={{ fontSize: 13, color: SUB, marginTop: 8 }}>공간과 면적을 넣으면 금액이 더 정확해집니다.</div>
        <div style={{ marginTop: "auto", display: "flex", gap: 8 }}>
          <div style={{ flex: 1 }}><Btn ghost>이대로 견적 받기</Btn></div>
          <div style={{ flex: 1.4 }}><Btn>다음</Btn></div>
        </div>
      </Box>
    ),
  },
  {
    no: 2, name: "3단계 · 자세히 적기", note: "특이사항을 적고 분석을 누릅니다.",
    render: () => (
      <Box>
        <Label>작업 내용 (선택)</Label>
        <div style={{ background: "#fff", border: "1px solid " + LINE, padding: 14, minHeight: 120, fontSize: 14, color: MUTED, borderRadius: 8 }}>
          면적, 수량, 특이사항 등을 적으면 더 정확한 견적을 받을 수 있어요.
        </div>
        <div style={{ marginTop: "auto" }}><Btn>AI 견적 분석하기</Btn></div>
      </Box>
    ),
  },
  {
    no: 9, name: "예전 (칸을 한 번에 다)", note: "카테고리부터 작업 내용까지 한 화면에 모두 펼쳐 두던 방식입니다.",
    render: () => (
      <Box>
        <Label>카테고리 선택</Label><Field muted>전문청소 ˅</Field>
        <Label>세부 항목 선택</Label><Field muted>이사청소 ˅</Field>
        <Label>공간유형</Label><Field muted>아파트 ˅</Field>
        <Label>면적 (선택)</Label><Field muted>예: 30평, 100m²</Field>
        <Label>작업 내용 (선택)</Label><Field muted>면적, 수량, 특이사항을 적어 주세요</Field>
        <div style={{ marginTop: "auto" }}><Btn>AI 견적 받기</Btn></div>
      </Box>
    ),
  },
  {
    no: 7, name: "한 줄로 물어보기 (다른 안)", note: "말하듯 한 줄만 적으면 됩니다. 필요한 값은 AI가 되물어봅니다.",
    render: () => (
      <Box>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <IoSparklesOutline size={20} color={P} />
          <div style={{ fontSize: 16, fontWeight: 700, color: TXT }}>무엇이 궁금하세요</div>
        </div>
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: 14, minHeight: 90, fontSize: 14, color: MUTED, borderRadius: 8 }}>
          예: 32평 아파트 이사청소 얼마나 나올까요
        </div>
        <Label>이렇게 물어보셔도 됩니다</Label>
        {["벽걸이 에어컨 2대 분해청소", "화장실 누수 탐지 비용", "상가 30평 준공청소"].map((t) => (
          <div key={t} style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "11px 12px", fontSize: 14, color: TXT, borderRadius: 8 }}>{t}</div>
        ))}
        <div style={{ marginTop: "auto" }}><Btn>견적 받기</Btn></div>
      </Box>
    ),
  },
  {
    no: 8, name: "꼭 필요한 것만 (다른 안)", note: "카테고리와 면적만 받고 나머지는 선택으로 접어 둡니다. 칸이 절반으로 줄어듭니다.",
    render: () => (
      <Box>
        <Label>무슨 일인가요</Label><Field muted>전문청소 · 이사청소 ˅</Field>
        <Label>면적</Label><Field muted>예: 32평</Field>
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "12px", fontSize: 14, color: SUB, display: "flex", justifyContent: "space-between", borderRadius: 8 }}>
          <span>자세히 적기 (선택)</span><IoChevronForward size={16} color={MUTED} />
        </div>
        <div style={{ fontSize: 13, color: SUB, lineHeight: 1.6 }}>자세히 적을수록 실제 금액에 가까워집니다.</div>
        <div style={{ marginTop: "auto" }}><Btn>견적 받기</Btn></div>
      </Box>
    ),
  },
];

export const AiResultCases = [
  {
    no: 0, name: "현재 (금액과 항목)", note: "예상 금액과 항목별 내역, 소요시간, 팁을 보여 줍니다.",
    render: () => (
      <Box>
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: 16, textAlign: "center", borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: SUB }}>예상 견적</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: P_DEEP, marginTop: 6 }}>45만 ~ 60만원</div>
        </div>
        <Label>항목</Label>
        {[["기본 청소", "35만원"], ["창틀·베란다", "10만원"], ["출장비", "3만원"]].map(([a, b]) => (
          <div key={a} style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "11px 12px", display: "flex", justifyContent: "space-between", fontSize: 14, borderRadius: 8 }}>
            <span style={{ color: TXT }}>{a}</span><span style={{ color: TXT, fontWeight: 700 }}>{b}</span>
          </div>
        ))}
        <div style={{ fontSize: 13, color: SUB }}>예상 소요시간 5~6시간</div>
      </Box>
    ),
  },
  {
    no: 1, name: "바로 접수로 잇기", note: "견적을 본 뒤 그대로 오더를 접수하도록 버튼을 둡니다. 입력한 내용이 그대로 넘어갑니다.",
    render: () => (
      <Box>
        <div style={{ background: P, color: "#fff", padding: 18, textAlign: "center", borderRadius: 10 }}>
          <div style={{ fontSize: 13, opacity: 0.9 }}>예상 견적</div>
          <div style={{ fontSize: 26, fontWeight: 700, marginTop: 6 }}>45만 ~ 60만원</div>
          <div style={{ fontSize: 13, opacity: 0.9, marginTop: 6 }}>32평 아파트 이사청소 기준</div>
        </div>
        {[["기본 청소", "35만원"], ["창틀·베란다", "10만원"]].map(([a, b]) => (
          <div key={a} style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "11px 12px", display: "flex", justifyContent: "space-between", fontSize: 14, borderRadius: 8 }}>
            <span style={{ color: TXT }}>{a}</span><span style={{ color: TXT, fontWeight: 700 }}>{b}</span>
          </div>
        ))}
        <div style={{ marginTop: "auto", display: "flex", flexDirection: "column", gap: 8 }}>
          <Btn>이 내용으로 예약접수</Btn>
          <Btn ghost>다시 물어보기</Btn>
        </div>
      </Box>
    ),
  },
  {
    no: 2, name: "근거와 주의 함께", note: "금액이 왜 그런지, 무엇에 따라 달라지는지 함께 알려 줍니다. 분쟁을 줄입니다.",
    render: () => (
      <Box>
        <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: 16, textAlign: "center", borderRadius: 8 }}>
          <div style={{ fontSize: 13, color: SUB }}>예상 견적</div>
          <div style={{ fontSize: 22, fontWeight: 700, color: P_DEEP, marginTop: 6 }}>45만 ~ 60만원</div>
        </div>
        <div style={{ background: P_TINT, border: `1px solid ${P}`, padding: 12, fontSize: 13, color: TXT, lineHeight: 1.6, borderRadius: 8 }}>
          평수와 오염 정도를 기준으로 계산했습니다. 곰팡이 제거나 창문 수가 많으면 올라갑니다.
        </div>
        <Label>항목</Label>
        {[["기본 청소", "35만원"], ["창틀·베란다", "10만원"]].map(([a, b]) => (
          <div key={a} style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "11px 12px", display: "flex", justifyContent: "space-between", fontSize: 14, borderRadius: 8 }}>
            <span style={{ color: TXT }}>{a}</span><span style={{ color: TXT, fontWeight: 700 }}>{b}</span>
          </div>
        ))}
        <div style={{ fontSize: 12, color: MUTED, marginTop: "auto" }}>실제 금액은 현장 확인 뒤 달라질 수 있습니다.</div>
      </Box>
    ),
  },
];

const AiLab = () => null;
export default AiLab;
