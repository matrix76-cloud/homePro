/* eslint-disable */
import React, { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import { formatOrderTime } from "../../service/OrderService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import {
  IoImageOutline,
  IoLocationOutline,
  IoCalendarOutline,
  IoPersonOutline,
  IoCashOutline,
  IoChatbubbleEllipsesOutline,
  IoCallOutline,
  IoHomeOutline,
  IoChevronBack,
  IoChevronForward,
} from "react-icons/io5";

const STATUS_BADGE = {
  "접수": { bg: THEME.purpleLight, text: THEME.purple },
  "지원가능": { bg: "#DBEAFE", text: THEME.primary },
  "배차대기": { bg: "#FEF3C7", text: "#B45309" },
  "진행중": { bg: "#DBEAFE", text: THEME.primary },
  "작업완료": { bg: "#D1FAE5", text: THEME.success },
  "취소": { bg: "#FEE2E2", text: THEME.danger },
  "완료": { bg: "#D1FAE5", text: THEME.success },
};

const OrderDetailPage = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const order = state?.order;
  const category = state?.category;

  const [photoIdx, setPhotoIdx] = useState(0);

  if (!order) {
    return (
      <SimpleBackLayout NAME="요청 상세" hideFooter>
        <EmptyWrap>
          <EmptyText>요청 정보를 불러올 수 없습니다.</EmptyText>
        </EmptyWrap>
      </SimpleBackLayout>
    );
  }

  const photos = order.photos || [];
  const badgeColor = STATUS_BADGE[order.orderStatus] || STATUS_BADGE["접수"];
  const timeLabel = formatOrderTime(order.createdAt);
  const headerName = category ? category.name : "요청 상세";

  return (
    <SimpleBackLayout NAME={headerName} hideFooter>
      <Wrapper>
        {/* 상단 사진 영역 */}
        {photos.length > 0 ? (
          <HeroArea $bg="none" style={{ background: "#000" }}>
            <HeroPhoto src={photos[photoIdx]} alt={`사진${photoIdx + 1}`} />
            {photos.length > 1 && (
              <>
                <NavBtn $left onClick={() => setPhotoIdx((p) => (p - 1 + photos.length) % photos.length)}>
                  <IoChevronBack size={20} color="#fff" />
                </NavBtn>
                <NavBtn onClick={() => setPhotoIdx((p) => (p + 1) % photos.length)}>
                  <IoChevronForward size={20} color="#fff" />
                </NavBtn>
              </>
            )}
            <BadgeRow>
              <Badge $bg={badgeColor.bg} $color={badgeColor.text}>
                {order.orderStatus}
              </Badge>
              <TimeLabel>{timeLabel}</TimeLabel>
            </BadgeRow>
            <PhotoCounter>{photoIdx + 1} / {photos.length}</PhotoCounter>
          </HeroArea>
        ) : (
          <HeroArea $bg="linear-gradient(135deg, #DBEAFE 0%, #93C5FD 100%)">
            <HeroInner>
              <IoImageOutline size={40} color="rgba(255,255,255,0.5)" />
            </HeroInner>
            <BadgeRow>
              <Badge $bg={badgeColor.bg} $color={badgeColor.text}>
                {order.orderStatus}
              </Badge>
              <TimeLabel>{timeLabel}</TimeLabel>
            </BadgeRow>
          </HeroArea>
        )}

        {/* 태그 */}
        <TagSection>
          {order.subcategory && <SubTag>{order.subcategory}</SubTag>}
          {order.matchType && <MatchTag>[{order.matchType}]</MatchTag>}
          {order.spaceType && <SpaceTag>{order.spaceType}</SpaceTag>}
        </TagSection>

        {/* 제목 */}
        <TitleSection>
          <OrderTitle>{order.title}</OrderTitle>
          <WriterRow>
            <IoPersonOutline size={14} color={THEME.muted} />
            <WriterText>{order.writer}</WriterText>
          </WriterRow>
        </TitleSection>

        {/* 정보 카드 */}
        <InfoCard>
          <InfoRow>
            <InfoIcon><IoLocationOutline size={18} color={THEME.primary} /></InfoIcon>
            <InfoContent>
              <InfoLabel>지역</InfoLabel>
              <InfoValue>{order.location || "-"}</InfoValue>
            </InfoContent>
          </InfoRow>
          <Divider />
          <InfoRow>
            <InfoIcon><IoCalendarOutline size={18} color={THEME.primary} /></InfoIcon>
            <InfoContent>
              <InfoLabel>일정</InfoLabel>
              <InfoValue>{order.schedule || "-"}</InfoValue>
            </InfoContent>
          </InfoRow>
          <Divider />
          <InfoRow>
            <InfoIcon><IoCashOutline size={18} color={THEME.primary} /></InfoIcon>
            <InfoContent>
              <InfoLabel>금액</InfoLabel>
              <InfoValue>{order.price || "-"}</InfoValue>
            </InfoContent>
          </InfoRow>
          {order.spaceType && (
            <>
              <Divider />
              <InfoRow>
                <InfoIcon><IoHomeOutline size={18} color={THEME.primary} /></InfoIcon>
                <InfoContent>
                  <InfoLabel>공간 유형</InfoLabel>
                  <InfoValue>{order.spaceType}</InfoValue>
                </InfoContent>
              </InfoRow>
            </>
          )}
        </InfoCard>

        {/* 상세 내용 */}
        <DetailSection>
          <SectionTitle>요청 상세 내용</SectionTitle>
          <DetailText>{order.description || "-"}</DetailText>
        </DetailSection>

        {/* 하단 여백 (CTA 공간) */}
        <BottomSpacer />
      </Wrapper>

      {/* 고정 하단 CTA */}
      <FixedBottom>
        <ActionRow>
          <SmallBtn onClick={() => {}}>
            <IoChatbubbleEllipsesOutline size={20} color={THEME.text} />
          </SmallBtn>
          <SmallBtn onClick={() => {}}>
            <IoCallOutline size={20} color={THEME.text} />
          </SmallBtn>
          <MainCTA onClick={() => {}}>견적 보내기</MainCTA>
        </ActionRow>
      </FixedBottom>
    </SimpleBackLayout>
  );
};

export default OrderDetailPage;

/* ===================== styles ===================== */

const Wrapper = styled.div`
  background: ${THEME.background};
  min-height: 100%;
`;

const HeroArea = styled.div`
  width: 100%;
  height: 200px;
  background: ${({ $bg }) => $bg};
  position: relative;
`;

const HeroInner = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const HeroPhoto = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const NavBtn = styled.button`
  position: absolute;
  top: 50%;
  ${({ $left }) => ($left ? "left: 8px;" : "right: 8px;")}
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
`;

const PhotoCounter = styled.div`
  position: absolute;
  bottom: 10px;
  right: 12px;
  padding: 3px 10px;
  border-radius: 10px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  font-size: 11px;
  font-weight: 400;
`;

const BadgeRow = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`;

const Badge = styled.span`
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 400;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

const TimeLabel = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.8);
`;

const TagSection = styled.div`
  display: flex;
  gap: 6px;
  padding: 16px 16px 0;
`;

const SubTag = styled.span`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 400;
  background: ${THEME.purpleLight};
  color: ${THEME.purple};
`;

const MatchTag = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.purple};
`;

const SpaceTag = styled.span`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 400;
  background: ${THEME.surface};
  color: ${THEME.textSecondary};
`;

const TitleSection = styled.div`
  padding: 12px 16px 0;
`;

const OrderTitle = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 400;
  color: ${THEME.text};
  letter-spacing: -0.03em;
  line-height: 1.4;
`;

const WriterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
`;

const WriterText = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const InfoCard = styled.div`
  margin: 16px 16px 0;
  background: ${THEME.surface};
  border-radius: 14px;
  padding: 4px 0;
  box-shadow: ${THEME.cardShadow};
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
`;

const InfoIcon = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${THEME.purpleLight};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoLabel = styled.div`
  font-size: 11px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-bottom: 2px;
`;

const InfoValue = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
`;

const Divider = styled.div`
  height: 1px;
  background: ${THEME.border};
  margin: 0 16px;
`;

const DetailSection = styled.div`
  margin: 16px 16px 0;
  background: ${THEME.surface};
  border-radius: 14px;
  padding: 20px 16px;
  box-shadow: ${THEME.cardShadow};
`;

const SectionTitle = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.text};
  margin-bottom: 12px;
`;

const DetailText = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  line-height: 1.7;
  white-space: pre-line;
`;

const BottomSpacer = styled.div`
  height: 100px;
`;

const FixedBottom = styled.div`
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: ${THEME.surface};
  border-top: 1px solid ${THEME.border};
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 900;
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SmallBtn = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 12px;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  &:active {
    background: ${THEME.background};
  }
`;

const MainCTA = styled.button`
  flex: 1;
  height: 48px;
  border-radius: 12px;
  border: none;
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 400;
  cursor: pointer;
  &:active {
    background: ${THEME.primaryDark};
  }
`;

const EmptyWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
`;

const EmptyText = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
`;
