/* eslint-disable */
/**
 * 랜딩(/intro) 그림 · PC 로그인 시안 — 형 9/19 "폰 목업 안 이뻐, 프레임 넣지 말고 / 진짜 화면은 한 개 정도만 /
 * 로그인은 폰 로그인 말고 PC 에서 다시 (도우미 PC 화면 참고)". 0번이 지금 화면.
 *  · LandingHeroCases : 첫 화면 오른쪽 그림
 *  · LandingArtCases  : 01~04 섹션 옆 그림
 *  · PcLoginCases     : PC 폭 로그인 화면 (도우미 /pclab 좌우 분할: 왼쪽 소개 면 + 오른쪽 520px 폼)
 */
import React from "react";
import { FiCheck, FiArrowDown } from "react-icons/fi";
import {
  ART, PIECES, DIAGRAMS, ICONS, HeroScreen, HeroScreenWithPieces, HeroBoard, PiecePay, PieceReferral,
} from "../page/landing/LandingArt";

const { P, P_DEEP, TINT, INK, BODY, LINE, ALT } = ART;
const DARK = "#1b1f27";

/* ================= 첫 화면 ================= */
const HeroText = () => (
  <div>
    <div style={{ fontSize: 17, fontWeight: 700, color: P, lineHeight: 1.5, marginBottom: 14 }}>일감을 공유하고, 수익을 만들고, 결제하고, 안전하게 일하는 사업자 플랫폼</div>
    <div style={{ fontSize: 42, lineHeight: 1.25, fontWeight: 800, color: INK, letterSpacing: "-0.02em", marginBottom: 20 }}>사업자의 일을 더 쉽게,<br />사업자의 수익을 더 넓게.</div>
    <div style={{ display: "flex", gap: 10 }}>
      <div style={{ background: P, color: "#fff", fontWeight: 700, fontSize: 17, padding: "14px 26px", borderRadius: 10 }}>사업자 가입하기</div>
      <div style={{ border: `1px solid ${LINE}`, color: INK, fontWeight: 700, fontSize: 17, padding: "13px 26px", borderRadius: 10 }}>자세히 보기</div>
    </div>
  </div>
);
const HeroRow = ({ children }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: 40, alignItems: "center", padding: "36px 40px", border: `1px solid ${LINE}`, background: "#fff" }}>
    <HeroText />
    <div style={{ display: "flex", justifyContent: "center" }}>{children}</div>
  </div>
);
const OldPhone = () => (
  <div style={{ width: 250, height: 516, background: DARK, borderRadius: 36, padding: 10, boxSizing: "border-box", boxShadow: "0 24px 50px rgba(20,24,31,0.18)" }}>
    <img src="/assets/landing/orders.png" alt="" style={{ display: "block", width: "100%", height: "100%", objectFit: "cover", objectPosition: "top center", borderRadius: 27 }} />
  </div>
);

export const LandingHeroCases = [
  { no: 0, name: "현재 — 검은 폰 틀", note: "실제 화면을 검은 폰 틀 안에 넣었습니다.", render: () => <HeroRow><OldPhone /></HeroRow> },
  { no: 1, name: "틀 없는 화면 한 장", note: "폰 틀을 걷어내고 화면만, 위쪽만 잘라 보여 줍니다. 랜딩 전체에서 진짜 화면은 이 한 장뿐입니다.", render: () => <HeroRow><HeroScreen height={500} width={310} /></HeroRow> },
  { no: 2, name: "화면 한 장 + 걸친 조각", note: "틀 없는 화면 옆에 소개수익·결제완료 조각을 걸쳐 '무엇을 얻는지'가 먼저 보이게 합니다.", render: () => <HeroRow><HeroScreenWithPieces /></HeroRow> },
  { no: 3, name: "화면 없이 네 칸 판", note: "진짜 화면을 아예 쓰지 않고, 네 가지 기능을 한 판에 보여 줍니다.", render: () => <HeroRow><HeroBoard /></HeroRow> },
];

/* ================= 섹션 그림 ================= */
const SEC = [
  { id: "order", no: "01", title: "오더를 주고받다", shot: "/assets/landing/order-create.png" },
  { id: "referral", no: "02", title: "내 전문분야가 아닌 오더도 수익으로", shot: "/assets/landing/myorders.png" },
  { id: "pay", no: "03", title: "내 고객에게도 간편하게 결제받다", shot: "/assets/landing/pg.png" },
  { id: "insurance", no: "04", title: "사고위험도 관리하다", shot: "/assets/landing/insurance.png" },
];
const FourGrid = ({ pick }) => (
  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }}>
    {SEC.map((s) => (
      <div key={s.id} style={{ border: `1px solid ${LINE}`, background: s.no === "01" || s.no === "03" ? ALT : "#fff", padding: "22px 22px 26px" }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: P }}>{s.no}</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: INK, marginBottom: 18 }}>{s.title}</div>
        <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: 300 }}>{pick(s)}</div>
      </div>
    ))}
  </div>
);
const OldShot = ({ src }) => (
  <div style={{ height: 340, overflow: "hidden" }}>
    <img src={src} alt="" style={{ display: "block", width: 220, borderRadius: 18, border: `1px solid ${LINE}`, boxShadow: "0 16px 40px rgba(20,24,31,0.12)" }} />
  </div>
);
const TextOnlySample = () => (
  <div style={{ border: `1px solid ${LINE}`, padding: "30px 34px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 40, alignItems: "start" }}>
    <div>
      <div style={{ fontSize: 18, fontWeight: 800, color: P }}>02</div>
      <div style={{ fontSize: 30, fontWeight: 800, color: INK, lineHeight: 1.3, margin: "6px 0 12px" }}>내 전문분야가 아닌 오더도 수익으로</div>
      <div style={{ fontSize: 19, fontWeight: 700, color: INK, marginBottom: 14 }}>“내가 못 하는 일”이 “내 수익”이 될 수 있습니다.</div>
      <div style={{ fontSize: 17, color: BODY, lineHeight: 1.8 }}>홈프로에서 적합한 전문가에게 오더를 공유하고 <b style={{ color: INK }}>소개수수료 수익</b>을 만들 수 있습니다.</div>
    </div>
    <div>
      {["고객이 누수공사를 요청", "나는 에어컨 전문사업자", "누수 전문사업자에게 오더 공유", "전문사업자가 작업 진행", "소개수수료 수익 발생"].map((t, i, a) => (
        <React.Fragment key={t}>
          {i > 0 && <div style={{ color: P, padding: "5px 0 5px 22px" }}><FiArrowDown /></div>}
          <div style={{ border: `1px solid ${i === a.length - 1 ? P : LINE}`, borderRadius: 10, padding: "13px 18px", fontSize: 17, fontWeight: i === a.length - 1 ? 800 : 500, color: i === a.length - 1 ? P : INK, background: "#fff" }}>{t}</div>
        </React.Fragment>
      ))}
    </div>
  </div>
);

export const LandingArtCases = [
  { no: 0, name: "현재 — 섹션마다 앱 화면 캡처", note: "네 섹션 모두 실제 앱 화면을 세워 넣었습니다. 작은 글씨가 안 읽히고 화면이 길어 옆이 많이 빕니다.", render: () => <FourGrid pick={(s) => <OldShot src={s.shot} />} /> },
  { no: 1, name: "화면 조각", note: "앱 화면을 통째로 찍는 대신 핵심 조각만 크게 새로 그립니다(오더 줄·소개수익·결제 요청·보험). 글씨가 읽히고 제품 느낌은 남습니다. 금액은 '예시'로 표기.", render: () => <FourGrid pick={(s) => PIECES[s.id]} /> },
  { no: 2, name: "도식", note: "누가 누구와 무엇을 주고받는지 그림으로. 다만 02·03은 본문에 이미 같은 흐름(화살표 목록)이 있어 겹칩니다.", render: () => <FourGrid pick={(s) => DIAGRAMS[s.id]} /> },
  { no: 3, name: "큰 아이콘 판", note: "연초록 면에 큰 아이콘 하나와 낱말 셋. 가장 가볍고 담백하지만 정보는 적습니다.", render: () => <FourGrid pick={(s) => ICONS[s.id]} /> },
  { no: 4, name: "그림 없이 글 두 단", note: "그림 자리를 없애고, 왼쪽에 제목·설명 / 오른쪽에 흐름·목록을 둡니다. 페이지가 가장 짧아집니다.", render: () => <TextOnlySample /> },
];

/* ================= PC 로그인 ================= */
const inputBox = { height: 52, border: `1px solid ${LINE}`, borderRadius: 10, padding: "0 16px", display: "flex", alignItems: "center", fontSize: 16, color: "#8a919c", background: "#fff", marginBottom: 10, boxSizing: "border-box" };
const Social = ({ bg, color, border, children }) => (
  <div style={{ height: 50, borderRadius: 10, background: bg, color, border: border || "none", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, boxSizing: "border-box" }}>{children}</div>
);
const LoginForm = ({ title = "로그인", sub = "홈프로 계정으로 계속합니다." }) => (
  <div style={{ width: "100%", maxWidth: 400 }}>
    <div style={{ fontSize: 26, fontWeight: 800, color: INK }}>{title}</div>
    <div style={{ fontSize: 15, color: BODY, margin: "6px 0 26px" }}>{sub}</div>
    <div style={inputBox}>아이디</div>
    <div style={inputBox}>비밀번호</div>
    <div style={{ height: 52, borderRadius: 10, background: P, color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 700, marginTop: 4 }}>로그인 하기</div>
    <div style={{ display: "flex", justifyContent: "center", gap: 18, fontSize: 15, color: INK, margin: "16px 0 20px" }}><span>아이디 찾기</span><span style={{ color: LINE }}>|</span><span>비밀번호 찾기</span></div>
    <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 14, color: BODY, marginBottom: 16 }}><span style={{ flex: 1, height: 1, background: LINE }} />또는<span style={{ flex: 1, height: 1, background: LINE }} /></div>
    <div style={{ display: "grid", gap: 9 }}>
      <Social bg="#FEE500" color="#1F2937">카카오로 계속하기</Social>
      <Social bg="#fff" color={INK} border={`1px solid ${LINE}`}>Google 로 계속하기</Social>
      <Social bg="#000" color="#fff">Apple 로 계속하기</Social>
    </div>
    <div style={{ textAlign: "center", fontSize: 15, color: INK, marginTop: 22 }}>아직 계정이 없으신가요? <b style={{ color: P }}>회원가입</b></div>
  </div>
);
const Screen = ({ children, bg = "#fff" }) => (
  <div style={{ border: `1px solid ${LINE}`, background: bg, height: 720, overflow: "hidden", position: "relative" }}>{children}</div>
);
const Split = ({ left, leftBg, right }) => (
  <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 520px", height: "100%" }}>
    <div style={{ background: leftBg, padding: "52px 56px", boxSizing: "border-box", display: "flex", flexDirection: "column" }}>{left}</div>
    <div style={{ padding: "0 56px", display: "flex", alignItems: "center", justifyContent: "center", background: "#fff" }}>{right}</div>
  </div>
);
const Points = ({ color }) => (
  <div style={{ display: "grid", gap: 14, marginTop: 30 }}>
    {["오더를 받고, 공유하고", "소개수익을 만들고", "내 고객에게 카드결제를 받고", "사고위험까지 관리합니다"].map((t) => (
      <div key={t} style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 18, fontWeight: 600, color }}><FiCheck />{t}</div>
    ))}
  </div>
);
const LeftCopy = ({ dark }) => (
  <>
    <div style={{ fontSize: 26, fontWeight: 800, color: dark ? "#fff" : P }}>홈프로</div>
    <div style={{ marginTop: "auto", marginBottom: "auto" }}>
      <div style={{ fontSize: 36, fontWeight: 800, lineHeight: 1.35, letterSpacing: "-0.02em", color: dark ? "#fff" : INK }}>사업자의 일을 더 쉽게,<br />사업자의 수익을 더 넓게.</div>
      <Points color={dark ? "#fff" : INK} />
    </div>
    <div style={{ fontSize: 14, color: dark ? "#dbe2ea" : BODY }}>고객센터 1555-3364</div>
  </>
);

export const PcLoginCases = [
  {
    no: 0, name: "현재 — 폰 화면이 가운데", note: "PC 에서도 폭 400 폰 화면이 가운데 뜨고 양옆이 빕니다.",
    render: () => (
      <Screen bg="#F2F4F6">
        <div style={{ width: 400, height: "100%", margin: "0 auto", background: ALT, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 30px", boxSizing: "border-box" }}>
          <div style={{ fontSize: 30, fontWeight: 800, color: P }}>홈프로</div>
          <div style={{ fontSize: 14, color: BODY, margin: "4px 0 30px" }}>각 분야 전문가를 연결하는 실전형 플랫폼</div>
          <div style={{ ...inputBox, width: "100%" }}>아이디</div>
          <div style={{ ...inputBox, width: "100%" }}>비밀번호</div>
          <div style={{ width: "100%", height: 48, borderRadius: 10, background: "#00B94A", color: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>로그인 하기</div>
          <div style={{ display: "flex", gap: 24, marginTop: 40 }}>
            {["#fff", "#FEE500", "#000"].map((c) => <span key={c} style={{ width: 62, height: 62, borderRadius: "50%", background: c, border: `1px solid ${LINE}` }} />)}
          </div>
        </div>
      </Screen>
    ),
  },
  {
    no: 1, name: "좌우 분할 — 연초록 소개 면", note: "도우미 PC 로그인과 같은 틀. 왼쪽 넓은 면에 홈프로 소개, 오른쪽 520 고정 폭에 로그인. 소셜은 동그라미 대신 글씨 있는 가로 버튼.",
    render: () => <Screen><Split leftBg={TINT} left={<LeftCopy />} right={<LoginForm />} /></Screen>,
  },
  {
    no: 2, name: "좌우 분할 — 먹색 소개 면", note: "랜딩 마무리 띠와 같은 먹색 면. 무게감 있고 로그인 폼이 또렷하게 갈립니다. 화면에서 진한 면은 이곳 하나.",
    render: () => <Screen><Split leftBg={DARK} left={<LeftCopy dark />} right={<LoginForm />} /></Screen>,
  },
  {
    no: 3, name: "좌우 분할 — 화면 조각을 곁들임", note: "왼쪽 면에 문구 대신 랜딩의 화면 조각(결제 요청·소개수익)을 놓습니다. 랜딩에서 '화면 조각'을 고를 때 잘 이어집니다.",
    render: () => (
      <Screen>
        <Split
          leftBg={ALT}
          left={
            <>
              <div style={{ fontSize: 26, fontWeight: 800, color: P }}>홈프로</div>
              <div style={{ fontSize: 30, fontWeight: 800, lineHeight: 1.35, color: INK, margin: "26px 0 26px" }}>사업자의 일과 수익을 연결합니다.</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, alignItems: "start" }}>
                <PiecePay /><PieceReferral />
              </div>
            </>
          }
          right={<LoginForm />}
        />
      </Screen>
    ),
  },
  {
    no: 4, name: "가운데 카드 + 위 헤더", note: "랜딩과 같은 헤더를 위에 두고, 가운데 폭 480 카드에 로그인. 가장 단순하고 랜딩과 오가기 쉽습니다.",
    render: () => (
      <Screen bg={ALT}>
        <div style={{ height: 66, background: "#fff", borderBottom: `1px solid ${LINE}`, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 56px" }}>
          <span style={{ fontSize: 24, fontWeight: 800, color: P }}>홈프로</span>
          <span style={{ fontSize: 16, fontWeight: 600, color: INK }}>홈프로 소개</span>
        </div>
        <div style={{ display: "flex", justifyContent: "center", paddingTop: 34 }}>
          <div style={{ width: 480, background: "#fff", border: `1px solid ${LINE}`, borderRadius: 16, padding: "36px 40px", boxSizing: "border-box", display: "flex", justifyContent: "center" }}>
            <LoginForm />
          </div>
        </div>
      </Screen>
    ),
  },
];
