/* eslint-disable */
/**
 * 마이페이지 윗부분 재구성 시안 (대표 리뷰 10/2 "마이페이지 형 6개를 편리한 UI UX 구성되길 희망합니다")
 *   대상 6개: ①프로필(이름·등급) ②기본 프로필 ③비즈프로필 ④정산 ⑤구독 관리 ⑥사업자도구 · PG결제
 *   폭 390 실제 크기. 위 머리줄, 아래 이웃 메뉴(기술전수 수강생모집)와 풋바까지 같이 그려 어울림을 본다. 0번이 지금 화면.
 */
import React from "react";
import {
  IoPersonCircleOutline, IoChevronForward, IoPersonOutline, IoBriefcaseOutline, IoWalletOutline,
  IoRibbonOutline, IoCardOutline, IoEyeOutline, IoHomeOutline, IoBusinessOutline, IoChatbubbleEllipsesOutline,
  IoShieldCheckmarkOutline, IoPerson,
} from "react-icons/io5";

const G = "#00963F";       // 포인트 초록
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#E5E8EC";
const BG = "#F7F8FA";
const GRAY = "#8A8F98";    // 레퍼런스 그대로 안에서만 쓰는 회색 보조 글씨

const Phone = ({ children, bg = BG }) => (
  <div style={{ width: 390, maxWidth: "100%", border: `1px solid ${LINE}`, background: bg, fontFamily: "inherit", color: TXT }}>
    <div style={{ height: 52, display: "flex", alignItems: "center", justifyContent: "center", background: "#fff", borderBottom: `1px solid ${LINE}`, fontSize: 18, fontWeight: 600 }}>마이페이지</div>
    {children}
    <div style={{ display: "flex", background: "#fff", borderTop: `1px solid ${LINE}`, padding: "8px 0 10px" }}>
      {[[IoHomeOutline, "홈"], [IoBusinessOutline, "공동중개"], [IoChatbubbleEllipsesOutline, "채팅"], [IoShieldCheckmarkOutline, "안심케어"], [IoPerson, "마이"]].map(([Ic, t], i) => (
        <div key={t} style={{ flex: 1, textAlign: "center", fontSize: 13, color: i === 4 ? G : SUB, fontWeight: i === 4 ? 700 : 500 }}>
          <Ic size={23} /><div>{t}</div>
        </div>
      ))}
    </div>
  </div>
);

/* 아래 이웃 — 어느 안이든 같은 자리에 온다 */
const Neighbor = ({ flat }) => (
  flat ? (
    <div style={{ background: "#fff", borderTop: `1px solid ${LINE}`, borderBottom: `1px solid ${LINE}`, margin: "10px 0 14px" }}>
      <MenuRow Icon={IoBriefcaseOutline} name="기술전수 수강생모집" last />
    </div>
  ) : (
    <div style={{ margin: "12px 12px 14px", background: "#fff", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
      <div>
        <div style={{ fontSize: 17, fontWeight: 700 }}>기술전수 수강생모집</div>
        <div style={{ fontSize: 15, marginTop: 3 }}>교육 공고를 등록하고 수강생을 모집하세요</div>
      </div>
      <IoChevronForward size={22} color={SUB} />
    </div>
  )
);

const Avatar = ({ size = 56 }) => <IoPersonCircleOutline size={size} color="#C9CED6" style={{ flexShrink: 0 }} />;

/* 이름 왼쪽 · 값 오른쪽 한 줄 (선 아이콘 앞에) */
const MenuRow = ({ Icon, name, value, valueColor, last, sub }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 16px", minHeight: 58, borderBottom: last ? "none" : `1px solid ${LINE}` }}>
    {Icon && <Icon size={24} color={TXT} style={{ flexShrink: 0 }} />}
    <div style={{ flex: 1, minWidth: 0, padding: "10px 0" }}>
      <div style={{ fontSize: 16, fontWeight: 600 }}>{name}</div>
      {sub && <div style={{ fontSize: 14, marginTop: 2 }}>{sub}</div>}
    </div>
    {value && <span style={{ fontSize: 15, fontWeight: 700, color: valueColor || TXT, textAlign: "right", wordBreak: "keep-all" }}>{value}</span>}
    <IoChevronForward size={18} color={SUB} style={{ flexShrink: 0 }} />
  </div>
);

const Box = ({ children, style }) => (
  <div style={{ margin: "12px 12px 0", background: "#fff", border: `1px solid ${LINE}`, ...style }}>{children}</div>
);

const GroupTitle = ({ children }) => (
  <div style={{ padding: "20px 16px 8px", fontSize: 15, fontWeight: 700 }}>{children}</div>
);

/* 프로필 한 줄 — 사진 · 이름 · 등급, 오른쪽 '내 프로필 보기' */
const ProfileLine = ({ boxed = true }) => {
  const inner = (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "16px" }}>
      <Avatar />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 19, fontWeight: 700 }}>해피클린</div>
        <div style={{ fontSize: 15, marginTop: 3 }}>홈프로 일반회원 · 골드</div>
      </div>
      <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 15, fontWeight: 600 }}>내 프로필 보기 <IoChevronForward size={17} /></span>
    </div>
  );
  return boxed ? <Box>{inner}</Box> : <div style={{ background: "#fff" }}>{inner}</div>;
};

const Tile = ({ Icon, name, value, valueColor }) => (
  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, minHeight: 92, padding: "12px 6px", textAlign: "center" }}>
    <Icon size={26} color={TXT} />
    <div style={{ fontSize: 15, fontWeight: 600, wordBreak: "keep-all", lineHeight: 1.3 }}>{name}</div>
    {value && <div style={{ fontSize: 14, fontWeight: 700, color: valueColor || TXT, wordBreak: "keep-all" }}>{value}</div>}
  </div>
);

export const MyPageCases = [
  {
    no: 0, name: "지금 화면", note: "프로필 카드 안에 버튼 두 개와 '내 프로필 보기', 그 아래 PG결제 · 정산 · 구독 관리가 카드 하나씩. 여섯 가지를 보려면 한 화면 넘게 내려야 합니다.",
    render: () => (
      <Phone>
        <div style={{ margin: "12px 12px 0", background: "#fff", borderRadius: 16, padding: 20 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            <Avatar size={60} />
            <div>
              <div style={{ fontSize: 19, fontWeight: 700 }}>해피클린 <span style={{ fontSize: 13, fontWeight: 700, color: "#B45309" }}>골드</span></div>
              <div style={{ fontSize: 15, marginTop: 3 }}>홈프로 일반회원</div>
            </div>
          </div>
          <div style={{ height: 1, background: LINE, margin: "16px 0" }} />
          <div style={{ display: "flex", gap: 8 }}>
            {[["기본 프로필", "사진·닉네임·소개"], ["비즈프로필", "인증·포트폴리오·정산계좌"]].map(([t, d]) => (
              <div key={t} style={{ flex: 1, border: `1px solid ${LINE}`, borderRadius: 10, padding: "12px 12px" }}>
                <div style={{ fontSize: 16, fontWeight: 700 }}>{t}</div>
                <div style={{ fontSize: 13, marginTop: 4 }}>{d}</div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 12, border: `1px solid ${LINE}`, borderRadius: 10, padding: "13px 14px", fontSize: 15, fontWeight: 600, display: "flex", justifyContent: "space-between", alignItems: "center" }}>다른 사람에게 보이는 내 프로필 보기 <IoChevronForward size={18} /></div>
        </div>
        {[["사업자도구 · PG결제", "결제링크로 고객에게 직접 결제받기"], ["정산", "수익과 정산 현황을 확인하세요"], ["구독 관리", "미구독 · 2차수 일반무료 회원"]].map(([t, d]) => (
          <div key={t} style={{ margin: "12px 12px 0", background: "#fff", borderRadius: 16, padding: "18px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div>
              <div style={{ fontSize: 17, fontWeight: 700 }}>{t}</div>
              <div style={{ fontSize: 15, marginTop: 3 }}>{d}</div>
            </div>
            <IoChevronForward size={22} color={SUB} />
          </div>
        ))}
        <Neighbor />
      </Phone>
    ),
  },
  {
    no: 1, name: "한 묶음 줄 목록", note: "프로필 한 줄 아래에 다섯 메뉴를 한 상자의 줄로 모읍니다. 줄마다 선 아이콘, 이름은 왼쪽 · 지금 값은 오른쪽. 여섯 가지가 한 화면에 다 들어옵니다. (설정 화면 문법)",
    render: () => (
      <Phone>
        <ProfileLine />
        <Box>
          <MenuRow Icon={IoPersonOutline} name="기본 프로필" value="사진 · 닉네임 · 소개" />
          <MenuRow Icon={IoBriefcaseOutline} name="비즈프로필" value="정산계좌 미등록" valueColor="#B45309" />
          <MenuRow Icon={IoWalletOutline} name="정산" value="이번달 0원" />
          <MenuRow Icon={IoRibbonOutline} name="구독 관리" value="2차수 일반무료 회원" />
          <MenuRow Icon={IoCardOutline} name="사업자도구 · PG결제" last />
        </Box>
        <Neighbor />
      </Phone>
    ),
  },
  {
    no: 2, name: "바로가기 세 칸 격자", note: "프로필 한 줄 아래에 아이콘 타일을 한 줄에 세 칸씩 두 줄로 놓습니다. 타일마다 지금 값을 한 줄로 보여 줍니다. 엄지로 누르기 쉽고 높이가 가장 짧습니다. (마이페이지 바로가기 문법)",
    render: () => (
      <Phone>
        <ProfileLine />
        <Box>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)" }}>
            {[
              [IoPersonOutline, "기본 프로필"], [IoBriefcaseOutline, "비즈프로필", "계좌 미등록", "#B45309"], [IoWalletOutline, "정산", "0원"],
              [IoRibbonOutline, "구독 관리", "2차수"], [IoCardOutline, "PG결제"], [IoEyeOutline, "내 프로필 보기"],
            ].map(([Ic, n, v, c], i) => (
              <div key={n} style={{ borderLeft: i % 3 ? `1px solid ${LINE}` : "none", borderTop: i >= 3 ? `1px solid ${LINE}` : "none" }}>
                <Tile Icon={Ic} name={n} value={v} valueColor={c} />
              </div>
            ))}
          </div>
        </Box>
        <Neighbor />
      </Phone>
    ),
  },
  {
    no: 3, name: "묶음 둘로 나누기", note: "'내 정보'(기본 프로필 · 비즈프로필)와 '정산 · 구독 · 결제'로 성격별 묶음 제목을 달고 줄 목록으로 놓습니다. 무엇이 어디 있는지 찾기 쉽습니다.",
    render: () => (
      <Phone>
        <ProfileLine />
        <GroupTitle>내 정보</GroupTitle>
        <Box style={{ marginTop: 0 }}>
          <MenuRow Icon={IoPersonOutline} name="기본 프로필" sub="사진 · 닉네임 · 소개" />
          <MenuRow Icon={IoBriefcaseOutline} name="비즈프로필" sub="인증 · 포트폴리오 · 정산계좌" value="계좌 미등록" valueColor="#B45309" last />
        </Box>
        <GroupTitle>정산 · 구독 · 결제</GroupTitle>
        <Box style={{ marginTop: 0 }}>
          <MenuRow Icon={IoWalletOutline} name="정산" value="이번달 0원" />
          <MenuRow Icon={IoRibbonOutline} name="구독 관리" value="2차수 일반무료 회원" />
          <MenuRow Icon={IoCardOutline} name="사업자도구 · PG결제" sub="결제링크로 고객에게 직접 결제받기" last />
        </Box>
        <Neighbor />
      </Phone>
    ),
  },
  {
    no: 4, name: "프로필 두 버튼 + 돈 줄 목록", note: "지금 화면에 가장 가깝습니다. 프로필 카드의 두 버튼(기본 프로필 · 비즈프로필)은 그대로 두고, 정산 · 구독 관리 · PG결제 카드 세 장만 한 상자의 줄 셋으로 합칩니다.",
    render: () => (
      <Phone>
        <Box>
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 16 }}>
            <Avatar />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 19, fontWeight: 700 }}>해피클린</div>
              <div style={{ fontSize: 15, marginTop: 3 }}>홈프로 일반회원 · 골드</div>
            </div>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 15, fontWeight: 600 }}>내 프로필 보기 <IoChevronForward size={17} /></span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", borderTop: `1px solid ${LINE}` }}>
            {[[IoPersonOutline, "기본 프로필", "사진 · 닉네임 · 소개"], [IoBriefcaseOutline, "비즈프로필", "인증 · 정산계좌"]].map(([Ic, t, d], i) => (
              <div key={t} style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 14px", borderLeft: i ? `1px solid ${LINE}` : "none", minHeight: 64 }}>
                <Ic size={24} color={TXT} style={{ flexShrink: 0 }} />
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>{t}</div>
                  <div style={{ fontSize: 13, marginTop: 2 }}>{d}</div>
                </div>
              </div>
            ))}
          </div>
        </Box>
        <Box>
          <MenuRow Icon={IoWalletOutline} name="정산" value="이번달 0원" />
          <MenuRow Icon={IoRibbonOutline} name="구독 관리" value="2차수 일반무료 회원" />
          <MenuRow Icon={IoCardOutline} name="사업자도구 · PG결제" last />
        </Box>
        <Neighbor />
      </Phone>
    ),
  },
  {
    no: 5, name: "레퍼런스 그대로", note: "국내 앱 마이페이지 문법을 겉칠까지 그대로: 흰 바탕, 프로필 줄 + ›, 동그란 아이콘 바로가기 네 칸, 옅은 회색 띠로 묶음을 가르고 회색 보조 글씨. (형 규칙과 다른 안 — 나란히 보기용)",
    render: () => (
      <Phone bg="#fff">
        <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "20px 20px 16px" }}>
          <Avatar />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 20, fontWeight: 700 }}>해피클린</div>
            <div style={{ fontSize: 13, color: GRAY, marginTop: 3 }}>홈프로 일반회원 · 골드</div>
          </div>
          <IoChevronForward size={18} color="#C0C4CC" />
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", padding: "4px 12px 20px" }}>
          {[[IoPersonOutline, "기본 프로필"], [IoBriefcaseOutline, "비즈프로필"], [IoWalletOutline, "정산"], [IoRibbonOutline, "구독"]].map(([Ic, n]) => (
            <div key={n} style={{ textAlign: "center" }}>
              <div style={{ width: 48, height: 48, borderRadius: 24, background: "#F2F3F5", display: "inline-flex", alignItems: "center", justifyContent: "center" }}><Ic size={23} color={TXT} /></div>
              <div style={{ fontSize: 13, marginTop: 7 }}>{n}</div>
            </div>
          ))}
        </div>
        <div style={{ height: 9, background: "#F2F3F5" }} />
        {[[IoCardOutline, "사업자도구 · PG결제", ""], [IoWalletOutline, "정산", "이번달 0원"], [IoRibbonOutline, "구독 관리", "2차수"], [IoBriefcaseOutline, "기술전수 수강생모집", ""]].map(([Ic, n, v], i, arr) => (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 12, padding: "0 20px", minHeight: 56 }}>
            <Ic size={23} color={TXT} />
            <div style={{ flex: 1, fontSize: 16, padding: "16px 0", borderBottom: i < arr.length - 1 ? "1px solid #EEEEEE" : "none" }}>{n}</div>
            {v && <span style={{ fontSize: 14, color: G, fontWeight: 600 }}>{v}</span>}
            <IoChevronForward size={16} color="#C0C4CC" />
          </div>
        ))}
        <div style={{ height: 14 }} />
      </Phone>
    ),
  },
];
