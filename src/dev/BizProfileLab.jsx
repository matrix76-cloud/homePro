/* eslint-disable */
/**
 * 비즈프로필(본인) 윗부분 시안 — 프로필 카드 · 등급/활동 · 포트폴리오·SNS (형 9/17)
 * 폭 390 실제 크기. 0번이 지금 화면.
 */
import React from "react";
import { IoChevronBack, IoLocationOutline, IoAddOutline, IoChevronForward, IoLogoInstagram, IoLogoYoutube, IoGlobeOutline, IoBriefcaseOutline, IoCreateOutline } from "react-icons/io5";

const G = "#00963F";
const G_DEEP = "#007A33";
const G_TINT = "#E6F7EE";
const BTN = "#00B84A";
const GOLD = "#D4930D";
const TXT = "#14181F";
const SUB = "#2b2f36";
const LINE = "#E3E6EB";
const BG = "#F7F8FA";

const SNS = [
  { label: "네이버 블로그", ph: "blog.naver.com/아이디", Icon: () => <span style={{ fontWeight: 900, fontSize: 15, color: "#03C75A" }}>N</span> },
  { label: "인스타그램", ph: "아이디 또는 주소", Icon: () => <IoLogoInstagram size={18} color="#C13584" /> },
  { label: "유튜브", ph: "youtube.com/@채널", Icon: () => <IoLogoYoutube size={18} color="#FF0000" /> },
  { label: "포트폴리오", ph: "숨고·오늘의집 등 주소", Icon: () => <IoBriefcaseOutline size={18} color={TXT} /> },
  { label: "개인 웹사이트", ph: "example.com", Icon: () => <IoGlobeOutline size={18} color={TXT} /> },
];

const Screen = ({ children }) => (
  <div style={{ width: 390, maxWidth: "100%", background: BG, border: `1px solid ${LINE}`, paddingBottom: 16 }}>
    <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "14px 16px", background: "#fff", borderBottom: "1px solid #EFF1F4" }}>
      <IoChevronBack size={22} color={TXT} /><span style={{ fontSize: 19, fontWeight: 700, color: TXT }}>비즈프로필</span>
    </div>
    {children}
  </div>
);
const Card = ({ children, style }) => <div style={{ background: "#fff", borderRadius: 14, margin: "12px 12px 0", padding: 18, ...style }}>{children}</div>;
const Avatar = ({ size = 60 }) => <div style={{ width: size, height: size, borderRadius: size / 2, background: G_TINT, color: G, fontSize: size * 0.4, fontWeight: 800, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>테</div>;
const Input = ({ ph, full = true }) => (
  <div style={{ width: full ? "100%" : "56%", boxSizing: "border-box", height: 48, border: `1px solid ${LINE}`, borderRadius: 10, background: full ? "#fff" : BG, padding: "0 14px", display: "flex", alignItems: "center", fontSize: 15, color: "#8A93A0" }}>{ph}</div>
);
const SaveBtn = ({ label = "링크 저장" }) => (
  <div style={{ marginTop: 16, height: 52, borderRadius: 10, background: BTN, color: "#fff", fontSize: 17, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{label}</div>
);
const Bar = ({ pct = 25 }) => (
  <div style={{ height: 8, borderRadius: 4, background: "#EDEFF2", overflow: "hidden", marginTop: 10 }}><div style={{ width: pct + "%", height: "100%", background: G }} /></div>
);
const Stats = ({ lined = true }) => (
  <div style={{ display: "flex", marginTop: 16 }}>
    {[["7,500", "누적 포인트"], ["0", "견적 보낸 수"], ["0", "고용"], ["0", "리뷰"]].map(([n, l], i) => (
      <div key={l} style={{ flex: 1, textAlign: "center", borderLeft: i && lined ? "1px solid #EFF1F4" : "none" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: TXT }}>{n}</div>
        <div style={{ fontSize: 13, color: SUB, marginTop: 2 }}>{l}</div>
      </div>
    ))}
  </div>
);

export const BizProfileCases = [
  {
    no: 0, name: "지금 화면", note: "등급이 알약 뱃지, 입력칸이 절반 폭만 차서 오른쪽이 비어 보입니다. 카드가 세 개로 나뉘어 있습니다.",
    render: () => (
      <Screen>
        <Card>
          <div style={{ display: "flex", gap: 14 }}>
            <Avatar />
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <b style={{ fontSize: 20, color: TXT }}>테스트업체</b>
                <span style={{ fontSize: 12, fontWeight: 700, background: "#FDF3DC", color: TXT, padding: "2px 7px", borderRadius: 20 }}>● 골드</span>
              </div>
              <div style={{ fontSize: 15, color: SUB, marginTop: 4 }}>한줄 소개를 작성해보세요</div>
              <div style={{ fontSize: 15, color: TXT, marginTop: 6, display: "flex", alignItems: "center", gap: 4 }}><IoLocationOutline size={15} />서울 마포구</div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #EFF1F4", marginTop: 14, paddingTop: 14, display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><IoAddOutline size={18} color={G} />전문분야 등록하기</span><IoChevronForward size={18} />
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 14, color: SUB }}>7,500P 더 모으면 <b style={{ color: G }}>다이아</b> 등급이에요!</div>
          <Bar />
          <Stats />
        </Card>
        <Card>
          <b style={{ fontSize: 17 }}>포트폴리오 · SNS</b>
          <div style={{ fontSize: 14, color: SUB, margin: "3px 0 12px" }}>등록한 채널은 내 프로필을 보는 홈프로에게 노출됩니다</div>
          {SNS.slice(0, 3).map((s) => (
            <div key={s.label} style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{s.label}</div>
              <Input ph={s.ph} full={false} />
            </div>
          ))}
          <div style={{ fontSize: 13, color: SUB }}>… 포트폴리오 · 개인 웹사이트</div>
          <SaveBtn />
        </Card>
      </Screen>
    ),
  },
  {
    no: 1, name: "정리만 (구성 그대로)", note: "카드 셋은 그대로 두고, 등급은 뱃지 대신 이름 아래 글씨로, 입력칸은 전체 폭으로 폅니다. 가장 작게 바꾸는 안입니다.",
    render: () => (
      <Screen>
        <Card>
          <div style={{ display: "flex", gap: 14 }}>
            <Avatar />
            <div>
              <b style={{ fontSize: 20, color: TXT }}>테스트업체</b>
              <div style={{ fontSize: 14, fontWeight: 700, color: GOLD, marginTop: 2 }}>골드 등급</div>
              <div style={{ fontSize: 15, color: SUB, marginTop: 4 }}>한줄 소개를 작성해보세요</div>
              <div style={{ fontSize: 15, color: TXT, marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}><IoLocationOutline size={15} />서울 마포구</div>
            </div>
          </div>
          <div style={{ borderTop: "1px solid #EFF1F4", marginTop: 14, paddingTop: 14, display: "flex", justifyContent: "space-between", fontSize: 16, fontWeight: 700 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><IoAddOutline size={18} color={G} />전문분야 등록하기</span><IoChevronForward size={18} />
          </div>
        </Card>
        <Card>
          <div style={{ fontSize: 15, color: SUB }}>7,500P 더 모으면 <b style={{ color: G }}>다이아</b> 등급이에요</div>
          <Bar />
          <Stats />
        </Card>
        <Card>
          <b style={{ fontSize: 17 }}>포트폴리오 · SNS</b>
          <div style={{ fontSize: 14, color: SUB, margin: "3px 0 14px" }}>등록한 채널은 내 프로필을 보는 홈프로에게 노출됩니다</div>
          {SNS.slice(0, 3).map((s) => (
            <div key={s.label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{s.label}</div>
              <Input ph={s.ph} />
            </div>
          ))}
          <div style={{ fontSize: 13, color: SUB }}>… 포트폴리오 · 개인 웹사이트</div>
          <SaveBtn />
        </Card>
      </Screen>
    ),
  },
  {
    no: 2, name: "프로필 한 덩어리", note: "프로필·등급·활동 숫자를 카드 하나로 합치고, 전문분야 등록은 그 아래 버튼 한 줄로 뺍니다. 위쪽이 짧아집니다.",
    render: () => (
      <Screen>
        <Card>
          <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
            <Avatar size={64} />
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
                <b style={{ fontSize: 21, color: TXT }}>테스트업체</b>
                <span style={{ fontSize: 14, fontWeight: 700, color: GOLD }}>골드</span>
              </div>
              <div style={{ fontSize: 15, color: SUB, marginTop: 3 }}>한줄 소개를 작성해보세요</div>
              <div style={{ fontSize: 14, color: TXT, marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}><IoLocationOutline size={14} />서울 마포구</div>
            </div>
            <IoCreateOutline size={22} color={SUB} />
          </div>
          <div style={{ marginTop: 16, fontSize: 14, color: SUB }}>다이아까지 <b style={{ color: G }}>7,500P</b></div>
          <Bar />
          <Stats />
        </Card>
        <div style={{ margin: "12px 12px 0", height: 52, borderRadius: 10, border: `1px solid ${G}`, background: "#fff", color: G_DEEP, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
          <IoAddOutline size={19} />전문분야 등록하기
        </div>
        <Card>
          <b style={{ fontSize: 17 }}>포트폴리오 · SNS</b>
          <div style={{ fontSize: 14, color: SUB, margin: "3px 0 14px" }}>등록한 채널은 내 프로필을 보는 홈프로에게 노출됩니다</div>
          {SNS.slice(0, 3).map((s) => (
            <div key={s.label} style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{s.label}</div>
              <Input ph={s.ph} />
            </div>
          ))}
          <SaveBtn />
        </Card>
      </Screen>
    ),
  },
  {
    no: 3, name: "SNS 아이콘 줄", note: "SNS 입력칸을 칸마다 아이콘을 붙인 한 줄로 바꿔 라벨 줄을 없앱니다. 다섯 칸이 한눈에 들어옵니다.",
    render: () => (
      <Screen>
        <Card>
          <div style={{ display: "flex", gap: 14 }}>
            <Avatar />
            <div>
              <b style={{ fontSize: 20, color: TXT }}>테스트업체</b>
              <div style={{ fontSize: 14, fontWeight: 700, color: GOLD, marginTop: 2 }}>골드 등급</div>
              <div style={{ fontSize: 15, color: SUB, marginTop: 4 }}>한줄 소개를 작성해보세요</div>
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 14, color: SUB }}>7,500P 더 모으면 <b style={{ color: G }}>다이아</b> 등급이에요</div>
          <Bar />
          <Stats />
        </Card>
        <Card>
          <b style={{ fontSize: 17 }}>포트폴리오 · SNS</b>
          <div style={{ fontSize: 14, color: SUB, margin: "3px 0 14px" }}>등록한 채널은 내 프로필을 보는 홈프로에게 노출됩니다</div>
          {SNS.map((s) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, height: 50, border: `1px solid ${LINE}`, borderRadius: 10, padding: "0 12px", marginBottom: 8 }}>
              <span style={{ width: 22, display: "flex", justifyContent: "center" }}><s.Icon /></span>
              <span style={{ fontSize: 15, fontWeight: 700, color: TXT, width: 92, flexShrink: 0 }}>{s.label}</span>
              <span style={{ fontSize: 15, color: "#8A93A0" }}>{s.ph}</span>
            </div>
          ))}
          <SaveBtn />
        </Card>
      </Screen>
    ),
  },
  {
    no: 4, name: "등록된 것만 + 추가", note: "빈 입력칸 다섯 개를 늘어놓지 않고, 등록한 채널만 보여 주고 [채널 추가]로 하나씩 넣습니다. 비어 있을 땐 가장 짧습니다.",
    render: () => (
      <Screen>
        <Card>
          <div style={{ display: "flex", gap: 14 }}>
            <Avatar />
            <div>
              <b style={{ fontSize: 20, color: TXT }}>테스트업체</b>
              <div style={{ fontSize: 14, fontWeight: 700, color: GOLD, marginTop: 2 }}>골드 등급</div>
              <div style={{ fontSize: 15, color: SUB, marginTop: 4 }}>한줄 소개를 작성해보세요</div>
            </div>
          </div>
          <div style={{ marginTop: 14, fontSize: 14, color: SUB }}>7,500P 더 모으면 <b style={{ color: G }}>다이아</b> 등급이에요</div>
          <Bar />
          <Stats />
        </Card>
        <Card>
          <b style={{ fontSize: 17 }}>포트폴리오 · SNS</b>
          <div style={{ fontSize: 14, color: SUB, margin: "3px 0 14px" }}>등록한 채널은 내 프로필을 보는 홈프로에게 노출됩니다</div>
          {[SNS[0], SNS[1]].map((s, i) => (
            <div key={s.label} style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 0", borderTop: i ? "1px solid #EFF1F4" : "none" }}>
              <span style={{ width: 22, display: "flex", justifyContent: "center" }}><s.Icon /></span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 15, fontWeight: 700 }}>{s.label}</div>
                <div style={{ fontSize: 14, color: SUB }}>{i ? "instagram.com/testcompany" : "blog.naver.com/test"}</div>
              </div>
              <span style={{ fontSize: 14, color: SUB }}>수정</span>
            </div>
          ))}
          <div style={{ marginTop: 10, height: 50, borderRadius: 10, border: `1px dashed ${G}`, color: G_DEEP, fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>
            <IoAddOutline size={19} />채널 추가
          </div>
        </Card>
      </Screen>
    ),
  },
  {
    no: 5, name: "카드 없이 줄로", note: "흰 카드를 걷어내고 흰 바탕 한 장에 굵은 구분선으로만 나눕니다. 화면이 넓고 조용해 보입니다.",
    render: () => (
      <Screen>
        <div style={{ background: "#fff" }}>
          <div style={{ display: "flex", gap: 14, padding: "20px 16px" }}>
            <Avatar />
            <div>
              <b style={{ fontSize: 20, color: TXT }}>테스트업체</b>
              <div style={{ fontSize: 14, fontWeight: 700, color: GOLD, marginTop: 2 }}>골드 등급</div>
              <div style={{ fontSize: 15, color: SUB, marginTop: 4 }}>한줄 소개를 작성해보세요</div>
              <div style={{ fontSize: 14, color: TXT, marginTop: 3, display: "flex", alignItems: "center", gap: 3 }}><IoLocationOutline size={14} />서울 마포구</div>
            </div>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", padding: "14px 16px", borderTop: "1px solid #EFF1F4", fontSize: 16, fontWeight: 700 }}>
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}><IoAddOutline size={18} color={G} />전문분야 등록하기</span><IoChevronForward size={18} />
          </div>
          <div style={{ height: 8, background: BG }} />
          <div style={{ padding: "16px" }}>
            <div style={{ fontSize: 14, color: SUB }}>7,500P 더 모으면 <b style={{ color: G }}>다이아</b> 등급이에요</div>
            <Bar />
            <Stats lined={false} />
          </div>
          <div style={{ height: 8, background: BG }} />
          <div style={{ padding: "16px" }}>
            <b style={{ fontSize: 17 }}>포트폴리오 · SNS</b>
            <div style={{ fontSize: 14, color: SUB, margin: "3px 0 14px" }}>등록한 채널은 내 프로필을 보는 홈프로에게 노출됩니다</div>
            {SNS.slice(0, 3).map((s) => (
              <div key={s.label} style={{ marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 6 }}>{s.label}</div>
                <Input ph={s.ph} />
              </div>
            ))}
            <SaveBtn />
          </div>
        </div>
      </Screen>
    ),
  },
];
