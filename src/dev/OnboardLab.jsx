/* eslint-disable */
/**
 * 온보딩 시안 — 가입 과정 세 화면(전화번호 입력 · 문자 코드 입력 · 회원정보 입력)의 후보.
 * /lab 에서 펼쳐 보여 준다. 0번이 지금 화면이다. (대표 9/17)
 */
import React from "react";

const G = "#00963F";      // 현재 포인트 색
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";

/* ── 공통 조각 ── */
const Screen = ({ children, title, sub }) => (
  <div style={{ border: `1px solid ${LINE}`, background: "#F7F8FA", minHeight: 430, display: "flex", flexDirection: "column" }}>
    <div style={{ background: "#fff", padding: "14px 16px", borderBottom: `1px solid #EFF1F4`, fontSize: 16, fontWeight: 700 }}>{title}</div>
    {sub && <div style={{ padding: "12px 16px 0", fontSize: 14, color: SUB, lineHeight: 1.5 }}>{sub}</div>}
    <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, flex: 1 }}>{children}</div>
  </div>
);
const Label = ({ children }) => <div style={{ fontSize: 14, color: TXT, fontWeight: 600 }}>{children}</div>;
const Field = ({ ph, val }) => (
  <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: "13px 12px", fontSize: 15, color: val ? TXT : "#9AA3AF" }}>{val || ph}</div>
);
const Btn = ({ children, $ghost, $wide }) => (
  <div style={{
    background: $ghost ? "#fff" : G, color: $ghost ? TXT : "#fff", border: $ghost ? `1px solid ${LINE}` : "none",
    padding: "13px 12px", textAlign: "center", fontSize: 15, fontWeight: 700, width: $wide ? "100%" : undefined, boxSizing: "border-box",
  }}>{children}</div>
);
const Row = ({ children, gap = 8 }) => <div style={{ display: "flex", gap, alignItems: "stretch" }}>{children}</div>;
const Steps = ({ n }) => (
  <div style={{ display: "flex", gap: 6, alignItems: "center", fontSize: 13, color: SUB }}>
    {[1, 2, 3].map((i) => (
      <span key={i} style={{ width: 22, height: 22, borderRadius: "50%", background: i === n ? G : "#E5E8EC", color: i === n ? "#fff" : "#8A93A0", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 700 }}>{i}</span>
    ))}
    <span style={{ marginLeft: 4 }}>{n}단계 / 3단계</span>
  </div>
);
const Otp = ({ filled = 0, big }) => (
  <div style={{ display: "flex", gap: 6 }}>
    {[0, 1, 2, 3, 4, 5].map((i) => (
      <div key={i} style={{
        flex: 1, height: big ? 52 : 44, border: `1px solid ${i < filled ? G : LINE}`, background: "#fff",
        display: "flex", alignItems: "center", justifyContent: "center", fontSize: big ? 22 : 18, fontWeight: 700, color: TXT,
      }}>{i < filled ? "•" : ""}</div>
    ))}
  </div>
);

/* ── 시안 정의 ── */
export const OnboardCases = [
  {
    group: "전화번호 입력",
    items: [
      { no: 0, name: "현재 화면 (적용됨)", note: "왜 번호가 필요한지 먼저 알려 주는 안으로 9월 17일 적용했습니다.", render: () => (
        <Screen title="전화번호 입력">
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: 14, fontSize: 14, color: SUB, lineHeight: 1.6 }}>
            전화번호는 카카오·구글 로그인과 아이디 로그인을 한 계정으로 묶는 기준입니다. 오더 연락에도 쓰입니다.
          </div>
          <Label>전화번호</Label>
          <Row><div style={{ flex: 1 }}><Field ph="010-1234-5678" /></div><Btn $ghost>인증번호 전송</Btn></Row>
          <div style={{ marginTop: "auto" }}><Btn $wide>확인 완료</Btn></div>
        </Screen>
      ) },
      { no: 1, name: "단계 표시 + 큰 버튼", note: "지금 몇 단계인지 위에 보이고, 전송 버튼을 아래에 크게 둡니다.", render: () => (
        <Screen title="전화번호 입력" sub="오더 접수와 계정 연결에 쓰입니다.">
          <Steps n={1} />
          <Label>휴대폰 번호</Label>
          <Field ph="010-1234-5678" />
          <div style={{ fontSize: 13, color: SUB }}>입력하신 번호로 인증번호를 보내드립니다.</div>
          <div style={{ marginTop: "auto" }}><Btn $wide>인증번호 받기</Btn></div>
        </Screen>
      ) },
      { no: 9, name: "안내 문구만 있는 안 (예전 후보)", note: "전송 버튼을 아래에 크게 둔 형태입니다.", render: () => (
        <Screen title="전화번호 입력">
          <div style={{ background: "#fff", border: `1px solid ${LINE}`, padding: 14, fontSize: 14, color: SUB, lineHeight: 1.6 }}>
            전화번호는 카카오·구글 로그인과 아이디 로그인을 한 계정으로 묶는 기준입니다. 오더 연락에도 쓰입니다.
          </div>
          <Label>휴대폰 번호</Label>
          <Field ph="010-1234-5678" />
          <div style={{ marginTop: "auto" }}><Btn $wide>인증번호 받기</Btn></div>
        </Screen>
      ) },
    ],
  },
  {
    group: "문자 코드 입력",
    items: [
      { no: 0, name: "현재 화면 (유지)", note: "전송을 누르면 여섯 칸 입력창이 뜹니다. 이 방식을 유지합니다.", render: () => (
        <Screen title="인증번호 입력" sub="010-1234-5678 로 보낸 6자리를 입력해 주세요.">
          <Otp filled={3} />
          <div style={{ fontSize: 13, color: SUB }}>재전송은 24초 뒤에 할 수 있어요</div>
          <Row><Btn $ghost>닫기</Btn><Btn $ghost>재전송</Btn><Btn>확인</Btn></Row>
        </Screen>
      ) },
      { no: 1, name: "큰 칸 · 자동 확인", note: "칸을 키우고 여섯 자리를 다 넣으면 버튼 없이 넘어갑니다.", render: () => (
        <Screen title="인증번호 입력" sub="문자로 받은 숫자 여섯 자리를 넣어 주세요.">
          <Steps n={2} />
          <Otp filled={4} big />
          <div style={{ fontSize: 13, color: SUB }}>남은 시간 2분 41초 · 재전송</div>
          <div style={{ marginTop: "auto", fontSize: 13, color: SUB }}>여섯 자리를 모두 넣으면 자동으로 확인됩니다.</div>
        </Screen>
      ) },
      { no: 2, name: "한 칸 입력", note: "칸을 나누지 않고 한 줄에 여섯 자리를 넣습니다. 붙여넣기 편합니다.", render: () => (
        <Screen title="인증번호 입력" sub="010-1234-5678 로 보냈습니다.">
          <Field val="1 2 3 4 5 6" />
          <div style={{ fontSize: 13, color: SUB }}>문자를 복사해 붙여 넣어도 됩니다. 남은 시간 2분 41초</div>
          <Row><Btn $ghost>재전송</Btn><Btn>확인</Btn></Row>
        </Screen>
      ) },
    ],
  },
  {
    group: "회원정보 입력",
    items: [
      { no: 9, name: "예전 화면", note: "추천인 코드가 다른 칸과 같은 모양이던 예전 화면입니다.", render: () => (
        <Screen title="업체 정보 설정" sub="다른 사용자에게 보여질 업체명이에요">
          <Label>회원유형</Label>
          <Row><Btn>사업자회원</Btn><Btn $ghost>일반고객</Btn></Row>
          <Label>업체명</Label>
          <Field ph="사업자등록증 상호명" />
          <Label>추천인 코드 (선택)</Label>
          <Field ph="추천인 코드가 있다면 입력하세요" />
          <div style={{ marginTop: "auto" }}><Btn $wide>완료</Btn></div>
        </Screen>
      ) },
      { no: 1, name: "유형을 먼저 묻기", note: "사업자인지 일반 고객인지 먼저 고르고, 그에 맞는 칸만 보여 줍니다.", render: () => (
        <Screen title="회원 정보 입력">
          <Steps n={3} />
          <Label>어떤 회원이신가요</Label>
          <Row><Btn>사업자회원</Btn><Btn $ghost>일반고객</Btn></Row>
          <Label>업체명</Label>
          <Field ph="사업자등록증 상호명" />
          <div style={{ fontSize: 13, color: SUB }}>추천인 코드는 가입 후 마이페이지에서도 넣을 수 있습니다.</div>
          <div style={{ marginTop: "auto" }}><Btn $wide>가입 완료</Btn></div>
        </Screen>
      ) },
      { no: 0, name: "현재 화면 (적용됨)", note: "추천인 코드를 눈에 띄게 둔 안으로 9월 17일 적용했습니다.", render: () => (
        <Screen title="회원 정보 입력" sub="마지막 단계입니다.">
          <Label>회원유형</Label>
          <Row><Btn>사업자회원</Btn><Btn $ghost>일반고객</Btn></Row>
          <Label>업체명</Label>
          <Field ph="사업자등록증 상호명" />
          <div style={{ background: "#fff", border: `1px solid ${G}`, padding: 12 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: TXT, marginBottom: 6 }}>추천인 코드가 있으신가요</div>
            <Field ph="코드를 넣으면 3,000P를 드립니다" />
          </div>
          <div style={{ marginTop: "auto" }}><Btn $wide>가입 완료</Btn></div>
        </Screen>
      ) },
    ],
  },
];

const OnboardLab = () => null;
export default OnboardLab;
