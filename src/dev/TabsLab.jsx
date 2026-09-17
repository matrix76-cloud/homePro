/* eslint-disable */
/**
 * 홈 안쪽 탭 시안 — 나의오더현황 · AI견적 · 보유자산.
 * 탭마다 후보를 나란히 두었다. 0번이 지금 화면. (대표 9/17)
 */
import React from "react";

const P = "#00963F";
const P_DEEP = "#007A33";
const P_TINT = "#E6F7EE";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";
const MUTED = "#8A93A0";

const Box = ({ children, pad = 12 }) => (
  <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", padding: pad, minHeight: 300 }}>{children}</div>
);
const Card = ({ children, style }) => (
  <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: 12, ...style }}>{children}</div>
);
const Title = ({ children }) => <div style={{ fontSize: 15, fontWeight: 700, color: TXT, margin: "2px 0 8px" }}>{children}</div>;

export const TabSections = [
  {
    group: "나의오더현황",
    items: [
      { no: 0, name: "현재 (상태별 개수 + 목록)", note: "위에 상태별 개수를 늘어놓고 아래에 오더를 표로 보여 줍니다.", render: () => (
        <Box>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 10 }}>
            {[["전체", 15], ["접수", 0], ["대기", 1], ["선정대기", 0], ["배정", 5], ["완료", 7]].map(([t, n]) => (
              <span key={t} style={{ border: `1px solid ${t === "전체" ? P : LINE}`, background: t === "전체" ? P_TINT : "#fff", padding: "6px 10px", fontSize: 13, color: TXT }}>{t} {n}</span>
            ))}
          </div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}` }}>
            {["08/19 · 배정 · 홈클리닝", "08/12 · 완료 · 누수탐지", "08/02 · 완료 · 도배"].map((t) => (
              <div key={t} style={{ padding: "11px 12px", borderBottom: `1px solid #F2F4F7`, fontSize: 14, color: TXT }}>{t}</div>
            ))}
          </div>
        </Box>
      ) },
      { no: 1, name: "할 일 먼저", note: "지금 손이 필요한 오더를 맨 위에 모읍니다. 체크인·완료·입금 확인 같은 것입니다.", render: () => (
        <Box>
          <Title>지금 할 일 2건</Title>
          <Card style={{ borderColor: P, marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TXT }}>홈클리닝 이사청소</div>
            <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>오늘 작업 · 현장 체크인이 필요합니다</div>
            <div style={{ marginTop: 8, background: P, color: "#fff", textAlign: "center", padding: "9px 0", fontSize: 14, fontWeight: 700 }}>현장 체크인</div>
          </Card>
          <Card style={{ borderColor: P, marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TXT }}>누수탐지</div>
            <div style={{ fontSize: 13, color: SUB, marginTop: 4 }}>캐시백 입금 확인을 기다리고 있습니다</div>
          </Card>
          <Title>그 밖의 오더</Title>
          <div style={{ background: "#fff", border: `1px solid ${LINE}` }}>
            {["08/12 · 완료 · 도배", "08/02 · 완료 · 특수청소"].map((t) => (
              <div key={t} style={{ padding: "11px 12px", borderBottom: `1px solid #F2F4F7`, fontSize: 14, color: TXT }}>{t}</div>
            ))}
          </div>
        </Box>
      ) },
      { no: 2, name: "진행 중과 지난 오더 분리", note: "진행 중인 오더와 끝난 오더를 위아래로 나눕니다.", render: () => (
        <Box>
          <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
            {["진행 중 6", "지난 오더 9"].map((t, i) => (
              <div key={t} style={{ flex: 1, textAlign: "center", padding: "10px 0", fontSize: 14, fontWeight: i === 0 ? 700 : 500, background: i === 0 ? P : "#fff", color: i === 0 ? "#fff" : TXT, border: `1px solid ${i === 0 ? P : LINE}` }}>{t}</div>
            ))}
          </div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}` }}>
            {["08/19 · 배정 · 홈클리닝 · 오늘 작업", "08/16 · 배정 · 준공청소 · 내일 작업", "08/14 · 선정대기 · 도배"].map((t) => (
              <div key={t} style={{ padding: "12px", borderBottom: `1px solid #F2F4F7`, fontSize: 14, color: TXT }}>{t}</div>
            ))}
          </div>
        </Box>
      ) },
    ],
  },
  {
    group: "AI견적",
    items: [
      { no: 0, name: "현재 (카테고리부터)", note: "카테고리를 고르고 내용을 적으면 예상 금액을 알려 줍니다.", render: () => (
        <Box>
          <Title>카테고리 선택</Title>
          <Card style={{ marginBottom: 8 }}>전문청소 ▾</Card>
          <Title>내용</Title>
          <Card style={{ color: MUTED, marginBottom: 10 }}>어떤 작업이 필요한지 적어 주세요</Card>
          <div style={{ background: P, color: "#fff", textAlign: "center", padding: "12px 0", fontSize: 15, fontWeight: 700 }}>견적 받기</div>
        </Box>
      ) },
      { no: 1, name: "예시로 시작", note: "무엇을 적어야 할지 모르는 사장님을 위해 예시를 눌러 시작합니다.", render: () => (
        <Box>
          <Title>이런 것을 물어볼 수 있어요</Title>
          {["32평 아파트 이사청소 얼마인가요", "벽걸이 에어컨 2대 분해청소", "화장실 누수 탐지 비용"].map((t) => (
            <Card key={t} style={{ marginBottom: 8, fontSize: 14, color: TXT }}>{t}</Card>
          ))}
          <Card style={{ color: MUTED, marginTop: 10, marginBottom: 10 }}>직접 적기</Card>
          <div style={{ background: P, color: "#fff", textAlign: "center", padding: "12px 0", fontSize: 15, fontWeight: 700 }}>견적 받기</div>
        </Box>
      ) },
      { no: 2, name: "지난 견적 함께", note: "받은 견적을 아래에 남겨 두어 다시 볼 수 있게 합니다.", render: () => (
        <Box>
          <Card style={{ marginBottom: 8 }}>전문청소 ▾</Card>
          <Card style={{ color: MUTED, marginBottom: 10 }}>어떤 작업이 필요한지 적어 주세요</Card>
          <div style={{ background: P, color: "#fff", textAlign: "center", padding: "12px 0", fontSize: 15, fontWeight: 700, marginBottom: 14 }}>견적 받기</div>
          <Title>지난 견적</Title>
          <div style={{ background: "#fff", border: `1px solid ${LINE}` }}>
            {[["이사청소 32평", "45만 ~ 60만원"], ["에어컨 2대", "11만 ~ 15만원"]].map(([a, b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "11px 12px", borderBottom: `1px solid #F2F4F7`, fontSize: 14 }}>
                <span style={{ color: TXT }}>{a}</span><span style={{ color: P_DEEP, fontWeight: 700 }}>{b}</span>
              </div>
            ))}
          </div>
        </Box>
      ) },
    ],
  },
  {
    group: "보유자산",
    items: [
      { no: 0, name: "현재 (초대코드 + 포인트 내역)", note: "초대코드를 먼저 보여 주고 아래에 포인트 내역을 둡니다.", render: () => (
        <Box>
          <Card style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TXT }}>내 추천코드</div>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
              <span style={{ fontSize: 18, fontWeight: 700, color: P_DEEP }}>SQ763016</span>
              <span style={{ background: P, color: "#fff", padding: "6px 12px", fontSize: 13 }}>복사</span>
            </div>
          </Card>
          <Card style={{ marginBottom: 10, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: SUB }}>총 보유 포인트</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: P_DEEP, marginTop: 4 }}>6,925P</div>
          </Card>
          <div style={{ background: "#fff", border: `1px solid ${LINE}` }}>
            {[["친구 초대 보상", "+3,000P"], ["오더 등록 보상", "+300P"]].map(([a, b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "11px 12px", borderBottom: `1px solid #F2F4F7`, fontSize: 14 }}>
                <span style={{ color: TXT }}>{a}</span><span style={{ color: P_DEEP, fontWeight: 700 }}>{b}</span>
              </div>
            ))}
          </div>
        </Box>
      ) },
      { no: 1, name: "포인트 먼저", note: "포인트 잔액과 내역을 먼저 보여 주고 초대코드는 아래에 둡니다.", render: () => (
        <Box>
          <div style={{ background: P, color: "#fff", padding: 16, textAlign: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 13, opacity: 0.9 }}>총 보유 포인트</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>6,925P</div>
          </div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, marginBottom: 10 }}>
            {[["친구 초대 보상", "+3,000P"], ["오더 등록 보상", "+300P"], ["리뷰 작성 보상", "+300P"]].map(([a, b]) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", padding: "11px 12px", borderBottom: `1px solid #F2F4F7`, fontSize: 14 }}>
                <span style={{ color: TXT }}>{a}</span><span style={{ color: P_DEEP, fontWeight: 700 }}>{b}</span>
              </div>
            ))}
          </div>
          <Card>
            <div style={{ fontSize: 14, color: SUB }}>초대코드 <b style={{ color: P_DEEP }}>SQ763016</b> · 공유하면 3,000P</div>
          </Card>
        </Box>
      ) },
      { no: 2, name: "쓸 곳 함께 안내", note: "모은 포인트로 무엇을 할 수 있는지 함께 보여 줍니다.", render: () => (
        <Box>
          <div style={{ background: P, color: "#fff", padding: 16, textAlign: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 13, opacity: 0.9 }}>총 보유 포인트</div>
            <div style={{ fontSize: 28, fontWeight: 700, marginTop: 4 }}>6,925P</div>
          </div>
          <Title>포인트로 할 수 있는 것</Title>
          {[["월 구독료 내기", "20,000P"], ["교육 공고 등록", "20,000P"], ["오더 대금 주고받기", "자유"]].map(([a, b]) => (
            <Card key={a} style={{ marginBottom: 8, display: "flex", justifyContent: "space-between" }}>
              <span style={{ fontSize: 14, color: TXT }}>{a}</span><span style={{ fontSize: 14, color: P_DEEP, fontWeight: 700 }}>{b}</span>
            </Card>
          ))}
          <Card style={{ marginTop: 6 }}>
            <div style={{ fontSize: 14, color: SUB }}>초대코드 <b style={{ color: P_DEEP }}>SQ763016</b> · 공유하면 3,000P</div>
          </Card>
        </Box>
      ) },
    ],
  },
];

const TabsLab = () => null;
export default TabsLab;
