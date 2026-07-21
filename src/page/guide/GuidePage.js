/* eslint-disable */
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";

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
    color: "#e7f0fd",
    steps: [
      { title: "작업 퀄리티가 기본", desc: "당연하지만 가장 중요합니다. 약속한 시간과 품질을 지키세요. 작은 디테일이 리뷰에 큰 차이를 만듭니다.", image: null },
      { title: "작업 전후 사진 남기기", desc: "Before/After 사진을 고객에게 공유하세요. 고객이 변화를 눈으로 확인하면 리뷰 작성 동기가 높아집니다.", image: null },
      { title: "완료 직후 리뷰 요청", desc: "작업 완료 후 바로 채팅으로 리뷰를 부탁하세요. 시간이 지나면 잊어버리기 쉽습니다.", image: null },
      { title: "리뷰 이벤트 활용", desc: "홈프로의 리뷰 이벤트를 활용하면 고객에게 리뷰 작성 동기를 제공할 수 있습니다.", image: null },
    ],
  },
  3: {
    title: "홈프로캐시 보상은 언제 이루어지나요?",
    color: "#e7f0fd",
    steps: [
      { title: "홈프로캐시란?", desc: "홈프로 내에서 사용할 수 있는 포인트입니다. 견적 발송, 프로필 부스트 등에 사용됩니다.", image: null },
      { title: "캐시 적립 방법", desc: "추천인 코드로 친구 초대 시 캐시가 적립됩니다. 또한 특정 미션 달성 시에도 보상이 지급됩니다.", image: null },
      { title: "캐시 사용처", desc: "견적 발송 시 캐시가 차감됩니다. 프로필 상단 노출 등 프리미엄 기능에도 사용할 수 있습니다.", image: null },
      { title: "캐시 충전", desc: "부족한 캐시는 직접 충전할 수 있습니다. 대량 충전 시 보너스 캐시가 추가됩니다.", image: null },
    ],
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
    color: "#e7f0fd",
    steps: [
      { title: "등급은 어떻게 결정되나요?", desc: "누적 적립 포인트에 따라 등급이 결정됩니다. 포인트를 사용해도 등급은 내려가지 않아요. 한번 올라간 등급은 영구 유지!", image: null },
      { title: "등급별 기준", desc: "루키(0P) → 브론즈(500P) → 실버(2,000P) → 골드(5,000P) → 다이아(15,000P) → 마스터(50,000P). 포인트를 꾸준히 모아 등급을 올려보세요.", image: null },
      { title: "포인트 모으는 법", desc: "친구 초대, 오더 등록, 오더 완료, 커뮤니티 활동, 리뷰 작성 등 다양한 활동으로 포인트를 받을 수 있어요.", image: null },
      { title: "등급이 높으면 좋은 점", desc: "등급이 높을수록 고객에게 신뢰감을 줍니다. 견적 카드에 등급 뱃지가 표시되어 선택률이 올라갑니다.", image: null },
    ],
  },
};

const GuidePage = () => {
  const { guideId } = useParams();
  const navigate = useNavigate();
  const guide = GUIDES[guideId];

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
  font-size: 22px;
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
  font-size: 15px;
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
  background: ${THEME.primary};
  color: #fff;
  font-size: 14px;
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
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 6px;
  line-height: 28px;
`;

const StepDesc = styled.div`
  font-size: 14px;
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
