/* eslint-disable */
import React, { useContext, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAtom } from "jotai";
import { UserContext } from "../../context/User";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import HomeLayout from "../../screen/Layout/Layout/HomeLayout";
import { IoPeopleOutline, IoSparklesOutline, IoGiftOutline } from "react-icons/io5";
import { MOCK_ORDERS } from "../order/OrderListPage";

/* ─── 오더 상태 ─── */
const STATUS_TABS = ["접수", "지원가능", "배차/대기", "취소", "완료"];
const STATUS_STYLE = {
  "접수": { bg: THEME.purpleLight, color: THEME.purple },
  "지원가능": { bg: "#DBEAFE", color: THEME.primary },
  "배차/대기": { bg: "#FEF3C7", color: "#B45309" },
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
            <CatIcon>{cat.icon}</CatIcon>
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
  const [activeStatusTab, setActiveStatusTab] = useState("접수");
  const [activeCatFilters, setActiveCatFilters] = useState([]);   // [] = 전체
  const [activeDistFilters, setActiveDistFilters] = useState(["전체"]);

  // 전체 오더 취합
  const allOrders = useMemo(() => {
    const catIds = proCategories.length > 0 ? proCategories : Object.keys(MOCK_ORDERS);
    const orders = [];
    catIds.forEach((catId) => {
      const list = MOCK_ORDERS[catId] || [];
      const cat = CATEGORIES.find((c) => c.id === catId);
      list.forEach((o) => orders.push({ ...o, categoryId: catId, categoryName: cat?.shortName, categoryIcon: cat?.icon }));
    });
    return orders;
  }, [proCategories]);

  // 상태 + 카테고리 필터 적용
  const filteredOrders = allOrders.filter((o) => {
    const statusMatch = o.orderStatus === activeStatusTab || (activeStatusTab === "배차/대기" && o.orderStatus === "배차대기");
    const catMatch = activeCatFilters.length === 0 || activeCatFilters.includes(o.categoryId);
    return statusMatch && catMatch;
  });

  const filterCats = CATEGORIES.filter((c) =>
    proCategories.length > 0 ? proCategories.includes(c.id) : Object.keys(MOCK_ORDERS).includes(c.id)
  );

  // 상태별 카운트
  const statusCounts = useMemo(() => {
    const counts = {};
    STATUS_TABS.forEach((s) => { counts[s] = 0; });
    allOrders.forEach((o) => {
      if (counts[o.orderStatus] !== undefined) counts[o.orderStatus]++;
      if (o.orderStatus === "배차대기" && counts["배차/대기"] !== undefined) counts["배차/대기"]++;
    });
    return counts;
  }, [allOrders]);

  return (
    <PageWrap>
      {/* ── 상단 액션 탭 바 ── */}
      <ActionBar>
        {ACTION_TABS.map((tab) => (
          <ActionTab key={tab.key} onClick={() => {
            if (tab.key === "my_orders") navigate("/order/my-orders");
            if (tab.key === "ai") navigate("/order/ai-estimate");
            if (tab.key === "worker") navigate("/order/create");
            if (tab.key === "invite") { /* TODO: 초대코드 */ }
          }}>
            <ActionLabel $active={tab.key === "all_orders"}>{tab.label}</ActionLabel>
          </ActionTab>
        ))}
      </ActionBar>

      {/* ── 1행: 거리/날짜 필터 (중복선택) ── */}
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

      {/* ── 2행: 카테고리 필터 (중복선택) ── */}
      <FilterRow>
        <FilterChip $active={activeCatFilters.length === 0} onClick={() => setActiveCatFilters([])}>
          전체
        </FilterChip>
        {filterCats.map((cat) => {
          const isActive = activeCatFilters.includes(cat.id);
          const handleClick = () => {
            const next = isActive
              ? activeCatFilters.filter((v) => v !== cat.id)
              : [...activeCatFilters, cat.id];
            setActiveCatFilters(next);
          };
          return (
            <FilterChip key={cat.id} $active={isActive} onClick={handleClick}>
              {cat.shortName}
            </FilterChip>
          );
        })}
      </FilterRow>

      {/* ── 상태 탭 ── */}
      <StatusTabRow>
        {STATUS_TABS.map((tab) => (
          <StatusTab key={tab} $active={activeStatusTab === tab} onClick={() => setActiveStatusTab(tab)}>
            {tab}
            {statusCounts[tab] > 0 && <StatusCount $active={activeStatusTab === tab}>{statusCounts[tab]}</StatusCount>}
          </StatusTab>
        ))}
      </StatusTabRow>

      {/* ── 오더 카드 리스트 ── */}
      {filteredOrders.length === 0 ? (
        <EmptyWrap>
          <EmptyIcon>📋</EmptyIcon>
          <EmptyText>{activeStatusTab} 상태의 오더가 없습니다</EmptyText>
          <EmptySubText>새로운 요청이 들어오면 알려드릴게요!</EmptySubText>
        </EmptyWrap>
      ) : (
        filteredOrders.map((order) => {
          const cat = CATEGORIES.find((c) => c.id === order.categoryId);
          const isUrgent = order.workDate === "긴급";
          const isToday = order.workDate === "당일";
          return (
            <OrderCard key={order.id} onClick={() => navigate(`/order/detail/${order.id}`, { state: { order, category: cat } })}>
              {/* 날짜 + 카테고리 + 세부[호출방식] + 위치 + 금액 */}
              <OrderRow>
                <DateCell $urgent={isUrgent} $today={isToday}>{order.workDate}</DateCell>
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

      <BottomSpacer />
    </PageWrap>
  );
};

/* ================================================================
   메인 페이지
   ================================================================ */
const MobileMainpage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [proCategories] = useAtom(proCategoriesAtom);
  const nickname = user?.USERINFO?.nickname || "고수님";

  return (
    <HomeLayout>
      <ProMain navigate={navigate} nickname={nickname} proCategories={proCategories} />
    </HomeLayout>
  );
};

export default MobileMainpage;

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

const Greeting = styled.div`
  font-size: 20px;
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const GreetingSub = styled.div`
  font-size: 14px;
  color: ${THEME.muted};
  margin-top: 4px;
  font-weight: 500;
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
  font-weight: 500;
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
  font-weight: 800;
  color: ${THEME.text};
`;

const StatLabel = styled.div`
  font-size: 13px;
  font-weight: 500;
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
  border-radius: 12px;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const CatIcon = styled.div`
  font-size: 28px;
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
  font-weight: 800;
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
  font-weight: 700;
  color: ${THEME.text};
`;

const StepDesc = styled.div`
  font-size: 13px;
  font-weight: 500;
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
  gap: 0;
  padding: 8px 12px;
  background: ${THEME.surface};
  border-bottom: 1px solid ${THEME.border};
`;

const ActionTab = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 4px;
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const ActionLabel = styled.div`
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? 800 : 600};
  color: ${({ $active }) => $active ? THEME.primary : THEME.text};
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

const FilterChip = styled.button`
  flex-shrink: 0;
  padding: 7px 12px;
  border-radius: 6px;
  border: 1.5px solid ${({ $active }) => $active ? THEME.primary : THEME.border};
  background: ${({ $active }) => $active ? THEME.primary : THEME.surface};
  color: ${({ $active }) => $active ? "#fff" : THEME.textSecondary};
  font-size: 12px;
  font-weight: 700;
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
`;

const StatusTab = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 4px;
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? 800 : 600};
  color: ${({ $active }) => $active ? THEME.primary : THEME.muted};
  border-bottom: 2px solid ${({ $active }) => $active ? THEME.primary : "transparent"};
  cursor: pointer;
  white-space: nowrap;
  margin-bottom: -2px;
  &:active { opacity: 0.7; }
`;

const StatusCount = styled.span`
  font-size: 11px;
  font-weight: 800;
  color: ${({ $active }) => $active ? "#fff" : THEME.muted};
  background: ${({ $active }) => $active ? THEME.primary : THEME.border};
  border-radius: 10px;
  padding: 1px 6px;
  min-width: 16px;
  text-align: center;
`;

/* 오더 카드 (기획안 테이블 스타일) */
const OrderCard = styled.div`
  background: ${THEME.surface};
  margin: 0 0 1px;
  padding: 14px 16px;
  cursor: pointer;
  border-bottom: 1px solid ${THEME.border};
  &:active { background: ${THEME.background}; }
`;

const OrderRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const DateCell = styled.div`
  font-size: 13px;
  font-weight: 800;
  color: ${({ $urgent }) => $urgent ? THEME.danger : ({ $today }) => $today ? THEME.accent : THEME.text};
  min-width: 48px;
  flex-shrink: 0;
`;

const CatCell = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${THEME.text};
  flex-shrink: 0;
`;

const SubCell = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.textSecondary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
`;

const MatchTag = styled.span`
  font-size: 11px;
  font-weight: 700;
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
  font-weight: 500;
  color: ${THEME.muted};
`;

const PriceCell = styled.div`
  font-size: 13px;
  font-weight: 800;
  color: ${THEME.primary};
`;

/* 빈 상태 */
const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
`;

const EmptyIcon = styled.div`
  font-size: 48px;
  margin-bottom: 16px;
`;

const EmptyText = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const EmptySubText = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.muted};
  margin-top: 4px;
`;
