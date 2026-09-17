/* eslint-disable */
/**
 * 공지사항 화면 시안 — 0번이 지금 화면 (대표 9/17)
 * 지금은 연한 알약 딱지에 색이 제각각이고, 접힌 글은 제목만 보여 무슨 내용인지 알 수 없다.
 */
import React from "react";

const P = "#00963F";
const P_DEEP = "#007A33";
const P_TINT = "#E6F7EE";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";
const MUTED = "#8A93A0";

const Screen = ({ children, bg = "#F7F8FA" }) => (
  <div style={{ border: `1px solid ${LINE}`, background: bg, padding: 12, minHeight: 480, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
);

const ITEMS = [
  ["안내", "개인정보처리방침 및 이용약관 게시 안내", "2026.03.21", "약관과 처리방침을 앱에서 바로 볼 수 있게 올렸습니다."],
  ["공지", "추천인 보상 프로그램 안내", "2026.03.21", "친구를 초대하면 가입 시점에 양쪽 모두 포인트를 받습니다."],
  ["이벤트", "오픈 기념 첫 오더 수수료 무료", "2026.03.21", "첫 오더 한 건은 수수료를 받지 않습니다."],
  ["공지", "홈프로 서비스 오픈 안내", "2026.03.21", "홈프로가 문을 열었습니다."],
];

export const NoticeCases = [
  {
    no: 0, name: "현재 (연한 딱지 · 접힘)", note: "딱지 색이 종류마다 달라 알록달록하고, 제목만 보여 무슨 내용인지 열어 봐야 압니다.",
    render: () => (
      <Screen>
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
          {ITEMS.map(([k, t, d], i) => (
            <div key={t} style={{ padding: "16px 14px", borderTop: i ? `1px solid #F0F2F5` : "none" }}>
              <span style={{ background: k === "이벤트" ? "#FEF3C7" : "#DCFCE7", color: k === "이벤트" ? "#92400E" : "#15803d", fontSize: 13, padding: "3px 10px", borderRadius: 999 }}>{k}</span>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <span style={{ fontSize: 16, color: TXT }}>{t}</span>
                <span style={{ color: MUTED }}>⌄</span>
              </div>
              <div style={{ fontSize: 14, color: MUTED, marginTop: 4 }}>{d}</div>
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    no: 1, name: "종류는 글씨로 · 첫 줄 보여주기", note: "딱지를 떼고 종류를 날짜 옆 글씨로 둡니다. 본문 첫 줄을 같이 보여 줘 열지 않아도 무슨 일인지 압니다.",
    render: () => (
      <Screen>
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
          {ITEMS.map(([k, t, d, body], i) => (
            <div key={t} style={{ padding: "16px 14px", borderTop: i ? `1px solid #F0F2F5` : "none" }}>
              <div style={{ fontSize: 13, color: MUTED }}>{k} · {d}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TXT, marginTop: 4, lineHeight: 1.4, wordBreak: "keep-all" }}>{t}</div>
              <div style={{ fontSize: 14, color: SUB, marginTop: 5, lineHeight: 1.6, wordBreak: "keep-all" }}>{body}</div>
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    no: 2, name: "중요한 것만 위로", note: "맨 위 하나를 크게 펼쳐 두고 나머지는 한 줄로 줄입니다. 새 글에는 점을 찍습니다.",
    render: () => (
      <Screen>
        <div style={{ background: "#fff", border: `1px solid ${P}`, borderRadius: 12, padding: 16 }}>
          <div style={{ fontSize: 13, color: P_DEEP, fontWeight: 700 }}>새 공지 · 2026.03.21</div>
          <div style={{ fontSize: 17, fontWeight: 700, color: TXT, marginTop: 5, lineHeight: 1.4 }}>추천인 보상 프로그램 안내</div>
          <div style={{ fontSize: 14, color: SUB, marginTop: 6, lineHeight: 1.6, wordBreak: "keep-all" }}>친구를 초대하면 가입 시점에 양쪽 모두 포인트를 받습니다.</div>
        </div>
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
          {ITEMS.filter((_, i) => i !== 1).map(([k, t, d], i) => (
            <div key={t} style={{ padding: "14px", borderTop: i ? `1px solid #F0F2F5` : "none", display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center" }}>
              <span style={{ fontSize: 15, color: TXT, minWidth: 0, wordBreak: "keep-all" }}>{t}</span>
              <span style={{ fontSize: 13, color: MUTED, flexShrink: 0 }}>{d.slice(5)}</span>
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    no: 3, name: "종류로 걸러 보기", note: "위에 공지·안내·이벤트 칸을 두어 걸러 봅니다. 글이 쌓여도 찾기 쉽습니다.",
    render: () => (
      <Screen>
        <div style={{ display: "flex", gap: 6 }}>
          {["전체", "공지", "안내", "이벤트"].map((t, i) => (
            <span key={t} style={{ flex: 1, textAlign: "center", border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? P_TINT : "#fff", color: i === 0 ? P_DEEP : SUB, fontWeight: i === 0 ? 700 : 500, padding: "9px 0", fontSize: 14, borderRadius: 8 }}>{t}</span>
          ))}
        </div>
        <div style={{ background: "#fff", borderRadius: 12, overflow: "hidden" }}>
          {ITEMS.map(([k, t, d], i) => (
            <div key={t} style={{ padding: "15px 14px", borderTop: i ? `1px solid #F0F2F5` : "none" }}>
              <div style={{ fontSize: 13, color: MUTED }}>{k} · {d}</div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TXT, marginTop: 4, lineHeight: 1.4, wordBreak: "keep-all" }}>{t}</div>
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
];

const NoticeLab = () => null;
export default NoticeLab;
