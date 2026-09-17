/* eslint-disable */
/**
 * 마이페이지 "프로필 편집"(사진·대화명·자기소개) 시안 (형 9/17)
 * 폭 390 실제 크기. 0번이 지금 화면(가운데 뜨는 창).
 */
import React from "react";
import { IoClose, IoCameraOutline, IoChevronBack, IoPersonCircleOutline } from "react-icons/io5";

const G = "#00963F";
const BTN = "#00B84A";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#D9DDE3";
const BG = "#F7F8FA";
const PH = "#8A93A0";

const H = 720;

/* 뒤에 깔린 마이페이지 (흐리게) */
const Behind = () => (
  <div style={{ position: "absolute", inset: 0, background: BG }}>
    <div style={{ background: "#fff", padding: "16px", fontSize: 19, fontWeight: 700, textAlign: "center" }}>마이페이지</div>
    <div style={{ background: "#fff", margin: 12, borderRadius: 14, padding: 18, display: "flex", gap: 12, alignItems: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: 28, background: "#E6F7EE" }} />
      <div><b style={{ fontSize: 18 }}>ㅎㅎㅎ</b><div style={{ fontSize: 14, color: SUB }}>골드 · 홈프로 일반회원</div></div>
    </div>
    {[1, 2, 3].map((i) => <div key={i} style={{ background: "#fff", margin: 12, borderRadius: 14, height: 90 }} />)}
  </div>
);
const Phone = ({ children, dim = true }) => (
  <div style={{ position: "relative", width: 390, maxWidth: "100%", height: H, overflow: "hidden", border: `1px solid ${LINE}` }}>
    <Behind />
    {dim && <div style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)" }} />}
    {children}
  </div>
);
const Photo = ({ size = 80, badge = true }) => (
  <div style={{ position: "relative", width: size, height: size }}>
    <IoPersonCircleOutline size={size} color="#D9DDE3" />
    {badge && (
      <div style={{ position: "absolute", right: 0, bottom: 0, width: 28, height: 28, borderRadius: 14, background: "#1b1f27", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <IoCameraOutline size={15} color="#fff" />
      </div>
    )}
  </div>
);
const Label = ({ children, count }) => (
  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
    <span style={{ fontSize: 15, fontWeight: 700, color: TXT }}>{children}</span>
    {count && <span style={{ fontSize: 13, color: SUB }}>{count}</span>}
  </div>
);
const Field = ({ value, ph, h = 50 }) => (
  <div style={{ height: h, border: `1px solid ${LINE}`, borderRadius: 10, background: "#fff", padding: h > 60 ? "12px 14px" : "0 14px", display: "flex", alignItems: h > 60 ? "flex-start" : "center", fontSize: 16, color: value ? TXT : PH, lineHeight: 1.5, boxSizing: "border-box" }}>
    {value || ph}
  </div>
);
const Save = ({ style }) => (
  <div style={{ height: 54, borderRadius: 10, background: BTN, color: "#fff", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", ...style }}>저장</div>
);

export const ProfileEditCases = [
  {
    no: 0, name: "지금 화면", note: "가운데 뜨는 창. 대화명 칸에 이름표가 없고, 글자 수가 칸 밑에 따로 떨어져 있습니다.",
    render: () => (
      <Phone>
        <div style={{ position: "absolute", left: 20, right: 20, top: 110, background: "#fff", borderRadius: 20, padding: "28px 24px 24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 24 }}>
            <span style={{ fontSize: 20, fontWeight: 600 }}>프로필 편집</span><IoClose size={24} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}><Photo /></div>
          <div style={{ height: 46, background: BG, borderRadius: 10, padding: "0 12px", display: "flex", alignItems: "center", fontSize: 16 }}>ㅎㅎㅎ</div>
          <div style={{ textAlign: "right", fontSize: 13, color: SUB, margin: "4px 0 10px" }}>3/12</div>
          <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 6 }}>자기소개</div>
          <div style={{ height: 96, background: BG, borderRadius: 10, padding: 12, fontSize: 16, color: PH }}>전문 분야, 경력, 강점 등을 소개해주세요</div>
          <div style={{ textAlign: "right", fontSize: 13, color: SUB, margin: "4px 0 14px" }}>0/200</div>
          <Save />
        </div>
      </Phone>
    ),
  },
  {
    no: 1, name: "창 그대로, 칸 정리", note: "가운데 창은 두고 대화명에도 이름표를 달고, 글자 수는 이름표 오른쪽으로 올립니다. 칸은 흰 면 + 얇은 테두리.",
    render: () => (
      <Phone>
        <div style={{ position: "absolute", left: 20, right: 20, top: 110, background: "#fff", borderRadius: 16, padding: "22px 20px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>프로필 편집</span><IoClose size={24} />
          </div>
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 18 }}>
            <Photo />
            <span style={{ fontSize: 14, color: SUB, marginTop: 6 }}>사진 바꾸기</span>
          </div>
          <Label count="3/12">대화명</Label>
          <Field value="ㅎㅎㅎ" />
          <div style={{ height: 16 }} />
          <Label count="0/200">자기소개</Label>
          <Field ph="전문 분야, 경력, 강점 등을 소개해주세요" h={110} />
          <Save style={{ marginTop: 18 }} />
        </div>
      </Phone>
    ),
  },
  {
    no: 2, name: "아래에서 올라오는 판", note: "창을 화면 아래에서 올라오게 합니다. 손가락이 닿기 쉽고, 키보드가 올라와도 칸이 덜 가려집니다.",
    render: () => (
      <Phone>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 0, background: "#fff", borderRadius: "18px 18px 0 0", padding: "10px 20px 24px" }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: LINE, margin: "0 auto 14px" }} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>프로필 편집</span><IoClose size={24} />
          </div>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 18 }}><Photo /></div>
          <Label count="3/12">대화명</Label>
          <Field value="ㅎㅎㅎ" />
          <div style={{ height: 16 }} />
          <Label count="0/200">자기소개</Label>
          <Field ph="전문 분야, 경력, 강점 등을 소개해주세요" h={110} />
          <Save style={{ marginTop: 18 }} />
        </div>
      </Phone>
    ),
  },
  {
    no: 3, name: "사진 옆에 대화명", note: "사진과 대화명을 한 줄에 놓아 높이를 줄입니다. 창이 짧아져 뒤 화면이 더 보입니다.",
    render: () => (
      <Phone>
        <div style={{ position: "absolute", left: 20, right: 20, top: 150, background: "#fff", borderRadius: 16, padding: "22px 20px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>프로필 편집</span><IoClose size={24} />
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
            <Photo size={72} />
            <div style={{ flex: 1 }}>
              <Label count="3/12">대화명</Label>
              <Field value="ㅎㅎㅎ" />
            </div>
          </div>
          <div style={{ height: 16 }} />
          <Label count="0/200">자기소개</Label>
          <Field ph="전문 분야, 경력, 강점 등을 소개해주세요" h={110} />
          <Save style={{ marginTop: 18 }} />
        </div>
      </Phone>
    ),
  },
  {
    no: 4, name: "화면 한 장으로", note: "창 대신 편집 화면으로 넘어갑니다. 저장은 위 오른쪽. 자기소개를 길게 쓰기 편합니다.",
    render: () => (
      <Phone dim={false}>
        <div style={{ position: "absolute", inset: 0, background: "#fff" }}>
          <div style={{ display: "flex", alignItems: "center", padding: "14px 16px", borderBottom: "1px solid #EFF1F4" }}>
            <IoChevronBack size={22} />
            <span style={{ fontSize: 19, fontWeight: 700, marginLeft: 8 }}>프로필 편집</span>
            <span style={{ marginLeft: "auto", fontSize: 17, fontWeight: 700, color: G }}>저장</span>
          </div>
          <div style={{ padding: "26px 20px" }}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: 26 }}>
              <Photo size={96} />
              <span style={{ fontSize: 15, color: SUB, marginTop: 8 }}>사진 바꾸기</span>
            </div>
            <Label count="3/12">대화명</Label>
            <Field value="ㅎㅎㅎ" />
            <div style={{ height: 20 }} />
            <Label count="0/200">자기소개</Label>
            <Field ph="전문 분야, 경력, 강점 등을 소개해주세요" h={180} />
          </div>
        </div>
      </Phone>
    ),
  },
  {
    no: 5, name: "보이는 모습 미리보기", note: "창 맨 위에 다른 사람에게 보일 프로필 한 줄을 미리 보여 주고, 고치면 바로 바뀌게 합니다.",
    render: () => (
      <Phone>
        <div style={{ position: "absolute", left: 20, right: 20, top: 90, background: "#fff", borderRadius: 16, padding: "22px 20px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <span style={{ fontSize: 20, fontWeight: 700 }}>프로필 편집</span><IoClose size={24} />
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", padding: 14, border: `1px solid ${LINE}`, borderRadius: 12, background: BG, marginBottom: 18 }}>
            <Photo size={56} badge={false} />
            <div>
              <div style={{ fontSize: 13, color: SUB }}>다른 사람에게 이렇게 보여요</div>
              <b style={{ fontSize: 17 }}>ㅎㅎㅎ</b>
              <div style={{ fontSize: 14, color: SUB }}>소개가 아직 없어요</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: 14, alignItems: "flex-end" }}>
            <Photo size={64} />
            <div style={{ flex: 1 }}>
              <Label count="3/12">대화명</Label>
              <Field value="ㅎㅎㅎ" />
            </div>
          </div>
          <div style={{ height: 16 }} />
          <Label count="0/200">자기소개</Label>
          <Field ph="전문 분야, 경력, 강점 등을 소개해주세요" h={100} />
          <Save style={{ marginTop: 18 }} />
        </div>
      </Phone>
    ),
  },
];
