/* eslint-disable */
// 공용 프로필 팝업 — 접수자/홈프로 이름·아바타 클릭 시 프로필(평점·등급·지역·소개 등) 표시
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { IoPersonCircleOutline, IoCloseOutline, IoStar } from "react-icons/io5";
import { THEME } from "../config/homeproConfig";
import { getUserProfileByUid } from "../service/UserProfileService";

const GRADE_LABEL = { rookie: "루키", bronze: "브론즈", silver: "실버", gold: "골드", diamond: "다이아", master: "마스터" };

// 미리 아는 정보(fallback)로 즉시 표시 + uid 있으면 상세 조회로 보강
const ProfilePopup = ({ uid, fallbackName, fallbackPhoto, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!uid);

  useEffect(() => {
    let alive = true;
    if (!uid) { setLoading(false); return; }
    getUserProfileByUid(uid)
      .then((p) => { if (alive) setProfile(p); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [uid]);

  const p = profile || {};
  const name = p.nickname || p.name || fallbackName || "사용자";
  const photo = p.profileImage || p.photoURL || fallbackPhoto || "";
  const company = p.companyName || p.bizName || "";
  const grade = p.grade;
  const rating = Number(p.rating || p.avgRating || 0);
  const reviewCount = Number(p.reviewCount || p.reviewsCount || 0);
  const region = p.region || (Array.isArray(p.regions) ? p.regions.join(", ") : p.regions) || p.address || "";
  const intro = p.introduction || p.intro || p.bio || p.description || "";
  const career = p.career || p.experience || "";

  return (
    <Overlay onClick={onClose}>
      <Box onClick={(e) => e.stopPropagation()}>
        <CloseBtn onClick={onClose}><IoCloseOutline size={22} /></CloseBtn>
        <Head>
          {photo ? <Avatar src={photo} alt={name} /> : <AvatarPh><IoPersonCircleOutline size={54} color={THEME.muted} /></AvatarPh>}
          <HeadInfo>
            <Name>{name}</Name>
            {company && <Company>{company}</Company>}
            <MetaRow>
              {grade && <GradeChip>{GRADE_LABEL[grade] || grade}</GradeChip>}
              {(rating > 0 || reviewCount > 0) && (
                <RatingWrap><IoStar size={13} color="#F5A623" /> {rating > 0 ? rating.toFixed(1) : "-"} <Rev>({reviewCount})</Rev></RatingWrap>
              )}
            </MetaRow>
          </HeadInfo>
        </Head>

        {loading ? (
          <Empty>불러오는 중...</Empty>
        ) : (
          <Body>
            {region && <Row><K>지역</K><V>{region}</V></Row>}
            {career && <Row><K>경력</K><V>{career}</V></Row>}
            {intro && <Row><K>소개</K><V>{intro}</V></Row>}
            {!region && !career && !intro && !grade && rating === 0 && (
              <Empty>등록된 상세 프로필 정보가 없습니다.</Empty>
            )}
          </Body>
        )}
      </Box>
    </Overlay>
  );
};

export default ProfilePopup;

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 1200;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
`;
const Box = styled.div`
  position: relative;
  background: #fff; border-radius: 16px;
  width: 100%; max-width: 340px;
  max-height: 76vh; overflow-y: auto;
  padding: 22px 20px 20px;
`;
const CloseBtn = styled.button`
  position: absolute; top: 12px; right: 12px;
  background: none; border: none; cursor: pointer; color: ${THEME.muted}; padding: 4px;
`;
const Head = styled.div`
  display: flex; align-items: center; gap: 14px;
  padding-bottom: 16px; border-bottom: 1px solid ${THEME.border};
`;
const Avatar = styled.img`
  width: 60px; height: 60px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
`;
const AvatarPh = styled.div`
  width: 60px; height: 60px; border-radius: 50%; background: ${THEME.background};
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
`;
const HeadInfo = styled.div` flex: 1; min-width: 0; `;
const Name = styled.div` font-size: 17px; font-weight: 700; color: ${THEME.text}; `;
const Company = styled.div` font-size: 13px; color: ${THEME.muted}; margin-top: 2px; `;
const MetaRow = styled.div` display: flex; align-items: center; gap: 8px; margin-top: 6px; `;
const GradeChip = styled.span`
  font-size: 12px; font-weight: 600; color: #fff; background: ${THEME.primary};
  padding: 2px 8px; border-radius: 6px;
`;
const RatingWrap = styled.span`
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 13px; font-weight: 600; color: ${THEME.text};
`;
const Rev = styled.span` color: ${THEME.muted}; font-weight: 400; `;
const Body = styled.div` padding-top: 4px; `;
const Row = styled.div` display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid ${THEME.border}; &:last-child { border-bottom: none; } `;
const K = styled.div` flex: 0 0 48px; font-size: 13px; font-weight: 600; color: ${THEME.textSecondary}; `;
const V = styled.div` flex: 1; font-size: 13.5px; color: ${THEME.text}; line-height: 1.55; word-break: break-word; white-space: pre-wrap; `;
const Empty = styled.div` padding: 24px 0; text-align: center; font-size: 13px; color: ${THEME.muted}; `;
