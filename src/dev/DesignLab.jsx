/* eslint-disable */
/**
 * 시안 모음 — /lab
 *   위 탭으로 주제를 고르고, 고른 주제의 시안은 화면 전체 폭에 한눈에 펼친다. (대표 9/17)
 *   주제가 늘어나면 TABS 에 추가한다.
 */
import React, { useState } from "react";
import { IconCases, IconTile } from "./IconLab";
import { ColorCases, ColorPhone } from "./ColorLab";
import { OnboardCases } from "./OnboardLab";
import { DoneCases } from "./DoneLab";
import { HomeSections } from "./HomeLab";
import { TabSections } from "./TabsLab";
import { HomeTuneCases } from "./HomeTuneLab";
import { PointLineCases } from "./PointLineLab";
import { BizProfileCases } from "./BizProfileLab";
import { ProfileEditCases } from "./ProfileEditLab";
import { CommunityListCases, CommunityDetailCases } from "./CommunityLab";
import { AssetSubTabCases } from "./AssetSubTabLab";
import { FilterCases, FilterOpenCases } from "./FilterLab";
import { EmptyCases } from "./EmptyLab";
import { AiInputCases, AiResultCases } from "./AiLab";
import { CatCases, StepFrameCases, SubChipCases } from "./CatLab";
import { AssetCases, ReferredCases } from "./AssetLab";
import { TableCases, ChatCases, ChatFilterCases, ChatEmptyCases } from "./ListLab";
import { BrokerDetailCases } from "./BrokerLab";
import { NoticeCases } from "./NoticeLab";
import { PointPageCases, PointEmptyCases } from "./PointLab";

const sortByNo = (a, b) => a.no - b.no;

const TABS = [
  { key: "icon", label: "앱 아이콘" },
  { key: "color", label: "포인트 색" },
  { key: "onboard", label: "온보딩" },
  { key: "done", label: "가입 완료" },
  { key: "home", label: "홈 화면" },
  { key: "tabs", label: "홈 안쪽 탭" },
  { key: "tune", label: "홈 다듬기" },
  { key: "pointline", label: "포인트 줄" },
  { key: "bizprofile", label: "비즈프로필" },
  { key: "profileedit", label: "프로필 편집" },
  { key: "community", label: "커뮤니티" },
  { key: "assetsub", label: "보유자산 안쪽 전환" },
  { key: "filter", label: "필터 줄" },
  { key: "empty", label: "빈 화면" },
  { key: "ai", label: "AI 견적" },
  { key: "cat", label: "카테고리 · 단계틀" },
  { key: "asset", label: "보유자산" },
  { key: "list", label: "홈 표 · 채팅" },
  { key: "broker", label: "공동중개 상세" },
  { key: "notice", label: "공지사항" },
  { key: "point", label: "포인트 화면" },
];

const DesignLab = () => {
  const [tab, setTab] = useState(() => new URLSearchParams(window.location.search).get("tab") || "icon");
  return (
    <Wrap>
      <Title>홈프로 시안</Title>
      <Lead>위 탭에서 주제를 고르시면 그 주제의 시안이 한 화면에 모두 나옵니다. 마음에 드는 번호를 알려 주세요. 0번이 지금 화면입니다.</Lead>

      <div><TabBar>
        {TABS.map((t, i) => (
          <TabBtn key={t.key} $on={t.key === tab} $first={i === 0} onClick={() => setTab(t.key)}>{t.label}</TabBtn>
        ))}
      </TabBar></div>

      {tab === "icon" && (
        <>
          <SectionNote>기본 모양과 삼성 원형, 작게 줄인 모습, 홈 화면에 놓였을 때를 함께 보여 드립니다.</SectionNote>
          <Grid $min={230}>
            {[...IconCases].sort(sortByNo).map((c) => (
              <Card key={c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                <IconRow>
                  <IconTile c={c} size={104} round={24} />
                  <IconTile c={c} size={72} round="50%" />
                  <IconTile c={c} size={52} round={12} />
                </IconRow>
                <HomeRow>
                  <IconTile c={c} size={46} round={12} />
                  <HomeDot $bg="#2FA84F" />
                  <HomeDot $bg="#F7E600" />
                  <HomeDot $bg="#3A7BD5" />
                </HomeRow>
              </Card>
            ))}
          </Grid>
        </>
      )}

      {tab === "color" && (
        <>
          <SectionNote>같은 화면을 색만 바꿔 그렸습니다. 헤더 로고, 선택된 탭, 포인트 숫자, 접수 상태 글씨, 선택된 필터, 예약접수 버튼, 하단 메뉴에 적용한 모습입니다.</SectionNote>
          <Grid $min={330}>
            {[...ColorCases].sort(sortByNo).map((c) => (
              <Card key={c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                <SwatchRow>
                  <Swatch $bg={c.accent} /> <SwatchText>포인트 {c.accent}</SwatchText>
                  <Swatch $bg={c.btn} /> <SwatchText>버튼 {c.btn}</SwatchText>
                </SwatchRow>
                <ColorPhone c={c} />
              </Card>
            ))}
          </Grid>
        </>
      )}

      {tab === "onboard" && (
        <>
          <SectionNote>가입 과정 세 화면입니다. 화면마다 후보를 나란히 두었습니다. 화면별로 따로 골라 주셔도 됩니다.</SectionNote>
          {OnboardCases.map((g) => (
            <div key={g.group}>
              <GroupTitle>{g.group}</GroupTitle>
              <Grid $min={300}>
                {[...g.items].sort(sortByNo).map((c) => (
                  <Card key={c.no} $on={c.no === 0}>
                    <CardTitle>{c.no}. {c.name}</CardTitle>
                    <CardNote>{c.note}</CardNote>
                    {c.render()}
                  </Card>
                ))}
              </Grid>
            </div>
          ))}
        </>
      )}
      {tab === "done" && (
        <>
          <SectionNote>가입 마지막 단계를 마친 뒤 보여 줄 화면입니다. 지금은 0번처럼 안내 없이 바로 목록으로 들어갑니다.</SectionNote>
          <Grid $min={300}>
            {[...DoneCases].sort(sortByNo).map((c) => (
              <Card key={c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "home" && (
        <>
          <SectionNote>홈은 위에서 아래로 여러 섹션이 쌓여 만들어집니다. 섹션마다 후보를 두었으니 섹션별로 번호를 골라 주세요. 각 섹션의 0번이 지금 화면입니다.</SectionNote>
          {HomeSections.map((g) => (
            <div key={g.group}>
              <GroupTitle>{g.group}</GroupTitle>
              <Grid $min={300}>
                {[...g.items].sort(sortByNo).map((c) => (
                  <Card key={c.no} $on={c.no === 0}>
                    <CardTitle>{c.no}. {c.name}</CardTitle>
                    <CardNote>{c.note}</CardNote>
                    {c.render()}
                  </Card>
                ))}
              </Grid>
            </div>
          ))}
        </>
      )}
      {tab === "tabs" && (
        <>
          <SectionNote>홈 안쪽 탭입니다. 탭마다 후보를 두었으니 탭별로 번호를 골라 주세요. 0번이 지금 화면입니다.</SectionNote>
          {TabSections.map((g) => (
            <div key={g.group}>
              <GroupTitle>{g.group}</GroupTitle>
              <Grid $min={300}>
                {[...g.items].sort(sortByNo).map((c) => (
                  <Card key={c.no} $on={c.no === 0}>
                    <CardTitle>{c.no}. {c.name}</CardTitle>
                    <CardNote>{c.note}</CardNote>
                    {c.render()}
                  </Card>
                ))}
              </Grid>
            </div>
          ))}
        </>
      )}
      {tab === "tune" && (
        <>
          <SectionNote>지금 홈이 무거워 보인다는 의견에 대한 후보입니다. 보라 면을 얼마나 쓸지, 위쪽 영역을 얼마나 줄일지가 다릅니다. 0번이 지금 화면입니다.</SectionNote>
          <Grid $min={300}>
            {[...HomeTuneCases].sort(sortByNo).map((c) => (
              <Card key={c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "assetsub" && (
        <>
          <SectionNote>보유자산 안의 [포인트 / 친구 초대] 전환입니다. 위 홈 탭 줄과 같은 밑줄 모양이라 두 겹으로 보이는 걸 다른 모양으로 바꾸는 후보입니다. 0번이 지금 화면입니다.</SectionNote>
          <Grid $min={400}>
            {[...AssetSubTabCases].sort(sortByNo).map((c) => (
              <Card key={c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "community" && (
        <>
          <SectionNote>커뮤니티 목록과 글 상세입니다. 실제 크기로 그렸고 0번이 지금 화면입니다. 목록과 상세는 따로 골라 주셔도 됩니다.</SectionNote>
          <GroupTitle>목록</GroupTitle>
          <Grid $min={400}>
            {[...CommunityListCases].sort(sortByNo).map((c) => (
              <Card key={"cl" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
          <GroupTitle>글 상세</GroupTitle>
          <Grid $min={400}>
            {[...CommunityDetailCases].sort(sortByNo).map((c) => (
              <Card key={"cd" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "profileedit" && (
        <>
          <SectionNote>마이페이지에서 기본 프로필(사진·대화명·자기소개)을 고치는 창입니다. 실제 크기로 그렸습니다. 0번이 지금 화면입니다.</SectionNote>
          <Grid $min={400}>
            {[...ProfileEditCases].sort(sortByNo).map((c) => (
              <Card key={c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "bizprofile" && (
        <>
          <SectionNote>비즈프로필(내 화면) 윗부분 후보입니다. 프로필 카드, 등급·활동 숫자, 포트폴리오·SNS 입력까지 실제 크기로 그렸습니다. 0번이 지금 화면입니다.</SectionNote>
          <Grid $min={400}>
            {[...BizProfileCases].sort(sortByNo).map((c) => (
              <Card key={c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "pointline" && (
        <>
          <SectionNote>홈 맨 위 차수·포인트 줄을 강조하는 후보입니다. 실제 크기로 헤더·탭·필터 줄과 함께 그렸습니다. 0번이 지금 화면입니다.</SectionNote>
          <Grid $min={400}>
            {[...PointLineCases].sort(sortByNo).map((c) => (
              <Card key={c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "filter" && (
        <>
          <SectionNote>오더 목록 위 필터입니다. 0번이 지금 화면입니다.</SectionNote>
          <GroupTitle>필터를 눌렀을 때 (전체 조건)</GroupTitle>
          <Grid $min={320}>
            {[...FilterOpenCases].sort(sortByNo).map((c) => (
              <Card key={"open" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
          <GroupTitle>평소 (접혀 있을 때)</GroupTitle>
          <Grid $min={320}>
            {[...FilterCases].sort(sortByNo).map((c) => (
              <Card key={c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "empty" && (
        <>
          <SectionNote>오더가 하나도 없을 때 보이는 화면입니다. 0번이 지금 화면입니다.</SectionNote>
          <Grid $min={300}>
            {[...EmptyCases].sort(sortByNo).map((c) => (
              <Card key={c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "ai" && (
        <>
          <SectionNote>AI 견적 화면입니다. 물어보는 화면과 결과 화면을 따로 골라 주셔도 됩니다. 0번이 지금 화면입니다.</SectionNote>
          <GroupTitle>물어보는 화면</GroupTitle>
          <Grid $min={300}>
            {[...AiInputCases].sort(sortByNo).map((c) => (
              <Card key={"in" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
          <GroupTitle>결과 화면</GroupTitle>
          <Grid $min={300}>
            {[...AiResultCases].sort(sortByNo).map((c) => (
              <Card key={"out" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "cat" && (
        <>
          <SectionNote>카테고리를 고르는 화면과, 단계 화면을 감싸는 틀입니다. 0번이 지금 화면입니다.</SectionNote>
          <GroupTitle>카테고리 고르기</GroupTitle>
          <Grid $min={300}>
            {[...CatCases].sort(sortByNo).map((c) => (
              <Card key={"cat" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
          <GroupTitle>세부 항목 버튼</GroupTitle>
          <Grid $min={300}>
            {[...SubChipCases].sort(sortByNo).map((c) => (
              <Card key={"sub" + c.no} $on={c.no === 1}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
          <GroupTitle>단계 화면 틀</GroupTitle>
          <Grid $min={300}>
            {[...StepFrameCases].sort(sortByNo).map((c) => (
              <Card key={"frame" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "asset" && (
        <>
          <SectionNote>보유자산 탭 전체 화면입니다. 0번이 지금 화면입니다.</SectionNote>
          <GroupTitle>화면 구성</GroupTitle>
          <Grid $min={320}>
            {[...AssetCases].sort(sortByNo).map((c) => (
              <Card key={"asset" + c.no} $on={c.no === 3}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
          <GroupTitle>추천코드 안내 줄</GroupTitle>
          <Grid $min={300}>
            {[...ReferredCases].sort(sortByNo).map((c) => (
              <Card key={"ref" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "list" && (
        <>
          <SectionNote>홈 화면의 오더 표와 채팅 목록입니다. 0번이 지금 화면입니다.</SectionNote>
          <GroupTitle>홈 오더 표</GroupTitle>
          <Grid $min={320}>
            {[...TableCases].sort(sortByNo).map((c) => (
              <Card key={"tbl" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
          <GroupTitle>채팅 위쪽 필터 줄</GroupTitle>
          <Grid $min={300}>
            {[...ChatFilterCases].sort(sortByNo).map((c) => (
              <Card key={"cf" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
          <GroupTitle>채팅방이 없을 때</GroupTitle>
          <Grid $min={300}>
            {[...ChatEmptyCases].sort(sortByNo).map((c) => (
              <Card key={"ce" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
          <GroupTitle>채팅 목록</GroupTitle>
          <Grid $min={320}>
            {[...ChatCases].sort(sortByNo).map((c) => (
              <Card key={"chat" + c.no} $on={c.no === 1}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "broker" && (
        <>
          <SectionNote>공동중개에서 매물을 눌렀을 때 보이는 화면입니다. 0번이 지금 화면(아래에서 올라오는 시트)입니다.</SectionNote>
          <Grid $min={320}>
            {[...BrokerDetailCases].sort(sortByNo).map((c) => (
              <Card key={"bk" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "notice" && (
        <>
          <SectionNote>공지사항 목록입니다. 0번이 지금 화면입니다.</SectionNote>
          <Grid $min={320}>
            {[...NoticeCases].sort(sortByNo).map((c) => (
              <Card key={"nt" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
      {tab === "point" && (
        <>
          <SectionNote>포인트 안내 화면입니다. 0번이 지금 화면입니다.</SectionNote>
          <GroupTitle>화면 구성</GroupTitle>
          <Grid $min={320}>
            {[...PointPageCases].sort(sortByNo).map((c) => (
              <Card key={"pt" + c.no} $on={c.no === 1}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
          <GroupTitle>내역이 없을 때</GroupTitle>
          <Grid $min={300}>
            {[...PointEmptyCases].sort(sortByNo).map((c) => (
              <Card key={"pe" + c.no} $on={c.no === 0}>
                <CardTitle>{c.no}. {c.name}</CardTitle>
                <CardNote>{c.note}</CardNote>
                {c.render()}
              </Card>
            ))}
          </Grid>
        </>
      )}
    </Wrap>
  );
};

export default DesignLab;

const FONT = "'Pretendard Variable', Pretendard, -apple-system, 'Malgun Gothic', sans-serif";
const Wrap = ({ children }) => <div style={{ minHeight: "100vh", background: "#F7F8FA", padding: "26px 20px 70px", boxSizing: "border-box", fontFamily: FONT, color: "#14181F" }}>{children}</div>;
const Title = ({ children }) => <div style={{ fontSize: 26, fontWeight: 700 }}>{children}</div>;
const Lead = ({ children }) => <div style={{ fontSize: 16, color: "#2b2f36", margin: "8px 0 20px", lineHeight: 1.6 }}>{children}</div>;
const TabBar = ({ children }) => <div style={{ display: "inline-flex", flexWrap: "wrap", border: "1px solid #D9DDE3", background: "#fff", marginBottom: 22 }}>{children}</div>;
const TabBtn = ({ children, $on, $first, ...rest }) => <button {...rest} style={{ padding: "9px 16px", fontSize: 15, fontFamily: "inherit", cursor: "pointer", border: "none", borderLeft: $first ? "none" : "1px solid #D9DDE3", background: $on ? "#E9ECF1" : "#fff", color: "#14181F", fontWeight: $on ? 700 : 500 }}>{children}</button>;
const SectionNote = ({ children }) => <div style={{ fontSize: 15, color: "#2b2f36", marginBottom: 18, lineHeight: 1.6 }}>{children}</div>;
const GroupTitle = ({ children }) => <div style={{ fontSize: 20, fontWeight: 700, margin: "6px 0 12px", paddingTop: 14, borderTop: "1px solid #D9DDE3" }}>{children}</div>;
const Grid = ({ children, $min }) => <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(" + $min + "px, 1fr))", gap: 18, marginBottom: 30 }}>{children}</div>;
const Card = ({ children, $on }) => <div style={{ background: "#fff", border: $on ? "1px solid #14181F" : "1px solid #D9DDE3", padding: 16 }}>{children}</div>;
const CardTitle = ({ children }) => <div style={{ fontSize: 17, fontWeight: 700, marginBottom: 4 }}>{children}</div>;
const CardNote = ({ children }) => <div style={{ fontSize: 14, color: "#2b2f36", marginBottom: 14, lineHeight: 1.5, minHeight: 42 }}>{children}</div>;
const IconRow = ({ children }) => <div style={{ display: "flex", gap: 14, alignItems: "flex-end", marginBottom: 14 }}>{children}</div>;
const HomeRow = ({ children }) => <div style={{ display: "flex", gap: 10, alignItems: "center", background: "#2B2F36", padding: "10px 12px", borderRadius: 8 }}>{children}</div>;
const HomeDot = ({ $bg }) => <div style={{ width: 46, height: 46, borderRadius: 12, background: $bg }} />;
const SwatchRow = ({ children }) => <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 12 }}>{children}</div>;
const Swatch = ({ $bg }) => <span style={{ width: 20, height: 20, background: $bg, border: "1px solid #D9DDE3", display: "inline-block" }} />;
const SwatchText = ({ children }) => <span style={{ fontSize: 13, color: "#2b2f36", marginRight: 10 }}>{children}</span>;
