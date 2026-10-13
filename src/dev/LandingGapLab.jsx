/**
 * 랜딩(/intro) 01~04 구역 — 그림 카드 아래가 비어 보이는 자리 시안 (형 10/1
 * "여백을 좀 더 크게 해도 되고, 비어 있는 부분에 사진이나 이런 걸로 넣자").
 * 글이 가장 길어 빈 자리가 제일 큰 02(소개수익) 구역을 PC 실제 크기로 그렸다. 0번이 지금 화면.
 * 사진은 시안용 무료 사진(public/assets/landing/photo) — 실제 현장 사진을 받으면 바꾼다.
 */
import React from "react";
import { FiArrowDown } from "react-icons/fi";
import { ART, PieceReferral } from "../page/landing/LandingArt";

const { P, TINT, INK, BODY, LINE } = ART;
const PH = "/assets/landing/photo/";

/* ---------- 02 구역의 글 (랜딩과 같은 글 · 같은 크기) ---------- */
const FLOW = ["고객이 누수공사를 요청", "나는 에어컨 전문사업자", "누수 전문사업자에게 오더 공유", "전문사업자가 작업 진행", "소개수수료 수익 발생"];

const Head = () => (
  <>
    <div style={{ fontSize: 22, fontWeight: 800, color: P, marginBottom: 10 }}>02</div>
    <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.3, color: INK, letterSpacing: "-0.02em", marginBottom: 14 }}>내 전문분야가 아닌 오더도 수익으로</div>
    <div style={{ fontSize: 23, fontWeight: 700, lineHeight: 1.45, color: INK, marginBottom: 26 }}>“내가 못 하는 일”이 “내 수익”이 될 수 있습니다.</div>
  </>
);
const Paras = () => (
  <>
    <p style={pStyle}>고객에게 받은 오더가<br />내 전문분야가 아니어도 그냥 놓치지 마세요.</p>
    <p style={pStyle}>홈프로에서 적합한 전문가에게 오더를 공유하고<br /><b style={{ color: INK, fontWeight: 700 }}>소개수수료 수익</b>을 만들 수 있습니다.</p>
  </>
);
const pStyle = { fontSize: 18, lineHeight: 1.8, color: BODY, margin: "0 0 18px" };
const Flow = ({ wide }) => (
  <>
    <div style={{ fontSize: 19, fontWeight: 800, color: INK, margin: "28px 0 14px" }}>예시</div>
    <div style={{ display: "flex", flexDirection: "column", alignItems: wide ? "stretch" : "flex-start", gap: 6, margin: "0 0 8px" }}>
      {FLOW.map((t, i) => {
        const strong = i === FLOW.length - 1;
        return (
          <React.Fragment key={t}>
            {i > 0 && <div style={{ color: P, fontSize: 18, paddingLeft: 24, display: "flex" }}><FiArrowDown /></div>}
            <div style={{ fontSize: 18, lineHeight: 1.5, padding: "13px 20px", borderRadius: 10, minWidth: 300, boxSizing: "border-box", border: `1px solid ${strong ? P : LINE}`, background: "#fff", color: strong ? P : BODY, fontWeight: strong ? 800 : 500 }}>{t}</div>
          </React.Fragment>
        );
      })}
    </div>
  </>
);
const Punch = () => (
  <p style={{ fontSize: 25, fontWeight: 800, lineHeight: 1.5, color: INK, margin: "34px 0 0", letterSpacing: "-0.01em" }}>내가 직접 하지 않아도<br />연결을 통해 새로운 수익을 만드세요.</p>
);
const FullText = () => (<div><Head /><Paras /><Flow /><Punch /></div>);

/* ---------- 틀 ---------- */
// 랜딩 02 구역과 같은 배치: 글 1.2 · 그림 0.8, 사이 72, 위아래 92
const Sec = ({ children, alignRight = "start" }) => ( // alignRight: 두 칸의 세로 맞춤(start · center · stretch)
  <div style={{ border: `1px solid ${LINE}`, background: "#fff", padding: "92px 44px", boxSizing: "border-box", wordBreak: "keep-all" }}>
    <div style={{ maxWidth: 1168, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 72, alignItems: alignRight }}>{children}</div>
  </div>
);
const Photo = ({ src, h, pos = "center", r = 16, style }) => (
  <div style={{ height: h, borderRadius: r, backgroundImage: `url(${PH}${src})`, backgroundSize: "cover", backgroundPosition: pos, ...style }} />
);
const Caption = ({ children }) => (
  <div style={{ fontSize: 15, fontWeight: 700, color: INK, marginTop: 10 }}>{children}</div>
);

export const LandingGapCases = [
  {
    no: 0, name: "현재 — 조각 카드만", note: "오른쪽 칸에 조각 카드 하나만 있고 그 아래가 글 높이만큼 빕니다. 실제 화면에서는 스크롤하면 카드가 따라 내려오지만, 멈춰서 보면 비어 보입니다.",
    render: () => (<Sec><FullText /><PieceReferral /></Sec>),
  },
  {
    no: 1, name: "카드 아래 사진 한 장", note: "조각 카드는 그대로 두고 그 밑에 현장 사진 한 장을 같은 폭으로 붙입니다. 가장 적게 바꾸는 안입니다. 구역마다 사진 1장씩, 모두 4장이 필요합니다.",
    render: () => (
      <Sec>
        <FullText />
        <div>
          <PieceReferral />
          <div style={{ maxWidth: 460, margin: "26px auto 0" }}>
            <Photo src="pipe.jpg" h={420} pos="35% center" />
            <Caption>누수 전문사업자가 작업합니다</Caption>
          </div>
        </div>
      </Sec>
    ),
  },
  {
    no: 2, name: "큰 사진 위에 카드를 걸치기", note: "오른쪽 칸을 세로로 긴 사진 한 장으로 채우고, 조각 카드를 사진 아래쪽에 겹쳐 얹습니다. 사람이 일하는 모습과 앱 화면이 한 덩이로 보입니다. 첫 화면의 겹친 조각과 같은 문법입니다.",
    render: () => (
      <Sec alignRight="stretch">
        <FullText />
        <div style={{ position: "relative", minHeight: 760, paddingBottom: 40 }}>
          <Photo src="pipe.jpg" h="calc(100% - 150px)" pos="30% center" style={{ minHeight: 560 }} />
          <div style={{ position: "absolute", left: -36, right: 36, bottom: 0, filter: "drop-shadow(0 16px 30px rgba(20,24,31,0.16))" }}>
            <PieceReferral />
          </div>
        </div>
      </Sec>
    ),
  },
  {
    no: 3, name: "카드 + 사진 두 장", note: "조각 카드 밑에 사진 두 장을 나란히. '주는 사람'과 '받아서 하는 사람' 두 업종을 같이 보여 줍니다. 구역마다 2장씩, 모두 8장이 필요해 사진 부담이 가장 큽니다.",
    render: () => (
      <Sec>
        <FullText />
        <div>
          <PieceReferral />
          <div style={{ maxWidth: 460, margin: "26px auto 0", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div><Photo src="clean-room.jpg" h={300} pos="40% center" /><Caption>오더를 넘긴 사업자</Caption></div>
            <div><Photo src="pipe.jpg" h={300} pos="30% center" /><Caption>작업한 전문사업자</Caption></div>
          </div>
        </div>
      </Sec>
    ),
  },
  {
    no: 4, name: "사진 없이 — 예시 흐름을 오른쪽으로", note: "글 쪽에 있던 '예시' 다섯 단계를 조각 카드 밑으로 옮기고, 짧아진 왼쪽 글은 오른쪽 칸의 가운데 높이에 맞춥니다. 사진이 필요 없고 구역 높이가 130px쯤 줄어듭니다. 왼쪽 글 위아래로 여백이 조금 남습니다.",
    render: () => (
      <Sec alignRight="center">
        <div><Head /><Paras /><Punch /></div>
        <div>
          <PieceReferral />
          <div style={{ maxWidth: 460, margin: "0 auto" }}><Flow wide /></div>
        </div>
      </Sec>
    ),
  },
  {
    no: 5, name: "사진 없이 — 연한 면으로 받치고 여백 넓히기", note: "오른쪽 칸 전체를 글 높이만큼 연한 초록 면으로 채우고 조각 카드를 가운데 둡니다. 새로 넣는 것 없이 '비어 있다'는 느낌만 없앱니다. 구역 위아래 여백도 92에서 120으로 넓혔습니다.",
    render: () => (
      <div style={{ border: `1px solid ${LINE}`, background: "#fff", padding: "120px 44px", boxSizing: "border-box", wordBreak: "keep-all" }}>
        <div style={{ maxWidth: 1168, margin: "0 auto", display: "grid", gridTemplateColumns: "1.2fr 0.8fr", gap: 72, alignItems: "stretch" }}>
          <FullText />
          <div style={{ background: TINT, borderRadius: 16, padding: "0 32px", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ width: "100%" }}><PieceReferral /></div>
          </div>
        </div>
      </div>
    ),
  },
];
