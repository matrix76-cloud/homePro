/**
 * 홈프로 PC 영업 랜딩 (앱 다운로드 유도)
 * - 레퍼런스: classmanage LandingPage 구조 재현 + 홈프로 B2B 톤으로 카피 전면 교체
 * - 대상: 청소·인테리어·설비 등 현장 전문가(프로)끼리 일감을 주고받는 하도급/외주 플랫폼
 * - 디자인 토큰: 퍼플 주조색(#2571e3) + 흰/연회색 교차, 버튼 r10 / 카드 r16, 약한 그림자, 라인 아이콘
 * - PC 기준 + 반응형(모바일 stack). 라우트: /intro
 * - 스크린샷 자리는 CSS 목업 → 추후 실제 앱 캡처로 교체
 */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import styled from 'styled-components';
import {
  FiClipboard, FiCpu, FiUsers, FiMessageSquare, FiMapPin,
  FiClock, FiShield, FiCheck, FiPlus, FiImage, FiBell, FiCalendar,
} from 'react-icons/fi';

const APP_STORE_URL = '#'; // TODO: 아이폰 심사 통과 후 App Store 링크
const PLAY_STORE_URL = '#'; // TODO: 안드로이드 배포 후 Google Play 링크

const STATS = [
  { num: '33개', label: '전문 분야 카테고리' },
  { num: 'AI', label: '자동 견적 산출' },
  { num: '5분', label: '오더 등록부터 견적까지' },
  { num: '0원', label: '가입·기본 사용 비용' },
];

const PAIN_POINTS = [
  { Icon: FiClock, title: '들쭉날쭉한 일감', desc: '바쁠 땐 손이 모자라고, 빌 땐 일이 없어 인력·장비를 놀리고 계셨죠.' },
  { Icon: FiUsers, title: '급할 때 부를 사람이 없음', desc: '갑자기 인력이 필요한데 믿고 맡길 동종 업계 프로를 찾기가 어렵습니다.' },
  { Icon: FiShield, title: '처음 보는 외주처는 불안', desc: '일은 받았는데 누구한테 넘겨야 할지, 제대로 마무리될지 확신이 안 섭니다.' },
];

const FEATURES = [
  {
    Icon: FiClipboard,
    tag: '오더·견적',
    color: '#2571e3',
    title: '일감을 올리면, 동종 프로가 견적을 보냅니다',
    desc: '하도급 줄 일감을 오더로 등록하세요. 분야가 맞는 프로들이 견적을 보내고, 수락하면 채팅방이 자동으로 열립니다.',
    points: ['오더 등록 → 견적 자동 수신', '견적 수락 시 채팅방 자동 생성', '카테고리별 맞춤 접수폼'],
  },
  {
    Icon: FiCpu,
    tag: 'AI 견적',
    color: '#16A34A',
    title: '사진과 내용만 넣으면, AI가 예상 견적을 뽑아줍니다',
    desc: '현장 사진과 작업 내용을 입력하면 AI가 예상 견적 범위를 산출합니다. 견적 기준이 막막할 때 출발점이 되어 줍니다.',
    points: ['현장 사진·내용 기반 자동 산출', '분야별 시세 참고', '견적 초안으로 바로 활용'],
  },
  {
    Icon: FiUsers,
    tag: '오더 배정',
    color: '#F59E0B',
    title: '상황에 맞게 골라 호출하세요',
    desc: '먼저 본 프로에게 빠른배정, 여러 견적을 받아 비교선정, 믿는 프로에게 지정배정까지. 일의 급함과 신뢰도에 맞춰 선택합니다.',
    points: ['빠른배정 · 비교선정 · 지정배정', '거부·블랙리스트로 안전하게', '완료 후 리뷰로 신뢰 쌓기'],
  },
  {
    Icon: FiCalendar,
    tag: '일정·채팅',
    color: '#0EA5E9',
    title: '진행도 마무리도 한 채팅 안에서',
    desc: '채팅에서 작업 일정을 공유하고, 캘린더로 기간을 관리하세요. 견적부터 정산까지 모든 대화가 한 곳에 남습니다.',
    points: ['채팅에서 일정 공유 · 미니 캘린더', '기간 단위 일정 관리', '읽음 표시 · 계약/정산 연동'],
  },
];

const PROMO = [
  { Icon: FiClipboard, grad: 'linear-gradient(135deg, #EFE6FB, #F3EEFE)', title: '1분이면 끝나는 오더 등록', desc: '카테고리만 고르면 분야에 맞는 접수폼이 떠요. 사진 몇 장과 내용만 넣으면 끝.' },
  { Icon: FiImage, grad: 'linear-gradient(135deg, #DBF3E6, #EAF6F0)', title: '내 작업으로 채우는 비즈프로필', desc: '시공 사진과 이력으로 내 전문성을 보여주고, 더 좋은 일감으로 연결되세요.' },
  { Icon: FiMapPin, grad: 'linear-gradient(135deg, #FCEFD9, #FEF6EA)', title: '내 지역 프로와 먼저 연결', desc: '가까운 지역의 프로끼리 우선 매칭돼 이동·소통 부담이 줄어듭니다.' },
];

const STEPS = [
  { no: '01', Icon: FiClipboard, title: '오더 등록', desc: '하도급 줄 일감을 카테고리에 맞춰 등록합니다.' },
  { no: '02', Icon: FiUsers, title: '견적 비교·선택', desc: '들어온 견적을 비교하고, 맞는 프로를 골라 수락합니다.' },
  { no: '03', Icon: FiMessageSquare, title: '채팅으로 진행·완료', desc: '일정·작업을 채팅에서 조율하고, 완료 후 리뷰로 마무리합니다.' },
];

const FAQS = [
  { q: '홈프로는 어떤 서비스인가요?', a: '청소·인테리어·설비 등 현장 전문가(프로)끼리 일감을 주고받는 하도급·외주 연결 플랫폼입니다. 바쁠 땐 일을 나누고, 일이 빌 땐 다른 프로의 일감을 받을 수 있습니다.' },
  { q: '소비자도 이용할 수 있나요?', a: '홈프로는 전문가(프로) 간 거래에 초점을 둔 B2B 서비스입니다. 현장 일을 하는 사업자·프리랜서 전문가라면 누구나 시작할 수 있습니다.' },
  { q: '이용 비용이 있나요?', a: '가입과 기본 사용은 무료로 시작할 수 있습니다. 일부 기능은 포인트로 운영되며, 자세한 정책은 앱 안에서 확인할 수 있습니다.' },
  { q: 'AI 견적은 어떻게 동작하나요?', a: '현장 사진과 작업 내용을 입력하면 AI가 분야별 정보를 참고해 예상 견적 범위를 산출합니다. 최종 견적은 프로가 직접 조정해 보낼 수 있습니다.' },
  { q: '모바일에서도 쓸 수 있나요?', a: 'iOS·Android 앱과 웹을 모두 지원합니다. 현장에서는 앱으로, 사무실에서는 웹으로 함께 사용할 수 있습니다.' },
];

const LandingPage = () => {
  const navigate = useNavigate();
  const [openFaq, setOpenFaq] = useState(0);

  const goDownload = () =>
    document.getElementById('download')?.scrollIntoView({ behavior: 'smooth' });

  return (
    <Page>
      {/* 헤더 */}
      <Header>
        <Inner>
          <Nav>
            <Logo onClick={() => navigate('/intro')}>홈프로</Logo>
            <Menu>
              <a href="#features">핵심 기능</a>
              <a href="#how">이용 방법</a>
              <a href="#download">앱 다운로드</a>
              <a href="#faq">자주 묻는 질문</a>
            </Menu>
            <NavBtns>
              <PrimaryBtn onClick={goDownload}>앱 다운로드</PrimaryBtn>
            </NavBtns>
          </Nav>
        </Inner>
      </Header>

      {/* 1. 히어로 */}
      <Hero>
        <Inner>
          <HeroGrid>
            <HeroText>
              <Badge>청소 · 인테리어 · 설비 현장 프로를 위한</Badge>
              <H1>
                일감은 나누고, 사람은 채우고.<br />
                <Accent>홈프로</Accent> 하나로.
              </H1>
              <Lead>
                현장 프로끼리 일감을 주고받는 곳.<br />
                바쁠 땐 믿을 프로에게 외주 주고, 빌 땐 하도급 받으세요.
              </Lead>
              <HeroBtns>
                <PrimaryBtn $lg onClick={goDownload}>앱 다운로드</PrimaryBtn>
                <OutlineBtn $lg as="a" href="#features">기능 둘러보기</OutlineBtn>
              </HeroBtns>
              <SubNote>가입·기본 사용 무료 · iOS · Android 지원</SubNote>
            </HeroText>

            {/* 폰 목업 */}
            <HeroVisual>
              <Phone>
                <PhoneNotch />
                <PhoneScreen>
                  <MockHeader>
                    <MockDot /> 홈프로
                  </MockHeader>
                  <MockNoti $c="#2571e3">
                    <FiClipboard />
                    <div>
                      <b>새 오더 · 상가 입주청소</b>
                      <span>강남구 · 견적 3건 도착</span>
                    </div>
                  </MockNoti>
                  <MockNoti $c="#16A34A">
                    <FiBell />
                    <div>
                      <b>견적이 수락됐어요</b>
                      <span>채팅방이 생성되었습니다</span>
                    </div>
                  </MockNoti>
                  <MockCard>
                    <MockCardTitle>AI 예상 견적</MockCardTitle>
                    <MockLine $w="90%" />
                    <MockLine $w="70%" />
                    <MockThumb />
                  </MockCard>
                </PhoneScreen>
              </Phone>
            </HeroVisual>
          </HeroGrid>
        </Inner>
      </Hero>

      {/* 2. 통계 바 */}
      <StatsBar>
        <Inner>
          <StatsGrid>
            {STATS.map((s) => (
              <Stat key={s.label}>
                <StatNum>{s.num}</StatNum>
                <StatLabel>{s.label}</StatLabel>
              </Stat>
            ))}
          </StatsGrid>
        </Inner>
      </StatsBar>

      {/* 3. 홍보 (갤러리 + 설명) */}
      <Section>
        <Inner>
          <Eyebrow>혼자 다 떠안지 않아도 괜찮아요</Eyebrow>
          <SectionTitle>일이 몰릴 때도, 비는 날에도 든든하게</SectionTitle>
          <WhoLead>
            나눠 줄 일감은 오더로, 받고 싶은 일감은 견적으로.
            현장 프로끼리 서로의 빈틈을 채워 주는 가장 빠른 방법입니다.
          </WhoLead>
          <PromoList>
            {PROMO.map(({ Icon, grad, title, desc }, i) => (
              <PromoRow key={title} $reverse={i % 2 === 1}>
                <PromoVisual>
                  <PromoBig $g={grad}>
                    {/* TODO: 실제 앱 화면으로 교체 */}
                    <Icon />
                  </PromoBig>
                </PromoVisual>
                <PromoBody>
                  <PromoTitle>{title}</PromoTitle>
                  <PromoDesc>{desc}</PromoDesc>
                </PromoBody>
              </PromoRow>
            ))}
          </PromoList>
        </Inner>
      </Section>

      {/* 4. 공감 (프로 고민) */}
      <Section $alt>
        <Inner>
          <Eyebrow>현장 프로님, 이런 고민 있으셨죠?</Eyebrow>
          <SectionTitle>일감과 인력 사이, 늘 아슬아슬한 줄타기</SectionTitle>
          <Cards3>
            {PAIN_POINTS.map(({ Icon, title, desc }) => (
              <PainCard key={title}>
                <PainIcon><Icon /></PainIcon>
                <PainTitle>{title}</PainTitle>
                <PainDesc>{desc}</PainDesc>
              </PainCard>
            ))}
          </Cards3>
        </Inner>
      </Section>

      {/* 5. 핵심기능 */}
      <Section id="features">
        <Inner>
          <Eyebrow>핵심 기능</Eyebrow>
          <SectionTitle>일감을 주고받는 데 필요한 모든 것</SectionTitle>
          <FeatureList>
            {FEATURES.map((f, i) => (
              <FeatureRow key={f.title} $reverse={i % 2 === 1}>
                <FeatureVisual>
                  <Browser>
                    <BrowserBar>
                      <BrowserDot /><BrowserDot /><BrowserDot />
                    </BrowserBar>
                    <BrowserBody>
                      <BigIcon $c={f.color}><f.Icon /></BigIcon>
                      <MockLine $w="80%" />
                      <MockLine $w="60%" />
                      <MockLine $w="70%" />
                    </BrowserBody>
                  </Browser>
                </FeatureVisual>
                <FeatureBody>
                  <FeatureTag $c={f.color}>{f.tag}</FeatureTag>
                  <FeatureTitle>{f.title}</FeatureTitle>
                  <FeatureDesc>{f.desc}</FeatureDesc>
                  <PointList>
                    {f.points.map((pt) => (
                      <li key={pt}><Check $c={f.color}><FiCheck /></Check>{pt}</li>
                    ))}
                  </PointList>
                </FeatureBody>
              </FeatureRow>
            ))}
          </FeatureList>
        </Inner>
      </Section>

      {/* 6. 이용 방법 (3스텝) */}
      <Section id="how" $alt>
        <Inner>
          <Eyebrow>이렇게 이용해요</Eyebrow>
          <SectionTitle>등록부터 완료까지, 단 3단계</SectionTitle>
          <Steps>
            {STEPS.map(({ no, Icon, title, desc }) => (
              <StepCard key={no}>
                <StepNo>{no}</StepNo>
                <StepIcon><Icon /></StepIcon>
                <StepTitle>{title}</StepTitle>
                <StepDesc>{desc}</StepDesc>
              </StepCard>
            ))}
          </Steps>
        </Inner>
      </Section>

      {/* 7. 앱 다운로드 CTA */}
      <Download id="download">
        <Inner>
          <DownloadTitle>지금 바로 시작해보세요</DownloadTitle>
          <DownloadLead>
            가입 비용 없이 무료로 시작. 현장에서는 앱으로, 사무실에서는 웹으로.
          </DownloadLead>
          <StoreBtns>
            <StoreBtn href={APP_STORE_URL}>App Store</StoreBtn>
            <StoreBtn href={PLAY_STORE_URL}>Google Play</StoreBtn>
          </StoreBtns>
        </Inner>
      </Download>

      {/* 8. FAQ */}
      <Section id="faq">
        <Inner $narrow>
          <Eyebrow>자주 묻는 질문</Eyebrow>
          <SectionTitle>궁금한 점이 있으신가요?</SectionTitle>
          <FaqList>
            {FAQS.map((f, i) => (
              <FaqItem key={f.q}>
                <FaqQ onClick={() => setOpenFaq(openFaq === i ? -1 : i)}>
                  <span>{f.q}</span>
                  <FaqToggle $open={openFaq === i}><FiPlus /></FaqToggle>
                </FaqQ>
                {openFaq === i && <FaqA>{f.a}</FaqA>}
              </FaqItem>
            ))}
          </FaqList>
        </Inner>
      </Section>

      {/* Footer */}
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
          <FootCopy>© {2026} 홈프로. All rights reserved.</FootCopy>
        </Inner>
      </Footer>
    </Page>
  );
};

export default LandingPage;

/* ============ design tokens ============ */
const PRIMARY = '#2571e3';
const INK = '#1F2937';
const SUB = '#6B7280';
const LINE = '#EEEAFB';
const ALT_BG = '#F7F8FA';
const RADIUS_CARD = '16px';
const RADIUS_BTN = '10px';
const SHADOW = '0 2px 10px rgba(31, 24, 64, 0.06)';

const Page = styled.div`
  background: #fff;
  color: ${INK};
  font-size: 16px;
  overflow-x: hidden;
`;

const Inner = styled.div`
  width: 100%;
  max-width: ${({ $narrow }) => ($narrow ? '900px' : '1400px')};
  margin: 0 auto;
  padding: 0 56px;
  @media (min-width: 1700px) {
    max-width: ${({ $narrow }) => ($narrow ? '1000px' : '1640px')};
  }
  @media (max-width: 900px) { padding: 0 32px; }
  @media (max-width: 600px) { padding: 0 20px; }
`;

/* Header */
const Header = styled.header`
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255, 255, 255, 0.9);
  backdrop-filter: blur(10px);
  border-bottom: 1px solid ${LINE};
`;

const Nav = styled.nav`
  height: 62px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
`;

const Logo = styled.div`
  font-size: 21px;
  font-weight: 800;
  color: ${PRIMARY};
  cursor: pointer;
  letter-spacing: -0.5px;
`;

const Menu = styled.div`
  display: flex;
  gap: 30px;
  a {
    font-size: 15px;
    font-weight: 500;
    color: #4B5563;
    text-decoration: none;
    &:hover { color: ${PRIMARY}; }
  }
  @media (max-width: 900px) { display: none; }
`;

const NavBtns = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
`;

const PrimaryBtn = styled.button`
  border: none;
  cursor: pointer;
  background: ${PRIMARY};
  color: #fff;
  font-weight: 700;
  font-size: ${({ $lg }) => ($lg ? '16px' : '14.5px')};
  padding: ${({ $lg }) => ($lg ? '14px 26px' : '10px 18px')};
  border-radius: ${RADIUS_BTN};
  text-decoration: none;
  display: inline-block;
  transition: background 0.15s, transform 0.12s;
  &:hover { background: #6A48F0; transform: translateY(-1px); }
  &:active { transform: translateY(0); }
`;

const OutlineBtn = styled.button`
  border: 1.5px solid #D7CEF7;
  cursor: pointer;
  background: #fff;
  color: #4B3A8A;
  font-weight: 700;
  font-size: ${({ $lg }) => ($lg ? '16px' : '14.5px')};
  padding: ${({ $lg }) => ($lg ? '13px 26px' : '9px 18px')};
  border-radius: ${RADIUS_BTN};
  text-decoration: none;
  display: inline-block;
  &:hover { border-color: ${PRIMARY}; color: ${PRIMARY}; }
`;

/* Hero */
const Hero = styled.section`
  background: linear-gradient(180deg, #F4F1FF 0%, #fff 100%);
  padding: 80px 0 88px;
`;

const HeroGrid = styled.div`
  display: grid;
  grid-template-columns: 1.05fr 0.95fr;
  gap: 48px;
  align-items: center;
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 40px;
    text-align: center;
  }
`;

const HeroText = styled.div``;

const Badge = styled.span`
  display: inline-block;
  background: #EDE7FE;
  color: ${PRIMARY};
  font-size: 14px;
  font-weight: 700;
  padding: 7px 15px;
  border-radius: 999px;
  margin-bottom: 22px;
`;

const H1 = styled.h1`
  font-size: 46px;
  line-height: 1.25;
  font-weight: 800;
  color: #111827;
  letter-spacing: -1.2px;
  margin-bottom: 20px;
  @media (max-width: 900px) { font-size: 33px; }
`;

const Accent = styled.span`color: ${PRIMARY};`;

const Lead = styled.p`
  font-size: 18px;
  line-height: 1.7;
  color: ${SUB};
  margin-bottom: 30px;
  @media (max-width: 900px) { font-size: 16px; br { display: none; } }
`;

const HeroBtns = styled.div`
  display: flex;
  gap: 12px;
  @media (max-width: 900px) { justify-content: center; }
`;

const SubNote = styled.p`
  margin-top: 16px;
  font-size: 14px;
  color: #9CA3AF;
`;

/* 폰 목업 */
const HeroVisual = styled.div`
  display: flex;
  justify-content: center;
`;

const Phone = styled.div`
  position: relative;
  width: 270px;
  height: 540px;
  background: #1E1832;
  border-radius: 38px;
  padding: 12px;
  box-shadow: 0 30px 60px rgba(45, 31, 90, 0.25);
`;

const PhoneNotch = styled.div`
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: 120px;
  height: 22px;
  background: #1E1832;
  border-radius: 0 0 14px 14px;
  z-index: 2;
`;

const PhoneScreen = styled.div`
  width: 100%;
  height: 100%;
  background: ${ALT_BG};
  border-radius: 28px;
  overflow: hidden;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const MockHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-weight: 800;
  font-size: 16px;
  color: #111827;
  padding: 18px 4px 6px;
`;

const MockDot = styled.span`
  width: 26px; height: 26px;
  border-radius: 8px;
  background: ${PRIMARY};
`;

const MockNoti = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 12px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow: ${SHADOW};
  svg { color: ${({ $c }) => $c}; font-size: 20px; flex-shrink: 0; }
  b { display: block; font-size: 13px; color: #111827; }
  span { display: block; font-size: 11px; color: #9CA3AF; margin-top: 2px; }
`;

const MockCard = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 14px;
  box-shadow: ${SHADOW};
  flex: 1;
`;

const MockCardTitle = styled.p`
  font-size: 13px;
  font-weight: 800;
  color: #111827;
  margin-bottom: 12px;
`;

const MockLine = styled.div`
  height: 9px;
  width: ${({ $w }) => $w || '100%'};
  background: #ECE8F8;
  border-radius: 5px;
  margin-bottom: 8px;
`;

const MockThumb = styled.div`
  margin-top: 10px;
  height: 70px;
  border-radius: 10px;
  background: linear-gradient(135deg, #E5DCFB, #EFE8FE);
`;

/* Stats */
const StatsBar = styled.section`
  background: ${PRIMARY};
  padding: 34px 0;
`;

const StatsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  @media (max-width: 700px) { grid-template-columns: repeat(2, 1fr); gap: 28px; }
`;

const Stat = styled.div`text-align: center;`;

const StatNum = styled.p`
  font-size: 34px;
  font-weight: 800;
  color: #fff;
  letter-spacing: -1px;
  @media (max-width: 900px) { font-size: 28px; }
`;

const StatLabel = styled.p`
  font-size: 14px;
  color: rgba(255, 255, 255, 0.85);
  margin-top: 4px;
`;

/* Section */
const Section = styled.section`
  padding: 84px 0;
  background: ${({ $alt }) => ($alt ? ALT_BG : '#fff')};
`;

const Eyebrow = styled.p`
  text-align: center;
  font-size: 15px;
  font-weight: 700;
  color: ${PRIMARY};
  margin-bottom: 12px;
`;

const SectionTitle = styled.h2`
  text-align: center;
  font-size: 32px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.8px;
  margin-bottom: 50px;
  @media (max-width: 900px) { font-size: 25px; }
`;

/* 홍보 (갤러리 + 설명) */
const WhoLead = styled.p`
  text-align: center;
  font-size: 17px;
  line-height: 1.7;
  color: ${SUB};
  max-width: 640px;
  margin: -34px auto 46px;
  @media (max-width: 900px) { font-size: 15.5px; }
`;

const PromoList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 56px;
`;

const PromoRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 56px;
  align-items: center;
  direction: ${({ $reverse }) => ($reverse ? 'rtl' : 'ltr')};
  & > * { direction: ltr; }
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    direction: ltr;
    gap: 24px;
    text-align: center;
  }
`;

const PromoVisual = styled.div``;

const PromoBig = styled.div`
  width: 100%;
  aspect-ratio: 16 / 10;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${RADIUS_CARD};
  background: ${({ $g }) => $g};
  color: rgba(45, 31, 90, 0.4);
  border: 1px solid ${LINE};
  box-shadow: 0 14px 40px rgba(45, 31, 90, 0.1);
  svg { font-size: 64px; }
`;

const PromoBody = styled.div``;

const PromoTitle = styled.h3`
  font-size: 28px;
  font-weight: 800;
  color: #111827;
  letter-spacing: -0.6px;
  line-height: 1.35;
  margin-bottom: 14px;
  @media (max-width: 900px) { font-size: 23px; }
`;

const PromoDesc = styled.p`
  font-size: 17.5px;
  line-height: 1.7;
  color: ${SUB};
  @media (max-width: 900px) { font-size: 16px; }
`;

/* Pain */
const Cards3 = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const PainCard = styled.div`
  background: #fff;
  border: 1px solid ${LINE};
  border-radius: ${RADIUS_CARD};
  padding: 32px 26px;
  box-shadow: ${SHADOW};
`;

const PainIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 50px; height: 50px;
  border-radius: 13px;
  background: #EDE7FE;
  color: ${PRIMARY};
  font-size: 24px;
  margin-bottom: 18px;
`;

const PainTitle = styled.h3`
  font-size: 19px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 10px;
`;

const PainDesc = styled.p`
  font-size: 15px;
  line-height: 1.7;
  color: ${SUB};
`;

/* Features */
const FeatureList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 60px;
`;

const FeatureRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 56px;
  align-items: center;
  direction: ${({ $reverse }) => ($reverse ? 'rtl' : 'ltr')};
  & > * { direction: ltr; }
  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    direction: ltr;
    gap: 28px;
  }
`;

const FeatureVisual = styled.div``;
const FeatureBody = styled.div``;

/* 브라우저 목업 */
const Browser = styled.div`
  border-radius: ${RADIUS_CARD};
  overflow: hidden;
  border: 1px solid ${LINE};
  box-shadow: 0 14px 40px rgba(45, 31, 90, 0.1);
  background: #fff;
`;

const BrowserBar = styled.div`
  background: #F4F2FB;
  padding: 12px 16px;
  display: flex;
  gap: 7px;
  border-bottom: 1px solid ${LINE};
`;

const BrowserDot = styled.span`
  width: 11px; height: 11px;
  border-radius: 50%;
  background: #D9D2EE;
`;

const BrowserBody = styled.div`
  padding: 32px 28px 36px;
`;

const BigIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px; height: 64px;
  border-radius: 16px;
  background: ${({ $c }) => `${$c}14`};
  color: ${({ $c }) => $c};
  font-size: 30px;
  margin-bottom: 24px;
`;

const FeatureTag = styled.span`
  display: inline-block;
  background: ${({ $c }) => `${$c}14`};
  color: ${({ $c }) => $c};
  font-size: 13px;
  font-weight: 700;
  padding: 6px 13px;
  border-radius: 999px;
  margin-bottom: 16px;
`;

const FeatureTitle = styled.h3`
  font-size: 27px;
  font-weight: 800;
  color: #111827;
  margin-bottom: 14px;
  letter-spacing: -0.6px;
  line-height: 1.35;
`;

const FeatureDesc = styled.p`
  font-size: 16.5px;
  line-height: 1.7;
  color: ${SUB};
  margin-bottom: 24px;
`;

const PointList = styled.ul`
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 13px;
  li {
    display: flex;
    align-items: center;
    gap: 11px;
    font-size: 16px;
    font-weight: 600;
    color: #374151;
  }
`;

const Check = styled.span`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 24px; height: 24px;
  border-radius: 50%;
  background: ${({ $c }) => `${$c}1A`};
  color: ${({ $c }) => $c};
  font-size: 14px;
  flex-shrink: 0;
`;

/* Steps */
const Steps = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 22px;
  @media (max-width: 900px) { grid-template-columns: 1fr; }
`;

const StepCard = styled.div`
  position: relative;
  background: #fff;
  border: 1px solid ${LINE};
  border-radius: ${RADIUS_CARD};
  padding: 34px 28px;
  box-shadow: ${SHADOW};
  text-align: center;
`;

const StepNo = styled.span`
  display: block;
  font-size: 15px;
  font-weight: 800;
  color: ${PRIMARY};
  letter-spacing: 1px;
  margin-bottom: 14px;
`;

const StepIcon = styled.div`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 56px; height: 56px;
  border-radius: 16px;
  background: #EDE7FE;
  color: ${PRIMARY};
  font-size: 26px;
  margin-bottom: 18px;
`;

const StepTitle = styled.h3`
  font-size: 19px;
  font-weight: 700;
  color: #111827;
  margin-bottom: 10px;
`;

const StepDesc = styled.p`
  font-size: 15px;
  line-height: 1.7;
  color: ${SUB};
`;

/* Download */
const Download = styled.section`
  background: linear-gradient(135deg, ${PRIMARY} 0%, #6ba3f0 100%);
  padding: 84px 0;
  text-align: center;
  color: #fff;
`;

const DownloadTitle = styled.h2`
  font-size: 34px;
  font-weight: 800;
  letter-spacing: -0.8px;
  margin-bottom: 16px;
  @media (max-width: 900px) { font-size: 26px; }
`;

const DownloadLead = styled.p`
  font-size: 18px;
  line-height: 1.7;
  color: rgba(255, 255, 255, 0.92);
  margin-bottom: 32px;
  @media (max-width: 900px) { font-size: 16px; }
`;

const StoreBtns = styled.div`
  display: flex;
  justify-content: center;
  gap: 12px;
  margin-bottom: 22px;
  flex-wrap: wrap;
`;

const StoreBtn = styled.a`
  background: #1E1832;
  color: #fff;
  font-weight: 700;
  font-size: 16px;
  padding: 14px 30px;
  border-radius: ${RADIUS_BTN};
  text-decoration: none;
  &:hover { background: #000; }
`;

/* FAQ */
const FaqList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const FaqItem = styled.div`
  border: 1px solid ${LINE};
  border-radius: ${RADIUS_CARD};
  background: #fff;
  overflow: hidden;
`;

const FaqQ = styled.button`
  width: 100%;
  border: none;
  background: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 22px;
  font-size: 17px;
  font-weight: 700;
  color: #1F2937;
  text-align: left;
`;

const FaqToggle = styled.span`
  display: inline-flex;
  color: ${PRIMARY};
  font-size: 20px;
  transition: transform 0.2s;
  transform: rotate(${({ $open }) => ($open ? '135deg' : '0')});
`;

const FaqA = styled.div`
  padding: 0 22px 22px;
  font-size: 15.5px;
  line-height: 1.75;
  color: ${SUB};
`;

/* Footer */
const Footer = styled.footer`
  background: #1E1832;
  color: #fff;
  padding: 48px 0 40px;
`;

const FootTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding-bottom: 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
`;

const FootLogo = styled.div`
  font-size: 20px;
  font-weight: 800;
  color: #fff;
`;

const FootLinks = styled.div`
  display: flex;
  gap: 22px;
  flex-wrap: wrap;
  a {
    font-size: 14px;
    color: rgba(255, 255, 255, 0.7);
    text-decoration: none;
    &:hover { color: #fff; }
  }
`;

const FootCopy = styled.p`
  margin-top: 22px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.5);
`;
