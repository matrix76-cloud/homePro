/* eslint-disable */
// 공용 프로필 팝업 — 접수자/홈프로 이름·아바타 클릭 시 프로필(평점·등급·지역·소개 등) 표시
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { IoPersonCircleOutline, IoCloseOutline, IoStar } from "react-icons/io5";
import { THEME } from "../config/homeproConfig";
import { getUserProfileByUid } from "../service/UserProfileService";
import { hasBusinessLicense, getCompletedOrderCount } from "../service/CertificateService";

const GRADE_LABEL = { rookie: "루키", bronze: "브론즈", silver: "실버", gold: "골드", diamond: "다이아", master: "마스터" };

// 미리 아는 정보(fallback)로 즉시 표시 + uid 있으면 상세 조회로 보강
const ProfilePopup = ({ uid, fallbackName, fallbackPhoto, onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!uid);
  // 신뢰요소 — 홈프로 누적 오더 완료 건수 (대표 지시 7/30)
  const [completedCount, setCompletedCount] = useState(null);

  useEffect(() => {
    let alive = true;
    if (!uid) { setLoading(false); return; }
    getUserProfileByUid(uid)
      .then((p) => {
        if (!alive) return;
        setProfile(p);
        return getCompletedOrderCount(p?.uid || uid).then((n) => { if (alive) setCompletedCount(n); });
      })
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
  // region 은 문자열 / {sido,gu} 객체 / 배열이 혼재 — 객체를 그대로 렌더하면 크래시하므로 문자열로 정규화
  const toRegionText = (v) => {
    if (!v) return "";
    if (typeof v === "string") return v;
    if (Array.isArray(v)) return v.map(toRegionText).filter(Boolean).join(", ");
    if (typeof v === "object") return `${v.sido || ""} ${v.gu || v.gugun || ""}`.trim();
    return String(v);
  };
  const region = toRegionText(p.region) || toRegionText(p.regions) || toRegionText(p.address);
  const intro = p.introduction || p.intro || p.bio || p.description || "";
  const career = p.career || p.experience || "";
  const licenseVerified = hasBusinessLicense(p);

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
            {/* 신뢰요소 한 줄 — 사업자등록증 인증 여부 + 누적 완료 건수 */}
            <TrustLine>
              <TrustCert $verified={licenseVerified}>
                {licenseVerified ? "사업자등록증 인증" : "사업자등록증 미등록"}
              </TrustCert>
              <TrustDot>·</TrustDot>
              <TrustCount>
                {completedCount === null ? "완료 실적 집계 중" : `누적 오더 완료 ${completedCount}건`}
              </TrustCount>
            </TrustLine>
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
const Name = styled.div` font-size: 19px; font-weight: 700; color: ${THEME.text}; `;
const Company = styled.div` font-size: 15px; color: ${THEME.muted}; margin-top: 2px; `;
const MetaRow = styled.div` display: flex; align-items: center; gap: 8px; margin-top: 6px; `;
const GradeChip = styled.span`
  font-size: 14px; font-weight: 600; color: #fff; background: ${THEME.primary};
  padding: 2px 8px; border-radius: 6px;
`;
const RatingWrap = styled.span`
  display: inline-flex; align-items: center; gap: 3px;
  font-size: 15px; font-weight: 600; color: ${THEME.text};
`;
const Rev = styled.span` color: ${THEME.muted}; font-weight: 400; `;
const Body = styled.div` padding-top: 4px; `;
const TrustLine = styled.div`
  display: flex; align-items: center; flex-wrap: wrap; gap: 6px;
  padding: 10px 0; border-bottom: 1px solid ${THEME.border};
`;
const TrustCert = styled.span`
  font-size: 14px;
  font-weight: ${({ $verified }) => ($verified ? 700 : 400)};
  color: ${({ $verified }) => ($verified ? THEME.primaryDark : THEME.muted)};
`;
const TrustDot = styled.span` font-size: 14px; color: ${THEME.muted}; `;
const TrustCount = styled.span` font-size: 14px; font-weight: 600; color: ${THEME.textSecondary}; `;
const Row = styled.div` display: flex; gap: 12px; padding: 10px 0; border-bottom: 1px solid ${THEME.border}; &:last-child { border-bottom: none; } `;
const K = styled.div` flex: 0 0 48px; font-size: 15px; font-weight: 600; color: ${THEME.textSecondary}; `;
const V = styled.div` flex: 1; font-size: 13.5px; color: ${THEME.text}; line-height: 1.55; word-break: break-word; white-space: pre-wrap; `;
const Empty = styled.div` padding: 24px 0; text-align: center; font-size: 15px; color: ${THEME.muted}; `;
