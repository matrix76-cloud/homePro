/* eslint-disable */
/**
 * 보유자산 탭 전체 화면 시안 — 0번이 지금 화면 (대표 9/17)
 * 지금은 초대 카드 넉 장이 먼저 나오고 포인트가 맨 아래에 묻힌다.
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

const Screen = ({ children }) => (
  <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", padding: 12, minHeight: 560, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
);
const Card = ({ children, pad = 14 }) => (
  <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: pad }}>{children}</div>
);
const T = ({ children }) => <div style={{ fontSize: 16, fontWeight: 700, color: TXT, marginBottom: 6 }}>{children}</div>;
const D = ({ children }) => <div style={{ fontSize: 14, color: SUB, lineHeight: 1.55 }}>{children}</div>;

const HISTORY = [
  ["추천인 가입 보상", "09/14", "+5,000P"],
  ["오더 접수 차감", "09/12", "-1,500P"],
  ["가입 축하 포인트", "09/01", "+3,000P"],
];

const Rows = () => (
  <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden" }}>
    {HISTORY.map(([a, b, c], i) => (
      <div key={a} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 14px", borderTop: i ? `1px solid #F0F2F5` : "none" }}>
        <div>
          <div style={{ fontSize: 15, color: TXT, fontWeight: 500 }}>{a}</div>
          <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{b}</div>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, color: c[0] === "+" ? P_DEEP : TXT }}>{c}</div>
      </div>
    ))}
  </div>
);

const Chips = () => (
  <div style={{ display: "flex", gap: 6 }}>
    {["전체", "3개월", "6개월", "1년"].map((t, i) => (
      <span key={t} style={{ border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : SUB, padding: "8px 13px", fontSize: 14, borderRadius: 8 }}>{t}</span>
    ))}
  </div>
);

const Big = ({ label = "총 보유 포인트", v = "7,500P" }) => (
  <div style={{ background: BTN, color: "#fff", borderRadius: 12, padding: "20px 16px", textAlign: "center" }}>
    <div style={{ fontSize: 14, opacity: 0.92 }}>{label}</div>
    <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>{v}</div>
  </div>
);

export const AssetCases = [
  {
    no: 0, name: "현재 (초대가 먼저)", note: "추천코드·초대공유·초대현황·추천코드 카드 넉 장을 지나야 포인트가 나옵니다. 탭 이름은 보유자산인데 자산이 화면 밖에 있습니다.",
    render: () => (
      <Screen>
        <Card><T>내 추천코드</T><D>친구에게 코드를 공유하고 포인트를 받으세요</D>
          <div style={{ marginTop: 10, background: "#F7F8FA", borderRadius: 10, padding: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 19, fontWeight: 700, color: P_DEEP }}>XZ646873</span>
            <span style={{ background: BTN, color: "#fff", padding: "9px 16px", borderRadius: 8, fontSize: 15, fontWeight: 700 }}>복사</span>
          </div>
        </Card>
        <Card><T>초대 공유</T><D>초대 링크로 가입하면 추천코드가 자동으로 입력됩니다</D></Card>
        <Card><T>초대 현황</T><D>초대한 친구 0명 · 받은 포인트 7,500P</D></Card>
        <Card><T>추천코드</T><D>이미 추천코드로 가입되었습니다</D></Card>
        <Big />
        <div style={{ fontSize: 13, color: MUTED, textAlign: "center" }}>… 포인트 내역은 더 아래</div>
      </Screen>
    ),
  },
  {
    no: 1, name: "포인트를 맨 위로", note: "자산을 먼저 보여 주고 초대는 아래 한 장으로 줄입니다. 탭 이름과 화면이 맞아떨어집니다.",
    render: () => (
      <Screen>
        <Big />
        <div style={{ display: "flex", gap: 8, marginTop: 2 }}>
          <span style={{ flex: 1, textAlign: "center", border: `1px solid ${LINE}`, background: "#fff", borderRadius: 10, padding: "13px 0", fontSize: 15, fontWeight: 700, color: TXT }}>포인트 충전</span>
          <span style={{ flex: 1, textAlign: "center", border: `1px solid ${LINE}`, background: "#fff", borderRadius: 10, padding: "13px 0", fontSize: 15, fontWeight: 700, color: TXT }}>사용처 보기</span>
        </div>
        <T>포인트 내역</T>
        <Chips />
        <Rows />
        <Card pad={13}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div><div style={{ fontSize: 15, fontWeight: 700, color: TXT }}>친구 초대하고 포인트 받기</div>
              <div style={{ fontSize: 14, color: SUB, marginTop: 3 }}>내 코드 XZ646873 · 초대한 친구 0명</div></div>
            <span style={{ color: MUTED, fontSize: 18 }}>›</span>
          </div>
        </Card>
      </Screen>
    ),
  },
  {
    no: 2, name: "위에 요약 두 칸", note: "지금 가진 포인트와 초대로 받은 포인트를 나란히 보여 줍니다. 초대 성과가 숫자로 바로 읽힙니다.",
    render: () => (
      <Screen>
        <div style={{ display: "flex", gap: 10 }}>
          <div style={{ flex: 1, background: BTN, color: "#fff", borderRadius: 12, padding: "18px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 14, opacity: 0.92 }}>보유 포인트</div>
            <div style={{ fontSize: 24, fontWeight: 700, marginTop: 4 }}>7,500P</div>
          </div>
          <div style={{ flex: 1, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: "18px 12px", textAlign: "center" }}>
            <div style={{ fontSize: 14, color: SUB }}>초대로 받은 포인트</div>
            <div style={{ fontSize: 24, fontWeight: 700, color: P_DEEP, marginTop: 4 }}>7,500P</div>
          </div>
        </div>
        <Card pad={13}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 15, color: TXT }}>내 추천코드 <b style={{ color: P_DEEP }}>XZ646873</b></span>
            <span style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "8px 14px", fontSize: 14, fontWeight: 700, color: TXT }}>공유</span>
          </div>
        </Card>
        <T>포인트 내역</T>
        <Chips />
        <Rows />
      </Screen>
    ),
  },
  {
    no: 3, name: "안쪽 탭으로 나누기", note: "포인트와 초대를 안쪽 탭으로 갈라 한 화면에 한 가지만 둡니다. 초대 내용이 길어져도 포인트를 밀어내지 않습니다.",
    render: () => (
      <Screen>
        <div style={{ display: "flex", border: `1px solid ${LINE}`, background: "#fff", borderRadius: 0, overflow: "hidden" }}>
          <div style={{ flex: 1, textAlign: "center", padding: "12px 0", fontSize: 15, fontWeight: 700, color: TXT, background: "#e9ecf1" }}>포인트</div>
          <div style={{ flex: 1, textAlign: "center", padding: "12px 0", fontSize: 15, color: SUB, borderLeft: `1px solid ${LINE}` }}>친구 초대</div>
        </div>
        <Big />
        <T>포인트 내역</T>
        <Chips />
        <Rows />
      </Screen>
    ),
  },
];


/* 추천코드로 이미 가입한 사람에게 보이는 줄 — 지금은 녹색 글씨 (대표 9/17 "갑자기 녹색이라 부담") */
export const ReferredCases = [
  {
    no: 0, name: "현재 (녹색 글씨)", note: "이 화면에서 녹색은 여기 한 곳뿐이라 그 줄만 뜹니다.",
    render: () => (
      <Card>
        <T>추천코드</T>
        <div style={{ marginTop: 8, fontSize: 16, color: "#10B981", fontWeight: 500 }}>이미 추천코드로 가입되었습니다 ✓</div>
      </Card>
    ),
  },
  {
    no: 1, name: "색 빼고 글씨만", note: "색을 쓰지 않고 먹색 글씨로 둡니다. 화면 전체 톤과 맞습니다.",
    render: () => (
      <Card>
        <T>추천코드</T>
        <div style={{ marginTop: 8, fontSize: 15, color: SUB }}>이미 추천코드로 가입되었습니다</div>
      </Card>
    ),
  },
  {
    no: 2, name: "한 줄로 줄이기", note: "카드 한 장을 쓸 만한 내용이 아니라 한 줄로 줄입니다. 화면이 그만큼 짧아집니다.",
    render: () => (
      <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: "14px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span style={{ fontSize: 15, color: TXT }}>추천코드</span>
        <span style={{ fontSize: 15, color: SUB }}>등록 완료</span>
      </div>
    ),
  },
  {
    no: 3, name: "어떤 코드였는지까지", note: "누구 코드로 가입했고 그때 얼마를 받았는지 같이 보여 줍니다. 문의가 줄어듭니다.",
    render: () => (
      <Card>
        <T>추천코드</T>
        <div style={{ marginTop: 8, fontSize: 15, color: SUB, lineHeight: 1.6 }}>
          <div>등록한 코드 <b style={{ color: TXT }}>AB123456</b></div>
          <div>가입 보상 <b style={{ color: TXT }}>3,000P</b> 받음 · 2026.08.05</div>
        </div>
      </Card>
    ),
  },
];

const AssetLab = () => null;
export default AssetLab;
