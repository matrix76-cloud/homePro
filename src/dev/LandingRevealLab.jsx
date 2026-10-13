/**
 * 랜딩(/intro) 01~05 구역 — 사진 위에 걸친 카드(화면 조각)가 스크롤할 때 나타나는 방식 시안
 * (형 10/1 "사진 위로 올라가는 카드들은 스크롤 할 때 나타나게 할까? 세련되게").
 * 05(비즈니스 에코시스템) 구역을 PC 실제 크기로 그렸다. 0번이 지금 화면(움직임 없음).
 * 랩에서는 다시 볼 수 있게 화면 밖으로 나갔다 들어오면 또 움직인다 — 실제 랜딩에 넣을 땐 구역마다 처음 한 번만.
 */
import React, { useEffect, useRef, useState } from "react";
import { ART, PieceEco } from "../page/landing/LandingArt";

const { P, INK, BODY, LINE } = ART;
const PH = "/assets/landing/photo/";
const EASE = "cubic-bezier(0.22, 1, 0.36, 1)"; // 빠르게 나와서 천천히 멎는다

const ECO = [
  ["거래장터", "현장에서 필요한 자재, 장비, 소모품을 알뜰하게 나누고 직거래"],
  ["기술전수 교육등록", "실전 노하우를 담은 전문 시공 강의 개설 및 수강생 모집"],
  ["양도·매매", "창고, 점포부터 시공 팀, 고정 거래처 DB까지 투명한 비즈니스 인수·인계"],
  ["공동중개", "부동산 매물과 손님을 공인중개사 파트너와 투명하고 안전하게 공유하는 협업 네트워크"],
];

/* 05 구역의 글 (랜딩과 같은 글 · 같은 크기) — 글은 움직이지 않는다 */
const Text = () => (
  <div>
    <div style={{ fontSize: 22, fontWeight: 800, color: P, marginBottom: 10 }}>05</div>
    <div style={{ fontSize: 38, fontWeight: 800, lineHeight: 1.3, color: INK, letterSpacing: "-0.02em", marginBottom: 14 }}>비즈니스 에코시스템</div>
    <div style={{ fontSize: 23, fontWeight: 700, lineHeight: 1.45, color: INK, marginBottom: 26 }}>일감부터 자산·노하우, 그리고 부동산 협업까지—<br />사장님의 사업 성장이 순환하는 생태계</div>
    <div style={{ border: `1px solid ${LINE}`, borderRadius: 12, background: "#fff", overflow: "hidden" }}>
      {ECO.map(([k, v], i) => (
        <div key={k} style={{ display: "grid", gridTemplateColumns: "190px 1fr", borderTop: i ? `1px solid ${LINE}` : "none" }}>
          <div style={{ padding: "18px 20px", fontSize: 17, fontWeight: 800, color: INK, background: "#f3f4f7" }}>{k}</div>
          <div style={{ padding: "18px 20px", fontSize: 17, lineHeight: 1.6, color: BODY }}>{v}</div>
        </div>
      ))}
    </div>
  </div>
);

/* 화면에 30% 넘게 들어오면 on. 완전히 나가면 되돌려서(랩 전용) 다시 볼 수 있게 한다 */
const useReveal = () => {
  const ref = useRef(null);
  const [on, setOn] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el || !("IntersectionObserver" in window)) { setOn(true); return undefined; }
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && e.intersectionRatio >= 0.3) setOn(true);
      else if (!e.isIntersecting) setOn(false);
    }, { threshold: [0, 0.3] });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  const replay = () => { setOn(false); setTimeout(() => setOn(true), 80); };
  return [ref, on, replay];
};

/* 스크롤 위치에 따라 카드가 조금씩 따라 움직이는 값(px). 화면 가운데에 오면 0 */
const useParallax = (ref, active) => {
  const [shift, setShift] = useState(0);
  useEffect(() => {
    if (!active) return undefined;
    let raf = 0;
    const calc = () => {
      raf = 0;
      const el = ref.current; if (!el) return;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight || 800;
      const d = (r.top + r.height / 2 - vh / 2) / vh; // 가운데보다 아래면 +
      setShift(Math.max(-44, Math.min(60, d * 110)));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(calc); };
    calc();
    window.addEventListener("scroll", onScroll, true); // 안쪽 스크롤 영역까지 잡는다
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll, true); window.removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, [ref, active]);
  return shift;
};

/* 타일을 하나씩 — PieceEco 안쪽 타일(틀 > 격자 > 타일)에 차례로 건다 */
const STAGGER_CSS = `
.rv-stagger > div > div > div { opacity: 0; transform: translateY(22px); }
.rv-stagger.on > div > div > div { opacity: 1; transform: none; transition: opacity .6s ease, transform .7s ${EASE}; }
.rv-stagger.on > div > div > div:nth-child(2) { transition-delay: .11s; }
.rv-stagger.on > div > div > div:nth-child(3) { transition-delay: .22s; }
.rv-stagger.on > div > div > div:nth-child(4) { transition-delay: .33s; }
`;

const ReplayBtn = ({ onClick }) => (
  <button type="button" onClick={onClick} style={{ border: `1px solid ${LINE}`, background: "#fff", color: INK, fontFamily: "inherit", fontSize: 15, fontWeight: 700, padding: "9px 16px", cursor: "pointer" }}>다시 보기</button>
);

/* 랜딩 05 구역과 같은 배치: 그림 0.8 · 글 1.2, 사이 72, 위아래 92, 그림 칸 높이 600 */
const Stage = ({ variant }) => {
  const [ref, on, replay] = useReveal();
  const shift = useParallax(ref, variant === "parallax");
  const tr = (list) => (on ? list.join(", ") : "none"); // 꺼질 땐 바로 사라지고, 켜질 때만 움직인다

  let photoIn = {};
  let piece = {};
  let pieceClass = "";
  if (variant === "rise") {
    piece = { opacity: on ? 1 : 0, transform: on ? "none" : "translateY(32px)", transition: tr(["opacity .6s ease", `transform .8s ${EASE}`]) };
  } else if (variant === "side") {
    piece = { opacity: on ? 1 : 0, transform: on ? "none" : "translateX(56px)", transition: tr(["opacity .6s ease", `transform .8s ${EASE}`]) };
  } else if (variant === "seq") {
    photoIn = { opacity: on ? 1 : 0, transform: on ? "none" : "scale(1.06)", transition: tr(["opacity .7s ease", `transform 1.1s ${EASE}`]) };
    piece = { opacity: on ? 1 : 0, transform: on ? "none" : "translateY(28px)", transition: tr(["opacity .6s ease .35s", `transform .8s ${EASE} .35s`]) };
  } else if (variant === "stagger") {
    pieceClass = `rv-stagger${on ? " on" : ""}`;
  } else if (variant === "pop") {
    piece = { opacity: on ? 1 : 0, transform: on ? "none" : "scale(0.92)", transformOrigin: "50% 100%", transition: tr(["opacity .5s ease", `transform .7s ${EASE}`]) };
  } else if (variant === "parallax") {
    piece = { transform: `translateY(${shift.toFixed(1)}px)` };
  }

  return (
    <div>
      {variant === "stagger" && <style>{STAGGER_CSS}</style>}
      {variant !== "none" && variant !== "parallax" && (
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 10 }}><ReplayBtn onClick={replay} /></div>
      )}
      <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", padding: "92px 44px", boxSizing: "border-box", wordBreak: "keep-all" }}>
        <div style={{ maxWidth: 1168, margin: "0 auto", display: "grid", gridTemplateColumns: "0.8fr 1.2fr", gap: 72, alignItems: "stretch" }}>
          <div ref={ref} style={{ position: "relative", minHeight: 600 }}>
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, bottom: 190, borderRadius: 16, overflow: "hidden" }}>
              <div style={{ width: "100%", height: "100%", backgroundImage: `url(${PH}tool-wall.jpg)`, backgroundSize: "cover", backgroundPosition: "center 20%", ...photoIn }} />
            </div>
            <div className={pieceClass} style={{ position: "absolute", bottom: 0, left: 36, right: -36, filter: "drop-shadow(0 16px 30px rgba(20, 24, 31, 0.16))", willChange: "transform, opacity", ...piece }}>
              <PieceEco />
            </div>
          </div>
          <Text />
        </div>
      </div>
    </div>
  );
};

export const LandingRevealCases = [
  {
    no: 0, name: "현재 — 움직임 없음", note: "카드가 처음부터 사진 위에 놓여 있습니다. 스크롤해도 아무것도 움직이지 않습니다.",
    render: () => <Stage variant="none" />,
  },
  {
    no: 1, name: "아래에서 떠오르기", note: "구역이 화면에 들어오면 카드가 32px 아래에서 올라오며 또렷해집니다(0.8초). 가장 흔하고 차분한 방식이라 어느 구역에나 무난합니다.",
    render: () => <Stage variant="rise" />,
  },
  {
    no: 2, name: "글 쪽에서 밀려 들어오기", note: "카드가 글이 있는 쪽에서 사진 쪽으로 밀려 들어옵니다. 구역마다 좌우가 번갈아 바뀌니 방향도 번갈아 바뀝니다. 움직임이 1번보다 눈에 띕니다.",
    render: () => <Stage variant="side" />,
  },
  {
    no: 3, name: "사진 먼저, 카드가 뒤따라", note: "사진이 먼저 살짝 당겨지며 자리 잡고, 0.35초 뒤에 카드가 그 위로 올라옵니다. '사진 위에 카드를 얹는다'는 배치 뜻이 그대로 움직임이 됩니다.",
    render: () => <Stage variant="seq" />,
  },
  {
    no: 4, name: "조각을 하나씩 차례로", note: "카드를 통째로 올리지 않고 안쪽 조각(05 는 타일 넷)을 0.1초 간격으로 하나씩 올립니다. 가장 공들인 느낌이지만 구역마다 조각 수가 달라 리듬이 조금씩 다릅니다.",
    render: () => <Stage variant="stagger" />,
  },
  {
    no: 5, name: "살짝 커지며 또렷해지기", note: "카드가 제자리에서 92% 크기로 시작해 커지며 나타납니다. 위치는 안 움직이고 '툭 놓이는' 느낌. 짧고 가볍습니다.",
    render: () => <Stage variant="pop" />,
  },
  {
    no: 6, name: "스크롤을 따라 미끄러지기", note: "한 번 나타나고 끝나는 게 아니라, 스크롤하는 동안 카드가 사진보다 조금 빠르게 위로 미끄러집니다(깊이감). 다시 보기 없이 이 칸을 위아래로 스크롤해 보세요. 화면이 계속 움직여 보일 수 있습니다.",
    render: () => <Stage variant="parallax" />,
  },
];
