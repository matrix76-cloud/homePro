/**
 * 홈프로 사업자 랜딩 /intro — 대표 초안 문구 그대로 (리뷰 9/17)
 *  히어로 → 01 오더를 주고받다 → 02 소개수수료 → 03 PG 결제 → 04 배상책임보험
 *  → 홈프로 하나로 → 사업자의 새로운 일하는 방식 → 마무리 [사업자 가입하기]
 * - 문구는 대표 초안에서 바꾸지 않는다. 화면 캡처는 public/assets/landing/*.png (화면 바뀌면 재캡처)
 * - PC 기준 + 반응형(900px 이하 세로 쌓기)
 */
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import { FiArrowDown, FiCheck } from 'react-icons/fi';
import { db } from '../../api/config';

const SECTIONS = [
  {
    id: 'order',
    no: '01',
    title: '오더를 주고받다',
    lead: '필요한 오더를 받고, 내가 가진 오더를 공유하세요.',
    shot: '/assets/landing/order-create.png',
    shotAlt: '홈프로 오더 등록 화면',
  },
  {
    id: 'referral',
    no: '02',
    title: '내 전문분야가 아닌 오더도 수익으로',
    lead: '“내가 못 하는 일”이 “내 수익”이 될 수 있습니다.',
    shot: '/assets/landing/myorders.png',
    shotAlt: '홈프로 나의 오더현황 화면',
  },
  {
    id: 'pay',
    no: '03',
    title: '내 고객에게도 간편하게 결제받다',
    lead: '홈프로 오더뿐만 아니라, 내 개인영업에도 활용하세요.',
    shot: '/assets/landing/pg.png',
    shotAlt: '홈프로 PG결제 화면',
  },
  {
    id: 'insurance',
    no: '04',
    title: '사고위험도 관리하다',
    lead: '일은 잘하는 것만큼, 사고에 대비하는 것도 중요합니다.',
    shot: '/assets/landing/insurance.png',
    shotAlt: '홈프로 안심케어 화면',
  },
];

const ONE = [
  { h: '오더를 받고', s: '새로운 일감을 만나고' },
  { h: '오더를 공유하고', s: '소개수익을 만들고' },
  { h: '결제를 받고', s: '내 매출을 직접 정산받고' },
  { h: '사고에 대비하고', s: '안전하게 사업하세요.' },
];

const WAY = ['오더 공유', '소개수익', 'PG 결제', '직접정산', '배상책임보험'];

const Flow = ({ items }) => (
  <FlowBox>
    {items.map((t, i) => (
      <React.Fragment key={i}>
        {i > 0 && <FlowArrow><FiArrowDown /></FlowArrow>}
        <FlowItem $strong={t.strong}>{t.text}</FlowItem>
      </React.Fragment>
    ))}
  </FlowBox>
);

// 사업자 정보 — 관리자 설정(settings/companyInfo)이 기준. 불러오기 전·실패 시엔 아래 값으로 표시
const COMPANY_FALLBACK = {
  companyName: '(주)윈플래닛',
  ceo: '박신영',
  privacyOfficer: '박성우',
  address: '서울시 종로구 종로19, B동 1422호(종로1가, 르메이에르 종로타운1)',
  bizNumber: '696-87-02440',
  mailOrderNo: '2021-서울종로-1936',
  phone: '1555-3364',
  email: 'homepro3364@gmail.com',
};

const LandingPage = () => {
  const navigate = useNavigate();
  const [company, setCompany] = useState(COMPANY_FALLBACK);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { doc, getDoc } = await import('firebase/firestore');
        const snap = await getDoc(doc(db, 'settings', 'companyInfo'));
        if (!cancelled && snap.exists()) setCompany({ ...COMPANY_FALLBACK, ...snap.data() });
      } catch (e) { /* 실패하면 기본값 그대로 */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const goSignup = () => navigate('/MobileSignup');

  const body = {
    order: (
      <>
        <P>
          내가 직접 수행할 수 있는 오더는 <b>받고</b>,<br />
          내 전문분야가 아니거나 직접 수행하기 어려운 오더는 <b>다른 전문가에게 공유</b>할 수 있습니다.
        </P>
        <TwoCol>
          <ListBox>
            <ListTitle>받는 오더</ListTitle>
            <Bullets>
              <li><Check><FiCheck /></Check>내 전문분야 오더 확인</li>
              <li><Check><FiCheck /></Check>지역·업종에 맞는 오더 수신</li>
              <li><Check><FiCheck /></Check>작업 상담 및 진행</li>
            </Bullets>
          </ListBox>
          <ListBox>
            <ListTitle>주는 오더</ListTitle>
            <Bullets>
              <li><Check><FiCheck /></Check>내가 받은 오더를 다른 전문가에게 공유</li>
              <li><Check><FiCheck /></Check>내 전문분야가 아닌 일도 놓치지 않고 연결</li>
              <li><Check><FiCheck /></Check>필요한 전문가에게 빠르게 전달</li>
            </Bullets>
          </ListBox>
        </TwoCol>
        <Punch>혼자 영업하는 사업자에서<br />서로 오더를 연결하는 사업자로</Punch>
      </>
    ),
    referral: (
      <>
        <P>
          고객에게 받은 오더가<br />
          내 전문분야가 아니어도 그냥 놓치지 마세요.
        </P>
        <P>
          홈프로에서 적합한 전문가에게 오더를 공유하고<br />
          <b>소개수수료 수익</b>을 만들 수 있습니다.
        </P>
        <SmallTitle>예시</SmallTitle>
        <Flow items={[
          { text: '고객이 누수공사를 요청' },
          { text: '나는 에어컨 전문사업자' },
          { text: '누수 전문사업자에게 오더 공유' },
          { text: '전문사업자가 작업 진행' },
          { text: '소개수수료 수익 발생', strong: true },
        ]} />
        <Punch>내가 직접 하지 않아도<br />연결을 통해 새로운 수익을 만드세요.</Punch>
      </>
    ),
    pay: (
      <>
        <P>
          홈프로에서 받은 오더뿐만 아니라<br />
          <b>사업자가 직접 확보한 고객의 작업대금도</b><br />
          간편하게 카드결제를 받을 수 있습니다.
        </P>
        <Flow items={[
          { text: '작업 완료' },
          { text: <>고객에게 <b>카드결제 링크 / 결제창 발송</b></> },
          { text: '고객 카드결제' },
          { text: '사업자 본인 계좌로 직접정산', strong: true },
        ]} />
        <Punch>내 영업은 내가 하고<br />결제도 간편하게</Punch>
        <P>
          홈프로는 사업자의 결제업무를 편리하게 이용할 수 있는<br />
          <b>PG 결제 인프라</b>를 제공합니다.
        </P>
        <Fine>※ 실제 결제·정산 방식 및 이용 조건은 PG사 계약 및 가맹점 심사 조건에 따라 적용됩니다.</Fine>
      </>
    ),
    insurance: (
      <>
        <P>
          작업 중 고객의 재산이나 시설 등에 손해가 발생하면<br />
          사업자에게 예상하지 못한 비용 부담이 발생할 수 있습니다.
        </P>
        <P>
          홈프로는 사업자가 작업 위험을 관리할 수 있도록<br />
          <b>도급업자배상책임보험 연계</b>를 제공합니다.
        </P>
        <SmallTitle>홈프로 안심전문가</SmallTitle>
        <CoverTable>
          <CoverRow><CoverK>배상책임보험</CoverK><CoverV>작업 중 발생할 수 있는 배상책임 위험에 대비</CoverV></CoverRow>
          <CoverRow><CoverK>물적손해 확대담보</CoverK><CoverV>업종과 상품 조건에 따라 작업대상물 등 관련 위험을 추가 보장할 수 있도록 설계</CoverV></CoverRow>
          <CoverRow><CoverK>사고 대응 지원</CoverK><CoverV>상품 조건에 따라 사고 발생 시 보험사의 보상절차 및 법률적 대응 지원</CoverV></CoverRow>
        </CoverTable>
        <Punch>사고가 없을 때는 든든하게<br />사고가 발생했을 때는 체계적으로</Punch>
        <Fine>※ 보험의 보장범위·면책사항·가입조건은 실제 보험상품의 약관 및 계약조건에 따릅니다.</Fine>
      </>
    ),
  };

  return (
    <Page>
      <Header>
        <Inner>
          <Nav>
            <Logo onClick={() => navigate('/intro')}>홈프로</Logo>
            <Menu>
              <a href="#order">오더 공유</a>
              <a href="#referral">소개수익</a>
              <a href="#pay">PG 결제</a>
              <a href="#insurance">배상책임보험</a>
            </Menu>
            <PrimaryBtn onClick={goSignup}>사업자 가입하기</PrimaryBtn>
          </Nav>
        </Inner>
      </Header>

      {/* 히어로 */}
      <Hero>
        <Inner>
          <HeroGrid>
            <div>
              <Kicker>일감을 공유하고, 수익을 만들고, 결제하고, 안전하게 일하는 사업자 플랫폼</Kicker>
              <H1>
                사업자의 일을 더 쉽게,<br />
                사업자의 수익을 더 넓게.
              </H1>
              <Lead>
                홈프로는 전문사업자들이 오더를 공유하고<br />
                새로운 수익을 만들며,<br />
                자신의 고객에게 간편하게 결제받고,<br />
                작업 중 사고 위험까지 관리할 수 있도록 돕습니다.
              </Lead>
              <HeroBtns>
                <PrimaryBtn $lg onClick={goSignup}>사업자 가입하기</PrimaryBtn>
                <OutlineBtn $lg as="a" href="#order">자세히 보기</OutlineBtn>
              </HeroBtns>
            </div>
            <HeroVisual>
              <Phone>
                <PhoneShot src="/assets/landing/orders.png" alt="홈프로 오더목록 화면" />
              </Phone>
            </HeroVisual>
          </HeroGrid>
        </Inner>
      </Hero>

      {/* 01 ~ 04 */}
      {SECTIONS.map((s, i) => (
        <Section key={s.id} id={s.id} $alt={i % 2 === 0}>
          <Inner>
            <Row $reverse={i % 2 === 1}>
              <ShotWrap>
                <Shot src={s.shot} alt={s.shotAlt} />
              </ShotWrap>
              <div>
                <No>{s.no}</No>
                <H2>{s.title}</H2>
                <H3>{s.lead}</H3>
                {body[s.id]}
              </div>
            </Row>
          </Inner>
        </Section>
      ))}

      {/* 홈프로 하나로 */}
      <Section>
        <Inner $narrow>
          <CenterTitle>홈프로 하나로</CenterTitle>
          <OneTable>
            {ONE.map((o) => (
              <OneRow key={o.h}>
                <OneH>{o.h}</OneH>
                <OneS>{o.s}</OneS>
              </OneRow>
            ))}
          </OneTable>
        </Inner>
      </Section>

      {/* 사업자의 새로운 일하는 방식 */}
      <Section $alt>
        <Inner>
          <CenterTitle>사업자의 새로운 일하는 방식</CenterTitle>
          <Way>
            {WAY.map((w, i) => (
              <React.Fragment key={w}>
                {i > 0 && <WaySep aria-hidden>↔</WaySep>}
                <WayItem>{w}</WayItem>
              </React.Fragment>
            ))}
          </Way>
        </Inner>
      </Section>

      {/* 마무리 */}
      <Closing>
        <Inner $narrow>
          <ClosingBrand>홈프로</ClosingBrand>
          <ClosingTitle>사업자의 일과 수익을 연결합니다.</ClosingTitle>
          <ClosingText>
            오더를 받는 곳에서<br />
            오더를 만들고,<br />
            수익을 만들고,<br />
            결제하고,<br />
            위험까지 관리하는 곳으로.
          </ClosingText>
          <ClosingCta>지금 홈프로에서 시작하세요.</ClosingCta>
          <ClosingBtn onClick={goSignup}>사업자 가입하기</ClosingBtn>
        </Inner>
      </Closing>

      <Footer>
        <Inner>
          <FootTop>
            <FootLogo>홈프로</FootLogo>
            <FootLinks>
              <a href="/legal/terms">이용약관</a>
              <a href="/legal/privacy">개인정보처리방침</a>
              <a href="/legal/location">위치기반서비스약관</a>
            </FootLinks>
          </FootTop>
          <FootInfo>
            <span>상호명 : {company.companyName}</span>
            <span>대표이사 : {company.ceo}</span>
            {company.privacyOfficer && <span>개인정보책임관리자 : {company.privacyOfficer}</span>}
            <span>사업자등록번호 : {company.bizNumber}</span>
            {company.mailOrderNo && <span>통신판매번호 : {company.mailOrderNo}</span>}
            <span>직업정보제공사업 신고번호 : {company.jobInfoNo || '(신고전)'}</span>
            <span>주소 : {company.address}</span>
            {company.phone && <span>고객센터 : {company.phone}</span>}
            {company.email && <span>이메일 : {company.email}</span>}
          </FootInfo>
          <FootCopy>© 2026 {company.companyName || '홈프로'}. All rights reserved.</FootCopy>
        </Inner>
      </Footer>
    </Page>
  );
};

export default LandingPage;

/* ============ tokens ============ */
const PRIMARY = '#00963F';
const INK = '#14181F';
const BODY = '#2b2f36';
const LINE = '#dfe3e8';
const ALT_BG = '#F7F8FA';

const Page = styled.div`
  background: #fff;
  color: ${INK};
  font-size: 18px;
  overflow-x: hidden;
  word-break: keep-all;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ $narrow }) => ($narrow ? '960px' : '1280px')};
  margin: 0 auto;
  padding: 0 56px;
  box-sizing: border-box;
  @media (max-width: 900px) { padding: 0 28px; }
  @media (max-width: 600px) { padding: 0 20px; }
`;

/* Header */
const Header = styled.header`
  position: sticky; top: 0; z-index: 50;
  background: rgba(255, 255, 255, 0.95);
  border-bottom: 1px solid ${LINE};
`;
const Nav = styled.nav`
  height: 66px; display: flex; align-items: center; justify-content: space-between; gap: 16px;
`;
const Logo = styled.div` font-size: 24px; font-weight: 800; color: ${PRIMARY}; cursor: pointer; `;
const Menu = styled.div`
  display: flex; gap: 30px;
  a { font-size: 17px; font-weight: 600; color: ${BODY}; text-decoration: none; &:hover { color: ${PRIMARY}; } }
  @media (max-width: 900px) { display: none; }
`;

const PrimaryBtn = styled.button`
  border: none; cursor: pointer; background: ${PRIMARY}; color: #fff; font-weight: 700; font-family: inherit;
  font-size: ${({ $lg }) => ($lg ? '18px' : '15px')};
  padding: ${({ $lg }) => ($lg ? '16px 30px' : '11px 18px')};
  border-radius: 10px; text-decoration: none; display: inline-block; white-space: nowrap;
  &:hover { background: #007A33; }
`;
const OutlineBtn = styled.button`
  border: 1px solid ${LINE}; cursor: pointer; background: #fff; color: ${INK}; font-weight: 700; font-family: inherit;
  font-size: ${({ $lg }) => ($lg ? '18px' : '15px')};
  padding: ${({ $lg }) => ($lg ? '15px 30px' : '10px 18px')};
  border-radius: 10px; text-decoration: none; display: inline-block;
  &:hover { border-color: ${PRIMARY}; color: ${PRIMARY}; }
`;

/* Hero */
const Hero = styled.section` padding: 84px 0 92px; background: #fff; `;
const HeroGrid = styled.div`
  display: grid; grid-template-columns: 1.15fr 0.85fr; gap: 56px; align-items: center;
  @media (max-width: 900px) { grid-template-columns: 1fr; gap: 44px; }
`;
const Kicker = styled.p` font-size: 19px; font-weight: 700; color: ${PRIMARY}; line-height: 1.5; margin-bottom: 18px; `;
const H1 = styled.h1`
  font-size: 50px; line-height: 1.25; font-weight: 800; color: ${INK}; letter-spacing: -0.02em; margin-bottom: 24px;
  @media (max-width: 900px) { font-size: 34px; }
`;
const Lead = styled.p`
  font-size: 20px; line-height: 1.75; color: ${BODY}; margin-bottom: 34px;
  @media (max-width: 600px) { font-size: 17px; }
`;
const HeroBtns = styled.div` display: flex; gap: 12px; flex-wrap: wrap; `;
const HeroVisual = styled.div` display: flex; justify-content: center; `;
const Phone = styled.div`
  width: 290px; height: 600px; background: #1b1f27; border-radius: 40px; padding: 12px; box-sizing: border-box;
  box-shadow: 0 24px 50px rgba(20, 24, 31, 0.18);
`;
const PhoneShot = styled.img`
  display: block; width: 100%; height: 100%; object-fit: cover; object-position: top center; border-radius: 30px;
`;

/* 01~04 */
const Section = styled.section`
  padding: 92px 0; background: ${({ $alt }) => ($alt ? ALT_BG : '#fff')};
  @media (max-width: 900px) { padding: 64px 0; }
`;
const Row = styled.div`
  display: grid; grid-template-columns: 0.8fr 1.2fr; gap: 72px; align-items: start;
  direction: ${({ $reverse }) => ($reverse ? 'rtl' : 'ltr')};
  & > * { direction: ltr; }
  @media (max-width: 900px) { grid-template-columns: 1fr; gap: 36px; direction: ltr; }
`;
const ShotWrap = styled.div`
  display: flex; justify-content: center; position: sticky; top: 100px;
  @media (max-width: 900px) { position: static; order: 2; }
`;
const Shot = styled.img`
  display: block; width: 300px; max-width: 100%; border-radius: 22px; border: 1px solid ${LINE};
  box-shadow: 0 16px 40px rgba(20, 24, 31, 0.12);
`;
const No = styled.div` font-size: 22px; font-weight: 800; color: ${PRIMARY}; margin-bottom: 10px; `;
const H2 = styled.h2`
  font-size: 38px; font-weight: 800; line-height: 1.3; color: ${INK}; letter-spacing: -0.02em; margin-bottom: 14px;
  @media (max-width: 900px) { font-size: 29px; }
`;
const H3 = styled.h3`
  font-size: 23px; font-weight: 700; line-height: 1.45; color: ${INK}; margin-bottom: 26px;
  @media (max-width: 900px) { font-size: 20px; }
`;
const P = styled.p`
  font-size: 18px; line-height: 1.8; color: ${BODY}; margin-bottom: 18px;
  b { color: ${INK}; font-weight: 700; }
  @media (max-width: 600px) { font-size: 17px; }
`;
const TwoCol = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin: 26px 0 8px;
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;
const ListBox = styled.div` background: #fff; border: 1px solid ${LINE}; border-radius: 12px; padding: 22px 22px 20px; `;
const ListTitle = styled.div` font-size: 19px; font-weight: 800; color: ${INK}; margin-bottom: 14px; `;
const Bullets = styled.ul`
  list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 12px;
  li { display: flex; gap: 10px; font-size: 17px; line-height: 1.5; color: ${BODY}; }
`;
const Check = styled.span` color: ${PRIMARY}; font-size: 18px; flex-shrink: 0; margin-top: 2px; display: inline-flex; `;
const SmallTitle = styled.div` font-size: 19px; font-weight: 800; color: ${INK}; margin: 28px 0 14px; `;
const FlowBox = styled.div`
  display: flex; flex-direction: column; align-items: flex-start; gap: 6px; margin: 22px 0 8px;
`;
const FlowItem = styled.div`
  font-size: 18px; line-height: 1.5; padding: 13px 20px; border-radius: 10px; min-width: 300px; box-sizing: border-box;
  border: 1px solid ${({ $strong }) => ($strong ? PRIMARY : LINE)};
  background: #fff;
  color: ${({ $strong }) => ($strong ? PRIMARY : BODY)}; font-weight: ${({ $strong }) => ($strong ? 800 : 500)};
  b { color: ${INK}; font-weight: 700; }
  @media (max-width: 600px) { min-width: 0; width: 100%; font-size: 17px; }
`;
const FlowArrow = styled.div` color: ${PRIMARY}; font-size: 18px; padding-left: 24px; display: flex; `;
const Punch = styled.p`
  font-size: 25px; font-weight: 800; line-height: 1.5; color: ${INK}; margin: 34px 0 22px; letter-spacing: -0.01em;
  @media (max-width: 900px) { font-size: 21px; }
`;
const Fine = styled.p` font-size: 15px; line-height: 1.6; color: ${BODY}; margin-top: 18px; `;
const CoverTable = styled.div` border: 1px solid ${LINE}; border-radius: 12px; background: #fff; overflow: hidden; `;
const CoverRow = styled.div`
  display: grid; grid-template-columns: 190px 1fr;
  & + & { border-top: 1px solid ${LINE}; }
  @media (max-width: 600px) { grid-template-columns: 1fr; }
`;
const CoverK = styled.div` padding: 18px 20px; font-size: 17px; font-weight: 800; color: ${INK}; background: #f3f4f7; `;
const CoverV = styled.div` padding: 18px 20px; font-size: 17px; line-height: 1.6; color: ${BODY}; `;

/* 홈프로 하나로 */
const CenterTitle = styled.h2`
  text-align: center; font-size: 38px; font-weight: 800; color: ${INK}; letter-spacing: -0.02em; margin-bottom: 44px;
  @media (max-width: 900px) { font-size: 29px; margin-bottom: 32px; }
`;
const OneTable = styled.div` border-top: 2px solid ${INK}; `;
const OneRow = styled.div`
  display: grid; grid-template-columns: 1fr 1fr; align-items: center; gap: 20px; padding: 24px 8px; border-bottom: 1px solid ${LINE};
  @media (max-width: 600px) { grid-template-columns: 1fr; gap: 6px; padding: 18px 4px; }
`;
const OneH = styled.div` font-size: 25px; font-weight: 800; color: ${INK}; @media (max-width: 600px) { font-size: 21px; } `;
const OneS = styled.div` font-size: 21px; font-weight: 600; color: ${PRIMARY}; @media (max-width: 600px) { font-size: 18px; } `;

/* 새로운 일하는 방식 */
const Way = styled.div`
  display: flex; align-items: center; justify-content: center; gap: 14px; flex-wrap: wrap;
  @media (max-width: 900px) { flex-direction: column; gap: 8px; }
`;
const WayItem = styled.div`
  font-size: 21px; font-weight: 800; color: ${INK}; background: #fff; border: 1px solid ${LINE}; border-radius: 12px;
  padding: 20px 26px; min-width: 150px; text-align: center; box-sizing: border-box;
  @media (max-width: 900px) { width: 100%; max-width: 360px; font-size: 19px; padding: 16px; }
`;
const WaySep = styled.div`
  font-size: 22px; color: ${PRIMARY}; font-weight: 700;
  @media (max-width: 900px) { transform: rotate(90deg); }
`;

/* 마무리 */
const Closing = styled.section` background: #1b1f27; color: #fff; padding: 96px 0; text-align: center; `;
const ClosingBrand = styled.div` font-size: 26px; font-weight: 800; color: #fff; margin-bottom: 12px; `;
const ClosingTitle = styled.h2`
  font-size: 40px; font-weight: 800; line-height: 1.3; letter-spacing: -0.02em; margin-bottom: 30px;
  @media (max-width: 900px) { font-size: 29px; }
`;
const ClosingText = styled.p` font-size: 22px; font-weight: 700; line-height: 1.75; color: #eef0f3; margin-bottom: 36px; `;
const ClosingCta = styled.p` font-size: 21px; font-weight: 600; color: #eef0f3; margin-bottom: 20px; `;
const ClosingBtn = styled.button`
  border: none; cursor: pointer; background: #fff; color: ${INK}; font-family: inherit;
  font-size: 19px; font-weight: 800; padding: 18px 40px; border-radius: 10px;
  &:hover { background: #eef0f3; }
`;

/* Footer */
const Footer = styled.footer` background: #fff; border-top: 1px solid ${LINE}; padding: 40px 0 36px; `;
const FootTop = styled.div` display: flex; align-items: center; justify-content: space-between; gap: 20px; flex-wrap: wrap; `;
const FootLogo = styled.div` font-size: 21px; font-weight: 800; color: ${PRIMARY}; `;
const FootLinks = styled.div`
  display: flex; gap: 22px; flex-wrap: wrap;
  a { font-size: 15px; color: ${BODY}; text-decoration: none; &:hover { color: ${PRIMARY}; } }
`;
const FootInfo = styled.div`
  margin-top: 22px; padding-top: 20px; border-top: 1px solid ${LINE};
  display: flex; flex-wrap: wrap; gap: 8px 24px;
  span { font-size: 14px; line-height: 1.6; color: ${BODY}; word-break: keep-all; }
`;
const FootCopy = styled.p` margin-top: 18px; font-size: 14px; color: ${BODY}; `;
