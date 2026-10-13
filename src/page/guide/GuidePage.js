/* eslint-disable */
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";
import { isIosApp } from "../../bridge/webviewBridge";
import { useAuth } from "../../context/AuthContext";

const GUIDES = {
  1: {
    title: "첫 견적 보내기, 이렇게 하면 쉬워요",
    color: "#FEF3C7",
    steps: [
      { title: "요청서 확인하기", desc: "홈 화면의 '전체오더'에서 내 카테고리에 맞는 요청을 확인하세요. 지역, 카테고리, 상세 요청 내용을 꼼꼼히 읽어보세요.", image: null },
      { title: "견적서 작성하기", desc: "요청 상세 페이지에서 '견적 보내기' 버튼을 누르세요. 예상 비용, 작업 기간, 포함 서비스를 명확하게 작성하면 채택률이 올라갑니다.", image: null },
      { title: "고객과 채팅하기", desc: "견적을 보내면 고객과 1:1 채팅이 시작됩니다. 궁금한 점을 빠르게 답변하면 신뢰도가 높아져요.", image: null },
      { title: "작업 완료 후 리뷰 받기", desc: "작업이 완료되면 고객에게 리뷰를 요청하세요. 좋은 리뷰는 다음 고객 확보의 핵심입니다.", image: null },
    ],
  },
  2: {
    title: "고객 리뷰를 늘리는 가장 효과적인 방법",
    color: "#F1EAF6",
    steps: [
      { title: "작업 퀄리티가 기본", desc: "당연하지만 가장 중요합니다. 약속한 시간과 품질을 지키세요. 작은 디테일이 리뷰에 큰 차이를 만듭니다.", image: null },
      { title: "작업 전후 사진 남기기", desc: "Before/After 사진을 고객에게 공유하세요. 고객이 변화를 눈으로 확인하면 리뷰 작성 동기가 높아집니다.", image: null },
      { title: "완료 직후 리뷰 요청", desc: "작업 완료 후 바로 채팅으로 리뷰를 부탁하세요. 시간이 지나면 잊어버리기 쉽습니다.", image: null },
      { title: "리뷰 이벤트 활용", desc: "홈프로의 리뷰 이벤트를 활용하면 고객에게 리뷰 작성 동기를 제공할 수 있습니다.", image: null },
    ],
  },
  3: {
    title: "홈프로캐시 보상은 언제 이루어지나요?",
    color: "#F1EAF6",
    steps: [
      { title: "홈프로캐시란?", desc: "홈프로 내에서 사용할 수 있는 포인트입니다. 견적 발송, 프로필 부스트 등에 사용됩니다.", image: null },
      { title: "캐시 적립 방법", desc: "추천인 코드로 친구 초대 시 캐시가 적립됩니다. 또한 특정 미션 달성 시에도 보상이 지급됩니다.", image: null },
      { title: "캐시 사용처", desc: "견적 발송 시 캐시가 차감됩니다. 프로필 상단 노출 등 프리미엄 기능에도 사용할 수 있습니다.", image: null },
      // 아이폰 앱에서는 충전(결제) 안내를 뺀다 (형 지시 2026-10-01)
      !isIosApp() && { title: "캐시 충전", desc: "부족한 캐시는 직접 충전할 수 있습니다. 대량 충전 시 보너스 캐시가 추가됩니다.", image: null },
    ].filter(Boolean),
  },
  4: {
    title: "프로필 사진, 이렇게 찍으세요",
    color: "#D1FAE5",
    steps: [
      { title: "밝은 조명에서 촬영", desc: "자연광이 가장 좋습니다. 얼굴이 잘 보이는 밝은 환경에서 촬영하세요. 역광은 피하세요.", image: null },
      { title: "작업복 또는 깔끔한 복장", desc: "전문가다운 인상을 주세요. 작업복을 입고 촬영하면 신뢰감이 올라갑니다.", image: null },
      { title: "작업 현장 사진 추가", desc: "프로필에 실제 작업 현장 사진을 추가하면 고객이 실력을 가늠할 수 있습니다.", image: null },
      { title: "포트폴리오 정리", desc: "대표 작업 사진 3~5장을 선별하세요. 다양한 종류의 작업을 보여주면 더 좋습니다.", image: null },
    ],
  },
  5: {
    title: "등급 시스템 — 포인트로 등급을 올리세요",
    color: "#F1EAF6",
    steps: [
      { title: "등급은 어떻게 결정되나요?", desc: "누적 적립 포인트에 따라 등급이 결정됩니다. 포인트를 사용해도 등급은 내려가지 않아요. 한번 올라간 등급은 영구 유지!", image: null },
      { title: "등급별 기준", desc: "루키(0P) → 브론즈(500P) → 실버(2,000P) → 골드(5,000P) → 다이아(15,000P) → 마스터(50,000P). 포인트를 꾸준히 모아 등급을 올려보세요.", image: null },
      { title: "포인트 모으는 법", desc: "친구 초대, 오더 등록, 오더 완료, 커뮤니티 활동, 리뷰 작성 등 다양한 활동으로 포인트를 받을 수 있어요.", image: null },
      { title: "등급이 높으면 좋은 점", desc: "등급이 높을수록 고객에게 신뢰감을 줍니다. 견적 카드에 등급 뱃지가 표시되어 선택률이 올라갑니다.", image: null },
    ],
  },

  // ── 대표 안내문 원문 (리뷰 2026-10-06) — 문구는 받은 그대로 ──
  6: {
    title: "홈프로 오더 접수 및 수락 가이드",
    color: "#E6F7EE",
    intro: "홈프로의 오더 접수와 수락은 파트너님을 위해 모두 무료로 제공됩니다.",
    steps: [
      { title: "오더 접수 — 요청 등록", desc: "고객(발주자)이 필요한 서비스 카테고리와 상세 내용을 선택해 등록합니다.", image: null },
      { title: "오더 접수 — 실시간 알림", desc: "등록된 오더는 홈프로 앱의 실시간 오더 목록에 바로 등록되며, 동시에 푸시 알림으로 즉시 안내됩니다.", image: null },
      { title: "오더 수락 권한 — 비즈프로필 셀프 등록", desc: "파트너 본인의 기술 분야 카테고리를 최대 5개까지 직접 선택하실 수 있습니다.", image: null },
      { title: "오더 수락 권한 — 자동 권한 부여", desc: "등록한 카테고리 분야의 오더는 별도의 비용 없이 무료로 수락 권한이 부여됩니다.", image: null },
      { title: "오더 수락 권한 — 회원등급별 수락 시간차", desc: "공정하고 원활한 매칭을 위해, 회원등급에 따라 오더 수락 가능 시점에 차등(시간차수)이 적용됩니다.\n(※ 자세한 내용은 '구독 회원등급 안내'를 참고해 주세요.)", image: null },
    ],
  },
  7: {
    title: "홈프로 구독 회원등급 및 오더 수락 안내",
    color: "#F1EAF6",
    intro: "홈프로는 파트너님의 활동 기여도와 구독 형태에 따라 총 3가지 등급(2차수 ~ 0차수)으로 운영되며, 등급에 따라 오더 수락 가능 시점에 차등(시간차수)이 적용됩니다.",
    steps: [
      { title: "2차수: 일반무료 회원", desc: "대상: 홈프로에 처음 가입한 직후의 모든 기본 회원\n혜택 및 권한: 가입 비용 없이 기본적으로 제공되는 무료 회원 등급입니다.\n오더 수락 조건: 오더 접수 후 7분이 경과한 시점부터 오더 수락 권한이 부여됩니다.", image: null },
      { title: "1차수: 앰배서더 회원", desc: "대상: H-포인트 2만 P 이상 보유 회원 또는 활발한 초대 및 적극적인 활동으로 플랫폼 성장에 기여한 회원\n혜택 및 권한: 플랫폼 기여도를 인정받은 파트너를 위한 우대 등급입니다.\n오더 수락 조건: 오더 접수 후 3분이 경과한 시점부터 오더 수락 권한이 부여됩니다.", image: null },
      // 아이폰 앱에서는 구독 요금 안내를 뺀다 (애플 심사 3.1.1 · 형 지시 2026-10-01)
      { title: "0차수: 유료구독 회원", desc: (isIosApp()
          ? "혜택 및 권한: 가장 빠르고 유리한 조건으로 오더를 선점할 수 있는 최고 등급입니다."
          : "대상: 월 구독료를 결제하여 이용 중인 프리미엄 파트너 회원\n이용 요금: 월 16,500원 (부가세 포함)\n혜택 및 권한: 가장 빠르고 유리한 조건으로 오더를 선점할 수 있는 최고 등급입니다.")
          + "\n오더 수락 조건: 오더 접수와 동시에 지연 없이 실시간('0'분)으로 오더 수락이 가능합니다.", image: null },
    ],
  },
  8: {
    title: "홈프로 포인트(H-포인트) 획득 및 사용 안내",
    color: "#FEF3C7",
    intro: "홈프로에서는 플랫폼 활동과 기여도에 따라 다양한 방식으로 포인트를 획득하고 유용하게 사용하실 수 있습니다.",
    steps: [
      { title: "포인트 획득 — 친구 초대 및 추천", desc: "신규 파트너나 고객을 플랫폼으로 초대하면 감사의 의미로 포인트가 적립됩니다.", image: null },
      { title: "포인트 획득 — 적극적인 플랫폼 활동", desc: "오더접수, 서비스 완료, 리뷰 작성, 커뮤니티 기여 등 홈프로 생태계를 활성화하는 다양한 활동을 통해 포인트를 쌓을 수 있습니다.", image: null },
      { title: "포인트 획득 — 이벤트 및 프로모션", desc: "플랫폼 내에서 진행되는 다양한 이벤트나 미션 참여를 통해 추가 포인트를 획득할 수 있습니다.", image: null },
      { title: "포인트 사용 — 회원등급 업그레이드", desc: "모은 포인트(예: H-포인트 2만 P 이상)를 활용해 '앰배서더 회원(1차수)' 등급으로 진입하여, 오더 수락 대기 시간을 단축(3분 경과 후 수락)할 수 있습니다.", image: null },
      !isIosApp() && { title: "포인트 사용 — 플랫폼 내 결제 및 서비스 이용", desc: "적립된 포인트는 홈프로 내 서비스 이용료, 기타 제휴 서비스 등 다양한 용도로 편리하게 활용하실 수 있습니다.", image: null },
    ].filter(Boolean),
  },
  9: {
    title: "홈프로 나의 오더 현황 관리 안내",
    color: "#D1FAE5",
    intro: "홈프로에서는 내가 요청한 오더부터 수락한 오더까지, 모든 진행 상황을 실시간으로 확인하고 스마트하게 관리할 수 있습니다.",
    steps: [
      { title: "오더 진행 상황 실시간 관리", desc: "상태별 모니터링: 오더가 접수된 순간부터 진행 중, 완료에 이르기까지의 모든 과정을 실시간으로 투명하게 관리할 수 있습니다.", image: null },
      { title: "내가 접수한 오더 (발주자 입장)", desc: "오더를 배정받은 홈프로(파트너)와 전화 및 채팅을 통해 직접 소통하며, 작업 진행 상태를 실시간으로 관제하고 확인할 수 있습니다.", image: null },
      { title: "내가 수락한 오더 (파트너 입장)", desc: "작업 시작(체크인) 및 작업 종료(체크아웃), 그리고 현장 사진 첨부 기능을 활용하여 오더를 배정한 발주자(고객)와 긴밀하게 소통합니다.\n실시간으로 현장 작업 정보를 주고받으며 투명하게 진행 상황을 공유할 수 있습니다.", image: null },
      { title: "시공대금 및 소개수수료 정산 안내", desc: "유연한 자율 정산: 시공 완료 후 발생하는 시공 대금 및 소개수수료 정산은 발주자(고객)가 설정한 접수 내용과 당사자 간의 상호 협의를 바탕으로 이루어집니다.\n플랫폼의 일방적인 강제 규정 대신, 두 당사자 간에 가장 편리하고 적합한 방식을 자유롭게 선택하여 유연하게 정산할 수 있습니다.", image: null },
    ],
  },
  10: {
    title: "도급배상책임보험",
    color: "#E6F7EE",
    intro: "작업 중 발생할 수 있는 사고 대비 도급배상책임보험 가입 및 보장 안내",
    steps: [
      { title: "가입 대상 (프리랜서 가입 가능)", desc: "누구나 가입 가능: 사업자등록증이 없는 개인 프리랜서 파트너님도 누구나 가입하여 안심하고 보장을 받으실 수 있습니다.", image: null },
      { title: "보장 내용 및 물적확대 담보", desc: "안전한 작업 환경 보장: 서비스 시공 및 작업 진행 중 부주의나 과실로 인해 고객의 재산에 손해를 입히거나 제3자에게 배상 책임이 발생했을 때 보장해 드립니다.\n물적확대 담보 보장: 작업 대상물뿐만 아니라 작업으로 인해 직접적으로 영향을 받는 주변의 재물 및 물적 손해 범위까지 폭넓게 확대하여 보장하므로 더욱 안심하고 시공하실 수 있습니다.", image: null },
      // 아이폰 앱에는 결제가 없다 (형 지시 2026-10-01) — 가입·결제 방법 항목은 뺀다
      !isIosApp() && { title: "보험료 안내 및 가입/결제 방법", desc: "간편한 앱 내 가입: 별도의 복잡한 서류 제출 없이, 홈프로 앱 내에서 기본 정보 입력 후 즉시 결제를 통해 빠르고 편리하게 보험 가입을 완료하실 수 있습니다.\n(※ 구체적인 보험료 및 상세 보장 한도는 앱 내 보험 안내 화면에서 확인하실 수 있습니다.)", image: null },
      { title: "[필수] 보장 적용을 위한 체크인·체크아웃 및 외부 오더 관리", desc: "도급배상책임보험의 정상적인 보장을 받기 위해서는 작업 이력 기록이 필수적입니다.\n앱 내 오더: 현장 도착 시 '체크인(작업 시작)'과 작업 완료 시 '체크아웃(작업 종료)' 기록이 반드시 남아야 합니다.\n외부 오더(셀프 등록): 홈프로 플랫폼을 통하지 않은 외부 오더의 경우에도, 파트너가 앱에 직접 오더를 셀프 등록한 뒤 동일하게 체크인·체크아웃 기능으로 작업 기록을 남겨야만 보험 보장 혜택이 정상적으로 적용됩니다.", image: null },
    ].filter(Boolean),
  },
};

const GuidePage = () => {
  const { guideId } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  // PG 심사 계정에서는 보험 안내를 열지 않는다 (형 2026-10-07)
  const guide = userData?.pgReview === true && String(guideId) === "10" ? null : GUIDES[guideId];

  if (!guide) {
    return (
      <SimpleBackLayout title="가이드">
        <Empty>존재하지 않는 가이드입니다.</Empty>
      </SimpleBackLayout>
    );
  }

  return (
    <SimpleBackLayout title="홈프로 가이드">
      <Wrap>
        <Hero $bg={guide.color}>
          <HeroTitle>{guide.title}</HeroTitle>
          {guide.intro && <HeroIntro>{guide.intro}</HeroIntro>}
        </Hero>

        <Timeline>
          {guide.steps.map((step, idx) => (
            <StepRow key={idx}>
              <StepLeft>
                <StepNum>{idx + 1}</StepNum>
                {idx < guide.steps.length - 1 && <StepLine />}
              </StepLeft>
              <StepContent>
                <StepTitle>{step.title}</StepTitle>
                <StepDesc>{step.desc}</StepDesc>
                {step.image && <StepImg src={step.image} alt={step.title} />}
              </StepContent>
            </StepRow>
          ))}
        </Timeline>
      </Wrap>
    </SimpleBackLayout>
  );
};

export default GuidePage;

/* ─── Styled ─── */

const Wrap = styled.div`
  padding: 16px 16px 40px;
`;

const Hero = styled.div`
  background: ${({ $bg }) => $bg || "#F3F4F6"};
  border-radius: 16px;
  padding: 28px 24px;
  margin-bottom: 28px;
`;

const HeroTitle = styled.h1`
  font-size: 24px;
  font-weight: 700;
  color: ${THEME.text};
  line-height: 1.4;
  margin: 0;
  white-space: pre-line;
`;

const Empty = styled.div`
  padding: 60px 0;
  text-align: center;
  color: ${THEME.textSecondary};
  font-size: 17px;
`;

const Timeline = styled.div`
  display: flex;
  flex-direction: column;
`;

const StepRow = styled.div`
  display: flex;
  gap: 14px;
`;

const StepLeft = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  flex-shrink: 0;
  width: 28px;
`;

const StepNum = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${THEME.button};
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const StepLine = styled.div`
  flex: 1;
  width: 2px;
  border-left: 2px dashed #D1D5DB;
  min-height: 20px;
`;

const StepContent = styled.div`
  flex: 1;
  padding-bottom: 28px;
`;

const StepTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 6px;
  line-height: 28px;
`;

const HeroIntro = styled.div`
  margin-top: 10px;
  font-size: 16px;
  line-height: 1.6;
  color: ${THEME.text};
  word-break: keep-all;
`;

const StepDesc = styled.div`
  white-space: pre-line;
  word-break: keep-all;
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  line-height: 1.6;
`;

const StepImg = styled.img`
  margin-top: 12px;
  width: 100%;
  border-radius: 12px;
  object-fit: cover;
`;
