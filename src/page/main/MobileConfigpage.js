/* eslint-disable */
import React, { useContext, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAtom } from "jotai";
import { IoPersonCircleOutline, IoCameraOutline, IoClose, IoChevronForward, IoCalendarOutline, IoAddOutline } from "react-icons/io5";
import { UserContext } from "../../context/User";
import { signOutUser } from "../../service/AuthService";
import { THEME, CATEGORIES } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import MyPageLayout from "../../screen/Layout/Layout/MyPageLayout";

/* ─── 프로필 카드 ─── */
const ProfileCard = styled.div`
  margin: 16px 16px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 24px 20px;
  box-shadow: ${THEME.cardShadow};
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  &:active { background: #FAFBFC; }
`;

const ProfileImgWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const ProfileImg = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
`;

const ProfilePlaceholder = styled.div`
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProfileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProfileName = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.02em;
`;

const ProfileSub = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const ProfileEditLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.primary};
`;

/* ─── 프로필 편집 모달 ─── */
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled.div`
  width: 100%;
  max-width: 360px;
  background: ${THEME.surface};
  border-radius: 20px;
  padding: 28px 24px 24px;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const ModalTitle = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: ${THEME.text};
`;

const ModalCloseBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const ModalImgWrap = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
`;

const ModalImgBtn = styled.div`
  position: relative;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const CameraBadge = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${THEME.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid ${THEME.border};
  border-radius: 12px;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${THEME.primary}; }
`;

const ModalInputCount = styled.div`
  text-align: right;
  font-size: 12px;
  color: ${THEME.muted};
  margin-top: 6px;
`;

const ModalSaveBtn = styled.button`
  width: 100%;
  margin-top: 20px;
  padding: 16px;
  border: none;
  border-radius: 14px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.9; }
  &:disabled { background: ${THEME.border}; color: ${THEME.muted}; }
`;


const LogoutButton = styled.button`
  width: calc(100% - 32px);
  margin: 12px 16px;
  padding: 16px;
  background: ${THEME.surface};
  border: none;
  border-radius: 16px;
  color: ${THEME.danger};
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  font-family: inherit;
  box-shadow: ${THEME.cardShadow};
  &:active { opacity: 0.8; }
`;

/* ─── 캘린더 ─── */
const CalendarCard = styled.div`
  margin: 12px 16px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const CalendarRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CalendarLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
`;

const CalIconWrap = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const CalendarText = styled.div``;

const CalTitle = styled.div`
  font-size: 15px;
  font-weight: 800;
  color: ${THEME.primary};
  letter-spacing: -0.02em;
`;

const CalDesc = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
  margin-top: 2px;
`;

const AddBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: ${THEME.background};
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  &:active { background: ${THEME.border}; }
`;

/* ─── 커뮤니티 & 가이드 ─── */
const CommunityCard = styled.div`
  margin: 12px 16px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CardTitle = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const CardDesc = styled.div`
  font-size: 14px;
  color: ${THEME.muted};
  margin-top: 4px;
  font-weight: 500;
`;

const ArrowBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  &:active { opacity: 0.6; }
`;

const HScrollRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
  &::-webkit-scrollbar { display: none; }
`;

const PostCard = styled.div`
  flex-shrink: 0;
  width: 220px;
  padding: 16px;
  background: ${THEME.background};
  border-radius: 14px;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const PostBadge = styled.div`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 6px;
  background: ${THEME.purpleLight};
  color: ${THEME.purple};
  font-size: 11px;
  font-weight: 700;
  margin-bottom: 10px;
`;

const PostTitle = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.text};
  line-height: 1.4;
  letter-spacing: -0.02em;
`;

const PostDesc = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${THEME.muted};
  margin-top: 4px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const PostDate = styled.div`
  margin-top: 10px;
  font-size: 12px;
  font-weight: 500;
  color: ${THEME.muted};
`;

const GuideSection = styled.div`
  margin: 12px 16px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const GuideCard = styled.div`
  flex-shrink: 0;
  width: 200px;
  height: 120px;
  padding: 20px;
  border-radius: 16px;
  background: ${({ $bg }) => $bg || THEME.background};
  display: flex;
  align-items: flex-end;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const GuideText = styled.div`
  font-size: 15px;
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  line-height: 1.45;
  white-space: pre-line;
`;

/* ─── 개별 메뉴 카드 ─── */
const SingleCardWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 0;
`;

const SingleCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: ${THEME.cardShadow};
  cursor: pointer;
  &:active { background: #FAFBFC; }
`;

const SingleCardIcon = styled.div`
  font-size: 28px;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const SingleCardText = styled.div`
  flex: 1;
  min-width: 0;
`;

const SingleCardTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
`;

const SingleCardDesc = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${THEME.muted};
  margin-top: 2px;
`;

const SupportList = styled.div`
  margin-top: 14px;
`;

const SupportItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 0;
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const SupportLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
`;

const BottomSpacer = styled.div`
  height: 20px;
`;

/* ─── 콘텐츠 카드 ─── */
const ContentCard = styled.div`
  margin: 12px 16px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const InfoGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;

const InfoLabel2 = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.muted};
`;

const InfoValue2 = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ReferralBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 12px 16px;
  background: ${THEME.background};
  border-radius: 12px;
`;

const ReferralCode = styled.div`
  flex: 1;
  font-size: 18px;
  font-weight: 800;
  color: ${THEME.primary};
  letter-spacing: 0.05em;
`;

const CopyBtn = styled.button`
  padding: 6px 14px;
  border: none;
  border-radius: 8px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const ReferralStat = styled.div`
  display: flex;
  align-items: center;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid ${THEME.border};
`;

const ReferralStatItem = styled.div`
  flex: 1;
  text-align: center;
`;

const ReferralNum = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: ${THEME.text};
`;

const ReferralLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const StatDivider2 = styled.div`
  width: 1px;
  height: 32px;
  background: ${THEME.border};
`;

const BizCatList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
`;

const EmptyBiz = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  border: 1.5px dashed ${THEME.border};
  border-radius: 12px;
  cursor: pointer;
  width: 100%;
  &:active { background: ${THEME.background}; }
`;

const EmptyBizText = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.muted};
`;

const BizCatChip = styled.div`
  padding: 8px 14px;
  border-radius: 10px;
  background: ${THEME.background};
  font-size: 13px;
  font-weight: 700;
  color: ${THEME.text};
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const SubStatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
`;

const SubBadge = styled.span`
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 700;
  background: ${({ $active }) => ($active ? "#DBEAFE" : THEME.background)};
  color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
`;

const SubText = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${THEME.muted};
`;

const CashGrid = styled.div`
  display: flex;
  align-items: center;
  margin-top: 16px;
`;

const CashItem = styled.div`
  flex: 1;
  text-align: center;
`;

const CashAmount = styled.div`
  font-size: 18px;
  font-weight: 800;
  color: ${THEME.text};
`;

const CashLabel = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const CashDivider = styled.div`
  width: 1px;
  height: 32px;
  background: ${THEME.border};
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid ${THEME.border};
  margin-top: ${({ $first }) => ($first ? "16px" : "0")};
`;

const ToggleLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
`;

const ToggleSwitch = styled.div`
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $on }) => ($on ? THEME.primary : THEME.border)};
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${({ $on }) => ($on ? "22px" : "2px")};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
`;

const MobileConfigpage = () => {
  const navigate = useNavigate();
  const { user, dispatch } = useContext(UserContext);
  const [proCategories] = useAtom(proCategoriesAtom);
  const [showEditModal, setShowEditModal] = useState(false);

  const nickname = user?.USERINFO?.nickname || "사용자";
  const userimg = user?.USERINFO?.userimg || "";
  const [editNickname, setEditNickname] = useState("");

  const handleOpenEdit = () => {
    setEditNickname(nickname);
    setShowEditModal(true);
  };

  const handleSaveProfile = () => {
    const trimmed = editNickname.trim();
    if (!trimmed) return;
    dispatch({ USERINFO: { nickname: trimmed } });
    setShowEditModal(false);
  };

  const handleLogout = async () => {
    await signOutUser();
    dispatch(null);
    navigate("/MobileLogin", { replace: true });
  };

  return (
    <MyPageLayout name="마이페이지">
      {/* 프로필 */}
      <ProfileCard onClick={handleOpenEdit}>
        <ProfileImgWrap>
          {userimg ? (
            <ProfileImg src={userimg} alt="profile" />
          ) : (
            <ProfilePlaceholder>
              <IoPersonCircleOutline size={60} color={THEME.border} />
            </ProfilePlaceholder>
          )}
        </ProfileImgWrap>
        <ProfileInfo>
          <ProfileName>{nickname}</ProfileName>
          <ProfileSub>
            홈프로 전문가
          </ProfileSub>
        </ProfileInfo>
        <ProfileEditLabel>편집</ProfileEditLabel>
      </ProfileCard>

      {/* 프로필 편집 모달 */}
      {showEditModal && (
        <ModalOverlay onClick={() => setShowEditModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>프로필 편집</ModalTitle>
              <ModalCloseBtn onClick={() => setShowEditModal(false)}>
                <IoClose size={24} color={THEME.text} />
              </ModalCloseBtn>
            </ModalHeader>
            <ModalImgWrap>
              <ModalImgBtn>
                {userimg ? (
                  <ProfileImg src={userimg} alt="profile" style={{ width: 80, height: 80 }} />
                ) : (
                  <ProfilePlaceholder style={{ width: 80, height: 80 }}>
                    <IoPersonCircleOutline size={80} color={THEME.border} />
                  </ProfilePlaceholder>
                )}
                <CameraBadge>
                  <IoCameraOutline size={16} color="#fff" />
                </CameraBadge>
              </ModalImgBtn>
            </ModalImgWrap>
            <ModalInput
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value.slice(0, 12))}
              placeholder="대화명을 입력하세요"
              maxLength={12}
            />
            <ModalInputCount>{editNickname.length}/12</ModalInputCount>
            <ModalSaveBtn
              onClick={handleSaveProfile}
              disabled={!editNickname.trim()}
            >
              저장
            </ModalSaveBtn>
          </ModalContent>
        </ModalOverlay>
      )}

      {/* 기본 계정정보 */}
      <ContentCard>
        <CardHeader>
          <div><CardTitle>기본 계정정보</CardTitle></div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
        <InfoGrid>
          <InfoItem><InfoLabel2>이름</InfoLabel2><InfoValue2>{nickname}</InfoValue2></InfoItem>
          <InfoItem><InfoLabel2>전화번호</InfoLabel2><InfoValue2>{user?.USERINFO?.phone || "미등록"}</InfoValue2></InfoItem>
          <InfoItem><InfoLabel2>이메일</InfoLabel2><InfoValue2>{user?.USERINFO?.email || "미등록"}</InfoValue2></InfoItem>
        </InfoGrid>
      </ContentCard>

      {/* 추천인 코드 */}
      <ContentCard>
        <CardHeader>
          <div>
            <CardTitle>추천인 코드</CardTitle>
            <CardDesc>친구를 초대하고 캐시를 받으세요</CardDesc>
          </div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
        <ReferralBox>
          <ReferralCode>{user?.uid?.slice(0, 8)?.toUpperCase() || "HOMEPRO"}</ReferralCode>
          <CopyBtn onClick={() => { navigator.clipboard?.writeText(user?.uid?.slice(0, 8)?.toUpperCase() || "HOMEPRO"); alert("복사되었습니다!"); }}>복사</CopyBtn>
        </ReferralBox>
        <ReferralStat>
          <ReferralStatItem><ReferralNum>0</ReferralNum><ReferralLabel>초대한 친구</ReferralLabel></ReferralStatItem>
          <StatDivider2 />
          <ReferralStatItem><ReferralNum>0원</ReferralNum><ReferralLabel>받은 캐시</ReferralLabel></ReferralStatItem>
        </ReferralStat>
      </ContentCard>

      {/* 업무분야 */}
      <ContentCard>
        <CardHeader>
          <div>
            <CardTitle>업무분야 관리</CardTitle>
            <CardDesc>등록된 전문 분야를 확인하세요</CardDesc>
          </div>
          <ArrowBtn onClick={() => navigate("/pro/categories")}><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
        <BizCatList>
          {proCategories.length === 0 ? (
            <EmptyBiz onClick={() => navigate("/pro/register-category")}>
              <IoAddOutline size={20} color={THEME.primary} />
              <EmptyBizText>업무분야를 등록해보세요</EmptyBizText>
            </EmptyBiz>
          ) : (
            proCategories.map((catId) => {
              const cat = CATEGORIES.find((c) => c.id === catId);
              if (!cat) return null;
              return (
                <BizCatChip key={catId} onClick={() => navigate(`/pro/category-detail/${catId}`)}>
                  {cat.icon} {cat.shortName}
                </BizCatChip>
              );
            })
          )}
        </BizCatList>
      </ContentCard>

      {/* 구독 관리 */}
      <ContentCard>
        <CardHeader>
          <div><CardTitle>구독 관리</CardTitle></div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
        <SubStatusRow>
          <SubBadge $active={false}>무료 체험중</SubBadge>
          <SubText>구독하면 모든 오더를 받을 수 있어요</SubText>
        </SubStatusRow>
      </ContentCard>

      {/* 캐시 / 정산 */}
      <ContentCard>
        <CardHeader>
          <div>
            <CardTitle>캐시 / 정산</CardTitle>
            <CardDesc>수익 현황을 한눈에 확인하세요</CardDesc>
          </div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
        <CashGrid>
          <CashItem>
            <CashAmount>0원</CashAmount>
            <CashLabel>보유 캐시</CashLabel>
          </CashItem>
          <CashDivider />
          <CashItem>
            <CashAmount>0원</CashAmount>
            <CashLabel>이번달 수익</CashLabel>
          </CashItem>
          <CashDivider />
          <CashItem>
            <CashAmount>0원</CashAmount>
            <CashLabel>정산 대기</CashLabel>
          </CashItem>
        </CashGrid>
      </ContentCard>

      {/* 알림 설정 */}
      <ContentCard>
        <CardHeader>
          <div><CardTitle>알림 설정</CardTitle></div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
        <ToggleRow>
          <ToggleLabel>새 오더 알림</ToggleLabel>
          <ToggleSwitch $on={true} />
        </ToggleRow>
        <ToggleRow>
          <ToggleLabel>채팅 알림</ToggleLabel>
          <ToggleSwitch $on={true} />
        </ToggleRow>
        <ToggleRow style={{ borderBottom: "none" }}>
          <ToggleLabel>마케팅 알림</ToggleLabel>
          <ToggleSwitch $on={false} />
        </ToggleRow>
      </ContentCard>

      {/* 홈프로캘린더 */}
      {(
        <CalendarCard>
          <CalendarRow onClick={() => navigate("/calendar")} style={{ cursor: "pointer" }}>
            <CalendarLeft>
              <CalIconWrap>
                <IoCalendarOutline size={28} color={THEME.primary} />
              </CalIconWrap>
              <CalendarText>
                <CalTitle>홈프로캘린더</CalTitle>
                <CalDesc>일정을 등록해 보세요!</CalDesc>
              </CalendarText>
            </CalendarLeft>
            <AddBtn onClick={(e) => { e.stopPropagation(); navigate("/calendar/create"); }}>
              <IoAddOutline size={22} color={THEME.muted} />
            </AddBtn>
          </CalendarRow>
        </CalendarCard>
      )}

      {/* 홈프로 커뮤니티 */}
      {(
        <CommunityCard>
          <CardHeader>
            <div>
              <CardTitle>홈프로 커뮤니티</CardTitle>
              <CardDesc>고객과 소통하고, 홈프로들과 경험을 나눠보세요</CardDesc>
            </div>
            <ArrowBtn onClick={() => {}}>
              <IoChevronForward size={22} color={THEME.muted} />
            </ArrowBtn>
          </CardHeader>
          <HScrollRow>
            <PostCard>
              <PostBadge>이벤트/공지</PostBadge>
              <PostTitle>홈프로 오픈 기념 이벤트!</PostTitle>
              <PostDesc>지금 가입하면 첫 오더 수수료 무료</PostDesc>
              <PostDate>2026.02.08</PostDate>
            </PostCard>
            <PostCard>
              <PostBadge>이벤트/공지</PostBadge>
              <PostTitle>추천인 보상 프로그램 안내</PostTitle>
              <PostDesc>친구를 초대하고 캐시를 받으세요</PostDesc>
              <PostDate>2026.02.08</PostDate>
            </PostCard>
            <PostCard>
              <PostBadge>팁/노하우</PostBadge>
              <PostTitle>프로필 완성도 높이는 법</PostTitle>
              <PostDesc>완성도가 높을수록 고객 매칭률 UP</PostDesc>
              <PostDate>2026.02.08</PostDate>
            </PostCard>
          </HScrollRow>
        </CommunityCard>
      )}

      {/* 홈프로 가이드 */}
      {(
        <GuideSection>
          <CardTitle>홈프로 가이드</CardTitle>
          <CardDesc>'이대로만 따라해요!' 홈프로를 위한 안내서</CardDesc>
          <HScrollRow>
            <GuideCard $bg="#FEF3C7">
              <GuideText>첫 견적 보내기,{"\n"}이렇게 하면 쉬워요</GuideText>
            </GuideCard>
            <GuideCard $bg="#EDE9FE">
              <GuideText>고객 리뷰를 늘리는{"\n"}가장 효과적인 방법</GuideText>
            </GuideCard>
            <GuideCard $bg="#DBEAFE">
              <GuideText>홈프로캐시 보상은{"\n"}언제 이루어지나요?</GuideText>
            </GuideCard>
            <GuideCard $bg="#D1FAE5">
              <GuideText>프로필 사진,{"\n"}이렇게 찍으세요</GuideText>
            </GuideCard>
          </HScrollRow>
        </GuideSection>
      )}

      {/* 고객지원 */}
      <ContentCard>
        <CardTitle>고객지원</CardTitle>
        <SupportList>
          <SupportItem onClick={() => navigate("/notice")}>
            <SupportLabel>공지사항</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
          <SupportItem onClick={() => navigate("/support")}>
            <SupportLabel>고객센터</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
          <SupportItem onClick={() => navigate("/legal/terms")}>
            <SupportLabel>이용약관</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
          <SupportItem onClick={() => navigate("/legal/privacy")}>
            <SupportLabel>개인정보처리방침</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
          <SupportItem onClick={() => navigate("/legal/location")} style={{ borderBottom: "none" }}>
            <SupportLabel>위치기반서비스 이용약관</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
        </SupportList>
      </ContentCard>

      <LogoutButton onClick={handleLogout}>로그아웃</LogoutButton>

      <BottomSpacer />
    </MyPageLayout>
  );
};

export default MobileConfigpage;
