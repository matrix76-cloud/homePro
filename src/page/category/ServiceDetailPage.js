/* eslint-disable */
import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import {
  IoStar,
  IoPersonCircleOutline,
  IoLocationOutline,
  IoTimeOutline,
  IoChatbubbleOutline,
  IoCallOutline,
  IoImageOutline,
  IoShieldCheckmarkOutline,
  IoBriefcaseOutline,
  IoDocumentTextOutline,
} from "react-icons/io5";

/* ─── 목업 리뷰 ─── */
const MOCK_REVIEWS = [
  { id: "rv1", name: "김**", rating: 5, text: "친절하고 꼼꼼하게 상담해주셨어요. 강력 추천합니다!", date: "2026.02.05" },
  { id: "rv2", name: "이**", rating: 5, text: "빠른 응대와 정확한 정보 감사합니다.", date: "2026.02.01" },
  { id: "rv3", name: "박**", rating: 4, text: "전반적으로 만족합니다. 다음에도 이용할게요.", date: "2026.01.28" },
];

const ServiceDetailPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { service: svc, category: cat } = location.state || {};

  if (!svc) {
    return (
      <SimpleBackLayout NAME="서비스 상세" hideFooter>
        <EmptyWrap>
          <EmptyText>서비스 정보를 찾을 수 없습니다</EmptyText>
        </EmptyWrap>
      </SimpleBackLayout>
    );
  }

  return (
    <SimpleBackLayout NAME={svc.proName} hideFooter>
      <PageWrap>
        {/* 상단 사진 영역 */}
        <HeroArea>
          <HeroPlaceholder>
            <IoImageOutline size={48} color="rgba(255,255,255,0.5)" />
            {svc.photoCount > 0 && (
              <HeroPhotoBadge>사진 {svc.photoCount}장</HeroPhotoBadge>
            )}
          </HeroPlaceholder>
        </HeroArea>

        {/* 전문가 프로필 */}
        <Card>
          <ProProfileRow>
            <ProAvatarLarge>
              <IoPersonCircleOutline size={56} color={THEME.muted} />
            </ProAvatarLarge>
            <ProProfileInfo>
              <ProNameLarge>{svc.proName}</ProNameLarge>
              <ProMetaRow>
                <IoLocationOutline size={13} color={THEME.muted} />
                <ProMetaText>{svc.location}</ProMetaText>
                <MetaDot />
                <IoBriefcaseOutline size={13} color={THEME.muted} />
                <ProMetaText>경력 {svc.career}</ProMetaText>
              </ProMetaRow>
              <RatingRow>
                <IoStar size={16} color={THEME.accent} />
                <RatingNum>{svc.rating}</RatingNum>
                <RatingCount>리뷰 {svc.reviews}개</RatingCount>
              </RatingRow>
            </ProProfileInfo>
          </ProProfileRow>
          <VerifiedBadge>
            <IoShieldCheckmarkOutline size={14} color={THEME.success} />
            <VerifiedText>사업자 인증 완료</VerifiedText>
          </VerifiedBadge>
        </Card>

        {/* 서비스 소개 */}
        <Card>
          <SectionTitle>서비스 소개</SectionTitle>
          <ServiceTitleText>{svc.title}</ServiceTitleText>
          <ServiceDescText>{svc.description}</ServiceDescText>

          <TagWrap>
            {svc.tags.map((tag) => (
              <TagChip key={tag}>{tag}</TagChip>
            ))}
          </TagWrap>
        </Card>

        {/* 가격 정보 */}
        <Card>
          <SectionTitle>가격 안내</SectionTitle>
          <PriceBox>
            <PriceLabel>서비스 비용</PriceLabel>
            <PriceValue>{svc.price}</PriceValue>
          </PriceBox>
          <PriceNote>* 상세 견적은 요청 후 전문가가 안내드립니다</PriceNote>
        </Card>

        {/* 카테고리 정보 */}
        {cat && (
          <Card>
            <SectionTitle>전문 분야</SectionTitle>
            <CatInfoRow>
              <CatIconWrap>{cat.shortName.charAt(0)}</CatIconWrap>
              <CatInfoText>
                <CatNameText>{cat.name}</CatNameText>
                <CatDescText>{cat.description}</CatDescText>
              </CatInfoText>
            </CatInfoRow>
          </Card>
        )}

        {/* 리뷰 */}
        <Card>
          <SectionHeader>
            <SectionTitle>리뷰</SectionTitle>
            <ReviewTotal>{svc.reviews}개</ReviewTotal>
          </SectionHeader>
          {MOCK_REVIEWS.map((rv) => (
            <ReviewItem key={rv.id}>
              <ReviewTop>
                <ReviewerName>{rv.name}</ReviewerName>
                <ReviewStars>
                  {Array.from({ length: 5 }, (_, i) => (
                    <IoStar key={i} size={12} color={i < rv.rating ? THEME.accent : THEME.border} />
                  ))}
                </ReviewStars>
                <ReviewDate>{rv.date}</ReviewDate>
              </ReviewTop>
              <ReviewText>{rv.text}</ReviewText>
            </ReviewItem>
          ))}
          <MoreBtn>리뷰 더보기</MoreBtn>
        </Card>

        <BottomSpacer />
      </PageWrap>

      {/* 하단 고정 CTA */}
      <FixedBottom>
        <ActionIconBtn onClick={() => {}}>
          <IoChatbubbleOutline size={22} color={THEME.primary} />
        </ActionIconBtn>
        <ActionIconBtn onClick={() => {}}>
          <IoCallOutline size={22} color={THEME.primary} />
        </ActionIconBtn>
        <RequestBtn onClick={() => navigate(`/order/create/${cat?.id || ""}`)}>
          서비스 요청하기
        </RequestBtn>
      </FixedBottom>
    </SimpleBackLayout>
  );
};

export default ServiceDetailPage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
  background: ${THEME.background};
  min-height: 100%;
  padding: 0 0 80px;
`;

/* 히어로 사진 */
const HeroArea = styled.div`
  width: 100%;
  height: 220px;
  background: linear-gradient(135deg, #DBEAFE 0%, #93C5FD 50%, #60A5FA 100%);
`;

const HeroPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
`;

const HeroPhotoBadge = styled.div`
  padding: 6px 14px;
  border-radius: 14px;
  background: rgba(255,255,255,0.7);
  font-size: 13px;
  font-weight: 400;
  color: rgba(0,0,0,0.5);
`;

/* 카드 */
const Card = styled.div`
  background: ${THEME.surface};
  margin: 10px 12px;
  border-radius: 4px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

/* 프로필 */
const ProProfileRow = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const ProAvatarLarge = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
`;

const ProProfileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProNameLarge = styled.div`
  font-size: 18px;
  font-weight: 400;
  color: ${THEME.text};
  letter-spacing: -0.02em;
`;

const ProMetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 4px;
`;

const ProMetaText = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const MetaDot = styled.div`
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: ${THEME.border};
  margin: 0 2px;
`;

const RatingRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 6px;
`;

const RatingNum = styled.span`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.text};
`;

const RatingCount = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-left: 2px;
`;

const VerifiedBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 4px;
  margin-top: 14px;
  padding: 6px 12px;
  border-radius: 8px;
  background: #D1FAE5;
`;

const VerifiedText = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.success};
`;

/* 섹션 */
const SectionTitle = styled.div`
  font-size: 17px;
  font-weight: 400;
  color: ${THEME.text};
  letter-spacing: -0.02em;
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
`;

/* 서비스 소개 */
const ServiceTitleText = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.text};
  margin-top: 12px;
  line-height: 1.4;
`;

const ServiceDescText = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 8px;
  line-height: 1.6;
`;

const TagWrap = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 14px;
`;

const TagChip = styled.span`
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 13px;
  font-weight: 400;
  background: ${THEME.purpleLight};
  color: ${THEME.purple};
`;

/* 가격 */
const PriceBox = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding: 16px;
  border-radius: 12px;
  background: ${THEME.background};
`;

const PriceLabel = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
`;

const PriceValue = styled.div`
  font-size: 18px;
  font-weight: 400;
  color: ${THEME.primary};
`;

const PriceNote = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 8px;
`;

/* 카테고리 */
const CatInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 12px;
`;

const CatIconWrap = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.primary};
  width: 48px;
  height: 48px;
  border-radius: 4px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const CatInfoText = styled.div`
  flex: 1;
`;

const CatNameText = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.text};
`;

const CatDescText = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 2px;
  line-height: 1.4;
`;

/* 리뷰 */
const ReviewTotal = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.primary};
`;

const ReviewItem = styled.div`
  padding: 14px 0;
  &:not(:last-of-type) {
    border-bottom: 1px solid ${THEME.border};
  }
`;

const ReviewTop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const ReviewerName = styled.span`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
`;

const ReviewStars = styled.div`
  display: flex;
  gap: 1px;
`;

const ReviewDate = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-left: auto;
`;

const ReviewText = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 8px;
  line-height: 1.5;
`;

const MoreBtn = styled.div`
  text-align: center;
  padding: 14px 0 4px;
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.primary};
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

/* 하단 고정 CTA */
const FixedBottom = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  z-index: 998;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 16px;
  padding-bottom: calc(12px + env(safe-area-inset-bottom, 0px));
  background: ${THEME.surface};
  border-top: 1px solid ${THEME.border};
  box-shadow: 0 -2px 10px rgba(0,0,0,0.05);
`;

const ActionIconBtn = styled.button`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  &:active { background: ${THEME.background}; }
`;

const RequestBtn = styled.button`
  flex: 1;
  padding: 14px;
  border: none;
  border-radius: 12px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.9; }
`;

/* 빈/에러 */
const EmptyWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
`;

const EmptyText = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const BottomSpacer = styled.div`
  height: 24px;
`;
