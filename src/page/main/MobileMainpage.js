/* eslint-disable */
import React, { useContext, useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { useAtom } from "jotai";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { CATEGORIES, CATEGORY_GROUPS, THEME } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import { getProCategoryIds } from "../../service/ProService";
import HomeLayout from "../../screen/Layout/Layout/HomeLayout";
import { CATEGORY_ICONS } from "../../utility/CategoryIcons";
import { useForceReloadIfVersionChanged } from "../../hooks/useForceReloadIfVersionChanged";
import { IoPeopleOutline, IoSparklesOutline, IoGiftOutline, IoCheckmarkCircle, IoCloseOutline, IoCalendarOutline, IoAddOutline, IoChevronForward, IoChevronDown, IoDocumentTextOutline, IoSendOutline, IoStarOutline, IoChatbubbleOutline, IoWalletOutline, IoCashOutline, IoCameraOutline, IoPersonOutline, IoLocationOutline, IoTimeOutline, IoGridOutline, IoRefreshOutline, IoFunnelOutline } from "react-icons/io5";
import { subscribeToAllOrders, formatOrderTime, hideOrder } from "../../service/OrderService";
import { MyOrdersContent } from "../order/MyOrdersPage";
import { AIEstimateContent } from "../order/AIEstimatePage";
import { OrderCreateContent } from "../order/OrderCreatePage";

/* ─── 오더 상태 ─── */
const STATUS_TABS = ["접수", "마감"];
const STATUS_STYLE = {
  "접수": { bg: "#F59E0B", color: "#fff" },
  "마감": { bg: "#3B82F6", color: "#fff" },
  "취소": { bg: THEME.danger, color: "#fff" },
  "요청": { bg: "#F59E0B", color: "#fff" },
  "진행": { bg: THEME.primary, color: "#fff" },
  "완료": { bg: THEME.success, color: "#fff" },
};

/* ─── 필터 옵션 ─── */
const DISTANCE_OPTIONS = ["전체", "10km", "20km", "30km", "50km", "100km"];
const PERIOD_OPTIONS = ["전체", "1주일", "1개월", "미래"];

/* ─── 날짜 포맷 ─── */
const formatOrderDate = (createdAt) => {
  if (!createdAt) return "-";
  const now = new Date();
  const date = createdAt.toDate ? createdAt.toDate() : new Date(createdAt);
  const diffMs = now - date;
  const diffHours = diffMs / (1000 * 60 * 60);
  const diffDays = diffMs / (1000 * 60 * 60 * 24);

  // 미래 일정
  if (diffMs < 0) return "미래";

  // 긴급 (3시간 이내)
  if (diffHours <= 3) return "긴급";

  // 당일
  const isToday = now.toDateString() === date.toDateString();
  if (isToday) return "당일";

  // 내일 체크
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() - 1);
  if (tomorrow.toDateString() === date.toDateString()) return "내일";

  // MM/DD
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};

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
      {CATEGORY_GROUPS.map((group) => (
        <div key={group.id}>
          <CatGroupLabel>{group.label}</CatGroupLabel>
          <CategoryGrid>
            {CATEGORIES.filter((cat) => cat.group === group.id).map((cat) => (
              <CategoryItem key={cat.id} onClick={() => navigate(`/category/${cat.id}`)}>
                <CatIcon>{(() => { const Icon = CATEGORY_ICONS[cat.id]; return Icon ? <Icon /> : cat.shortName.charAt(0); })()}</CatIcon>
                <CatName>{cat.shortName}</CatName>
              </CategoryItem>
            ))}
          </CategoryGrid>
        </div>
      ))}
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
   초대코드 탭 콘텐츠
   ================================================================ */
const InviteTabContent = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.USERS_ID || userData?.uid;
  const [myCode, setMyCode] = useState("");
  const [inputCode, setInputCode] = useState("");
  const [stats, setStats] = useState({ referralCount: 0, referralPoints: 0 });
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [alreadyReferred, setAlreadyReferred] = useState(false);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { getReferralCode, getReferralStats } = await import("../../service/ReferralService");
      const { doc, getDoc } = await import("firebase/firestore");
      const { db } = await import("../../api/config");
      const code = await getReferralCode(uid);
      setMyCode(code);
      const s = await getReferralStats(uid);
      setStats(s);
      // 이미 추천코드 사용 여부 확인
      const userSnap = await getDoc(doc(db, "users", uid));
      if (userSnap.exists() && userSnap.data()?.referredBy) {
        setAlreadyReferred(true);
      }
    })();
  }, [uid]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(myCode);
    showToast("복사되었습니다!");
  };

  const handleRegenerate = async () => {
    if (!uid || !myCode) return;
    if (!window.confirm("기존 코드가 무효화됩니다. 재발행하시겠습니까?")) return;
    setBusy(true);
    try {
      const { regenerateReferralCode } = await import("../../service/ReferralService");
      const newCode = await regenerateReferralCode(uid, myCode);
      setMyCode(newCode);
      showToast("새 추천코드가 발행되었습니다");
    } catch (e) {
      showToast("재발행 실패 — 다시 시도해주세요");
    } finally { setBusy(false); }
  };

  const handleApply = async () => {
    if (!uid || !inputCode.trim()) return;
    setBusy(true);
    try {
      const { applyReferralCode } = await import("../../service/ReferralService");
      const res = await applyReferralCode(uid, inputCode.trim());
      if (res.success) {
        setInputCode("");
        setAlreadyReferred(true);
        showToast("추천코드가 적용되었습니다! 포인트가 충전되었습니다 🎉");
      } else {
        showToast(res.message);
      }
    } catch (e) {
      showToast("적용 실패 — 다시 시도해주세요");
    } finally { setBusy(false); }
  };

  return (
    <InviteWrap>
      {/* 내 코드 */}
      <InviteCard>
        <InviteCardTitle>내 추천코드</InviteCardTitle>
        <InviteCardDesc>친구에게 코드를 공유하고 포인트를 받으세요</InviteCardDesc>
        <InviteCodeBox>
          <InviteCode>{myCode || "..."}</InviteCode>
          <InviteCopyBtn onClick={handleCopy}>복사</InviteCopyBtn>
        </InviteCodeBox>
      </InviteCard>

      {/* 통계 */}
      <InviteCard>
        <InviteCardTitle>초대 현황</InviteCardTitle>
        <InviteStatRow>
          <InviteStatItem onClick={() => navigate("/referral/friends")} style={{ cursor: "pointer" }}>
            <InviteStatNum>{stats.referralCount}</InviteStatNum>
            <InviteStatLabel>초대한 친구</InviteStatLabel>
          </InviteStatItem>
          <InviteStatDivider />
          <InviteStatItem onClick={() => navigate("/referral/points")} style={{ cursor: "pointer" }}>
            <InviteStatNum>{stats.referralPoints.toLocaleString()}P</InviteStatNum>
            <InviteStatLabel>받은 포인트</InviteStatLabel>
          </InviteStatItem>
        </InviteStatRow>
      </InviteCard>

      {/* 코드 입력 */}
      <InviteCard>
        {alreadyReferred ? (
          <>
            <InviteCardTitle>추천코드</InviteCardTitle>
            <ReferredDoneText>이미 추천코드로 가입되었습니다 ✓</ReferredDoneText>
          </>
        ) : (
          <>
            <InviteCardTitle>추천코드 입력</InviteCardTitle>
            <InviteCardDesc>추천받은 코드가 있다면 입력하세요</InviteCardDesc>
            <InviteInputRow>
              <InviteInput
                placeholder="추천코드 입력"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value.toUpperCase())}
              />
              <InviteApplyBtn onClick={handleApply} disabled={busy || !inputCode.trim()}>적용</InviteApplyBtn>
            </InviteInputRow>
          </>
        )}
      </InviteCard>

      {toast && <InviteToast>{toast}</InviteToast>}
    </InviteWrap>
  );
};

/* ================================================================
   전문가 모드 메인 — 기획안 구조
   ================================================================ */
const ProMain = ({ navigate, nickname, proCategories, uid }) => {
  const location = useLocation();
  const [activeTab, setActiveTab] = useState("all_orders");
  const [activeStatusFilter, setActiveStatusFilter] = useState("전체");
  const [activeCatFilters, setActiveCatFilters] = useState([]);
  const [activeDist, setActiveDist] = useState("전체");
  const [activePeriod, setActivePeriod] = useState("전체");
  const [showCatSheet, setShowCatSheet] = useState(false);
  const [showDistSheet, setShowDistSheet] = useState(false);
  const [showPeriodSheet, setShowPeriodSheet] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [rawOrders, setRawOrders] = useState([]);
  const [toast, setToast] = useState("");
  const [userPoints, setUserPoints] = useState(0);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  const handleHideOrder = async (orderId) => {
    if (!uid || !orderId) return;
    try {
      await hideOrder(orderId, uid);
      showToast("오더가 삭제되었습니다");
    } catch (e) {
      console.error("오더 숨기기 실패:", e);
    }
  };

  // 포인트 로드
  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("../../api/config");
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) setUserPoints(snap.data().referralPoints || snap.data().points || 0);
      } catch (e) { console.error(e); }
    })();
  }, [uid]);

  // 홈 탭 클릭 시 첫 번째 탭으로 리셋
  useEffect(() => {
    if (location.state?.resetTab) {
      setActiveTab("all_orders");
    }
  }, [location.state?.resetTab]);

  // Firestore 실시간 구독
  useEffect(() => {
    const unsub = subscribeToAllOrders((orders) => setRawOrders(orders));
    return () => unsub();
  }, []);

  // proCategories 필터 적용 + hiddenBy 제외 + 카테고리 메타 부착
  const allOrders = useMemo(() => {
    return rawOrders
      .filter((o) => !(o.hiddenBy || []).includes(uid))
      .map((o) => {
        const cat = CATEGORIES.find((c) => c.id === o.categoryId);
        return { ...o, categoryName: cat?.shortName || o.categoryName || o.categoryId, categoryIcon: cat?.icon };
      });
  }, [rawOrders, proCategories, uid]);

  // 상태 매핑 (요청/접수 → 접수, 완료/배차 → 마감)
  const mapStatus = (status) => {
    if (status === "요청" || status === "접수") return "접수";
    if (status === "배정" || status === "완료" || status === "마감" || status === "업체선택대기") return "마감";
    if (status === "취소" || status === "대기" || status === "거부") return "마감";
    return "접수";
  };

  // 기간 필터
  const filterByPeriod = (order) => {
    if (activePeriod === "전체") return true;
    const now = new Date();
    const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const diffMs = now - date;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (activePeriod === "1주일") return diffDays <= 7;
    if (activePeriod === "1개월") return diffDays <= 30;
    if (activePeriod === "미래") return diffMs < 0;
    return true;
  };

  // 상태 + 카테고리 + 기간 필터 적용
  const filteredOrders = allOrders.filter((o) => {
    const mapped = mapStatus(o.orderStatus);
    const statusMatch = activeStatusFilter === "전체" || mapped === activeStatusFilter;
    const catMatch = activeCatFilters.length === 0 || activeCatFilters.includes(o.categoryId);
    const periodMatch = filterByPeriod(o);
    return statusMatch && catMatch && periodMatch;
  });

  // 바텀시트에는 항상 전체 카테고리 표시
  const filterCats = CATEGORIES;

  const HOME_TABS = [
    { key: "assets", label: "보유자산" },
    { key: "all_orders", label: "요청목록" },
    { key: "my_orders", label: "나의오더현황" },
    { key: "ai", label: "AI견적" },
    { key: "referral", label: "초대코드" },
  ];

  return (
    <PageWrap>
      {/* ── 상단 탭 버튼 ── */}
      <HomeTabRow>
        {HOME_TABS.map((tab) => (
          <HomeTabBtn key={tab.key} $active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
            {tab.sub && <HomeTabSub $active={activeTab === tab.key}>{tab.sub}</HomeTabSub>}
          </HomeTabBtn>
        ))}
      </HomeTabRow>

      {/* ══════ 보유자산 ══════ */}
      {activeTab === "assets" && (
        <>
          <AssetSection>
            <AssetCard>
              <AssetLabel>포인트</AssetLabel>
              <AssetValue>{userPoints.toLocaleString()}P</AssetValue>
              <AssetDesc>적립된 포인트를 확인하세요</AssetDesc>
            </AssetCard>
            <AssetCard $muted>
              <AssetLabel>블록체인 자산</AssetLabel>
              <AssetValue style={{color: THEME.muted}}>준비중</AssetValue>
              <AssetDesc>향후 블록체인 기반 자산이 추가됩니다</AssetDesc>
            </AssetCard>
          </AssetSection>
        </>
      )}

      {/* ══════ 요청목록 (전체) ══════ */}
      {activeTab === "all_orders" && (
      <>
          <FilterBtnRow>
            <FilterBtn onClick={() => { setRawOrders([]); }}>새로고침</FilterBtn>
            <FilterBtn $active={activeDist !== "전체"} onClick={() => setShowDistSheet(true)}>
              {activeDist !== "전체" ? activeDist : "거리"} <IoChevronDown size={11} />
            </FilterBtn>
            <FilterBtn $active={activeStatusFilter !== "전체"} onClick={() => setShowStatusSheet(true)}>
              {activeStatusFilter !== "전체" ? activeStatusFilter : "상태"} <IoChevronDown size={11} />
            </FilterBtn>
            <FilterBtn $active={activePeriod !== "전체"} onClick={() => setShowPeriodSheet(true)}>
              {activePeriod !== "전체" ? activePeriod : "기간"} <IoChevronDown size={11} />
            </FilterBtn>
            <FilterBtn $active={activeCatFilters.length > 0} onClick={() => setShowCatSheet(true)}>
              {activeCatFilters.length > 0 ? `${activeCatFilters.length}개` : "카테고리"} <IoChevronDown size={11} />
            </FilterBtn>
          </FilterBtnRow>

          {filteredOrders.length === 0 ? (
            <EmptyWrap>
              <EmptyText>등록된 요청이 없습니다</EmptyText>
              <EmptySubText>새로운 요청이 들어오면 알려드릴게요!</EmptySubText>
            </EmptyWrap>
          ) : (
            <TableWrap>
              <TableHeader>
                <ThCell $flex={1} style={{textAlign:"center"}}>날짜</ThCell>
                <ThCell $flex={0.8} style={{textAlign:"center"}}>상태</ThCell>
                <ThCell $flex={1.5} style={{textAlign:"center"}}>카테고리</ThCell>
                <ThCell $flex={1.5} style={{textAlign:"center"}}>지역</ThCell>
                <ThCell $flex={1.5} style={{textAlign:"center"}}>금액</ThCell>
              </TableHeader>
              {filteredOrders.map((order) => {
                const cat = CATEGORIES.find((c) => c.id === order.categoryId);
                const dateLabel = formatOrderDate(order.createdAt);
                const status = mapStatus(order.orderStatus);
                const sStyle = STATUS_STYLE[status] || STATUS_STYLE["접수"];
                const isUrgent = dateLabel === "긴급";
                return (
                  <TableRow key={order.id} onClick={() => {
                    if (status === "마감") { showToast("이미 마감된 항목은 확인할 수 없습니다"); return; }
                    navigate(`/order/detail/${order.id}`, { state: { order, category: cat } });
                  }}>
                    <TdCell $flex={1}>
                      <TdDate $urgent={isUrgent}>{dateLabel}</TdDate>
                    </TdCell>
                    <TdCell $flex={0.8} style={{alignItems:"center"}}>
                      <TdStatusBadge style={{background: sStyle.bg, color: sStyle.color}}>{status}</TdStatusBadge>
                    </TdCell>
                    <TdCell $flex={1.5} style={{alignItems:"center"}}>
                      <TdCatName>{order.categoryName}</TdCatName>
                    </TdCell>
                    <TdCell $flex={1.5}>
                      <TdLocation>{order.location ? order.location.split(" ").slice(0, 2).join(" ") : "-"}</TdLocation>
                    </TdCell>
                    <TdCell $flex={1.5} style={{alignItems:"flex-end"}}>
                      <TdAmount>{order.price && Number(order.price.replace(/[^0-9]/g, "")) > 0 ? `${Number(order.price.replace(/[^0-9]/g, "")).toLocaleString()}원` : "견적협의"}</TdAmount>
                    </TdCell>
                  </TableRow>
                );
              })}
            </TableWrap>
          )}

        <FloatBtn onClick={() => navigate("/order/create")}>+ 예약접수</FloatBtn>
        </>
      )}

      {/* ══════ 나의오더현황 ══════ */}
      {activeTab === "my_orders" && (
        <>
          <MyOrdersContent />
        </>
      )}

      {/* ══════ AI견적 ══════ */}
      {activeTab === "ai" && (
        <>
          <AIEstimateContent />
        </>
      )}

      {/* ══════ 초대코드 ══════ */}
      {activeTab === "referral" && (
        <>
          <InviteTabContent />
        </>
      )}

      {/* ══════ 가이드 ══════ */}
      {activeTab === "guide" && (
        <GuideSection>
          <CardTitle>홈프로 가이드</CardTitle>
          <CardDesc>'이대로만 따라해요!' 홈프로를 위한 안내서</CardDesc>
          <HScrollRow>
            <GuideCard $bg="#FEF3C7" onClick={() => navigate("/guide/1")}>
              <GuideIconWrap><IoDocumentTextOutline size={32} color="#B45309" /><GuideSubIcon><IoSendOutline size={18} color="#B45309" /></GuideSubIcon></GuideIconWrap>
              <GuideText>첫 견적 보내기,{"\n"}이렇게 하면 쉬워요</GuideText>
            </GuideCard>
            <GuideCard $bg="#EDE9FE" onClick={() => navigate("/guide/2")}>
              <GuideIconWrap><IoStarOutline size={32} color={THEME.primary} /><GuideSubIcon><IoChatbubbleOutline size={18} color={THEME.primary} /></GuideSubIcon></GuideIconWrap>
              <GuideText>고객 리뷰를 늘리는{"\n"}가장 효과적인 방법</GuideText>
            </GuideCard>
            <GuideCard $bg={THEME.purpleLight} onClick={() => navigate("/guide/3")}>
              <GuideIconWrap><IoWalletOutline size={32} color={THEME.primaryDark} /><GuideSubIcon><IoCashOutline size={18} color={THEME.primaryDark} /></GuideSubIcon></GuideIconWrap>
              <GuideText>홈프로캐시 보상은{"\n"}언제 이루어지나요?</GuideText>
            </GuideCard>
            <GuideCard $bg="#D1FAE5" onClick={() => navigate("/guide/4")}>
              <GuideIconWrap><IoCameraOutline size={32} color="#059669" /></GuideIconWrap>
              <GuideText>프로필 사진,{"\n"}이렇게 찍으세요</GuideText>
            </GuideCard>
            <GuideCard $bg="#EDE9FE" onClick={() => navigate("/guide/5")}>
              <GuideIconWrap><IoStarOutline size={32} color={THEME.primary} /></GuideIconWrap>
              <GuideText>등급 시스템{"\n"}포인트로 올리세요</GuideText>
            </GuideCard>
          </HScrollRow>
        </GuideSection>
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
              {CATEGORY_GROUPS.map((group) => (
                <React.Fragment key={group.id}>
                  <SheetGroupLabel>{group.label}</SheetGroupLabel>
                  {filterCats.filter((c) => c.group === group.id).map((cat) => {
                    const checked = activeCatFilters.includes(cat.id);
                    const toggle = () => {
                      setActiveCatFilters((prev) =>
                        checked ? prev.filter((v) => v !== cat.id) : [...prev, cat.id]
                      );
                    };
                    const Icon = CATEGORY_ICONS[cat.id];
                    return (
                      <SheetItem key={cat.id} onClick={toggle}>
                        <SheetItemLeft>
                          <SheetCatIcon>{Icon ? <Icon /> : null}</SheetCatIcon>
                          <SheetItemName>{cat.shortName}</SheetItemName>
                        </SheetItemLeft>
                        {checked && <IoCheckmarkCircle size={22} color={THEME.primary} />}
                      </SheetItem>
                    );
                  })}
                </React.Fragment>
              ))}
            </SheetList>
            <SheetActions>
              <SheetResetBtn onClick={() => setActiveCatFilters([])}>초기화</SheetResetBtn>
              <SheetConfirmBtn onClick={() => setShowCatSheet(false)}>확인</SheetConfirmBtn>
            </SheetActions>
          </SheetContent>
        </SheetOverlay>
      )}

      {/* 거리 필터 바텀시트 */}
      {showDistSheet && (
        <SheetOverlay onClick={() => setShowDistSheet(false)}>
          <SheetContent onClick={(e) => e.stopPropagation()}>
            <SheetHandle />
            <SheetHeader>
              <SheetTitle>거리 선택</SheetTitle>
              <SheetCloseBtn onClick={() => setShowDistSheet(false)}>
                <IoCloseOutline size={24} color={THEME.text} />
              </SheetCloseBtn>
            </SheetHeader>
            <SheetList>
              {DISTANCE_OPTIONS.map((d) => (
                <SheetItem key={d} onClick={() => { setActiveDist(d); setShowDistSheet(false); }}>
                  <SheetItemName>{d}</SheetItemName>
                  {activeDist === d && <IoCheckmarkCircle size={22} color={THEME.primary} />}
                </SheetItem>
              ))}
            </SheetList>
          </SheetContent>
        </SheetOverlay>
      )}

      {/* 기간 필터 바텀시트 */}
      {showPeriodSheet && (
        <SheetOverlay onClick={() => setShowPeriodSheet(false)}>
          <SheetContent onClick={(e) => e.stopPropagation()}>
            <SheetHandle />
            <SheetHeader>
              <SheetTitle>기간 선택</SheetTitle>
              <SheetCloseBtn onClick={() => setShowPeriodSheet(false)}>
                <IoCloseOutline size={24} color={THEME.text} />
              </SheetCloseBtn>
            </SheetHeader>
            <SheetList>
              {PERIOD_OPTIONS.map((t) => (
                <SheetItem key={t} onClick={() => { setActivePeriod(t); setShowPeriodSheet(false); }}>
                  <SheetItemName>{t}</SheetItemName>
                  {activePeriod === t && <IoCheckmarkCircle size={22} color={THEME.primary} />}
                </SheetItem>
              ))}
            </SheetList>
          </SheetContent>
        </SheetOverlay>
      )}

      {/* 상태 필터 바텀시트 */}
      {showStatusSheet && (
        <SheetOverlay onClick={() => setShowStatusSheet(false)}>
          <SheetContent onClick={(e) => e.stopPropagation()}>
            <SheetHandle />
            <SheetHeader>
              <SheetTitle>상태 선택</SheetTitle>
              <SheetCloseBtn onClick={() => setShowStatusSheet(false)}>
                <IoCloseOutline size={24} color={THEME.text} />
              </SheetCloseBtn>
            </SheetHeader>
            <SheetList>
              {["전체", ...STATUS_TABS].map((s) => (
                  <SheetItem key={s} onClick={() => { setActiveStatusFilter(s); setShowStatusSheet(false); }}>
                    <SheetItemName>{s}</SheetItemName>
                    {activeStatusFilter === s && <IoCheckmarkCircle size={22} color={THEME.primary} />}
                  </SheetItem>
              ))}
            </SheetList>
          </SheetContent>
        </SheetOverlay>
      )}

      {toast && <HideToast>{toast}</HideToast>}
    </PageWrap>
  );
};

/* ================================================================
   Pull-to-Refresh Hook
   ================================================================ */
const usePullToRefresh = (onRefresh) => {
  const [pulling, setPulling] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const startY = useRef(0);
  const containerRef = useRef(null);
  const THRESHOLD = 60;

  const onTouchStart = useCallback((e) => {
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) return;
    startY.current = e.touches[0].clientY;
    setPulling(true);
  }, []);

  const onTouchMove = useCallback((e) => {
    if (!pulling || refreshing) return;
    const el = containerRef.current;
    if (!el || el.scrollTop > 0) { setPullDistance(0); return; }
    const diff = e.touches[0].clientY - startY.current;
    if (diff > 0) {
      setPullDistance(Math.min(diff * 0.4, 100));
    }
  }, [pulling, refreshing]);

  const onTouchEnd = useCallback(async () => {
    if (!pulling) return;
    setPulling(false);
    if (pullDistance >= THRESHOLD && !refreshing) {
      setRefreshing(true);
      try { await onRefresh(); } catch (e) { console.error(e); }
      setRefreshing(false);
    }
    setPullDistance(0);
  }, [pulling, pullDistance, refreshing, onRefresh]);

  return { containerRef, pullDistance, refreshing, onTouchStart, onTouchMove, onTouchEnd };
};

/* ================================================================
   메인 페이지
   ================================================================ */
const MobileMainpage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData, refreshUser } = useAuth();
  const [proCategories, setProCategories] = useAtom(proCategoriesAtom);
  const { showUpdateToast, updateInfo, checkVersion } = useForceReloadIfVersionChanged();

  // AuthContext fallback (리프레시 시 UserContext 날아가는 문제 보완)
  const uid = user?.USERS_ID || userData?.uid;
  const nickname = user?.USERINFO?.nickname || userData?.name || userData?.nickname || "고수님";

  // 프로 카테고리 로드
  const loadProCategories = useCallback(async () => {
    if (!uid) return;
    try {
      const ids = await getProCategoryIds(uid);
      setProCategories(ids);
    } catch (e) { console.error(e); }
  }, [uid]);

  useEffect(() => { loadProCategories(); }, [loadProCategories]);

  // 홈 진입 시마다 버전 체크
  useEffect(() => { checkVersion(); }, [location.pathname]);

  // 10초 자동 갱신
  useEffect(() => {
    if (!uid) return;
    const timer = setInterval(() => {
      loadProCategories();
      refreshUser?.();
    }, 10000);
    return () => clearInterval(timer);
  }, [uid, loadProCategories, refreshUser]);

  // Pull-to-refresh
  const handleRefresh = useCallback(async () => {
    await Promise.all([
      loadProCategories(),
      refreshUser?.(),
    ]);
  }, [loadProCategories, refreshUser]);

  const { containerRef, pullDistance, refreshing, onTouchStart, onTouchMove, onTouchEnd } = usePullToRefresh(handleRefresh);

  return (
    <>
      {showUpdateToast && (
        <UpdateToast>
          <UpdateVersion>v{updateInfo.version} 업데이트</UpdateVersion>
          {updateInfo.content && <UpdateContent>{updateInfo.content}</UpdateContent>}
          <UpdateText>새로운 버전으로 업데이트 중...</UpdateText>
        </UpdateToast>
      )}
      <HomeLayout>
        <PullContainer
          ref={containerRef}
          onTouchStart={onTouchStart}
          onTouchMove={onTouchMove}
          onTouchEnd={onTouchEnd}
        >
          <PullIndicator style={{ height: pullDistance || (refreshing ? 50 : 0) }}>
            {refreshing ? (
              <Spinner />
            ) : pullDistance > 0 && (
              <PullArrow style={{ transform: `rotate(${pullDistance >= 60 ? 180 : 0}deg)` }}>↓</PullArrow>
            )}
          </PullIndicator>
          <ProMain navigate={navigate} nickname={nickname} proCategories={proCategories} uid={uid} />
        </PullContainer>
      </HomeLayout>
    </>
  );
};

export default MobileMainpage;

/* ===================== Pull-to-Refresh styles ===================== */

const PullContainer = styled.div`
  overflow-y: auto;
  height: 100%;
  -webkit-overflow-scrolling: touch;
`;

const PullIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  transition: height 0.2s ease;
`;

const spinAnim = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 24px;
  height: 24px;
  border: 2.5px solid ${THEME.border};
  border-top-color: ${THEME.primary};
  border-radius: 50%;
  animation: ${spinAnim} 0.7s linear infinite;
`;

const PullArrow = styled.div`
  font-size: 20px;
  color: ${THEME.muted};
  transition: transform 0.2s ease;
`;

/* ===================== 업데이트 배너 ===================== */

const UpdateToast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 368px;
  background: #fff;
  padding: 16px 20px;
  border-radius: 16px;
  z-index: 9999;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
  text-align: left;
  animation: slideUp 0.3s ease-out;
  @keyframes slideUp {
    from { transform: translateX(-50%) translateY(20px); opacity: 0; }
    to { transform: translateX(-50%) translateY(0); opacity: 1; }
  }
`;

const UpdateVersion = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.primary};
  margin-bottom: 4px;
`;

const UpdateContent = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.text};
  line-height: 1.4;
  margin-bottom: 6px;
`;

const UpdateText = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
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
  margin: 12px 12px;
  box-shadow: ${THEME.cardShadow};
`;

const CardTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
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
  font-weight: 700;
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
  border-radius: 12px;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const CatIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  svg { width: 32px; height: 32px; }
`;

const CatGroupLabel = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.textSecondary};
  background: ${THEME.background};
  padding: 8px 10px;
  border-radius: 8px;
  margin: 16px 0 8px;
  &:first-child { margin-top: 4px; }
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

const slideDown = keyframes`
  from { transform: translate(-50%, -20px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
`;

const HideToast = styled.div`
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 60px);
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-size: 14px;
  font-weight: 400;
  border-radius: 10px;
  z-index: 9999;
  white-space: nowrap;
  animation: ${slideDown} 0.3s ease-out;
`;

const BottomSpacer = styled.div`
  height: 20px;
`;

/* ===================== 초대코드 탭 styles ===================== */

const InviteWrap = styled.div`
  padding: 0 12px;
`;

const InviteCard = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  margin-top: 12px;
  box-shadow: ${THEME.cardShadow};
`;

const InviteCardTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
`;

const InviteCardDesc = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const InviteCodeBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 14px 16px;
  background: ${THEME.background};
  border-radius: 12px;
`;

const InviteCode = styled.div`
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.primary};
  letter-spacing: 0.05em;
`;

const InviteCopyBtn = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const InviteRegenBtn = styled.button`
  margin-top: 10px;
  background: none;
  border: none;
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  text-decoration: underline;
  cursor: pointer;
  font-family: inherit;
  &:active { opacity: 0.6; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const InviteStatRow = styled.div`
  display: flex;
  align-items: center;
  margin-top: 16px;
`;

const InviteStatItem = styled.div`
  flex: 1;
  text-align: center;
`;

const InviteStatNum = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const InviteStatLabel = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const InviteStatDivider = styled.div`
  width: 1px;
  height: 32px;
  background: ${THEME.border};
`;

const InviteInputRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 14px;
`;

const InviteInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 15px;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${THEME.primary}; }
  &::placeholder { color: ${THEME.muted}; }
`;

const InviteApplyBtn = styled.button`
  padding: 12px 20px;
  border: none;
  border-radius: 10px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
  &:active { opacity: 0.85; }
  &:disabled { background: ${THEME.border}; color: ${THEME.muted}; }
`;

const ReferredDoneText = styled.div`
  margin-top: 8px;
  font-size: 14px;
  color: ${THEME.success || "#10B981"};
  font-weight: 500;
`;

const InviteToast = styled.div`
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0,0,0,0.8);
  color: #fff;
  font-size: 14px;
  border-radius: 10px;
  z-index: 9999;
  white-space: nowrap;
`;

/* 상단 탭 행 */
const HomeTabRow = styled.div`
  display: flex;
  gap: 0;
  padding: 0 12px;
  overflow-x: auto;
  border-bottom: 1px solid ${THEME.border};
  &::-webkit-scrollbar { display: none; }
`;

const HomeTabBtn = styled.button`
  flex: 1;
  padding: 10px 8px 8px;
  border: none;
  border-bottom: 2px solid ${({ $active }) => $active ? THEME.primary : "transparent"};
  background: ${THEME.surface};
  color: ${({ $active }) => $active ? THEME.primary : THEME.textSecondary};
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  &:active { opacity: 0.8; }
`;

const HomeTabSub = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: ${({ $active }) => $active ? THEME.primary : THEME.muted};
`;

/* 보유자산 */
const AssetSection = styled.div`
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 12px;
`;

const AssetCard = styled.div`
  background: ${({ $muted }) => $muted ? THEME.background : THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${({ $muted }) => $muted ? "none" : THEME.cardShadow};
  ${({ $muted }) => $muted ? `border: 1px dashed ${THEME.border};` : ""}
`;

const AssetLabel = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.textSecondary};
`;

const AssetValue = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: ${THEME.primary};
  margin-top: 8px;
`;

const AssetDesc = styled.div`
  font-size: 12px;
  color: ${THEME.muted};
  margin-top: 6px;
`;

/* 새로고침 버튼 */
const RefreshBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  cursor: pointer;
  flex-shrink: 0;
  &:active { opacity: 0.6; }
`;

const FloatBtn = styled.button`
  position: fixed;
  bottom: calc(70px + env(safe-area-inset-bottom, 0px));
  right: calc(50% - 163px);
  padding: 10px 18px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  z-index: 90;
  &:active { opacity: 0.85; }
`;

const SectionTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.text};
  padding: 16px 16px 0;
`;

const FilterBtnRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 12px 16px 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { display: none; }
`;

const FilterLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${THEME.text};
  flex-shrink: 0;
  display: flex;
  align-items: center;
`;

const FilterBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid ${({ $active }) => $active ? THEME.primary : THEME.border};
  background: ${({ $active }) => $active ? `${THEME.primary}10` : THEME.surface};
  color: ${({ $active }) => $active ? THEME.primary : THEME.textSecondary};
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  &:active { opacity: 0.8; }
`;

/* ===================== 전문가 모드 styles ===================== */

/* 상단 액션 탭 바 */
const ActionBar = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px;
  margin: 0 12px 0;
  background: ${THEME.background};
  border-radius: 16px;
`;

const ActionTab = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 10px 4px;
  border-radius: 10px;
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
  padding: 12px 16px 8px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { display: none; }
`;

const TEAL = "#0D9488";
const TEAL_LIGHT = "#F0FDFA";

const CatFilterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 4px 16px 8px;
  justify-content: flex-start;
`;

const CatFilterBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 12px;
  border-radius: 20px;
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
  border-radius: 20px;
  border: none;
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
  border-radius: 20px;
  border: none;
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
  padding: 7px 14px;
  border-radius: 20px;
  border: ${({ $active }) => $active ? "none" : `1.5px solid ${THEME.border}`};
  background: ${({ $active }) => $active ? THEME.primary : THEME.surface};
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
  border-radius: 10px;
  padding: 2px 8px;
  min-width: 20px;
  text-align: center;
`;

/* 오더 카드 (기획안 테이블 스타일) */
const OrderCard = styled.div`
  background: ${THEME.surface};
  margin: 0 12px 12px;
  padding: 20px;
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
`;

const OrderTop = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const OrderAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: ${THEME.purpleLight};
  color: ${THEME.primary};
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  overflow: hidden;
  svg { width: 32px; height: 32px; }
`;

const OrderAvatarImg = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const OrderTopInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const OrderCustomer = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
  display: flex;
  align-items: center;
  flex-wrap: wrap;
`;

const OrderQuote = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const QuoteNum = styled.span`
  font-weight: 600;
  color: ${THEME.primary};
`;

const OrderTime = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  flex-shrink: 0;
`;

const OrderMiddle = styled.div`
  margin-top: 14px;
`;

const OrderCatName = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
`;

const OrderSubRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
`;

const OrderSubName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  word-break: keep-all;
  line-height: 1.4;
`;

const MatchBadge = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${THEME.purple};
  background: ${THEME.purpleLight};
  padding: 2px 6px;
  border-radius: 4px;
`;

const OrderLocation = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
`;

const OrderDesc = styled.div`
  margin-top: 8px;
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const OrderPrice = styled.div`
  margin-top: 8px;
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.primary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const NegoDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${THEME.danger};
`;

const OrderDivider = styled.div`
  height: 1px;
  background: ${THEME.border};
  margin-top: 16px;
`;

const OrderActions = styled.div`
  display: flex;
  align-items: center;
`;

const OrderActionDivider = styled.div`
  width: 1px;
  height: 20px;
  background: ${THEME.border};
`;

const OrderActionBtn = styled.button`
  flex: 1;
  padding: 14px 0;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  color: ${({ $primary }) => ($primary ? THEME.primary : THEME.textSecondary)};
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

/* ─── 테이블 스타일 ─── */

const TableWrap = styled.div`
  margin: 0 12px;
  background: ${THEME.surface};
  overflow: hidden;
  border: 1px solid ${THEME.border};
`;

const TableHeader = styled.div`
  display: flex;
  padding: 8px 12px;
  gap: 4px;
  background: #4A5568;
  border-bottom: 1px solid ${THEME.border};
  align-items: center;
`;

const ThCell = styled.div`
  flex: ${({ $flex }) => $flex || 1};
  font-size: 13px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
`;

const TableRow = styled.div`
  display: flex;
  padding: 8px 12px;
  gap: 4px;
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  align-items: center;
  min-height: 40px;
  &:last-child { border-bottom: none; }
  &:active { background: ${THEME.background}; }
`;

const TdCell = styled.div`
  flex: ${({ $flex }) => $flex || 1};
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  overflow: hidden;
`;

const TdAvatar = styled.img`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  object-fit: cover;
`;

const TdAvatarDefault = styled.div`
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  color: ${THEME.muted};
`;

const TdInfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const TdInfoText = styled.div`
  min-width: 0;
`;

const TdName = styled.div`
  font-size: 9px;
  color: ${THEME.muted};
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TdCatName = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const TdBadge = styled.span`
  font-size: 10px;
  font-weight: 600;
  color: ${THEME.primary};
  background: ${THEME.purpleLight};
  padding: 1px 5px;
  border-radius: 3px;
`;

const TdSub = styled.div`
  font-size: 11px;
  color: ${THEME.muted};
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TdLocation = styled.div`
  font-size: 13px;
  color: ${THEME.textSecondary};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
`;

const TdPrice = styled.div`
  font-size: 10px;
  font-weight: 400;
  color: ${THEME.text};
  white-space: nowrap;
`;

const TdQuote = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.primary};
`;

const TdQuoteUnit = styled.span`
  font-size: 11px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-left: 1px;
`;

const TdTime = styled.div`
  font-size: 11px;
  color: ${THEME.muted};
`;

const TdDate = styled.div`
  font-size: 13px;
  font-weight: ${({ $urgent }) => $urgent ? 700 : 400};
  color: ${({ $urgent }) => $urgent ? THEME.danger : THEME.text};
  white-space: nowrap;
`;

const TdStatusBadge = styled.span`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  white-space: nowrap;
`;

const TdAmount = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.text};
  text-align: right;
  white-space: nowrap;
`;

const ViewAllBtn = styled.div`
  text-align: center;
  padding: 16px;
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.primary};
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

/* 빈 상태 */
const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  flex: 1;
  gap: 12px;
`;

const EmptyText = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.textSecondary};
`;

const EmptySubText = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 6px;
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
  border-radius: 10px;
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
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
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

const SheetGroupLabel = styled.div`
  padding: 10px 20px;
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.textSecondary};
  background: ${THEME.background};
  border-bottom: 1px solid ${THEME.border};
  position: sticky;
  top: 0;
  z-index: 1;
`;

const SheetItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SheetCatIcon = styled.div`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 28px; height: 28px; }
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
  border-radius: 10px;
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
  border-radius: 10px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
`;

/* ===================== 캘린더 / 커뮤니티 / 가이드 ===================== */

const CalendarCard = styled.div`
  margin: 12px 12px 0;
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
  font-weight: 600;
  color: ${THEME.primary};
  letter-spacing: -0.02em;
`;

const CalDesc = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
  margin-top: 2px;
`;

const CalAddBtn = styled.button`
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

const AICard = styled.div`
  margin: 12px 12px 0;
  background: linear-gradient(135deg, ${THEME.primary}, ${THEME.primaryDark || "#5B3FD6"});
  border-radius: 12px;
  padding: 18px 20px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  &:active { opacity: 0.9; }
`;

const aiGlow = keyframes`
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
`;

const AIIconWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  animation: ${aiGlow} 1.5s ease-in-out infinite;
`;

const AICardTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: #fff;
`;

const AICardDesc = styled.div`
  font-size: 13px;
  color: rgba(255,255,255,0.75);
  margin-top: 3px;
`;

const CommunityCard = styled.div`
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const ComCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ComArrowBtn = styled.button`
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
  border-radius: 12px;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const PostBadge = styled.div`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 20px;
  background: ${THEME.purpleLight};
  color: ${THEME.purple};
  font-size: 11px;
  font-weight: 400;
  margin-bottom: 10px;
`;

const PostTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.text};
  line-height: 1.4;
  letter-spacing: -0.02em;
`;

const PostDesc = styled.div`
  font-size: 13px;
  font-weight: 400;
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
  font-weight: 400;
  color: ${THEME.muted};
`;

const GuideBarWrap = styled.div`
  padding: 8px 0 0;
  background: ${THEME.surface};
  border-bottom: 1px solid ${THEME.border};
`;

const GuideBarItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 20px;
  background: ${({ $bg }) => $bg || THEME.background};
  white-space: nowrap;
  font-size: 12px;
  font-weight: 500;
  color: ${THEME.text};
  cursor: pointer;
  flex-shrink: 0;
  &:active { opacity: 0.7; }
`;

const GuideSection = styled.div`
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const GuideCard = styled.div`
  flex-shrink: 0;
  width: 200px;
  height: 100px;
  padding: 16px;
  border-radius: 16px;
  background: ${({ $bg }) => $bg || THEME.background};
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const GuideIconWrap = styled.div`
  flex-shrink: 0;
  position: relative;
  width: 32px;
  height: 32px;
  opacity: 0.8;
`;

const GuideSubIcon = styled.div`
  position: absolute;
  bottom: -4px;
  right: -6px;
`;

const GuideText = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  line-height: 1.45;
  white-space: pre-line;
`;
