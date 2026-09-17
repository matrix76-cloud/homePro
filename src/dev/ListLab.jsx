/* eslint-disable */
/**
 * 홈 오더 표 · 채팅 목록 시안 — 0번이 지금 화면 (대표 9/17)
 * 표가 온통 흰 면이라 밋밋하다는 지적에서 출발.
 */
import React from "react";

const P = "#00963F";
const P_DEEP = "#007A33";
const BTN = "#00B84A";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";
const MUTED = "#8A93A0";
const HEAD = "#E9ECF1";

const Screen = ({ children, bg = "#F7F8FA" }) => (
  <div style={{ border: `1px solid ${LINE}`, background: bg, padding: 12, minHeight: 470, display: "flex", flexDirection: "column", gap: 10 }}>{children}</div>
);

const COLS = ["날짜", "상태", "요청방식", "서비스"];
const ROWS = [
  ["08/19", "대기", "빠른", "홈클리닝 이사청소"],
  ["오늘", "대기", "-", "실내하수구 변기막힘"],
  ["오늘", "접수", "빠른", "홈클리닝 이사청소"],
  ["07/31", "접수", "빠른", "준공청소 특수청소"],
  ["07/21", "대기", "지정", "가전분해청소"],
  ["07/21", "마감", "0/3", "도배"],
];
const stColor = (s) => (s === "접수" ? P : s === "마감" ? MUTED : "#8A93A0");

/* ── 홈 오더 표 ── */
export const TableCases = [
  {
    no: 0, name: "현재 (흰 줄 + 얇은 선)", note: "머리글만 회색이고 아래는 전부 흰 면이라 줄이 잘 안 갈립니다.",
    render: () => (
      <Screen>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", background: HEAD, borderBottom: `1px solid ${LINE}`, padding: "9px 10px" }}>
            {COLS.map((c, i) => <div key={c} style={{ flex: i === 3 ? 1.4 : 1, fontSize: 14, fontWeight: 700, color: TXT, textAlign: "center" }}>{c}</div>)}
          </div>
          {ROWS.map((r, ri) => (
            <div key={ri} style={{ display: "flex", background: "#fff", borderBottom: `1px solid ${LINE}`, padding: "11px 10px" }}>
              {r.map((v, i) => <div key={i} style={{ flex: i === 3 ? 1.4 : 1, fontSize: 14, color: i === 1 ? stColor(v) : TXT, textAlign: "center" }}>{v}</div>)}
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    no: 1, name: "한 줄 걸러 옅은 면", note: "짝수 줄에만 아주 옅은 회색을 깔아 눈이 줄을 따라가게 합니다. 선은 더 연하게 합니다.",
    render: () => (
      <Screen>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", background: HEAD, borderBottom: `1px solid ${LINE}`, padding: "9px 10px" }}>
            {COLS.map((c, i) => <div key={c} style={{ flex: i === 3 ? 1.4 : 1, fontSize: 14, fontWeight: 700, color: TXT, textAlign: "center" }}>{c}</div>)}
          </div>
          {ROWS.map((r, ri) => (
            <div key={ri} style={{ display: "flex", background: ri % 2 ? "#F7F8FA" : "#fff", borderBottom: `1px solid #EEF0F3`, padding: "11px 10px" }}>
              {r.map((v, i) => <div key={i} style={{ flex: i === 3 ? 1.4 : 1, fontSize: 14, color: i === 1 ? stColor(v) : TXT, textAlign: "center" }}>{v}</div>)}
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    no: 2, name: "표 밖을 회색으로", note: "표 자체는 흰 면으로 두고 바깥 배경을 회색으로 깔아 표가 떠 보이게 합니다. 선도 연회색으로 낮춥니다.",
    render: () => (
      <Screen bg="#EDEFF3">
        <div style={{ border: `1px solid #E2E5EA`, borderRadius: 10, overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", background: HEAD, borderBottom: `1px solid ${LINE}`, padding: "9px 10px" }}>
            {COLS.map((c, i) => <div key={c} style={{ flex: i === 3 ? 1.4 : 1, fontSize: 14, fontWeight: 700, color: TXT, textAlign: "center" }}>{c}</div>)}
          </div>
          {ROWS.map((r, ri) => (
            <div key={ri} style={{ display: "flex", background: "#fff", borderBottom: ri === ROWS.length - 1 ? "none" : `1px solid #EEF0F3`, padding: "11px 10px" }}>
              {r.map((v, i) => <div key={i} style={{ flex: i === 3 ? 1.4 : 1, fontSize: 14, color: i === 1 ? stColor(v) : TXT, textAlign: "center" }}>{v}</div>)}
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
  {
    no: 3, name: "날짜 칸을 옅게 깔기", note: "왼쪽 고정되는 날짜 칸에만 옅은 면을 깔아 머리글과 이어 보이게 합니다. 옆으로 밀 때 기준이 분명해집니다.",
    render: () => (
      <Screen>
        <div style={{ border: `1px solid ${LINE}`, borderRadius: 8, overflow: "hidden" }}>
          <div style={{ display: "flex", background: HEAD, borderBottom: `1px solid ${LINE}`, padding: "9px 10px" }}>
            {COLS.map((c, i) => <div key={c} style={{ flex: i === 3 ? 1.4 : 1, fontSize: 14, fontWeight: 700, color: TXT, textAlign: "center" }}>{c}</div>)}
          </div>
          {ROWS.map((r, ri) => (
            <div key={ri} style={{ display: "flex", background: "#fff", borderBottom: `1px solid #EEF0F3`, padding: 0 }}>
              {r.map((v, i) => (
                <div key={i} style={{ flex: i === 3 ? 1.4 : 1, fontSize: 14, color: i === 1 ? stColor(v) : TXT, textAlign: "center", padding: "11px 4px", background: i === 0 ? "#F4F5F8" : "transparent", fontWeight: i === 0 ? 600 : 400 }}>{v}</div>
              ))}
            </div>
          ))}
        </div>
      </Screen>
    ),
  },
];

/* ── 채팅 목록 ── */
const CHATS = [
  ["설비.하수구 싱크대 배수관(트랩)교체", "설비.하수구.배관", "ㅎㅎㅎ", "서비스 잘 하겠습니다", "9/15", 2],
  ["설비.하수구 배관 고압세척", "설비.하수구.배관", "ㅎㅎㅎ", "안녕하세요", "9/15", 0],
  ["전문청소 원룸청소", "전문청소", "성실한청소부", "대화를 시작해보세요", "7/24", 0],
];

const Av = ({ size = 44 }) => (
  <div style={{ width: size, height: size, borderRadius: "50%", background: "#EDEFF3", flexShrink: 0 }} />
);

export const ChatCases = [
  {
    no: 0, name: "현재", note: "제목이 말줄임으로 잘리고, 카테고리가 연보라 알약으로 붙습니다. 안 읽은 표시가 없습니다.",
    render: () => (
      <Screen bg="#fff">
        {CHATS.map(([t, c, who, last, d]) => (
          <div key={t} style={{ display: "flex", gap: 10, alignItems: "flex-start", borderBottom: "1px solid #F2F4F7", paddingBottom: 12 }}>
            <Av />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <span style={{ fontSize: 16, fontWeight: 700, color: TXT, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 130 }}>{t}</span>
                <span style={{ background: "#E6F7EE", color: P, fontSize: 12, padding: "3px 8px", borderRadius: 999, whiteSpace: "nowrap" }}>{c} ›</span>
                <span style={{ marginLeft: "auto", fontSize: 13, color: MUTED }}>{d}</span>
              </div>
              <div style={{ fontSize: 14, color: SUB, marginTop: 3 }}>{who}</div>
              <div style={{ fontSize: 14, color: SUB, marginTop: 3 }}>{last}</div>
            </div>
          </div>
        ))}
      </Screen>
    ),
  },
  {
    no: 1, name: "제목을 자르지 않기", note: "제목을 두 줄까지 그대로 보여 주고, 카테고리는 알약을 떼고 작은 글씨로 제목 위에 둡니다.",
    render: () => (
      <Screen bg="#fff">
        {CHATS.map(([t, c, who, last, d, un]) => (
          <div key={t} style={{ display: "flex", gap: 10, borderBottom: "1px solid #F2F4F7", paddingBottom: 12 }}>
            <Av />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 13, color: MUTED }}>{c}</span>
                <span style={{ fontSize: 13, color: MUTED }}>{d}</span>
              </div>
              <div style={{ fontSize: 16, fontWeight: 700, color: TXT, lineHeight: 1.4, marginTop: 2, wordBreak: "keep-all" }}>{t}</div>
              <div style={{ display: "flex", alignItems: "center", gap: 6, marginTop: 4 }}>
                <span style={{ fontSize: 14, color: SUB, flex: 1, minWidth: 0 }}>{who} · {last}</span>
                {un > 0 && <span style={{ background: BTN, color: "#fff", fontSize: 12, fontWeight: 700, minWidth: 20, height: 20, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 6px" }}>{un}</span>}
              </div>
            </div>
          </div>
        ))}
      </Screen>
    ),
  },
  {
    no: 2, name: "안 읽은 것을 앞세우기", note: "안 읽은 방은 왼쪽에 점을 찍고 제목을 진하게 둡니다. 읽은 방은 한 톤 낮춰 대비를 줍니다.",
    render: () => (
      <Screen bg="#fff">
        {CHATS.map(([t, c, who, last, d, un]) => (
          <div key={t} style={{ display: "flex", gap: 10, alignItems: "center", background: un ? "#FAF7FC" : "#fff", border: `1px solid ${un ? "#E7DCEF" : "#F0F2F5"}`, borderRadius: 10, padding: 12 }}>
            {un > 0 ? <span style={{ width: 7, height: 7, borderRadius: "50%", background: P, flexShrink: 0 }} /> : <span style={{ width: 7, flexShrink: 0 }} />}
            <Av size={40} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <span style={{ fontSize: 15, fontWeight: un ? 700 : 500, color: un ? TXT : SUB, lineHeight: 1.4, wordBreak: "keep-all" }}>{t}</span>
                <span style={{ fontSize: 13, color: MUTED, whiteSpace: "nowrap" }}>{d}</span>
              </div>
              <div style={{ fontSize: 14, color: un ? SUB : MUTED, marginTop: 3 }}>{who} · {last}</div>
            </div>
          </div>
        ))}
      </Screen>
    ),
  },
  {
    no: 3, name: "무슨 일인지 먼저", note: "카테고리를 제목 앞에 붙여 한 문장으로 읽히게 하고, 상대와 마지막 말은 아래 한 줄로 모읍니다. 가장 담백합니다.",
    render: () => (
      <Screen bg="#fff">
        {CHATS.map(([t, c, who, last, d, un]) => (
          <div key={t} style={{ display: "flex", gap: 12, borderBottom: "1px solid #F2F4F7", paddingBottom: 14 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: TXT, lineHeight: 1.45, wordBreak: "keep-all" }}>{t}</div>
              <div style={{ fontSize: 14, color: SUB, marginTop: 5 }}>{who} · {last}</div>
            </div>
            <div style={{ textAlign: "right", flexShrink: 0 }}>
              <div style={{ fontSize: 13, color: MUTED }}>{d}</div>
              {un > 0 && <div style={{ marginTop: 6, background: BTN, color: "#fff", fontSize: 12, fontWeight: 700, borderRadius: 10, padding: "2px 8px", display: "inline-block" }}>{un}</div>}
            </div>
          </div>
        ))}
      </Screen>
    ),
  },
];


/* ── 채팅 위쪽 필터 줄 ── */
const CHAT_FILTERS = ["전체", "오더", "거래장터", "기술전수", "공동중개"];

export const ChatFilterCases = [
  {
    no: 0, name: "현재 (밑줄 탭)", note: "글자 사이가 넓고 회색이라 누를 수 있는 줄로 안 보입니다. 항목이 늘면 오른쪽이 잘립니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#fff", padding: "0 12px", minHeight: 120 }}>
        <div style={{ display: "flex", gap: 18, borderBottom: `1px solid ${LINE}` }}>
          {CHAT_FILTERS.map((t, i) => (
            <span key={t} style={{ padding: "11px 2px", fontSize: 15, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? P : MUTED, borderBottom: `2px solid ${i === 0 ? P : "transparent"}`, whiteSpace: "nowrap" }}>{t}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    no: 1, name: "누를 수 있는 칸으로", note: "칸마다 얇은 테두리를 둘러 버튼으로 읽히게 합니다. 고른 칸만 옅은 면과 진한 글씨입니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#fff", padding: 12, minHeight: 120 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {CHAT_FILTERS.map((t, i) => (
            <span key={t} style={{ border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? "#E6F7EE" : "#fff", color: i === 0 ? P_DEEP : SUB, fontWeight: i === 0 ? 700 : 500, padding: "9px 14px", fontSize: 14, borderRadius: 8, whiteSpace: "nowrap" }}>{t}</span>
          ))}
        </div>
      </div>
    ),
  },
  {
    no: 2, name: "개수를 같이 보여주기", note: "각 갈래에 방이 몇 개인지 같이 보여 줍니다. 안 읽은 방이 있는 갈래에는 점을 찍습니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#fff", padding: 12, minHeight: 120 }}>
        <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
          {[["전체", 6, true], ["오더", 4, true], ["거래장터", 1, false], ["기술전수", 0, false], ["공동중개", 1, false]].map(([t, n, dot], i) => (
            <span key={t} style={{ border: `1px solid ${i === 0 ? P : LINE}`, background: i === 0 ? "#E6F7EE" : "#fff", color: i === 0 ? P_DEEP : SUB, fontWeight: i === 0 ? 700 : 500, padding: "9px 13px", fontSize: 14, borderRadius: 8, whiteSpace: "nowrap", display: "inline-flex", alignItems: "center", gap: 5 }}>
              {dot && <span style={{ width: 6, height: 6, borderRadius: "50%", background: P }} />}
              {t} <b style={{ color: i === 0 ? P_DEEP : MUTED, fontWeight: 700 }}>{n}</b>
            </span>
          ))}
        </div>
      </div>
    ),
  },
  {
    no: 3, name: "한 덩이 묶음 상자", note: "탭을 한 상자로 묶고 사이에 가는 선만 둡니다. 다른 화면 탭바와 같은 문법입니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#fff", padding: 12, minHeight: 120 }}>
        <div style={{ display: "flex", border: `1px solid ${LINE}` }}>
          {CHAT_FILTERS.map((t, i) => (
            <span key={t} style={{ flex: 1, textAlign: "center", padding: "11px 4px", fontSize: 14, fontWeight: i === 0 ? 700 : 500, color: i === 0 ? TXT : SUB, background: i === 0 ? "#e9ecf1" : "#fff", borderLeft: i ? `1px solid ${LINE}` : "none", whiteSpace: "nowrap" }}>{t}</span>
          ))}
        </div>
      </div>
    ),
  },
];

/* ── 채팅방이 하나도 없을 때 ── */
export const ChatEmptyCases = [
  {
    no: 0, name: "현재", note: "회색 말풍선 하나에 한 줄뿐입니다. 왜 비었는지도, 무엇을 하면 되는지도 없습니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#fff", minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, border: `2px solid ${MUTED}` }} />
        <div style={{ fontSize: 15, color: MUTED }}>채팅방이 없습니다</div>
      </div>
    ),
  },
  {
    no: 1, name: "언제 생기는지 알려주기", note: "채팅방이 언제 만들어지는지 알려 줍니다. 고장이 아니라는 걸 먼저 말해 줍니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#fff", minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center" }}>
        <div style={{ width: 66, height: 66, borderRadius: "50%", background: "#E6F7EE" }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: TXT, marginTop: 4 }}>아직 시작된 대화가 없어요</div>
        <div style={{ fontSize: 15, color: SUB, lineHeight: 1.6, wordBreak: "keep-all" }}>오더를 접수하거나 맡으면 상대와 이야기할 방이 여기에 생깁니다.</div>
      </div>
    ),
  },
  {
    no: 2, name: "할 일을 같이 주기", note: "오더 목록으로 보내는 버튼을 같이 둡니다. 화면에서 다음 걸음이 끊기지 않습니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#fff", minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center" }}>
        <div style={{ width: 66, height: 66, borderRadius: "50%", background: "#E6F7EE" }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: TXT, marginTop: 4 }}>아직 시작된 대화가 없어요</div>
        <div style={{ fontSize: 15, color: SUB, lineHeight: 1.6, wordBreak: "keep-all" }}>오더를 접수하거나 맡으면 상대와 이야기할 방이 여기에 생깁니다.</div>
        <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
          <span style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "12px 16px", fontSize: 15, color: TXT }}>오더 둘러보기</span>
          <span style={{ background: BTN, color: "#fff", borderRadius: 8, padding: "12px 18px", fontSize: 15, fontWeight: 700 }}>예약접수 하기</span>
        </div>
      </div>
    ),
  },
  {
    no: 3, name: "고른 갈래만 비었을 때", note: "필터 때문에 비었을 때는 문구를 달리하고 전체로 돌아가는 길을 줍니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#fff", minHeight: 300, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 10, padding: 24, textAlign: "center" }}>
        <div style={{ width: 66, height: 66, borderRadius: "50%", background: "#E6F7EE" }} />
        <div style={{ fontSize: 17, fontWeight: 700, color: TXT, marginTop: 4 }}>기술전수 대화는 아직 없어요</div>
        <div style={{ fontSize: 15, color: SUB, lineHeight: 1.6 }}>다른 갈래에는 대화가 6개 있습니다.</div>
        <span style={{ border: `1px solid ${LINE}`, borderRadius: 8, padding: "12px 16px", fontSize: 15, color: TXT, marginTop: 8 }}>전체 보기</span>
      </div>
    ),
  },
];

const ListLab = () => null;
export default ListLab;
