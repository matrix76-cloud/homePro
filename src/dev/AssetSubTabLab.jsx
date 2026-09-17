/* eslint-disable */
/**
 * 보유자산 안쪽 [포인트 / 친구 초대] 전환 시안 (형 9/18 "둘 다 탭줄이라서 아래를 다른 걸로")
 * 위 홈 탭 줄(밑줄)과 겹쳐 보이지 않게 아래 전환을 다른 모양으로. 폭 390 실제 크기, 0번이 지금 화면.
 */
import React from "react";
import { IoChevronForward, IoGiftOutline, IoWalletOutline } from "react-icons/io5";

const G = "#00963F";
const G_DEEP = "#007A33";
const G_TINT = "#E6F7EE";
const BTN = "#00B84A";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";
const BG = "#F7F8FA";

const Phone = ({ children }) => (
  <div style={{ width: 390, maxWidth: "100%", height: 560, overflow: "hidden", background: BG, border: `1px solid ${LINE}` }}>
    <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #EFF1F4" }}>
      <div style={{ flex: 1, padding: "10px 16px" }}><div style={{ fontSize: 13, color: SUB }}>회원 등급</div><b style={{ fontSize: 16 }}>2차수 · 구독</b></div>
      <div style={{ width: 1, background: "#EFF1F4", margin: "10px 0" }} />
      <div style={{ flex: 1, padding: "10px 16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ fontSize: 13, color: SUB }}>보유 포인트</div><b style={{ fontSize: 20, color: G }}>7,500P</b></div><IoChevronForward size={17} />
      </div>
    </div>
    <div style={{ display: "flex", background: "#fff", borderBottom: "1px solid #EFF1F4" }}>
      {["오더목록", "나의오더현황", "AI견적", "보유자산"].map((t, i) => (
        <div key={t} style={{ flex: t === "나의오더현황" ? 1.3 : 1, textAlign: "center", padding: "14px 2px 12px", fontSize: 15, fontWeight: 600, color: i === 3 ? G : TXT, borderBottom: `3px solid ${i === 3 ? G : "transparent"}` }}>{t}</div>
      ))}
    </div>
    {children}
  </div>
);
const CodeCard = () => (
  <div style={{ background: "#fff", borderRadius: 14, margin: "0 12px", padding: 18 }}>
    <b style={{ fontSize: 17 }}>내 추천코드</b>
    <div style={{ fontSize: 14, color: SUB, marginTop: 3 }}>친구에게 코드를 공유하고 포인트를 받으세요</div>
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", background: BG, borderRadius: 10, padding: "12px 14px", marginTop: 14 }}>
      <b style={{ fontSize: 19, color: G, letterSpacing: "0.04em" }}>XZ646873</b>
      <span style={{ background: BTN, color: "#fff", fontSize: 15, fontWeight: 700, padding: "8px 16px", borderRadius: 8 }}>복사</span>
    </div>
  </div>
);

export const AssetSubTabCases = [
  {
    no: 0, name: "지금 화면", note: "위 홈 탭과 똑같은 밑줄 탭이 한 번 더 나와 탭 줄이 두 겹으로 보입니다.",
    render: () => (
      <Phone>
        <div style={{ display: "flex", margin: "0 16px 16px", borderBottom: "1px solid #E3E6EB" }}>
          {["포인트", "친구 초대"].map((t, i) => (
            <div key={t} style={{ flex: 1, textAlign: "center", padding: "16px 0 12px", fontSize: 15, fontWeight: 600, color: i === 1 ? G : TXT, borderBottom: `3px solid ${i === 1 ? G : "transparent"}` }}>{t}</div>
          ))}
        </div>
        <CodeCard />
      </Phone>
    ),
  },
  {
    no: 1, name: "한 상자 탭 (기준 탭바)", note: "두 칸을 테두리 한 상자로 묶고 가운데만 세로선. 고른 칸은 연회색 면 + 굵은 글씨. 밑줄 탭과 확실히 달라 보입니다.",
    render: () => (
      <Phone>
        <div style={{ display: "flex", margin: "14px 12px", border: `1px solid ${LINE}`, background: "#fff" }}>
          {["포인트", "친구 초대"].map((t, i) => (
            <div key={t} style={{ flex: 1, textAlign: "center", padding: "13px 0", fontSize: 16, fontWeight: i === 1 ? 700 : 500, color: TXT, background: i === 1 ? "#E9ECF1" : "#fff", borderLeft: i ? `1px solid ${LINE}` : "none" }}>{t}</div>
          ))}
        </div>
        <CodeCard />
      </Phone>
    ),
  },
  {
    no: 2, name: "눌러 바꾸는 스위치", note: "연회색 바탕 안에 흰 칸이 고른 쪽으로 옮겨 가는 스위치 모양. 부드럽고 요즘 앱에서 많이 씁니다.",
    render: () => (
      <Phone>
        <div style={{ display: "flex", margin: "14px 12px", padding: 4, background: "#E9ECF1", borderRadius: 12 }}>
          {["포인트", "친구 초대"].map((t, i) => (
            <div key={t} style={{ flex: 1, textAlign: "center", padding: "11px 0", fontSize: 16, fontWeight: i === 1 ? 700 : 500, color: TXT, background: i === 1 ? "#fff" : "transparent", borderRadius: 9, boxShadow: i === 1 ? "0 1px 3px rgba(0,0,0,0.08)" : "none" }}>{t}</div>
          ))}
        </div>
        <CodeCard />
      </Phone>
    ),
  },
  {
    no: 3, name: "숫자 보이는 두 칸", note: "탭 대신 요약 칸 두 개. 포인트 칸엔 보유 포인트, 친구 초대 칸엔 초대한 친구 수를 보여 주고, 고른 칸은 초록 테두리.",
    render: () => (
      <Phone>
        <div style={{ display: "flex", gap: 8, margin: "14px 12px" }}>
          {[{ t: "포인트", v: "7,500P", I: IoWalletOutline }, { t: "친구 초대", v: "0명 초대", I: IoGiftOutline }].map((c, i) => (
            <div key={c.t} style={{ flex: 1, background: "#fff", borderRadius: 12, padding: "12px 14px", border: `1.5px solid ${i === 1 ? G : "#EFF1F4"}` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 15, fontWeight: 700, color: i === 1 ? G_DEEP : TXT }}><c.I size={17} />{c.t}</div>
              <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4, color: TXT }}>{c.v}</div>
            </div>
          ))}
        </div>
        <CodeCard />
      </Phone>
    ),
  },
  {
    no: 4, name: "왼쪽 글씨 전환", note: "가운데 정렬 탭 대신 왼쪽에 큰 글씨 두 개만 둡니다. 고른 쪽은 진하고 크게, 안 고른 쪽은 보통. 제목처럼 읽힙니다.",
    render: () => (
      <Phone>
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, padding: "18px 16px 14px" }}>
          <span style={{ fontSize: 17, fontWeight: 500, color: SUB }}>포인트</span>
          <span style={{ fontSize: 20, fontWeight: 800, color: TXT }}>친구 초대</span>
        </div>
        <CodeCard />
      </Phone>
    ),
  },
  {
    no: 5, name: "탭 없이 이어 붙이기", note: "전환을 없애고 한 화면에 포인트 요약 → 친구 초대를 차례로 둡니다. 포인트 내역은 [내역 보기]로 들어갑니다.",
    render: () => (
      <Phone>
        <div style={{ background: "#fff", borderRadius: 14, margin: "14px 12px 10px", padding: "14px 18px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div><div style={{ fontSize: 14, color: SUB }}>보유 포인트</div><b style={{ fontSize: 22 }}>7,500P</b></div>
          <span style={{ display: "flex", alignItems: "center", gap: 2, fontSize: 15, color: TXT }}>내역 보기<IoChevronForward size={16} /></span>
        </div>
        <div style={{ fontSize: 16, fontWeight: 700, padding: "6px 16px 8px" }}>친구 초대</div>
        <CodeCard />
      </Phone>
    ),
  },
];
