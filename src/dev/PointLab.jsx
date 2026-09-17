/* eslint-disable */
/**
 * 포인트 안내 화면 시안 — 0번이 지금 화면 (대표 9/17)
 * 지금은 제목이 없고, 초록 면이 크게 깔리고, 받는 방법 카드가 옆으로 잘리고, 빈 내역이 글씨 한 줄뿐이다.
 */
import React from "react";

const P = "#00963F";
const P_DEEP = "#007A33";
const P_TINT = "#E6F7EE";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";
const MUTED = "#8A93A0";

const Phone = ({ children, bg = "#F7F8FA" }) => (
  <div style={{ border: `1px solid ${LINE}`, background: bg, minHeight: 520, display: "flex", flexDirection: "column" }}>{children}</div>
);
const Bar = ({ title }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", borderBottom: `1px solid ${LINE}`, background: "#fff" }}>
    <span style={{ fontSize: 18, color: TXT }}>‹</span>
    <span style={{ fontSize: 17, fontWeight: 700, color: TXT }}>{title}</span>
  </div>
);

const WAYS = [
  ["+1,000P", "가입 환영 보상", "가입 시 자동 적립"],
  ["+3,000P", "친구 초대 보상", "내 코드로 가입 시"],
  ["+300P", "오더 완료 보상", "작업을 끝냈을 때"],
];

export const PointPageCases = [
  {
    no: 0, name: "현재", note: "화면 제목이 없고, 초록 면이 크게 깔립니다. 받는 방법 카드가 옆으로 잘리고 빈 내역은 글씨 한 줄뿐입니다.",
    render: () => (
      <Phone>
        <div style={{ padding: "14px 16px", background: "#fff", borderBottom: `1px solid ${LINE}` }}><span style={{ fontSize: 18, color: TXT }}>‹</span></div>
        <div style={{ padding: 12 }}>
          <div style={{ background: "#4CAF6D", borderRadius: 14, padding: "26px 16px", textAlign: "center", color: "#fff" }}>
            <div style={{ fontSize: 14, opacity: 0.9 }}>총 보유 포인트</div>
            <div style={{ fontSize: 30, fontWeight: 700, marginTop: 4 }}>7,500P</div>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: TXT, margin: "16px 0 10px" }}>이렇게 포인트를 받을 수 있어요</div>
          <div style={{ display: "flex", gap: 10, overflow: "hidden" }}>
            {WAYS.map(([a, b, c]) => (
              <div key={b} style={{ minWidth: 150, background: P_TINT, borderRadius: 12, padding: 14 }}>
                <div style={{ fontSize: 19, fontWeight: 700, color: P, marginTop: 24 }}>{a}</div>
                <div style={{ fontSize: 14, color: TXT, marginTop: 4 }}>{b}</div>
                <div style={{ fontSize: 13, color: MUTED, marginTop: 24 }}>{c}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: TXT, margin: "16px 0" }}>포인트 내역</div>
          <div style={{ textAlign: "center", fontSize: 16, fontWeight: 700, color: TXT, padding: "40px 0" }}>아직 포인트 내역이 없어요</div>
        </div>
      </Phone>
    ),
  },
  {
    no: 1, name: "제목 달고 색 면 빼기", note: "화면 제목을 달고 초록 면을 흰 카드로 바꿉니다. 받는 방법은 세로 줄로 놓아 잘리지 않습니다.",
    render: () => (
      <Phone>
        <Bar title="포인트" />
        <div style={{ padding: 16 }}>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 15, color: SUB }}>총 보유 포인트</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: TXT }}>7,500P</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: TXT, margin: "18px 0 8px" }}>이렇게 받을 수 있어요</div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden" }}>
            {WAYS.map(([a, b, c], i) => (
              <div key={b} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 14px", borderTop: i ? `1px solid #F0F2F5` : "none" }}>
                <div>
                  <div style={{ fontSize: 15, color: TXT, fontWeight: 500 }}>{b}</div>
                  <div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{c}</div>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: P_DEEP }}>{a}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: TXT, margin: "18px 0 8px" }}>포인트 내역</div>
          <div style={{ textAlign: "center", padding: "30px 16px" }}>
            <div style={{ width: 60, height: 60, borderRadius: "50%", background: P_TINT, margin: "0 auto 10px" }} />
            <div style={{ fontSize: 16, fontWeight: 700, color: TXT }}>아직 쌓인 포인트가 없어요</div>
            <div style={{ fontSize: 14, color: SUB, marginTop: 5, lineHeight: 1.6 }}>위 방법으로 포인트를 모을 수 있습니다.</div>
          </div>
        </div>
      </Phone>
    ),
  },
  {
    no: 2, name: "받는 방법을 접어 두기", note: "내역을 먼저 보여 주고 받는 방법은 한 줄로 접습니다. 이미 아는 사람에게는 안내가 길게 안 보입니다.",
    render: () => (
      <Phone>
        <Bar title="포인트" />
        <div style={{ padding: 16 }}>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 15, color: SUB }}>총 보유 포인트</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: TXT }}>7,500P</span>
          </div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: "14px", marginTop: 10, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 15, color: TXT }}>포인트 받는 방법 보기</span>
            <span style={{ color: MUTED }}>⌄</span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: TXT, margin: "18px 0 8px" }}>포인트 내역</div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden" }}>
            {[["추천인 가입 보상", "09/14", "+5,000P"], ["가입 축하 포인트", "09/01", "+3,000P"]].map(([a, b, c], i) => (
              <div key={a} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 14px", borderTop: i ? `1px solid #F0F2F5` : "none" }}>
                <div><div style={{ fontSize: 15, color: TXT }}>{a}</div><div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{b}</div></div>
                <div style={{ fontSize: 16, fontWeight: 700, color: P_DEEP }}>{c}</div>
              </div>
            ))}
          </div>
        </div>
      </Phone>
    ),
  },
  {
    no: 3, name: "쓸 곳까지 같이", note: "모으는 방법 옆에 쓰는 곳도 알려 줍니다. 포인트를 왜 모으는지가 분명해집니다.",
    render: () => (
      <Phone>
        <Bar title="포인트" />
        <div style={{ padding: 16 }}>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, padding: "16px", display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
            <span style={{ fontSize: 15, color: SUB }}>총 보유 포인트</span>
            <span style={{ fontSize: 22, fontWeight: 700, color: TXT }}>7,500P</span>
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <span style={{ flex: 1, textAlign: "center", border: `1px solid ${P}`, background: P_TINT, color: P_DEEP, fontWeight: 700, borderRadius: 8, padding: "10px 0", fontSize: 14 }}>모으는 방법</span>
            <span style={{ flex: 1, textAlign: "center", border: `1px solid ${LINE}`, background: "#fff", color: SUB, borderRadius: 8, padding: "10px 0", fontSize: 14 }}>쓰는 곳</span>
          </div>
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, borderRadius: 12, overflow: "hidden", marginTop: 10 }}>
            {WAYS.map(([a, b, c], i) => (
              <div key={b} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "13px 14px", borderTop: i ? `1px solid #F0F2F5` : "none" }}>
                <div><div style={{ fontSize: 15, color: TXT }}>{b}</div><div style={{ fontSize: 13, color: MUTED, marginTop: 2 }}>{c}</div></div>
                <div style={{ fontSize: 16, fontWeight: 700, color: P_DEEP }}>{a}</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: TXT, margin: "18px 0 8px" }}>포인트 내역</div>
          <div style={{ textAlign: "center", padding: "24px 16px", fontSize: 15, color: SUB }}>아직 쌓인 포인트가 없어요</div>
        </div>
      </Phone>
    ),
  },
];


/* 포인트 내역이 하나도 없을 때 */
export const PointEmptyCases = [
  {
    no: 0, name: "현재 (글씨 한 줄)", note: "굵은 글씨 한 줄뿐이라 화면이 비어 보이고, 무엇을 하면 되는지 알 수 없습니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", minHeight: 300, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: TXT }}>아직 포인트 내역이 없어요</div>
      </div>
    ),
  },
  {
    no: 1, name: "무엇을 하면 되는지", note: "왜 비었는지 알려 주고 가장 쉬운 방법 하나를 버튼으로 줍니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: P_TINT }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: TXT, marginTop: 4 }}>아직 쌓인 포인트가 없어요</div>
        <div style={{ fontSize: 15, color: SUB, lineHeight: 1.6, wordBreak: "keep-all" }}>친구를 초대하면 가입하는 순간 3,000P가 들어옵니다.</div>
        <span style={{ marginTop: 6, background: P, color: "#fff", borderRadius: 8, padding: "13px 20px", fontSize: 15, fontWeight: 700 }}>친구 초대하고 받기</span>
      </div>
    ),
  },
  {
    no: 2, name: "첫 포인트 받는 순서", note: "받는 방법을 번호로 보여 줍니다. 처음 온 사람이 무엇부터 할지 압니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", minHeight: 300, padding: 20, display: "flex", flexDirection: "column", gap: 12 }}>
        <div style={{ fontSize: 17, fontWeight: 700, color: TXT }}>첫 포인트를 받아 보세요</div>
        {[["1", "친구에게 내 코드 보내기", "+3,000P"], ["2", "오더 하나 끝내기", "+300P"], ["3", "후기 남기기", "+50P"]].map(([n, t, p2]) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 10, padding: "13px 14px" }}>
            <span style={{ width: 24, height: 24, borderRadius: "50%", background: P_TINT, color: P_DEEP, fontSize: 14, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>{n}</span>
            <span style={{ flex: 1, fontSize: 15, color: TXT, wordBreak: "keep-all" }}>{t}</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: P_DEEP }}>{p2}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    no: 3, name: "받을 수 있는 금액 보여주기", note: "지금 다 모으면 얼마인지 한 줄로 알려 줍니다. 움직일 이유가 생깁니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center" }}>
        <div style={{ width: 64, height: 64, borderRadius: "50%", background: P_TINT }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: TXT, marginTop: 4 }}>아직 쌓인 포인트가 없어요</div>
        <div style={{ fontSize: 15, color: SUB, lineHeight: 1.6, wordBreak: "keep-all" }}>
          지금 받을 수 있는 포인트가 <b style={{ color: P_DEEP }}>4,350P</b> 있습니다.
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
          <span style={{ border: `1px solid ${LINE}`, background: "#fff", borderRadius: 8, padding: "13px 16px", fontSize: 15, color: TXT }}>받는 방법 보기</span>
          <span style={{ background: P, color: "#fff", borderRadius: 8, padding: "13px 18px", fontSize: 15, fontWeight: 700 }}>친구 초대하기</span>
        </div>
      </div>
    ),
  },
];

const PointLab = () => null;
export default PointLab;
