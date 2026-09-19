/* eslint-disable */
/**
 * PC 틀 · 랜딩 실사 시안 — 형 9/20 "로그인하면 PC 화면으로(도우미·숨고처럼) / 위 메뉴는 실제 동작, 홍보는 홈에서만 /
 * 랜딩에 실사도". 0번이 지금 화면.
 *  · PcShellCases    : 로그인 뒤 PC 화면의 틀 (홈 = 오더목록 기준으로 그림)
 *  · LandingPhotoCases: 로그인 전 홈(홍보) — 실제 메뉴가 달린 헤더 + 실사를 넣은 첫 화면
 */
import React from "react";
import { FiMessageCircle, FiBell, FiPlus, FiChevronDown, FiCheck, FiSearch } from "react-icons/fi";
import { ART, HeroScreenWithPieces } from "../page/landing/LandingArt";

const { P, P_DEEP, TINT, INK, BODY, LINE, ALT } = ART;
const PH = "/assets/landing/photo/";
const MENU = ["오더목록", "나의 오더", "AI 견적", "공동중개", "교육·장터", "안심케어"];

/* ---------- 공통 부품 ---------- */
const Frame = ({ children, h = 760, bg = ALT }) => (
  <div style={{ border: `1px solid ${LINE}`, background: bg, height: h, overflow: "hidden", position: "relative" }}>{children}</div>
);
const TopMenu = ({ on = "오더목록", guest }) => (
  <div style={{ height: 68, background: "#fff", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", padding: "0 40px", gap: 36, boxSizing: "border-box" }}>
    <span style={{ fontSize: 25, fontWeight: 800, color: P }}>홈프로</span>
    <div style={{ display: "flex", gap: 26, flex: 1, height: "100%" }}>
      {(guest ? ["홈", ...MENU] : MENU).map((m) => (
        <span key={m} style={{ display: "flex", alignItems: "center", fontSize: 16, fontWeight: m === on ? 800 : 500, color: INK, boxShadow: m === on ? `inset 0 -3px 0 ${P}` : "none" }}>{m}</span>
      ))}
    </div>
    {guest ? (
      <div style={{ display: "flex", gap: 8 }}>
        <span style={{ border: `1px solid ${LINE}`, borderRadius: 10, padding: "9px 16px", fontSize: 15, fontWeight: 700, color: INK }}>로그인</span>
        <span style={{ background: P, borderRadius: 10, padding: "10px 16px", fontSize: 15, fontWeight: 700, color: "#fff" }}>사업자 가입하기</span>
      </div>
    ) : (
      <div style={{ display: "flex", alignItems: "center", gap: 18, color: INK }}>
        <FiMessageCircle size={21} /><FiBell size={21} />
        <span style={{ fontSize: 15 }}><b>논산클린</b> 님 · <b style={{ color: P }}>7,325P</b></span>
      </div>
    )}
  </div>
);
const ROWS = [
  ["08/19", "대기", "빠른", "홈클리닝 이사청소", "충남 논산시", "350,000원", "a1"],
  ["오늘", "대기", "-", "실내하수구 변기막힘", "충남 논산시", "협의", "a2"],
  ["오늘", "대기", "빠른", "홈클리닝 이사청소", "대전 서구", "420,000원", "a1"],
  ["07/31", "접수", "빠른", "준공청소 기타, 특수", "충남 계룡시", "1,200,000원", "a3"],
  ["07/21", "대기", "빠른", "가전분해청소", "충남 논산시", "120,000원", "a1"],
  ["07/21", "대기", "지정", "가전분해청소", "세종시", "90,000원", "a4"],
  ["07/21", "접수", "0/3", "도배", "대전 유성구", "협의", "a2"],
  ["07/21", "접수", "빠른", "누수탐지", "충남 논산시", "200,000원", "a5"],
];
const WideTable = ({ cols = 7, rows = 8 }) => {
  const heads = ["날짜", "상태", "요청방식", "서비스", "지역", "금액", "등록자"].slice(0, cols);
  const tpl = ["90px", "80px", "90px", "1.6fr", "1fr", "130px", "90px"].slice(0, cols).join(" ");
  return (
    <div style={{ background: "#fff", border: `1px solid ${LINE}` }}>
      <div style={{ display: "grid", gridTemplateColumns: tpl, padding: "13px 20px", background: "#e9ecf1", fontSize: 15, fontWeight: 700, color: INK }}>{heads.map((h) => <span key={h}>{h}</span>)}</div>
      {ROWS.slice(0, rows).map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: tpl, padding: "14px 20px", borderTop: `1px solid ${LINE}`, fontSize: 15, color: INK }}>
          {r.slice(0, cols).map((c, j) => <span key={j} style={j === 1 ? { fontWeight: 700, color: c === "접수" ? "#653A80" : BODY } : j === 3 ? { fontWeight: 600 } : null}>{c}</span>)}
        </div>
      ))}
    </div>
  );
};
const TitleRow = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
      <span style={{ fontSize: 24, fontWeight: 800, color: INK }}>오더목록</span>
      <span style={{ fontSize: 15, color: INK }}>9건</span>
      <span style={{ border: `1px solid ${LINE}`, background: "#fff", padding: "8px 14px", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}>필터 <FiChevronDown /></span>
    </div>
    <span style={{ background: P, color: "#fff", borderRadius: 10, padding: "11px 18px", fontSize: 15, fontWeight: 700, display: "flex", alignItems: "center", gap: 6 }}><FiPlus />오더 접수</span>
  </div>
);
const Panel = ({ title, children }) => (
  <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "18px 18px", marginBottom: 14 }}>
    {title && <div style={{ fontSize: 16, fontWeight: 800, color: INK, marginBottom: 12 }}>{title}</div>}
    {children}
  </div>
);
const Line = ({ k, v, strong }) => (
  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 15, color: INK, padding: "7px 0" }}><span>{k}</span><b style={{ color: strong ? P : INK }}>{v}</b></div>
);

/* ================= PC 틀 ================= */
export const PcShellCases = [
  {
    no: 0, name: "현재 — 폰 화면이 가운데", note: "로그인 뒤에도 폭 400 폰 화면이 가운데 뜨고 하단 탭으로 이동합니다.",
    render: () => (
      <Frame bg="#F2F4F6">
        <div style={{ width: 400, height: "100%", margin: "0 auto", background: "#fff", display: "flex", flexDirection: "column" }}>
          <div style={{ padding: "16px", fontSize: 17, fontWeight: 700, borderBottom: `1px solid ${LINE}` }}>충남 논산시</div>
          <div style={{ padding: "12px 16px", fontSize: 15 }}>2차수 · 구독 <b style={{ color: P, marginLeft: 60 }}>7,325P</b></div>
          <div style={{ flex: 1, padding: "0 12px" }}><WideTable cols={4} rows={8} /></div>
          <div style={{ display: "flex", justifyContent: "space-around", padding: "14px 0", borderTop: `1px solid ${LINE}`, fontSize: 14 }}>{["홈", "공동중개", "채팅", "안심케어", "마이"].map((t) => <span key={t}>{t}</span>)}</div>
        </div>
      </Frame>
    ),
  },
  {
    no: 1, name: "위 메뉴 + 넓은 본문 한 단 (숨고식)", note: "위에 실제 메뉴, 아래는 폭 1200 본문 하나. 표에 지역·금액·등록자 칸이 더 들어가 PC 답게 넓게 씁니다. 가장 단순하고 화면마다 옮기기 쉽습니다.",
    render: () => (
      <Frame>
        <TopMenu />
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 40px" }}><TitleRow /><WideTable /></div>
      </Frame>
    ),
  },
  {
    no: 2, name: "위 메뉴 + 3단 (도우미식)", note: "왼쪽 내 정보(등급·포인트·바로가기) / 가운데 본문 / 오른쪽 공지·안심케어. 도우미 PC 와 같은 틀(236 · 본문 · 312). 정보가 한눈에 보이지만 가운데 표는 좁아집니다.",
    render: () => (
      <Frame>
        <TopMenu />
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "26px 24px", display: "grid", gridTemplateColumns: "236px minmax(0,1fr) 312px", gap: 24 }}>
          <div>
            <Panel title="논산클린">
              <Line k="회원 등급" v="2차수 · 구독" /><Line k="보유 포인트" v="7,325P" strong /><Line k="진행 중 오더" v="3건" />
            </Panel>
            <Panel title="바로가기">{["비즈프로필", "PG 결제", "보유자산", "초대코드"].map((t) => <div key={t} style={{ fontSize: 15, padding: "8px 0", color: INK }}>{t}</div>)}</Panel>
          </div>
          <div><TitleRow /><WideTable cols={5} rows={8} /></div>
          <div>
            <Panel title="공지사항">{["추석 연휴 고객센터 운영 안내", "PG 결제 서비스 오픈", "안심케어 보험 가입 안내"].map((t) => <div key={t} style={{ fontSize: 15, padding: "8px 0", color: INK, borderTop: `1px solid ${LINE}` }}>{t}</div>)}</Panel>
            <Panel title="안심케어"><Line k="내 보험" v="미가입" /><div style={{ marginTop: 8, border: `1px solid ${LINE}`, padding: "10px 0", textAlign: "center", fontSize: 15, fontWeight: 700 }}>가입 알아보기</div></Panel>
          </div>
        </div>
      </Frame>
    ),
  },
  {
    no: 3, name: "왼쪽 세로 메뉴 + 넓은 본문", note: "메뉴를 왼쪽 세로로 내리고 본문을 가장 넓게. 업무 도구(관리 화면) 느낌이 강합니다. 다만 '위 메뉴가 랜딩과 이어진다'는 점은 사라집니다.",
    render: () => (
      <Frame>
        <div style={{ display: "grid", gridTemplateColumns: "220px minmax(0,1fr)", height: "100%" }}>
          <div style={{ background: "#fff", borderRight: `1px solid ${LINE}`, padding: "22px 0" }}>
            <div style={{ fontSize: 25, fontWeight: 800, color: P, padding: "0 24px 22px" }}>홈프로</div>
            {MENU.concat(["채팅", "마이"]).map((m, i) => (
              <div key={m} style={{ padding: "13px 24px", fontSize: 16, fontWeight: i === 0 ? 800 : 500, color: INK, background: i === 0 ? "#e9ecf1" : "transparent" }}>{m}</div>
            ))}
          </div>
          <div>
            <div style={{ height: 60, background: "#fff", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "flex-end", gap: 18, padding: "0 32px", fontSize: 15 }}><FiSearch size={20} /><FiBell size={20} /><span><b>논산클린</b> 님 · <b style={{ color: P }}>7,325P</b></span></div>
            <div style={{ padding: "26px 32px" }}><TitleRow /><WideTable /></div>
          </div>
        </div>
      </Frame>
    ),
  },
  {
    no: 4, name: "위 메뉴 + 가운데 폰 폭 본문", note: "위 메뉴만 새로 달고 본문은 지금 폰 화면을 폭 480 으로 그대로 씁니다. 모든 화면이 바로 되지만 PC 답다는 느낌은 가장 약합니다. (다른 번호로 가는 동안 아직 안 옮긴 화면은 이 모양으로 보이게 됩니다.)",
    render: () => (
      <Frame>
        <TopMenu />
        <div style={{ width: 480, margin: "24px auto 0", background: "#fff", border: `1px solid ${LINE}`, padding: "16px 14px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 15, marginBottom: 12 }}>2차수 · 구독 <b style={{ color: P, marginLeft: 120 }}>7,325P</b></div>
          <WideTable cols={4} rows={8} />
        </div>
      </Frame>
    ),
  },
];

/* ================= 랜딩 실사 ================= */
const HeroCopy = ({ light }) => (
  <div>
    <div style={{ fontSize: 17, fontWeight: 700, color: light ? "#fff" : P, marginBottom: 14 }}>일감을 공유하고, 수익을 만들고, 결제하고, 안전하게 일하는 사업자 플랫폼</div>
    <div style={{ fontSize: 44, lineHeight: 1.25, fontWeight: 800, color: light ? "#fff" : INK, letterSpacing: "-0.02em", marginBottom: 22 }}>사업자의 일을 더 쉽게,<br />사업자의 수익을 더 넓게.</div>
    <div style={{ display: "flex", gap: 10 }}>
      <span style={{ background: P, color: "#fff", fontWeight: 700, fontSize: 17, padding: "14px 26px", borderRadius: 10 }}>사업자 가입하기</span>
      <span style={{ border: `1px solid ${light ? "#fff" : LINE}`, color: light ? "#fff" : INK, fontWeight: 700, fontSize: 17, padding: "13px 26px", borderRadius: 10 }}>자세히 보기</span>
    </div>
  </div>
);
const Photo = ({ src, h, r = 16, pos = "center" }) => (
  <div style={{ height: h, borderRadius: r, backgroundImage: `url(${PH}${src})`, backgroundSize: "cover", backgroundPosition: pos }} />
);
const Chip = ({ style, children }) => (
  <div style={{ position: "absolute", background: "#fff", border: `1px solid ${LINE}`, borderRadius: 14, padding: "14px 18px", boxShadow: "0 14px 34px rgba(20,24,31,0.16)", ...style }}>{children}</div>
);
const HeroGrid = ({ children }) => (
  <div style={{ maxWidth: 1200, margin: "0 auto", padding: "52px 40px", display: "grid", gridTemplateColumns: "1.05fr 0.95fr", gap: 48, alignItems: "center" }}>{children}</div>
);

export const LandingPhotoCases = [
  {
    no: 0, name: "현재 — 화면 한 장 + 조각 (실사 없음)", note: "어제 적용한 첫 화면. 위 메뉴는 페이지 안 이동(오더 공유·소개수익…)이고 실제 메뉴가 아닙니다.",
    render: () => <Frame h={680} bg="#fff"><TopMenu guest on="홈" /><HeroGrid><HeroCopy /><HeroScreenWithPieces /></HeroGrid></Frame>,
  },
  {
    no: 1, name: "오른쪽 실사 한 장 + 걸친 조각", note: "오른쪽에 현장 사진 한 장을 크게, 그 위에 소개수익·결제완료 조각을 걸칩니다. 사람이 일하는 서비스라는 게 바로 보이고 제품 느낌도 남습니다.",
    render: () => (
      <Frame h={680} bg="#fff"><TopMenu guest on="홈" />
        <HeroGrid><HeroCopy />
          <div style={{ position: "relative", paddingBottom: 26 }}>
            <Photo src="clean-sofa.jpg" h={460} />
            <Chip style={{ left: -28, top: 40 }}><div style={{ fontSize: 14, color: BODY }}>소개수수료 수익</div><div style={{ fontSize: 24, fontWeight: 800, color: P }}>+ 50,000원</div></Chip>
            <Chip style={{ right: -14, bottom: 0, display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ width: 30, height: 30, borderRadius: "50%", background: TINT, color: P, display: "flex", alignItems: "center", justifyContent: "center" }}><FiCheck /></span>
              <div><div style={{ fontSize: 15, fontWeight: 700, color: INK }}>고객 카드결제 완료</div><div style={{ fontSize: 14, color: P_DEEP, fontWeight: 600 }}>본인 계좌로 직접정산</div></div>
            </Chip>
          </div>
        </HeroGrid>
      </Frame>
    ),
  },
  {
    no: 2, name: "전폭 실사 배경 + 흰 글씨 (숨고식)", note: "첫 화면 전체에 사진을 깔고 어둡게 덮은 뒤 흰 글씨. 가장 인상이 세지만 사진 품질에 크게 좌우되고, 화면 조각은 첫 화면에서 빠집니다.",
    render: () => (
      <Frame h={680} bg="#fff"><TopMenu guest on="홈" />
        <div style={{ height: 612, backgroundImage: `linear-gradient(90deg, rgba(20,24,31,0.78) 0%, rgba(20,24,31,0.45) 55%, rgba(20,24,31,0.15) 100%), url(${PH}plumb-bath.jpg)`, backgroundSize: "cover", backgroundPosition: "center 40%", display: "flex", alignItems: "center" }}>
          <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", width: "100%", boxSizing: "border-box" }}><div style={{ maxWidth: 640 }}><HeroCopy light /></div></div>
        </div>
      </Frame>
    ),
  },
  {
    no: 3, name: "실사 세 장 모음", note: "큰 사진 하나에 작은 사진 둘. 청소·설비·수리처럼 업종이 여럿이라는 걸 한 번에 보여 줍니다.",
    render: () => (
      <Frame h={680} bg="#fff"><TopMenu guest on="홈" />
        <HeroGrid><HeroCopy />
          <div style={{ display: "grid", gridTemplateColumns: "1.25fr 1fr", gap: 12 }}>
            <Photo src="clean-sofa.jpg" h={452} />
            <div style={{ display: "grid", gap: 12 }}><Photo src="plumb-bath.jpg" h={220} pos="center 30%" /><Photo src="tools.jpg" h={220} /></div>
          </div>
        </HeroGrid>
      </Frame>
    ),
  },
  {
    no: 4, name: "첫 화면은 그대로 + 아래 실사 띠", note: "첫 화면(화면 한 장+조각)은 두고, 바로 아래에 업종 사진 네 장을 한 줄로 넣습니다. 바꾸는 폭이 가장 작습니다.",
    render: () => (
      <Frame h={980} bg="#fff"><TopMenu guest on="홈" />
        <HeroGrid><HeroCopy /><HeroScreenWithPieces /></HeroGrid>
        <div style={{ maxWidth: 1200, margin: "0 auto", padding: "0 40px", display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 14 }}>
          {[["clean-sofa.jpg", "전문청소"], ["plumb-bath.jpg", "설비 · 누수"], ["tools.jpg", "집수리"], ["clean-room.jpg", "정기청소"]].map(([s, t]) => (
            <div key={t}><Photo src={s} h={170} r={12} /><div style={{ fontSize: 17, fontWeight: 700, color: INK, marginTop: 10 }}>{t}</div></div>
          ))}
        </div>
      </Frame>
    ),
  },
];
