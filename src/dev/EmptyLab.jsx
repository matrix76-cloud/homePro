/* eslint-disable */
/**
 * 빈 화면 시안 — 오더가 하나도 없을 때. 0번이 지금 화면. (대표 9/17 "너무 밋밋")
 */
import React from "react";
import { IoDocumentTextOutline, IoSearchOutline, IoAddCircleOutline, IoNotificationsOutline } from "react-icons/io5";

const P = "#00963F";
const P_DEEP = "#007A33";
const P_TINT = "#E6F7EE";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";

const Box = ({ children }) => (
  <div style={{ border: `1px solid ${LINE}`, background: "#fff", minHeight: 330, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 24, textAlign: "center", gap: 10 }}>{children}</div>
);
const Btn = ({ children, ghost }) => (
  <div style={{ background: ghost ? "#fff" : P, color: ghost ? TXT : "#fff", border: ghost ? `1px solid ${LINE}` : "none", padding: "11px 18px", fontSize: 15, fontWeight: 700, borderRadius: 8 }}>{children}</div>
);

export const EmptyCases = [
  {
    no: 0, name: "현재", note: "글자 한 줄만 있어 허전합니다.",
    render: () => (
      <Box><div style={{ fontSize: 15, color: SUB }}>해당 상태의 오더가 없어요.</div></Box>
    ),
  },
  {
    no: 1, name: "그림과 안내", note: "아이콘과 함께 왜 비었는지, 다음에 무엇을 하면 되는지 알려 줍니다.",
    render: () => (
      <Box>
        <div style={{ width: 66, height: 66, borderRadius: "50%", background: P_TINT, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IoDocumentTextOutline size={30} color={P} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: TXT, marginTop: 4 }}>아직 오더가 없어요</div>
        <div style={{ fontSize: 14, color: SUB, lineHeight: 1.6 }}>고른 조건에 맞는 오더가 없습니다.{"\n"}조건을 바꾸면 더 많은 오더가 보입니다.</div>
        <div style={{ marginTop: 8 }}><Btn ghost>조건 바꾸기</Btn></div>
      </Box>
    ),
  },
  {
    no: 2, name: "행동 두 가지", note: "조건을 넓히거나, 직접 오더를 등록하도록 두 길을 줍니다.",
    render: () => (
      <Box>
        <div style={{ width: 66, height: 66, borderRadius: "50%", background: P_TINT, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IoSearchOutline size={30} color={P} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: TXT, marginTop: 4 }}>조건에 맞는 오더가 없어요</div>
        <div style={{ fontSize: 14, color: SUB, lineHeight: 1.6 }}>거리를 넓히거나 기간을 늘려 보세요.</div>
        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
          <Btn ghost>조건 초기화</Btn>
          <Btn>예약접수 하기</Btn>
        </div>
      </Box>
    ),
  },
  {
    no: 3, name: "알림 받기 권유", note: "새 오더가 올라오면 알려 준다고 안내해 다시 오게 만듭니다.",
    render: () => (
      <Box>
        <div style={{ width: 66, height: 66, borderRadius: "50%", background: P_TINT, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <IoNotificationsOutline size={30} color={P} />
        </div>
        <div style={{ fontSize: 17, fontWeight: 700, color: TXT, marginTop: 4 }}>지금은 올라온 오더가 없어요</div>
        <div style={{ fontSize: 14, color: SUB, lineHeight: 1.6 }}>내 분야에 새 오더가 들어오면{"\n"}바로 알려 드릴게요.</div>
        <div style={{ marginTop: 10 }}><Btn>알림 받기</Btn></div>
      </Box>
    ),
  },
  {
    no: 4, name: "가까운 조건 제안", note: "비어 있는 대신 조금 넓힌 조건의 결과를 바로 보여 줍니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#fff", minHeight: 330, padding: 18 }}>
        <div style={{ textAlign: "center", padding: "18px 0 14px" }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: TXT }}>내 동네에는 오더가 없어요</div>
          <div style={{ fontSize: 14, color: SUB, marginTop: 6 }}>가까운 지역 오더를 대신 보여 드릴게요.</div>
        </div>
        <div style={{ border: `1px solid ${LINE}` }}>
          {[["오늘", "접수", "누수탐지 · 같은 시"], ["08/19", "접수", "홈클리닝 · 타지역"]].map(([a, b, c]) => (
            <div key={c} style={{ display: "flex", gap: 8, padding: "11px 12px", borderBottom: `1px solid #F2F4F7`, fontSize: 13, color: TXT }}>
              <span style={{ width: 46 }}>{a}</span>
              <span style={{ width: 40, color: P_DEEP, fontWeight: 700 }}>{b}</span>
              <span style={{ flex: 1 }}>{c}</span>
            </div>
          ))}
        </div>
        <div style={{ textAlign: "center", marginTop: 14 }}><Btn ghost>내 조건으로 돌아가기</Btn></div>
      </div>
    ),
  },
];

const EmptyLab = () => null;
export default EmptyLab;
