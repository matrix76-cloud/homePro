/* eslint-disable */
/**
 * 필터 줄 시안 — /lab 의 "필터 줄" 탭. 0번이 지금 화면. (대표 9/17)
 * 고른 조건과 안 고른 조건이 잘 구분되는지, 두 줄로 넘칠 때 어떻게 보일지를 비교한다.
 */
import React from "react";

const P = "#00963F";
const P_DEEP = "#007A33";
const P_TINT = "#E6F7EE";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";

const ON = ["가까운거리순", "접수", "타지역"];
const OFF = ["기간", "카테고리"];
const TOGGLE = "마감·취소 숨김";

const Box = ({ children }) => (
  <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", padding: 14, minHeight: 150 }}>{children}</div>
);
const Row = ({ children }) => <div style={{ display: "flex", gap: 6, flexWrap: "wrap", alignItems: "center" }}>{children}</div>;

export const FilterCases = [
  {
    no: 0, name: "현재", note: "고른 것은 연보라 면에 보라 글씨, 안 고른 것은 흰 면입니다. 여섯 개가 두 줄로 넘칩니다.",
    render: () => (
      <Box>
        <Row>
          {ON.map((t) => (
            <span key={t} style={{ border: `1px solid ${P}`, background: P_TINT, color: P_DEEP, padding: "5px 9px", fontSize: 15, borderRadius: 4 }}>{t} ˅</span>
          ))}
          {OFF.map((t) => (
            <span key={t} style={{ border: `1px solid ${LINE}`, background: "#fff", color: SUB, padding: "5px 9px", fontSize: 15, borderRadius: 4 }}>{t} ˅</span>
          ))}
          <span style={{ border: `1px solid ${P}`, background: P_TINT, color: P_DEEP, padding: "5px 9px", fontSize: 15, borderRadius: 4 }}>{TOGGLE}</span>
        </Row>
      </Box>
    ),
  },
  {
    no: 1, name: "고른 것만 진하게", note: "고른 것은 보라 면에 흰 글씨로 또렷하게, 나머지는 회색 글씨로 물러나게 합니다.",
    render: () => (
      <Box>
        <Row>
          {ON.map((t) => (
            <span key={t} style={{ border: `1px solid ${P}`, background: P, color: "#fff", padding: "6px 10px", fontSize: 14, fontWeight: 700, borderRadius: 999 }}>{t} ×</span>
          ))}
          {OFF.map((t) => (
            <span key={t} style={{ border: `1px solid ${LINE}`, background: "#fff", color: SUB, padding: "6px 10px", fontSize: 14, borderRadius: 999 }}>{t} ˅</span>
          ))}
          <span style={{ border: `1px solid ${P}`, background: P, color: "#fff", padding: "6px 10px", fontSize: 14, fontWeight: 700, borderRadius: 999 }}>{TOGGLE}</span>
        </Row>
      </Box>
    ),
  },
  {
    no: 2, name: "한 줄 + 옆으로 밀기", note: "두 줄로 넘기지 않고 한 줄에 두고 옆으로 밀어 봅니다. 위쪽이 덜 차지합니다.",
    render: () => (
      <Box>
        <div style={{ display: "flex", gap: 6, overflowX: "auto", paddingBottom: 4 }}>
          {[...ON, ...OFF, TOGGLE].map((t, i) => (
            <span key={t} style={{ flexShrink: 0, border: `1px solid ${i < 3 || t === TOGGLE ? P : LINE}`, background: i < 3 || t === TOGGLE ? P_TINT : "#fff", color: i < 3 || t === TOGGLE ? P_DEEP : SUB, padding: "6px 10px", fontSize: 14, borderRadius: 6 }}>{t}</span>
          ))}
        </div>
        <div style={{ fontSize: 13, color: SUB, marginTop: 8 }}>옆으로 밀어 나머지 조건을 봅니다.</div>
      </Box>
    ),
  },
  {
    no: 3, name: "필터 버튼 하나로", note: "버튼 하나만 두고, 고른 조건만 그 옆에 남깁니다. 가장 단순합니다.",
    render: () => (
      <Box>
        <Row>
          <span style={{ border: `1px solid ${LINE}`, background: "#fff", color: TXT, padding: "8px 14px", fontSize: 14, fontWeight: 700, borderRadius: 6 }}>필터 3</span>
          {ON.map((t) => (
            <span key={t} style={{ border: `1px solid ${P}`, background: "#fff", color: P_DEEP, padding: "7px 10px", fontSize: 13, borderRadius: 6 }}>{t} ×</span>
          ))}
          <span style={{ marginLeft: "auto", fontSize: 14, color: TXT }}>9건</span>
        </Row>
        <div style={{ fontSize: 13, color: SUB, marginTop: 10 }}>필터 버튼을 누르면 조건 전체가 펼쳐집니다.</div>
      </Box>
    ),
  },
  {
    no: 4, name: "정렬만 따로", note: "정렬은 오른쪽 끝에 글자로 두고, 왼쪽에는 거르는 조건만 둡니다.",
    render: () => (
      <Box>
        <Row>
          <span style={{ border: `1px solid ${P}`, background: P_TINT, color: P_DEEP, padding: "6px 10px", fontSize: 14, borderRadius: 6 }}>접수</span>
          <span style={{ border: `1px solid ${P}`, background: P_TINT, color: P_DEEP, padding: "6px 10px", fontSize: 14, borderRadius: 6 }}>타지역</span>
          <span style={{ border: `1px solid ${LINE}`, background: "#fff", color: SUB, padding: "6px 10px", fontSize: 14, borderRadius: 6 }}>기간</span>
          <span style={{ border: `1px solid ${LINE}`, background: "#fff", color: SUB, padding: "6px 10px", fontSize: 14, borderRadius: 6 }}>카테고리</span>
          <span style={{ marginLeft: "auto", fontSize: 14, color: P_DEEP, fontWeight: 700 }}>가까운거리순 ˅</span>
        </Row>
        <div style={{ fontSize: 13, color: SUB, marginTop: 10 }}>마감·취소 숨김은 필터 안으로 옮깁니다.</div>
      </Box>
    ),
  },
];


/* ───────── 필터를 눌렀을 때 펼쳐지는 전체 조건 ───────── */
const Chip = ({ t, on }) => (
  <span style={{ border: "1px solid " + (on ? P : LINE), background: on ? P_TINT : "#fff", color: on ? P_DEEP : SUB, padding: "7px 11px", fontSize: 14, borderRadius: 6 }}>{t}</span>
);
const Label = ({ children }) => <div style={{ fontSize: 13, fontWeight: 700, color: TXT, margin: "2px 0 6px" }}>{children}</div>;

export const FilterOpenCases = [
  {
    no: 0, name: "현재 (조건 여섯 개가 한 덩어리)", note: "정렬·상태·거리·기간·카테고리·숨김이 구분 없이 이어져 무엇이 무엇인지 알기 어렵습니다.",
    render: () => (
      <Box>
        <Row>
          <Chip t="가까운거리순 ˅" on /><Chip t="접수 ˅" on /><Chip t="타지역 ˅" on />
          <Chip t="기간 ˅" /><Chip t="카테고리 ˅" /><Chip t="마감·취소 숨김" on />
        </Row>
      </Box>
    ),
  },
  {
    no: 1, name: "이름을 붙여 묶기", note: "정렬·상태·거리처럼 무엇을 고르는 줄인지 앞에 적어 줍니다.",
    render: () => (
      <Box>
        <Label>정렬</Label>
        <Row><Chip t="등록순" /><Chip t="가까운거리순" on /><Chip t="서비스순" /></Row>
        <div style={{ height: 12 }} />
        <Label>상태</Label>
        <Row><Chip t="전체" /><Chip t="접수" on /><Chip t="대기" /><Chip t="배정" /></Row>
        <div style={{ height: 12 }} />
        <Label>거리</Label>
        <Row><Chip t="전체" /><Chip t="내 동네" /><Chip t="같은 시" /><Chip t="타지역" on /></Row>
        <div style={{ height: 12 }} />
        <Label>그 밖에</Label>
        <Row><Chip t="기간" /><Chip t="카테고리" /><Chip t="마감·취소 숨김" on /></Row>
      </Box>
    ),
  },
  {
    no: 2, name: "아래에서 올라오는 창", note: "목록을 가리지 않게 아래에서 창이 올라오고, 다 고른 뒤 적용을 누릅니다.",
    render: () => (
      <Box>
        <div style={{ background: "#fff", border: "1px solid " + LINE, borderRadius: "14px 14px 0 0", padding: 14 }}>
          <div style={{ width: 40, height: 4, background: LINE, borderRadius: 2, margin: "0 auto 12px" }} />
          <Label>상태</Label>
          <Row><Chip t="전체" /><Chip t="접수" on /><Chip t="대기" /></Row>
          <div style={{ height: 10 }} />
          <Label>거리</Label>
          <Row><Chip t="전체" /><Chip t="내 동네" /><Chip t="타지역" on /></Row>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <div style={{ flex: 1, textAlign: "center", padding: "12px 0", border: "1px solid " + LINE, background: "#fff", fontSize: 15 }}>초기화</div>
            <div style={{ flex: 1.4, textAlign: "center", padding: "12px 0", background: P, color: "#fff", fontSize: 15, fontWeight: 700 }}>9건 보기</div>
          </div>
        </div>
      </Box>
    ),
  },
  {
    no: 3, name: "줄마다 오른쪽에 값", note: "한 줄에 항목 이름과 지금 고른 값을 두고, 누르면 그 항목만 펼칩니다.",
    render: () => (
      <Box>
        <div style={{ background: "#fff", border: "1px solid " + LINE }}>
          {[["정렬", "가까운거리순"], ["상태", "접수"], ["거리", "타지역"], ["기간", "전체"], ["카테고리", "전체"]].map(([a, b], i) => (
            <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "12px 14px", borderBottom: i === 4 ? "none" : "1px solid #F2F4F7", fontSize: 14 }}>
              <span style={{ color: TXT }}>{a}</span>
              <span style={{ color: b === "전체" ? SUB : P_DEEP, fontWeight: b === "전체" ? 400 : 700 }}>{b} ˃</span>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 14, color: TXT }}>
          <span>마감·취소 숨김</span>
          <span style={{ width: 40, height: 22, borderRadius: 999, background: P, position: "relative" }}>
            <i style={{ position: "absolute", right: 3, top: 3, width: 16, height: 16, borderRadius: "50%", background: "#fff" }} />
          </span>
        </div>
      </Box>
    ),
  },
];

const FilterLab = () => null;
export default FilterLab;
