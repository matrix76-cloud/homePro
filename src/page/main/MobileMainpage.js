/* eslint-disable */
import React, { useContext, useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAtom } from "jotai";
import { UserContext } from "../../context/User";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import { getProCategoryIds } from "../../service/ProService";
import HomeLayout from "../../screen/Layout/Layout/HomeLayout";
import { useForceReloadIfVersionChanged } from "../../hooks/useForceReloadIfVersionChanged";
import { IoPeopleOutline, IoSparklesOutline, IoGiftOutline, IoFilterOutline, IoCheckmarkCircle, IoCloseOutline } from "react-icons/io5";
import { subscribeToAllOrders, formatOrderTime } from "../../service/OrderService";
import { MyOrdersContent } from "../order/MyOrdersPage";
import { AIEstimateContent } from "../order/AIEstimatePage";
import { OrderCreateContent } from "../order/OrderCreatePage";

/* ─── 오더 상태 ─── */
const STATUS_TABS = ["접수", "지원", "배차", "대기", "취소", "완료"];
const STATUS_STYLE = {
  "접수": { bg: THEME.purpleLight, color: THEME.purple },
  "지원": { bg: "#DBEAFE", color: THEME.primary },
  "배차": { bg: "#FEF3C7", color: "#B45309" },
  "대기": { bg: "#FFF7ED", color: "#C2410C" },
  "취소": { bg: "#FEE2E2", color: THEME.danger },
  "완료": { bg: "#D1FAE5", color: THEME.success },
};

/* ─── 상단 액션 탭 ─── */
const ACTION_TABS = [
  { key: "all_orders", label: "전체오더", icon: null },
  { key: "my_orders", label: "나의오더", icon: null },
  { key: "worker", label: "인력호출", icon: IoPeopleOutline },
  { key: "ai", label: "AI견적", icon: IoSparklesOutline },
  { key: "invite", label: "초대코드", icon: IoGiftOutline },
];

/* ─── 거리 필터 옵션 ─── */
const DISTANCE_OPTIONS = ["전체", "당일", "10km", "20km", "30km", "50km", "100km"];

/* ================================================================
   사용자 모드 메인
   ================================================================ */
const UserMain = ({ navigate, nickname }) => (
  <PageWrap>
    <Card>
      <Greeting>{nickname}, 안녕하세요!</Greeting>
      <GreetingSub>어떤 서비스가 필요하세요?</GreetingSub>
      <SearchBar onClick={() => navigate("/order/create")}>
        <IoSearchOutline size={18} color={THEME.muted} />
        <SearchPlaceholder>필요한 서비스를 검색하세요</SearchPlaceholder>
      </SearchBar>
    </Card>

    <Card>
      <CardTitle>내 요청 현황</CardTitle>
      <CardDesc>등록한 오더의 진행 상태를 확인하세요</CardDesc>
      <StatRow>
        <StatItem><StatNum>0</StatNum><StatLabel>진행중</StatLabel></StatItem>
        <StatDivider />
        <StatItem><StatNum>0</StatNum><StatLabel>견적 도착</StatLabel></StatItem>
        <StatDivider />
        <StatItem><StatNum>0</StatNum><StatLabel>완료</StatLabel></StatItem>
      </StatRow>
    </Card>

    <Card>
      <CardTitle>카테고리</CardTitle>
      <CardDesc>필요한 서비스를 선택하세요</CardDesc>
      <CategoryGrid>
        {CATEGORIES.map((cat) => (
          <CategoryItem key={cat.id} onClick={() => navigate(`/category/${cat.id}`)}>
            <CatIcon>{cat.shortName.charAt(0)}</CatIcon>
            <CatName>{cat.shortName}</CatName>
          </CategoryItem>
        ))}
      </CategoryGrid>
    </Card>

    <Card>
      <CardTitle>홈프로 이용방법</CardTitle>
      <CardDesc>처음이세요? 쉽게 알려드릴게요</CardDesc>
      <StepList>
        {[
          { n: 1, t: "서비스 요청", d: "카테고리를 선택하고 요청서를 작성하세요" },
          { n: 2, t: "견적 비교", d: "전문가들의 견적을 비교하고 선택하세요" },
          { n: 3, t: "서비스 진행", d: "선택한 전문가와 일정을 조율하세요" },
          { n: 4, t: "리뷰 작성", d: "서비스 완료 후 리뷰를 남겨주세요" },
        ].map((s) => (
          <StepItem key={s.n}>
            <StepNum>{s.n}</StepNum>
            <StepText><StepTitle>{s.t}</StepTitle><StepDesc>{s.d}</StepDesc></StepText>
          </StepItem>
        ))}
      </StepList>
    </Card>
    <BottomSpacer />
  </PageWrap>
);

/* ================================================================
   전문가 모드 메인 — 기획안 구조
   ================================================================ */
const ProMain = ({ navigate, nickname, proCategories }) => {
  const [activeTab, setActiveTab] = useState("all_orders");
  const [activeStatusTab, setActiveStatusTab] = useState("접수");
  const [activeCatFilters, setActiveCatFilters] = useState([]);
  const [activeDistFilters, setActiveDistFilters] = useState(["전체"]);
  const [showCatSheet, setShowCatSheet] = useState(false);
  const [rawOrders, setRawOrders] = useState([]);

  // Firestore 실시간 구독
  useEffect(() => {
    const unsub = subscribeToAllOrders((orders) => setRawOrders(orders));
    return () => unsub();
  }, []);

  // proCategories 필터 적용 + 카테고리 메타 부착
  const allOrders = useMemo(() => {
    return rawOrders
      .filter((o) => proCategories.length === 0 || proCategories.includes(o.categoryId))
      .map((o) => {
        const cat = CATEGORIES.find((c) => c.id === o.categoryId);
        return { ...o, categoryName: cat?.shortName, categoryIcon: cat?.icon };
      });
  }, [rawOrders, proCategories]);

  // 상태 + 카테고리 필터 적용
  const filteredOrders = allOrders.filter((o) => {
    const statusMatch = o.orderStatus === activeStatusTab;
    const catMatch = activeCatFilters.length === 0 || activeCatFilters.includes(o.categoryId);
    return statusMatch && catMatch;
  });

  // proCategories 설정이 있으면 해당 카테고리만, 없으면 전체 카테고리 표시
  const filterCats = useMemo(() => {
    return proCategories.length > 0
      ? CATEGORIES.filter((c) => proCategories.includes(c.id))
      : CATEGORIES;
  }, [proCategories]);

  // 상태별 카운트
  const statusCounts = useMemo(() => {
    const counts = {};
    STATUS_TABS.forEach((s) => { counts[s] = 0; });
    allOrders.forEach((o) => {
      if (counts[o.orderStatus] !== undefined) counts[o.orderStatus]++;
    });
    return counts;
  }, [allOrders]);

  return (
    <PageWrap>
      {/* ── 상단 액션 탭 바 ── */}
      <ActionBar>
        {ACTION_TABS.map((tab) => (
          <ActionTab key={tab.key} $active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
            <ActionLabel $active={activeTab === tab.key}>{tab.label}</ActionLabel>
          </ActionTab>
        ))}
      </ActionBar>

      {/* ══════ 전체오더 탭 ══════ */}
      {activeTab === "all_orders" && (
        <>
          <FilterRow>
            {DISTANCE_OPTIONS.map((d) => {
              const isActive = activeDistFilters.includes(d);
              const handleClick = () => {
                if (d === "전체") {
                  setActiveDistFilters(["전체"]);
                } else {
                  const without = activeDistFilters.filter((v) => v !== "전체");
                  const next = isActive ? without.filter((v) => v !== d) : [...without, d];
                  setActiveDistFilters(next.length === 0 ? ["전체"] : next);
                }
              };
              return (
                <FilterChip key={d} $active={isActive} onClick={handleClick}>
                  {d}
                </FilterChip>
              );
            })}
          </FilterRow>

          <CatFilterRow>
            {activeCatFilters.slice(0, 2).map((catId) => {
              const c = filterCats.find((fc) => fc.id === catId);
              if (!c) return null;
              return (
                <CatChip key={catId} onClick={() => setActiveCatFilters((prev) => prev.filter((v) => v !== catId))}>
                  {c.shortName} <IoCloseOutline size={13} />
                </CatChip>
              );
            })}
            {activeCatFilters.length > 2 && (
              <PlusBadge onClick={() => setShowCatSheet(true)}>+{activeCatFilters.length - 2}</PlusBadge>
            )}
            <CatFilterBtn $active={activeCatFilters.length > 0} onClick={() => setShowCatSheet(true)}>
              <IoFilterOutline size={14} />
              카테고리
            </CatFilterBtn>
          </CatFilterRow>

          <StatusTabRow>
            {STATUS_TABS.map((tab) => (
              <StatusTab key={tab} $active={activeStatusTab === tab} onClick={() => setActiveStatusTab(tab)}>
                {tab}
                <StatusCount $active={activeStatusTab === tab}>{statusCounts[tab] || 0}</StatusCount>
              </StatusTab>
            ))}
          </StatusTabRow>

          {filteredOrders.length === 0 ? (
            <EmptyWrap>
              <EmptyText>{activeStatusTab} 상태의 오더가 없습니다</EmptyText>
              <EmptySubText>새로운 요청이 들어오면 알려드릴게요!</EmptySubText>
            </EmptyWrap>
          ) : (
            filteredOrders.map((order) => {
              const cat = CATEGORIES.find((c) => c.id === order.categoryId);
              const timeLabel = formatOrderTime(order.createdAt);
              return (
                <OrderCard key={order.id} onClick={() => navigate(`/order/detail/${order.id}`, { state: { order, category: cat } })}>
                  <OrderRow>
                    <DateCell>{timeLabel}</DateCell>
                    <CatCell>{order.categoryName}</CatCell>
                    <SubCell>{order.subcategory}<MatchTag>[{order.matchType}]</MatchTag></SubCell>
                  </OrderRow>
                  <OrderRow2>
                    <LocationCell>{order.location}</LocationCell>
                    <PriceCell>{order.price}</PriceCell>
                  </OrderRow2>
                </OrderCard>
              );
            })
          )}
        </>
      )}

      {/* ══════ 나의오더 탭 ══════ */}
      {activeTab === "my_orders" && <MyOrdersContent />}

      {/* ══════ 인력호출 탭 ══════ */}
      {activeTab === "worker" && <OrderCreateContent />}

      {/* ══════ AI견적 탭 ══════ */}
      {activeTab === "ai" && <AIEstimateContent />}

      {/* ══════ 초대코드 탭 ══════ */}
      {activeTab === "invite" && (
        <TabPlaceholder>
          <TabPlaceholderTitle>초대코드</TabPlaceholderTitle>
          <TabPlaceholderDesc>친구를 초대하고 혜택을 받으세요</TabPlaceholderDesc>
          <TabPlaceholderBtn>초대코드 복사</TabPlaceholderBtn>
        </TabPlaceholder>
      )}

      <BottomSpacer />

      {/* 카테고리 필터 바텀시트 */}
      {showCatSheet && (
        <SheetOverlay onClick={() => setShowCatSheet(false)}>
          <SheetContent onClick={(e) => e.stopPropagation()}>
            <SheetHandle />
            <SheetHeader>
              <SheetTitle>카테고리 선택</SheetTitle>
              <SheetCloseBtn onClick={() => setShowCatSheet(false)}>
                <IoCloseOutline size={24} color={THEME.text} />
              </SheetCloseBtn>
            </SheetHeader>
            <SheetList>
              {filterCats.map((cat) => {
                const checked = activeCatFilters.includes(cat.id);
                const toggle = () => {
                  setActiveCatFilters((prev) =>
                    checked ? prev.filter((v) => v !== cat.id) : [...prev, cat.id]
                  );
                };
                return (
                  <SheetItem key={cat.id} onClick={toggle}>
                    <SheetItemName>{cat.shortName}</SheetItemName>
                    {checked && <IoCheckmarkCircle size={22} color={THEME.primary} />}
                  </SheetItem>
                );
              })}
            </SheetList>
            <SheetActions>
              <SheetResetBtn onClick={() => setActiveCatFilters([])}>초기화</SheetResetBtn>
              <SheetConfirmBtn onClick={() => setShowCatSheet(false)}>확인</SheetConfirmBtn>
            </SheetActions>
          </SheetContent>
        </SheetOverlay>
      )}
    </PageWrap>
  );
};

/* ================================================================
   메인 페이지
   ================================================================ */
const MobileMainpage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [proCategories, setProCategories] = useAtom(proCategoriesAtom);
  const nickname = user?.USERINFO?.nickname || "고수님";
  const { showUpdateBanner, versionName } = useForceReloadIfVersionChanged();
  const uid = user?.USERS_ID;

  useEffect(() => {
    if (!uid) return;
    getProCategoryIds(uid).then(setProCategories).catch(console.error);
  }, [uid]);

  return (
    <>
      {showUpdateBanner && (
        <UpdateToast>
          <UpdateText>{versionName ? `v${versionName}` : ""} 업데이트 중... 곧 새로고침돼요!</UpdateText>
        </UpdateToast>
      )}
      <HomeLayout>
        <ProMain navigate={navigate} nickname={nickname} proCategories={proCategories} />
      </HomeLayout>
    </>
  );
};

export default MobileMainpage;

/* ===================== 업데이트 배너 ===================== */

const UpdateToast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 16px;
  right: 16px;
  background: ${THEME.text};
  padding: 14px 20px;
  border-radius: 4px;
  z-index: 9999;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  text-align: left;
  animation: slideUp 0.3s ease-out;
  @keyframes slideUp {
    from { transform: translateY(20px); opacity: 0; }
    to { transform: translateY(0); opacity: 1; }
  }
`;

const UpdateText = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: #fff;
`;

/* ===================== 공통 styles ===================== */

const PageWrap = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  background: ${THEME.background};
  min-height: 100%;
`;

const Card = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  margin: 6px 16px;
  box-shadow: ${THEME.cardShadow};
`;

const CardTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const CardDesc = styled.div`
  font-size: 14px;
  color: ${THEME.muted};
  margin-top: 4px;
  font-weight: 400;
`;

const Greeting = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const GreetingSub = styled.div`
  font-size: 14px;
  color: ${THEME.muted};
  margin-top: 4px;
  font-weight: 400;
`;

const SearchBar = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 14px 16px;
  background: ${THEME.background};
  border-radius: 12px;
  cursor: pointer;
  &:active { background: ${THEME.border}; }
`;

const SearchPlaceholder = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;

/* 사용자 모드 통계 */
const StatRow = styled.div`
  display: flex;
  align-items: center;
  margin-top: 20px;
  padding: 16px 0 4px;
`;

const StatItem = styled.div`
  flex: 1;
  text-align: center;
`;

const StatNum = styled.div`
  font-size: 22px;
  font-weight: 600;
  color: ${THEME.text};
`;

const StatLabel = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const StatDivider = styled.div`
  width: 1px;
  height: 32px;
  background: ${THEME.border};
`;

/* 사용자 모드 카테고리 */
const CategoryGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
  margin-top: 16px;
`;

const CategoryItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 14px 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const CatIcon = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.primary};
  width: 40px;
  height: 40px;
  border-radius: 4px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
`;

const CatName = styled.div`
  font-size: 12px;
  font-weight: 600;
  color: ${THEME.text};
  text-align: center;
  line-height: 1.3;
  word-break: keep-all;
`;

/* 사용자 모드 이용 가이드 */
const StepList = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 16px;
`;

const StepItem = styled.div`
  display: flex;
  align-items: flex-start;
  gap: 14px;
`;

const StepNum = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${THEME.primary};
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const StepText = styled.div`
  flex: 1;
`;

const StepTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
`;

const StepDesc = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 2px;
`;

const BottomSpacer = styled.div`
  height: 20px;
`;

/* ===================== 전문가 모드 styles ===================== */

/* 상단 액션 탭 바 */
const ActionBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  margin: 8px 12px;
  background: ${THEME.background};
  border-radius: 4px;
`;

const ActionTab = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 4px;
  border-radius: 4px;
  background: ${({ $active }) => $active ? THEME.primary : "transparent"};
  cursor: pointer;
  transition: background 0.15s;
  &:active { opacity: 0.7; }
`;

const ActionLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active }) => $active ? "#fff" : THEME.muted};
  white-space: nowrap;
`;

/* 필터 칩 행 */
const FilterRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 10px 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  background: ${THEME.surface};
  &::-webkit-scrollbar { display: none; }
`;

const TEAL = "#0D9488";
const TEAL_LIGHT = "#F0FDFA";

const CatFilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 10px 16px;
  background: ${THEME.surface};
  justify-content: flex-start;
`;

const CatFilterBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border-radius: 6px;
  margin-left: auto;
  border: 1.5px solid ${({ $active }) => $active ? TEAL : THEME.border};
  background: ${({ $active }) => $active ? TEAL_LIGHT : THEME.surface};
  color: ${({ $active }) => $active ? TEAL : THEME.textSecondary};
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  &:active { opacity: 0.8; }
`;

const CatChip = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  border-radius: 6px;
  border: 1.5px solid ${TEAL};
  background: ${TEAL};
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  &:active { opacity: 0.8; }
`;

const PlusBadge = styled.button`
  padding: 6px 10px;
  border-radius: 6px;
  border: 1.5px solid ${TEAL};
  background: ${TEAL};
  color: #fff;
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
  &:active { opacity: 0.8; }
`;

const FilterChip = styled.button`
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 6px;
  border: 1.5px solid ${({ $active }) => $active ? TEAL : THEME.border};
  background: ${({ $active }) => $active ? TEAL : THEME.surface};
  color: ${({ $active }) => $active ? "#fff" : THEME.textSecondary};
  font-size: 12px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  &:active { opacity: 0.8; }
`;

/* 상태 탭 */
const StatusTabRow = styled.div`
  display: flex;
  background: ${THEME.surface};
  border-bottom: 2px solid ${THEME.border};
  padding: 0 12px;
`;

const StatusTab = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 0;
  font-size: 13px;
  font-weight: 600;
  color: ${({ $active }) => $active ? THEME.primary : THEME.muted};
  border-bottom: 2px solid ${({ $active }) => $active ? THEME.primary : "transparent"};
  cursor: pointer;
  white-space: nowrap;
  margin-bottom: -2px;
  &:active { opacity: 0.7; }
`;

const StatusCount = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${({ $active }) => $active ? "#fff" : THEME.muted};
  background: ${({ $active }) => $active ? THEME.primary : THEME.border};
  border-radius: 4px;
  padding: 2px 8px;
  min-width: 20px;
  text-align: center;
`;

/* 오더 카드 (기획안 테이블 스타일) */
const OrderCard = styled.div`
  background: ${THEME.surface};
  margin: 6px 12px;
  padding: 14px 16px;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid ${THEME.border};
  &:active { background: ${THEME.background}; }
`;

const OrderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DateCell = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.text};
  min-width: 48px;
  flex-shrink: 0;
`;

const CatCell = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.text};
  flex-shrink: 0;
`;

const SubCell = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const MatchTag = styled.span`
  font-size: 11px;
  font-weight: 400;
  color: ${THEME.purple};
  margin-left: 2px;
`;

const OrderRow2 = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 6px;
`;

const LocationCell = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const PriceCell = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.primary};
`;

/* 빈 상태 */
const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  margin: 0 12px;
`;

const EmptyText = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

const EmptySubText = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
`;

/* 탭 플레이스홀더 */
const TabPlaceholder = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 8px;
`;

const TabPlaceholderTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${THEME.text};
`;

const TabPlaceholderDesc = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const TabPlaceholderBtn = styled.button`
  margin-top: 16px;
  padding: 12px 32px;
  border: none;
  border-radius: 4px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
`;

/* ===================== 카테고리 바텀시트 ===================== */

const SheetOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const SheetContent = styled.div`
  width: 100%;
  max-height: 70vh;
  background: #fff;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  animation: sheetUp 0.25s ease-out;
  @keyframes sheetUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;

const SheetHandle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: ${THEME.border};
  margin: 10px auto 0;
`;

const SheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
`;

const SheetTitle = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.text};
`;

const SheetCloseBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  &:active { opacity: 0.6; }
`;

const SheetList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 16px;
  -webkit-overflow-scrolling: touch;
`;

const SheetItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const SheetItemName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
`;

const SheetActions = styled.div`
  display: flex;
  gap: 10px;
  padding: 12px 16px 20px;
  border-top: 1px solid ${THEME.border};
`;

const SheetResetBtn = styled.button`
  flex: 1;
  padding: 14px;
  border: 1.5px solid ${THEME.border};
  border-radius: 4px;
  background: #fff;
  color: ${THEME.textSecondary};
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const SheetConfirmBtn = styled.button`
  flex: 2;
  padding: 14px;
  border: none;
  border-radius: 4px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
`;
