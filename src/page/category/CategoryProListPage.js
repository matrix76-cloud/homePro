/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import {
  IoLocationOutline,
  IoStar,
  IoImageOutline,
  IoPersonCircleOutline,
  IoChevronForward,
} from "react-icons/io5";
import { CATEGORY_ICONS } from "../../utility/CategoryIcons";
import { getProsByCategory } from "../../service/ProService";
import { UserContext } from "../../context/User";
import { parseDisplayName } from "../../utility/regionUtils";

/* ─── 플레이스홀더 색상 ─── */
const PH_COLORS = [
  `linear-gradient(135deg, ${THEME.purpleLight} 0%, ${THEME.primaryLight} 100%)`,
  "linear-gradient(135deg, #e7f0fd 0%, #C4B5FD 100%)",
  "linear-gradient(135deg, #D1FAE5 0%, #6EE7B7 100%)",
  "linear-gradient(135deg, #FEF3C7 0%, #FCD34D 100%)",
  "linear-gradient(135deg, #FCE7F3 0%, #F9A8D4 100%)",
  "linear-gradient(135deg, #E0E7FF 0%, #A5B4FC 100%)",
];

/* ─── 정렬 옵션 ─── */
const SORT_OPTIONS = [
  { key: "career", label: "경력순" },
];

const CategoryProListPage = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [sort, setSort] = useState("rating");
  const [firestorePros, setFirestorePros] = useState([]);
  const [loadingPros, setLoadingPros] = useState(true);

  const category = CATEGORIES.find((c) => c.id === categoryId);
  const catName = category ? category.name : "카테고리";

  // 사용자 선택 지역으로 Firestore 프로 조회
  const currentRegion = parseDisplayName(user?.USERINFO?.address_name);

  useEffect(() => {
    if (!categoryId) return;
    setLoadingPros(true);
    getProsByCategory(categoryId, currentRegion)
      .then((pros) => setFirestorePros(pros))
      .catch(() => setFirestorePros([]))
      .finally(() => setLoadingPros(false));
  }, [categoryId, currentRegion.sido, currentRegion.gu]);

  // Firestore 프로 데이터만 사용
  const services = firestorePros.map((p) => ({
    id: p.id,
    uid: p.uid,
    proName: p.detail?.intro || p.uid,
    proImg: null,
    title: p.detail?.intro || category?.shortName || "",
    description: `경력 ${p.detail?.experience || "?"}년 · ${p.detail?.subcategories?.join(", ") || ""}`,
    photoCount: p.photoUrls?.length || 0,
    location: p.region ? `${p.region.sido} ${p.region.gu || ""}`.trim() : "",
    rating: 0,
    reviews: 0,
    career: `${p.detail?.experience || "?"}년`,
    price: "",
    tags: p.detail?.subcategories?.slice(0, 3) || [],
  }));

  const handleCardClick = (service) => {
    // 서비스 상세 페이지로 이동 (서비스 데이터를 state로 전달)
    navigate(`/service/${categoryId}/${service.id}`, { state: { service, category } });
  };

  const headerRequestBtn = (
    <HeaderReqBtn onClick={() => navigate(`/order/create/${categoryId}`)}>
      요청하기
    </HeaderReqBtn>
  );

  return (
    <SimpleBackLayout NAME={catName} hideFooter rightAction={headerRequestBtn}>
      <PageWrap>
        {/* 카테고리 헤더 */}
        {category && (
          <CatHeader>
            <CatIconWrap>{(() => { const Icon = CATEGORY_ICONS[category.id]; return Icon ? <Icon /> : category.shortName.charAt(0); })()}</CatIconWrap>
            <CatInfo>
              <CatName>{category.name}</CatName>
              <CatDesc>{category.description}</CatDesc>
            </CatInfo>
          </CatHeader>
        )}

        {/* 정렬 + 건수 */}
        <FilterBar>
          <ServiceCount>전문가 {services.length}명</ServiceCount>
          <SortRow>
            {SORT_OPTIONS.map((opt) => (
              <SortBtn key={opt.key} $active={sort === opt.key} onClick={() => setSort(opt.key)}>
                {opt.label}
              </SortBtn>
            ))}
          </SortRow>
        </FilterBar>

        {/* 서비스 카드 리스트 */}
        {services.length > 0 ? (
          services.map((svc, idx) => (
            <ServiceCard key={svc.id} onClick={() => handleCardClick(svc)}>
              {/* 상단 전체 사진 영역 */}
              <PhotoArea $bg={PH_COLORS[idx % PH_COLORS.length]}>
                <PhotoPlaceholder>
                  <IoImageOutline size={40} color="rgba(255,255,255,0.5)" />
                  {svc.photoCount > 0 && (
                    <PhotoBadge>사진 {svc.photoCount}장</PhotoBadge>
                  )}
                </PhotoPlaceholder>
              </PhotoArea>

              {/* 본문 */}
              <CardBody>
                {/* 전문가 정보 */}
                <ProRow>
                  <ProAvatar>
                    <IoPersonCircleOutline size={32} color={THEME.muted} />
                  </ProAvatar>
                  <ProInfo>
                    <ProName>{svc.proName}</ProName>
                    <ProMeta>경력 {svc.career} · {svc.location}</ProMeta>
                  </ProInfo>
                  <RatingWrap>
                    <IoStar size={14} color={THEME.accent} />
                    <RatingText>{svc.rating}</RatingText>
                    <ReviewCount>({svc.reviews})</ReviewCount>
                  </RatingWrap>
                </ProRow>

                {/* 서비스 제목 */}
                <ServiceTitle>{svc.title}</ServiceTitle>
                <ServiceDesc>{svc.description}</ServiceDesc>

                {/* 태그 */}
                <TagRow>
                  {svc.tags.map((tag) => (
                    <Tag key={tag}>{tag}</Tag>
                  ))}
                </TagRow>

                {/* 하단 */}
                <BottomRow>
                  <PriceText>{svc.price}</PriceText>
                  <DetailBtn>
                    상세보기 <IoChevronForward size={14} />
                  </DetailBtn>
                </BottomRow>
              </CardBody>
            </ServiceCard>
          ))
        ) : (
          <EmptyWrap>
            <EmptyIcon>{category?.shortName?.charAt(0) || "?"}</EmptyIcon>
            <EmptyTitle>아직 등록된 전문가가 없어요</EmptyTitle>
            <EmptyDesc>곧 전문가들이 등록할 예정이에요!</EmptyDesc>
          </EmptyWrap>
        )}

        <BottomSpacer />
      </PageWrap>
    </SimpleBackLayout>
  );
};

export default CategoryProListPage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
  background: ${THEME.background};
  min-height: 100%;
  padding: 0 0 12px;
`;

const CatHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 20px 16px;
  background: ${THEME.surface};
`;

const CatIconWrap = styled.div`
  width: 52px;
  height: 52px;
  border-radius: 12px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 48px; height: 48px; }
`;

const CatInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CatName = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const CatDesc = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
  line-height: 1.4;
`;

/* 필터 바 */
const FilterBar = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  background: ${THEME.surface};
  border-top: 1px solid ${THEME.border};
  border-bottom: 1px solid ${THEME.border};
`;

const ServiceCount = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
`;

const SortRow = styled.div`
  display: flex;
  gap: 4px;
`;

const SortBtn = styled.button`
  padding: 5px 10px;
  border-radius: 20px;
  border: none;
  font-size: 12px;
  font-weight: 400;
  font-family: inherit;
  background: ${({ $active }) => ($active ? THEME.primary : "transparent")};
  color: ${({ $active }) => ($active ? "#fff" : THEME.muted)};
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

/* 서비스 카드 */
const ServiceCard = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  margin: 12px 12px;
  overflow: hidden;
  cursor: pointer;
  box-shadow: ${THEME.cardShadow};
  &:active { transform: scale(0.99); }
  transition: transform 0.1s;
`;

/* 사진 영역 */
const PhotoArea = styled.div`
  width: 100%;
  height: 180px;
  background: ${({ $bg }) => $bg};
  position: relative;
`;

const PhotoPlaceholder = styled.div`
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
`;

const PhotoBadge = styled.div`
  padding: 4px 10px;
  border-radius: 20px;
  background: rgba(255,255,255,0.7);
  font-size: 12px;
  font-weight: 400;
  color: rgba(0,0,0,0.5);
`;

/* 본문 */
const CardBody = styled.div`
  padding: 20px;
`;

const ProRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 12px;
`;

const ProAvatar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
`;

const ProInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProName = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
`;

const ProMeta = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 1px;
`;

const RatingWrap = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  flex-shrink: 0;
`;

const RatingText = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.text};
`;

const ReviewCount = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const ServiceTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  line-height: 1.4;
`;

const ServiceDesc = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 6px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const TagRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
`;

const Tag = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 400;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const BottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid ${THEME.border};
`;

const PriceText = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.primary};
`;

const DetailBtn = styled.div`
  display: flex;
  align-items: center;
  gap: 2px;
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

/* 빈 상태 */
const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px 40px;
`;

const EmptyIcon = styled.div`
  font-size: 56px;
  margin-bottom: 20px;
`;

const EmptyTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const EmptyDesc = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 8px;
`;

/* 헤더 요청 버튼 */
const HeaderReqBtn = styled.button`
  padding: 7px 14px;
  border-radius: 10px;
  border: none;
  background: ${THEME.primary};
  color: #fff;
  font-size: 13px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
`;

const BottomSpacer = styled.div`
  height: 24px;
`;
