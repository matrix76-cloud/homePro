/* eslint-disable */
import React, { useContext, useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { useAtom } from "jotai";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { CATEGORIES, CATEGORY_GROUPS, THEME } from "../../config/homeproConfig";
import { PUBLIC_BASE_URL } from "../../api/config";
import { proCategoriesAtom } from "../../store/store";
import { getProCategoryIds } from "../../service/ProService";
import HomeLayout from "../../screen/Layout/Layout/HomeLayout";
import { CATEGORY_ICONS } from "../../utility/CategoryIcons";
import { useForceReloadIfVersionChanged } from "../../hooks/useForceReloadIfVersionChanged";
import { IoAddCircle, IoPeopleOutline, IoSparklesOutline, IoGiftOutline, IoCheckmarkCircle, IoCloseOutline, IoCalendarOutline, IoAddOutline, IoChevronForward, IoChevronDown, IoDocumentTextOutline, IoSendOutline, IoStarOutline, IoChatbubbleOutline, IoWalletOutline, IoCashOutline, IoCameraOutline, IoPersonOutline, IoLocationOutline, IoTimeOutline, IoGridOutline, IoRefreshOutline, IoFunnelOutline, IoSearchOutline } from "react-icons/io5";
import { subscribeToAllOrders, formatOrderTime, hideOrder } from "../../service/OrderService";
import { getAccessTier, TIER_LABEL } from "../../utility/tierUtils";
import { MyOrdersContent } from "../order/MyOrdersPage";
import EmptyOrders from "../../components/EmptyOrders";
import usePcWide from "../../hooks/usePcWide";
import { PcTable, PcTHead, PcTRow, PcEmpty, PcCard, PcGhostBtn } from "../../pc/pcKit";
import { AIEstimateContent } from "../order/AIEstimatePage";
import { OrderCreateContent } from "../order/OrderCreatePage";

/* ─── 포인트 내역 날짜 표기 ─── */
const fmtCashDate = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

/* ─── 포인트 기간 필터 ─── */
const POINT_PERIODS = ["전체", "당일", "어제", "지난1주", "지난1개월", "지난3개월"];
const matchPointPeriod = (createdAt, period) => {
  if (period === "전체") return true;
  const d = createdAt?.toDate ? createdAt.toDate() : new Date(createdAt || 0);
  const now = new Date();
  const isToday = now.toDateString() === d.toDateString();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday = yesterday.toDateString() === d.toDateString();
  const days = (now - d) / 86400000;
  switch (period) {
    case "당일": return isToday;
    case "어제": return isYesterday;
    case "지난1주": return days >= 0 && days <= 7;
    case "지난1개월": return days >= 0 && days <= 30;
    case "지난3개월": return days >= 0 && days <= 90;
    default: return true;
  }
};

/* ─── 오더 상태 ─── (숨고풍: 뱃지 배경 없이 텍스트+색으로 담백하게) */
const STATUS_TABS = ["접수", "대기", "마감", "취소"];
// 상태별 색상 통일 (대표 지시 7/23) — 접수=보라(형 룰 충돌로 확인 전까지 블루)/배정=노랑/완료=초록/취소=붉은/대기=회색/선정대기=연노랑
export const STATUS_COLOR = {
  "접수": THEME.logoPurple,     // 로고 보라 (대표 9/18 "오더목록 표시의 접수 색상" — 7/23 원지시대로 보라)
  "대기": "#9CA3AF",            // 회색
  "선정대기": "#E0A800",        // 연노랑(텍스트 가독성 위해 진한 노랑)
  "배정": "#F59E0B",            // 노랑
  "마감": THEME.muted,
  "취소": THEME.danger,         // 붉은
  "요청": THEME.logoPurple,
  "진행": "#F59E0B",
  "완료": THEME.success,        // 초록
};

/* ─── 필터 옵션 ─── */
const DISTANCE_OPTIONS = ["전체", "내 동네", "같은 시", "타지역"];
// 거리 선택 시트의 반경 안내 (대표 9/14 리뷰). 오더 좌표가 없어 구·시 단위로 거르므로 대략값으로 보여 준다
const DISTANCE_RADIUS_HINT = {
  "내 동네": "같은 구 · 반경 약 5km",
  "같은 시": "같은 시·도 · 반경 약 20km",
  "타지역": "다른 시·도 · 20km 이상",
};
const PERIOD_OPTIONS = ["전체", "당일", "어제", "지난1주일", "지난2주일", "지난1개월"];
export const SORT_OPTIONS = ["등록순", "가까운거리순", "서비스순", "지역순", "요청방식순", "단가유형순"];

/* ─── 지역 헬퍼: order.location 문자열에서 시/구 추출 + 사용자 region과 비교 ─── */
const SIDO_NORMALIZE_RE = /(특별자치시|특별자치도|광역시|특별시|도|시)$/;
const normalizeSido = (raw) => (raw || "").replace(SIDO_NORMALIZE_RE, "");

const extractRegionFromLocation = (location) => {
  if (!location) return null;
  // 구버전 문서는 location 이 {sido, gu} 객체 — 그대로 사용 (심화점검 11 발견)
  if (typeof location === "object") {
    return location.sido ? { sido: normalizeSido(location.sido), gu: location.gu || "" } : null;
  }
  const parts = String(location).trim().split(/\s+/);
  if (parts.length === 0) return null;
  return { sido: normalizeSido(parts[0]), gu: parts[1] || "" };
};

export const getDistanceCategory = (orderLocation, myRegion) => {
  if (!myRegion?.sido) return null;
  const ord = extractRegionFromLocation(orderLocation);
  if (!ord?.sido) return null;
  const mySido = normalizeSido(myRegion.sido);
  if (ord.sido !== mySido) return "타지역";
  if (myRegion.gu && ord.gu && myRegion.gu === ord.gu) return "내 동네";
  return "같은 시";
};

const DISTANCE_RANK = { "내 동네": 0, "같은 시": 1, "타지역": 2 };

/* ─── 지역 표시 라벨 (스크린샷 사양) ───
   서울 → 구만 / 광역시 → 약칭+구 / 도+시 → 시만 / 일반시+자치구 → 시(시제거)+구
   매칭 못 하면 원본 앞 두 단어
*/
const METRO_FULL_TO_SHORT = {
  "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천",
  "광주광역시": "광주", "대전광역시": "대전", "울산광역시": "울산",
};
const METRO_SHORT_SET = new Set(Object.values(METRO_FULL_TO_SHORT));
const PROVINCE_SHORTS = new Set(["충북","충남","경기","경남","경북","전남","전북","강원","제주","세종"]);

export const formatRegionLabel = (location) => {
  if (!location) return "-";
  if (typeof location === "object") {
    return [location.sido, location.gu].filter(Boolean).join(" ") || "-";
  }
  const parts = String(location).trim().split(/\s+/);
  if (parts.length === 0) return "-";
  const [first = "", second = "", third = ""] = parts;

  if (first === "서울특별시" || first === "서울") return second || "-";
  if (METRO_FULL_TO_SHORT[first]) return `${METRO_FULL_TO_SHORT[first]}${second}`;
  if (METRO_SHORT_SET.has(first)) return `${first}${second}`;

  const isProvince = first.endsWith("도") || first.endsWith("특별자치도") || PROVINCE_SHORTS.has(first);
  if (isProvince) {
    if (second && third && (third.endsWith("구") || third.endsWith("군"))) {
      const cityShort = second.endsWith("시") ? second.slice(0, -1) : second;
      return `${cityShort}${third}`;
    }
    return second || "-";
  }

  return [first, second].filter(Boolean).join(" ") || "-";
};

/* ─── 단가유형 표시 (사양: "잔금 320K" / "금액 260K" / "현장견적" / "견적요청") ─── */
export const formatPriceType = (order) => {
  const amt = Number(order.b2bPriceAmount) || 0;
  const k = amt > 0 ? `${Math.round(amt / 1000).toLocaleString()}K` : "";
  switch (order.b2bPriceType) {
    case "balance": return amt > 0 ? `잔금 ${k}` : "잔금";
    case "fixed":   return amt > 0 ? `금액 ${k}` : "금액";
    case "hpoint":  return amt > 0 ? `H-P ${Math.round(amt / 1000).toLocaleString()}K` : "H-P";
    case "onsite":  return "현장견적";
    case "estimate": return "견적요청";
    default: break;
  }
  if (order.priceType === "direct" && order.directPrice) {
    const v = Number(String(order.directPrice).replace(/[^0-9]/g, ""));
    return v > 0 ? `금액 ${Math.round(v / 1000).toLocaleString()}K` : "견적요청";
  }
  return "견적요청";
};

/* ─── 요청방식 표시 (사양: "0/3"=다중비교 / "빠른"=우선배정 / "지정"=지정배정) ─── */
export const formatMatchType = (order) => {
  switch (order.matchType) {
    case "compare":  return `${order.applicantCount || 0}/3`;
    case "priority": return "빠른";
    case "direct":   return "지정";
    default:         return "-";
  }
};

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
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.toDateString() === date.toDateString()) return "내일";

  // MM/DD
  return `${String(date.getMonth() + 1).padStart(2, "0")}/${String(date.getDate()).padStart(2, "0")}`;
};

/* ─── 오더목록 날짜 표기 — 접수시각(createdAt)이 아니라 사용자가 고른 작업날짜 기준 ─── */
export const formatOrderScheduleShort = (order) => {
  const wd = order.workDate || order.schedule;
  // 예약날짜(구 희망날짜지정): 날짜만 MM/DD
  if (wd === "예약날짜" || wd === "희망날짜지정") {
    const p = order.workDatePicker || (/\d{4}-\d{2}-\d{2}/.test(order.schedule) ? order.schedule : "");
    if (p) { const [, m, d] = p.split("-"); return `${m}/${d}`; }
    return "예약";
  }
  // 긴급/오늘/내일은 그대로
  if (wd === "긴급" || wd === "오늘" || wd === "내일") return wd;
  // 나머지(협의/빨리 등)나 값 없음 → 접수시각 기준 표기로 폴백
  return formatOrderDate(order.createdAt);
};

/* ================================================================
   가로 스크롤 힌트 래퍼 — 표가 옆으로 더 있다는 걸 알려주는 담백한 신호
   (우측 고정 페이드 + 작은 정적 chevron. 애니메이션·클릭 없음. 끝까지 밀면 사라짐)
   ================================================================ */
const ScrollHintTable = ({ children }) => {
  // 우측 은은한 힌트(페이드+화살표) 제거 — 가로 스크롤만 유지 (형 지시 7/23)
  return (
    <TableScrollOuter>
      <TableWrap>{children}</TableWrap>
    </TableScrollOuter>
  );
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
   작업자요청 탭 콘텐츠 (시트6 사양)
   ================================================================ */
const WorkerRequestList = ({ navigate }) => {
  const [items, setItems] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { collection, query, orderBy, onSnapshot } = await import("firebase/firestore");
        const { db } = await import("../../api/config");
        const q = query(collection(db, "homepro_worker_requests"), orderBy("createdAt", "desc"));
        const unsub = onSnapshot(q, (snap) => {
          if (cancelled) return;
          const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          setItems(list);
          setLoading(false);
        });
        return () => unsub();
      } catch (e) {
        setLoading(false);
        console.error("worker_requests 로드 실패:", e);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <>
      {loading ? (
        <EmptyWrap><EmptyText>불러오는 중...</EmptyText></EmptyWrap>
      ) : items.length === 0 ? (
        <EmptyWrap>
          <EmptyText>등록된 작업자 요청이 없습니다</EmptyText>
          <EmptySubText>+ 버튼을 눌러 첫 요청을 등록해보세요</EmptySubText>
        </EmptyWrap>
      ) : (
        <ScrollHintTable>
          <TableHeader>
            <ThCell $flex={1} style={{textAlign:"center"}}>일자</ThCell>
            <ThCell $flex={1.4} style={{textAlign:"center"}}>카테고리</ThCell>
            <ThCell $flex={0.7} style={{textAlign:"center"}}>인원</ThCell>
            <ThCell $flex={1.4} style={{textAlign:"center"}}>지역</ThCell>
            <ThCell $flex={1.0} style={{textAlign:"center"}}>인건비</ThCell>
          </TableHeader>
          {items.map((it) => {
            const dateLabel = it.workDate === "날짜지정" ? (it.workDatePicker || "지정") : (it.workDate || "-");
            const region = formatRegionLabel(it.siteAddr);
            const wage = it.wage ? `${Math.round(Number(it.wage) / 1000).toLocaleString()}K` : "-";
            return (
              <TableRow key={it.id} onClick={() => navigate(`/order/worker-request/detail/${it.id}`)} style={{ cursor: "pointer" }}>
                <TdCell $flex={1} style={{alignItems:"center"}}><TdDate>{dateLabel}</TdDate></TdCell>
                <TdCell $flex={1.4} style={{alignItems:"center"}}><TdCatName>{it.category || "-"}</TdCatName></TdCell>
                <TdCell $flex={0.7} style={{alignItems:"center"}}><TdLocation>{it.headcount ? `${it.headcount}명` : "-"}</TdLocation></TdCell>
                <TdCell $flex={1.4} style={{alignItems:"center"}}><TdLocation>{region}</TdLocation></TdCell>
                <TdCell $flex={1.0} style={{alignItems:"center"}}><TdAmount>{wage}</TdAmount></TdCell>
              </TableRow>
            );
          })}
        </ScrollHintTable>
      )}
      <FloatBtn onClick={() => navigate("/order/worker-request/create")}>+ 인력 요청</FloatBtn>
    </>
  );
};

/* ================================================================
   초대코드 탭 콘텐츠
   ================================================================ */
/* 초대 공유 (커뮤니티·SNS 공유 명세 — 대표 지시 7/29)
   딥링크: /?code=초대코드 → 가입 시 추천코드 자동 입력 (App.js에서 캡처) */
const SHARE_BASE_URL = PUBLIC_BASE_URL;
const buildInviteText = (code) =>
  `집(Home) 관련 특화된 모든 분야 사장님들이 뭉쳐,\n오더를 공유하고 다양한 수익을 창출하는 대한민국 1등 B2B 플랫폼에 사장님을 초대합니다.\n지금 초대코드 ${code}를 입력하고, 홈프로만의 특별한 생태계에 합류하세요!`;

const InviteTabContent = ({ pointHistory = [] }) => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.USERS_ID || userData?.uid;
  const [myCode, setMyCode] = useState("");
  // 초대 딥링크(/?code=)로 들어온 경우 자동 입력 (대표 지시 7/29)
  const [inputCode, setInputCode] = useState(() => {
    try { return localStorage.getItem("homepro.pendingReferralCode") || ""; } catch (e) { return ""; }
  });
  const [stats, setStats] = useState({ referralCount: 0, referralPoints: 0 });
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [alreadyReferred, setAlreadyReferred] = useState(false);
  // 어떤 코드로 가입했는지까지 보여 준다 (대표 9/17 시안 3번)
  const [referredInfo, setReferredInfo] = useState(null); // { code, nickname }

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  // 가입할 때 추천으로 받은 포인트 (내역에서 찾는다)
  const referralReward = useMemo(
    () => pointHistory.find((h) => h.type === "earn" && /추천|초대/.test(h.reason || "")) || null,
    [pointHistory]
  );

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
      const refUid = userSnap.exists() ? userSnap.data()?.referredBy : null;
      if (refUid) {
        setAlreadyReferred(true);
        try {
          const refCode = await getReferralCode(refUid);
          const refSnap = await getDoc(doc(db, "users", refUid));
          setReferredInfo({
            code: refCode || "",
            nickname: refSnap.exists() ? (refSnap.data()?.nickname || "") : "",
          });
        } catch (re) { console.error("추천인 정보 로드 실패:", re); }
      }
    })();
  }, [uid]);

  const handleCopy = () => {
    navigator.clipboard?.writeText(myCode);
    showToast("복사되었습니다!");
  };

  const inviteUrl = `${SHARE_BASE_URL}/?code=${myCode}`;

  const handleCopyInvite = () => {
    if (!myCode) return;
    navigator.clipboard?.writeText(`${buildInviteText(myCode)}\n${inviteUrl}`);
    showToast("초대 문구와 링크가 복사되었습니다");
  };

  // OS 공유 시트 (카카오톡·단톡방·문자 등) — 미지원 브라우저는 복사로 폴백
  const handleWebShare = async () => {
    if (!myCode) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "홈프로 초대", text: buildInviteText(myCode), url: inviteUrl });
      } catch (e) { /* 사용자가 취소한 경우 무시 */ }
    } else {
      handleCopyInvite();
    }
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
        try { localStorage.removeItem("homepro.pendingReferralCode"); } catch (e) { /* ignore */ }
        setInputCode("");
        setAlreadyReferred(true);
        showToast("추천코드가 적용되었습니다! 포인트가 충전되었습니다");
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

      {/* 초대 공유 (대표 지시 7/29 — 카카오/밴드/단톡방 공유, 링크 타면 코드 자동입력) */}
      <InviteCard>
        <InviteCardTitle>초대 공유</InviteCardTitle>
        <InviteCardDesc>링크로 가입하면 코드가 자동 입력됩니다</InviteCardDesc>
        <ShareBtnRow>
          <ShareBtn onClick={handleCopyInvite}>초대문구 복사</ShareBtn>
          <ShareBtn $primary onClick={handleWebShare}>공유하기</ShareBtn>
        </ShareBtnRow>
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
            <ReferredList>
              {referredInfo?.code && (
                <ReferredRow>등록한 코드 <ReferredStrong>{referredInfo.code}</ReferredStrong>
                  {referredInfo.nickname ? <> · 추천인 <ReferredStrong>{referredInfo.nickname}</ReferredStrong></> : null}
                </ReferredRow>
              )}
              {referralReward ? (
                <ReferredRow>
                  가입 보상 <ReferredStrong>{(referralReward.amount || 0).toLocaleString()}P</ReferredStrong> 받음
                  {referralReward.createdAt ? " · " + fmtCashDate(referralReward.createdAt) : ""}
                </ReferredRow>
              ) : (
                <ReferredRow>이미 추천코드로 가입되었습니다</ReferredRow>
              )}
            </ReferredList>
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
const ACTIVE_TAB_STORAGE_KEY = "homepro.main.activeTab";

const ProMain = ({ navigate, nickname, proCategories, uid }) => {
  const location = useLocation();
  const pcWide = usePcWide(); // PC 에서는 왼쪽 세로 메뉴가 안쪽 탭을 대신한다
  const { userData } = useAuth();
  const myRegion = userData?.region;
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const saved = sessionStorage.getItem(ACTIVE_TAB_STORAGE_KEY);
      if (saved === "referral") return "assets"; // 초대코드 탭 통합 전 저장값
      if (saved) return saved;
    } catch (e) { /* ignore */ }
    return "all_orders";
  });
  const [activeStatusFilter, setActiveStatusFilter] = useState("전체");
  // 마감·취소 숨기기 (기본 켜짐) — 지원할 수 있는 오더만 보이게 (형 지시 7/28)
  const [hideClosed, setHideClosed] = useState(true);
  const [activeCatFilters, setActiveCatFilters] = useState([]);
  const [activeDist, setActiveDist] = useState("전체");
  const [activePeriod, setActivePeriod] = useState("전체");
  const [activeSort, setActiveSort] = useState("등록순");
  const [showCatSheet, setShowCatSheet] = useState(false);
  // 필터 줄 접기 (섹션 3-1) — 평소엔 필터 버튼과 고른 조건만 보인다
  const [showFilters, setShowFilters] = useState(false);
  const [showDistSheet, setShowDistSheet] = useState(false);
  const [showPeriodSheet, setShowPeriodSheet] = useState(false);
  const [showStatusSheet, setShowStatusSheet] = useState(false);
  const [showSortSheet, setShowSortSheet] = useState(false);
  const [rawOrders, setRawOrders] = useState([]);
  const [toast, setToast] = useState("");
  const [userPoints, setUserPoints] = useState(0);
  const [pointHistory, setPointHistory] = useState([]);
  const [pointPeriod, setPointPeriod] = useState("전체");
  // 보유자산 안쪽 탭 — 포인트 / 친구 초대 (대표 9/17 시안 3번)
  const [assetSub, setAssetSub] = useState("point");
  const [companyInfo, setCompanyInfo] = useState(null);
  const [showCompany, setShowCompany] = useState(false); // 사업자 정보 접기 (대표 9/17 섹션 7-1)

  // 사업자 정보(settings/companyInfo) 로드 — 관리자 설정에서 입력한 값
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { getDoc, doc } = await import("firebase/firestore");
        const { db } = await import("../../api/config");
        const snap = await getDoc(doc(db, "settings", "companyInfo"));
        if (!cancelled && snap.exists()) setCompanyInfo(snap.data());
      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, []);

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); };

  // 가입할 때 추천으로 받은 포인트 (내역에서 찾는다)
  const referralReward = useMemo(
    () => pointHistory.find((h) => h.type === "earn" && /추천|초대/.test(h.reason || "")) || null,
    [pointHistory]
  );

  // 내가 거부 등록한 사용자 — 거부등록된 상대의 오더 클릭 차단 (형 지시 7/31)
  const [blockedUids, setBlockedUids] = useState(new Set());
  useEffect(() => {
    if (!uid) return;
    let cancelled = false;
    (async () => {
      try {
        const { getMyBlocks } = await import("../../service/BlockService");
        const list = await getMyBlocks(uid);
        if (!cancelled) setBlockedUids(new Set(list.map((b) => b.blockedUid)));
      } catch (e) { /* ignore */ }
    })();
    return () => { cancelled = true; };
  }, [uid]);

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
        const { doc, getDoc, collection, query, where, orderBy, getDocs } = await import("firebase/firestore");
        const { db } = await import("../../api/config");
        const snap = await getDoc(doc(db, "users", uid));
        if (snap.exists()) setUserPoints(snap.data().referralPoints || snap.data().points || 0);
        // 포인트 내역 (homepro_cash)
        try {
          const q = query(collection(db, "homepro_cash"), where("uid", "==", uid), orderBy("createdAt", "desc"));
          const hs = await getDocs(q);
          setPointHistory(hs.docs.map((d) => ({ id: d.id, ...d.data() })));
        } catch (he) { console.error("포인트 내역 로드 실패:", he); }
      } catch (e) { console.error(e); }
    })();
  }, [uid]);

  // activeTab 변경 시 sessionStorage 동기화 (뒤로가기 시 탭 유지)
  useEffect(() => {
    try { sessionStorage.setItem(ACTIVE_TAB_STORAGE_KEY, activeTab); } catch (e) { /* ignore */ }
  }, [activeTab]);

  // PC 위 메뉴에서 ?tab= 으로 들어오면 그 탭을 연다
  useEffect(() => {
    const t = new URLSearchParams(location.search).get("tab");
    if (t && ["all_orders", "my_orders", "ai_estimate", "assets"].includes(t)) setActiveTab(t);
  }, [location.search]);

  // 홈 탭 클릭 시 첫 번째 탭으로 리셋
  useEffect(() => {
    if (location.state?.resetTab) {
      setActiveTab("all_orders");
      try { sessionStorage.removeItem(ACTIVE_TAB_STORAGE_KEY); } catch (e) { /* ignore */ }
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

  // 상태 매핑 (요청/접수→접수, 대기→대기, 취소/거부→취소, 그 외→마감)
  const mapStatus = (status) => {
    if (status === "요청" || status === "접수") return "접수";
    if (status === "대기") return "대기";
    if (status === "취소" || status === "거부") return "취소";
    // 배정 이후(작업/완료) + 선정대기(3명 마감)는 메인리스트에서 '마감' 묶음. 레거시값(진행/결제/리뷰/업체선택대기)도 흡수.
    if (["배정", "완료", "마감", "선정대기", "업체선택대기", "진행", "결제", "리뷰"].includes(status)) return "마감";
    return "접수";
  };

  // 기간 필터 (사양: 당일/어제/지난1주/지난2주/지난1개월)
  const filterByPeriod = (order) => {
    if (activePeriod === "전체") return true;
    const now = new Date();
    const date = order.createdAt?.toDate ? order.createdAt.toDate() : new Date(order.createdAt);
    const isToday = now.toDateString() === date.toDateString();
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
    const isYesterday = yesterday.toDateString() === date.toDateString();
    const diffMs = now - date;
    const diffDays = diffMs / (1000 * 60 * 60 * 24);
    if (activePeriod === "당일") return isToday;
    if (activePeriod === "어제") return isYesterday;
    if (activePeriod === "지난1주일") return diffDays >= 0 && diffDays <= 7;
    if (activePeriod === "지난2주일") return diffDays >= 0 && diffDays <= 14;
    if (activePeriod === "지난1개월") return diffDays >= 0 && diffDays <= 30;
    return true;
  };

  // 거리 필터 (지역 단순화: 내 동네 / 같은 시 / 타지역)
  const filterByDistance = (order) => {
    if (activeDist === "전체") return true;
    const cat = getDistanceCategory(order.location, myRegion);
    if (!cat) return false;
    return cat === activeDist;
  };

  // 상태 + 카테고리 + 기간 + 거리 필터 적용
  const filteredOrders = allOrders.filter((o) => {
    const mapped = mapStatus(o.orderStatus);
    // 지원 불가한 오더 숨기기 (형 지시 7/28) — 마감·취소는 어차피 못 들어가는 건이라 기본 숨김.
    // 단 상태 필터에서 마감/취소를 직접 고르면 그건 보겠다는 뜻이므로 숨김을 무시한다
    // (검수 7/28: 숨김이 먼저 걸려 상태→마감 선택 시 항상 빈 목록이 되던 충돌 수정)
    const wantsClosed = activeStatusFilter === "마감" || activeStatusFilter === "취소";
    if (hideClosed && !wantsClosed && (mapped === "마감" || mapped === "취소")) return false;
    // '대기' = 접수자가 수정하려고 보류한 오더 — 본인 외에는 숨긴다 (전수검사 7/29:
    // 사양상 "메인에 안 올라감"인데 노출·수락까지 가능해 보류 중 오더를 채갈 수 있었음)
    // 대기(보류) 오더도 메인에 보인다 — 살아 있는 상태 변화를 보여 주자는 대표 9/14 의견. 수락은 상세에서 막는다
    const statusMatch = activeStatusFilter === "전체" || mapped === activeStatusFilter;
    const catMatch = activeCatFilters.length === 0 || activeCatFilters.includes(o.categoryId);
    const periodMatch = filterByPeriod(o);
    const distMatch = filterByDistance(o);
    return statusMatch && catMatch && periodMatch && distMatch;
  });

  // 정렬 적용
  const sortedOrders = useMemo(() => {
    const list = [...filteredOrders];
    const getDate = (o) => (o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0));
    if (activeSort === "등록순") {
      return list.sort((a, b) => getDate(b) - getDate(a));
    }
    if (activeSort === "가까운거리순") {
      // 내 동네(0) → 같은 시(1) → 타지역(2) → 미상(3), 같은 등급은 최근 등록순
      const rank = (o) => {
        const cat = getDistanceCategory(o.location, myRegion);
        return cat ? DISTANCE_RANK[cat] : 3;
      };
      return list.sort((a, b) => {
        const r = rank(a) - rank(b);
        if (r !== 0) return r;
        return getDate(b) - getDate(a);
      });
    }
    if (activeSort === "서비스순") {
      return list.sort((a, b) => (a.categoryName || "").localeCompare(b.categoryName || "", "ko"));
    }
    if (activeSort === "지역순") {
      const key = (o) => {
        const r = extractRegionFromLocation(o.location);
        return r ? `${r.sido} ${r.gu}` : "";
      };
      return list.sort((a, b) => key(a).localeCompare(key(b), "ko"));
    }
    if (activeSort === "요청방식순") {
      return list.sort((a, b) => (a.matchType || "").localeCompare(b.matchType || "", "ko"));
    }
    if (activeSort === "단가유형순") {
      return list.sort((a, b) =>
        (a.priceType || a.b2bPriceType || "").localeCompare(b.priceType || b.b2bPriceType || "", "ko")
      );
    }
    return list;
  }, [filteredOrders, activeSort, myRegion]);

  // 오늘 올라온 오더 수 (섹션 5-1)
  const todayCount = useMemo(() => {
    const start = new Date(); start.setHours(0, 0, 0, 0);
    return allOrders.filter((o) => {
      const d = o.createdAt?.toDate ? o.createdAt.toDate() : new Date(o.createdAt || 0);
      return d >= start;
    }).length;
  }, [allOrders]);

  // 내 분야 오더 수 — 로그인 전이거나 등록한 분야가 없으면 null (보여 주지 않는다)
  const myFieldCount = useMemo(() => {
    if (!uid || !proCategories || proCategories.length === 0) return null;
    return allOrders.filter((o) => proCategories.includes(o.categoryId)).length;
  }, [allOrders, proCategories, uid]);

  // 지금 걸려 있는 필터만 칩으로 (섹션 3-1)
  const activeFilterChips = useMemo(() => {
    const list = [];
    if (activeSort !== "등록순") list.push({ key: "sort", label: activeSort, clear: () => setActiveSort("등록순") });
    if (activeStatusFilter !== "전체") list.push({ key: "status", label: activeStatusFilter, clear: () => setActiveStatusFilter("전체") });
    if (activeDist !== "전체") list.push({ key: "dist", label: activeDist, clear: () => setActiveDist("전체") });
    if (activePeriod !== "전체") list.push({ key: "period", label: activePeriod, clear: () => setActivePeriod("전체") });
    if (activeCatFilters.length > 0) list.push({ key: "cat", label: "카테고리 " + activeCatFilters.length, clear: () => setActiveCatFilters([]) });
    return list;
  }, [activeSort, activeStatusFilter, activeDist, activePeriod, activeCatFilters]);

  // 바텀시트에는 항상 전체 카테고리 표시
  const filterCats = CATEGORIES;

  const HOME_TABS = [
    { key: "all_orders", label: "오더목록" },
    { key: "my_orders", label: "나의오더현황", wide: true },
    { key: "ai_estimate", label: "AI견적" },
    // 초대코드 탭은 보유자산 탭에 통합 (대표 9/14 리뷰) — 보유자산 맨 위에 초대 내용을 먼저 보인다
    { key: "assets", label: "보유자산" },
  ];

  return (
    <PageWrap>
      {/* ── 상단 차수·포인트 ── (차수 상단 표시 = 대표 지시 7/29 "매우중요" · 일반고객은 차수 미표기 = 형 지시 7/31) */}
      {/* 시안 5번 두 칸 나눔 (형 9/17): 왼쪽 회원 등급 → 구독, 오른쪽 보유 포인트 → 보유자산 */}
      <PointLine>
        {userData?.userType !== "customer" && (
          <>
            <PointCell onClick={() => navigate("/subscription")}>
              <div>
                <PointCellLabel>회원 등급</PointCellLabel>
                <PointLineTier>
                  {TIER_LABEL[getAccessTier(userData)]}{getAccessTier(userData) !== "tier0" ? " · 구독" : ""}
                </PointLineTier>
              </div>
            </PointCell>
            <PointCellDivider />
          </>
        )}
        <PointCell onClick={() => setActiveTab("assets")}>
          <div>
            <PointCellLabel>보유 포인트</PointCellLabel>
            <PointLineValue>{userPoints.toLocaleString()}P</PointLineValue>
          </div>
          <IoChevronForward size={17} color="#2b2f36" />
        </PointCell>
      </PointLine>

      {/* ── 상단 탭 버튼 ── (PC 는 왼쪽 세로 메뉴로 이동하므로 탭 줄 대신 제목만) */}
      {pcWide && <PcTabTitle>{(HOME_TABS.find((t) => t.key === activeTab) || {}).label}</PcTabTitle>}
      <HomeTabRow style={pcWide ? { display: "none" } : undefined}>
        {HOME_TABS.map((tab) => (
          <HomeTabBtn key={tab.key} $wide={tab.wide} $active={activeTab === tab.key} onClick={() => setActiveTab(tab.key)}>
            {tab.label}
            {tab.sub && <HomeTabSub $active={activeTab === tab.key}>{tab.sub}</HomeTabSub>}
          </HomeTabBtn>
        ))}
      </HomeTabRow>

      {/* 비회원 — 회원 전용 탭에는 로그인 안내를 보여 준다 (대표 9/17) */}
      {!uid && (activeTab === "assets" || activeTab === "my_orders" || activeTab === "ai_estimate") && (
        <GuestNotice>
          <GuestTitle>로그인이 필요한 화면이에요</GuestTitle>
          <GuestDesc>
            {activeTab === "assets" && "포인트와 초대코드는 회원만 볼 수 있습니다."}
            {activeTab === "my_orders" && "내가 등록하거나 맡은 오더는 회원만 볼 수 있습니다."}
            {activeTab === "ai_estimate" && "AI 견적은 회원만 이용할 수 있습니다."}
          </GuestDesc>
          <GuestBtnRow>
            <GuestPrimary onClick={() => navigate("/MobileSignup")}>회원가입 하고 이용하기</GuestPrimary>
            <GuestGhost onClick={() => navigate("/MobileLogin")}>이미 회원이에요 · 로그인</GuestGhost>
          </GuestBtnRow>
        </GuestNotice>
      )}

      {/* ══════ 보유자산 (포인트 잔액 + 내역) ══════ */}
      {uid && activeTab === "assets" && (
        <AssetWrap>
          {/* 포인트와 친구 초대를 안쪽 탭으로 가른다 (대표 9/17 시안 3번) */}
          <AssetSubTabs>
            <AssetSubTab $active={assetSub === "point"} onClick={() => setAssetSub("point")}>포인트</AssetSubTab>
            <AssetSubTab $active={assetSub === "invite"} onClick={() => setAssetSub("invite")}>친구 초대</AssetSubTab>
          </AssetSubTabs>

          {assetSub === "invite" && <InviteTabContent pointHistory={pointHistory} />}

          {assetSub === "point" && pcWide && (
            <PcAssetGrid>
              <div>
                <PcCard>
                  <PcAssetLabel>총 보유 포인트</PcAssetLabel>
                  <PcAssetValue>{userPoints.toLocaleString()}P</PcAssetValue>
                </PcCard>
                <PcPeriodList>
                  {POINT_PERIODS.map((p) => (
                    <PcPeriodBtn key={p} $on={pointPeriod === p} onClick={() => setPointPeriod(p)}>{p}</PcPeriodBtn>
                  ))}
                </PcPeriodList>
              </div>
              <PcTable $minH={360}>
                <PcTHead $cols={PC_POINT_COLS}><span>일자</span><span>내용</span><span style={{ textAlign: "right" }}>포인트</span></PcTHead>
                {(() => {
                  const filtered = pointHistory.filter((h) => matchPointPeriod(h.createdAt, pointPeriod));
                  if (pointHistory.length === 0) return (
                    <PcEmpty>
                      <b>아직 쌓인 포인트가 없어요</b>
                      <span>오더를 끝내거나 친구를 초대하면 포인트가 들어옵니다.</span>
                      <div><PcGhostBtn onClick={() => setAssetSub("invite")}>친구 초대하고 받기</PcGhostBtn></div>
                    </PcEmpty>
                  );
                  if (filtered.length === 0) return (
                    <PcEmpty>
                      <b>이 기간에는 내역이 없어요</b>
                      <span>기간을 넓히면 지난 내역을 볼 수 있습니다.</span>
                      <div><PcGhostBtn onClick={() => setPointPeriod("전체")}>전체 기간 보기</PcGhostBtn></div>
                    </PcEmpty>
                  );
                  return filtered.map((h) => (
                    <PcTRow key={h.id} $cols={PC_POINT_COLS} $click={false}>
                      <span>{fmtCashDate(h.createdAt)}</span>
                      <b>{h.reason || "포인트"}</b>
                      <AssetHistoryAmt $type={h.type} style={{ textAlign: "right" }}>
                        {h.type === "earn" ? "+" : h.type === "use" ? "-" : ""}{(h.amount || 0).toLocaleString()}P
                      </AssetHistoryAmt>
                    </PcTRow>
                  ));
                })()}
              </PcTable>
            </PcAssetGrid>
          )}

          {assetSub === "point" && !pcWide && (
            <>
              <PointBalanceCard>
                <PointBalanceLabel>총 보유 포인트</PointBalanceLabel>
                <PointBalanceValue>{userPoints.toLocaleString()}P</PointBalanceValue>
              </PointBalanceCard>

              <AssetListHeader>
                <AssetListTitle>포인트 내역</AssetListTitle>
              </AssetListHeader>

              <PeriodChipRow>
                {POINT_PERIODS.map((p) => (
                  <PeriodChip key={p} $active={pointPeriod === p} onClick={() => setPointPeriod(p)}>
                    {p}
                  </PeriodChip>
                ))}
              </PeriodChipRow>

              {(() => {
                const filtered = pointHistory.filter((h) => matchPointPeriod(h.createdAt, pointPeriod));
                if (pointHistory.length === 0) return (
                  <EmptyOrders
                    icon={<IoGiftOutline size={30} color={THEME.primary} />}
                    title="아직 쌓인 포인트가 없어요"
                    desc="오더를 끝내거나 친구를 초대하면 포인트가 들어옵니다."
                    primaryLabel="친구 초대하고 받기"
                    onPrimary={() => setAssetSub("invite")}
                  />
                );
                if (filtered.length === 0) return (
                  <EmptyOrders
                    icon={<IoGiftOutline size={30} color={THEME.primary} />}
                    title="이 기간에는 내역이 없어요"
                    desc="기간을 넓히면 지난 내역을 볼 수 있습니다."
                    onReset={() => setPointPeriod("전체")}
                    resetLabel="전체 기간 보기"
                    showCreate={false}
                  />
                );
                return (
                <AssetHistoryList>
                  {filtered.map((h) => (
                    <AssetHistoryItem key={h.id}>
                      <div style={{ minWidth: 0 }}>
                        <AssetHistoryReason>{h.reason || "포인트"}</AssetHistoryReason>
                        <AssetHistoryDate>{fmtCashDate(h.createdAt)}</AssetHistoryDate>
                      </div>
                      <AssetHistoryAmt $type={h.type}>
                        {h.type === "earn" ? "+" : h.type === "use" ? "-" : ""}{(h.amount || 0).toLocaleString()}P
                      </AssetHistoryAmt>
                    </AssetHistoryItem>
                  ))}
                </AssetHistoryList>
                );
              })()}
            </>
          )}
        </AssetWrap>
      )}

      {/* ══════ 요청목록 (전체) ══════ */}
      {activeTab === "all_orders" && (
      <>
          {/* 요약 줄 — 오늘 새 오더 · 내 분야 (섹션 5-1). 로그인 전이거나 내 분야가 없으면 내 분야는 빼고 보여 준다 */}
          {(todayCount > 0 || myFieldCount) ? (
            <SummaryLine>
              오늘 새로 올라온 오더 <b>{todayCount}건</b>
              {myFieldCount !== null && <> · 내 분야 <b>{myFieldCount}건</b></>}
            </SummaryLine>
          ) : null}

          <FilterToggleRow>
            <FilterToggleBtn $on={showFilters} onClick={() => setShowFilters((v) => !v)}>
              필터{activeFilterChips.length > 0 ? " " + activeFilterChips.length : ""}
              {/* 펼침/접힘 표시 (형 9/17) */}
              <FilterChevron $open={showFilters}><IoChevronDown size={16} /></FilterChevron>
            </FilterToggleBtn>
            {activeFilterChips.map((chip) => (
              <ActiveChip key={chip.key} onClick={chip.clear}>{chip.label} ×</ActiveChip>
            ))}
            <FilterCount>{sortedOrders.length}건</FilterCount>
          </FilterToggleRow>

          {showFilters && (
          <FilterPanel>
            <FilterGroup>
              <FilterGroupLabel>정렬</FilterGroupLabel>
              <FilterBtnRow>
                {SORT_OPTIONS.map((t) => (
                  <FilterBtn key={t} $active={activeSort === t} onClick={() => setActiveSort(t)}>{t}</FilterBtn>
                ))}
              </FilterBtnRow>
            </FilterGroup>

            <FilterGroup>
              <FilterGroupLabel>상태</FilterGroupLabel>
              <FilterBtnRow>
                {["전체", ...STATUS_TABS].map((t) => (
                  <FilterBtn key={t} $active={activeStatusFilter === t} onClick={() => setActiveStatusFilter(t)}>{t}</FilterBtn>
                ))}
              </FilterBtnRow>
            </FilterGroup>

            <FilterGroup>
              <FilterGroupLabel>거리</FilterGroupLabel>
              <FilterBtnRow>
                {DISTANCE_OPTIONS.map((t) => (
                  <FilterBtn key={t} $active={activeDist === t} onClick={() => setActiveDist(t)}>{t}</FilterBtn>
                ))}
              </FilterBtnRow>
            </FilterGroup>

            <FilterGroup>
              <FilterGroupLabel>기간</FilterGroupLabel>
              <FilterBtnRow>
                {PERIOD_OPTIONS.map((t) => (
                  <FilterBtn key={t} $active={activePeriod === t} onClick={() => setActivePeriod(t)}>{t}</FilterBtn>
                ))}
              </FilterBtnRow>
            </FilterGroup>

            <FilterGroup>
              <FilterGroupLabel>그 밖에</FilterGroupLabel>
              <FilterBtnRow>
                <FilterBtn $active={activeCatFilters.length > 0} onClick={() => setShowCatSheet(true)}>
                  {activeCatFilters.length > 0 ? `카테고리 ${activeCatFilters.length}개` : "카테고리"} <IoChevronDown size={11} />
                </FilterBtn>
                <FilterBtn $active={hideClosed} onClick={() => setHideClosed((v) => !v)}>
                  {hideClosed ? "마감·취소 숨김" : "마감·취소 표시"}
                </FilterBtn>
              </FilterBtnRow>
            </FilterGroup>
            <FilterFoldBtn type="button" onClick={() => setShowFilters(false)}>
              필터 접기 <FilterChevron $open><IoChevronDown size={16} /></FilterChevron>
            </FilterFoldBtn>
          </FilterPanel>
          )}

          {sortedOrders.length === 0 ? (
            <EmptyOrders
              title={activeFilterChips.length > 0 ? "조건에 맞는 오더가 없어요" : "아직 올라온 오더가 없어요"}
              desc={activeFilterChips.length > 0 ? "거리를 넓히거나 기간을 늘려 보세요." : "새 오더가 올라오면 여기에 바로 보입니다."}
              onReset={activeFilterChips.length > 0 ? () => {
                setActiveSort("등록순"); setActiveStatusFilter("전체"); setActiveDist("전체");
                setActivePeriod("전체"); setActiveCatFilters([]);
              } : null}
            />
          ) : (
            <ScrollHintTable>
              <TableHeader>
                {/* 컬럼 순서: 날짜-상태-요청방식-서비스-지역-단가유형 (형 리뷰 7/31 — 요청방식 앞쪽 배치) */}
                {/* 옆으로 밀어도 날짜는 왼쪽에 붙어 있게 (대표 9/17) */}
                <ThCell $stickw={78} style={{textAlign:"center"}}>날짜</ThCell>
                <ThCell $flex={0.7} style={{textAlign:"center"}}>상태</ThCell>
                <ThCell $flex={0.7} style={{textAlign:"center"}}>요청방식</ThCell>
                <ThCell $flex={1.2} style={{textAlign:"center"}}>서비스</ThCell>
                <ThCell $flex={1.0} style={{textAlign:"center"}}>지역</ThCell>
                <ThCell $flex={1.1} style={{textAlign:"center"}}>단가유형</ThCell>
              </TableHeader>
              {sortedOrders.map((order, rowIdx) => {
                const cat = CATEGORIES.find((c) => c.id === order.categoryId);
                const dateLabel = formatOrderScheduleShort(order);
                const status = mapStatus(order.orderStatus);
                const statusColor = STATUS_COLOR[status] || STATUS_COLOR["접수"];
                const isUrgent = order.workDate === "긴급";
                const regionLabel = formatRegionLabel(order.location);
                const priceLabel = formatPriceType(order);
                const matchLabel = formatMatchType(order);
                return (
                  <TableRow key={order.id} $odd={rowIdx % 2 === 1} onClick={() => {
                    if (status === "마감") { showToast("이미 마감된 항목은 확인할 수 없습니다"); return; }
                    if (status === "대기" && order.createdBy !== uid) { showToast("접수자가 수정 중인 오더입니다"); return; }
                    if (order.createdBy !== uid && blockedUids.has(order.createdBy)) { showToast("거부등록된 오더입니다"); return; }
                    navigate(`/order/detail/${order.id}`, { state: { order, category: cat } });
                  }}>
                    <TdCell $stickw={78} style={{alignItems:"center"}}>
                      <TdDate $urgent={isUrgent}>{dateLabel}</TdDate>
                    </TdCell>
                    <TdCell $flex={0.7} style={{alignItems:"center"}}>
                      {/* 행 띠 배경 없이 "접수" 등 상태 글자에만 색 (형 리뷰 7/29) */}
                      <TdStatus style={{color: statusColor}}>
                        <StatusDot style={{background: statusColor}} />
                        {status}
                      </TdStatus>
                    </TdCell>
                    <TdCell $flex={0.7} style={{alignItems:"center"}}>
                      <TdLocation>{matchLabel}</TdLocation>
                    </TdCell>
                    {/* 서비스 = 종목명만 표기 (대분류 카테고리명 미표시 — 대표 지시 7/24) */}
                    <TdCell $flex={1.2} style={{alignItems:"center"}}>
                      <TdCatName>{order.subcategory || order.subcategories?.[0] || order.categoryName}</TdCatName>
                    </TdCell>
                    <TdCell $flex={1.0} style={{alignItems:"center"}}>
                      <TdLocation>{regionLabel}</TdLocation>
                    </TdCell>
                    <TdCell $flex={1.1} style={{alignItems:"center"}}>
                      <TdLocation>{priceLabel}</TdLocation>
                    </TdCell>
                  </TableRow>
                );
              })}
            </ScrollHintTable>
          )}

        <RoundCta onClick={() => navigate("/order/create")}>
          <IoAddCircle size={20} /> 접수
        </RoundCta>
        </>
      )}

      {/* ══════ 나의오더현황 ══════ */}
      {uid && activeTab === "my_orders" && (
        <>
          <MyOrdersContent />
        </>
      )}

      {/* ══════ AI견적 ══════ */}
      {uid && activeTab === "ai_estimate" && (
        <AIEstimateContent />
      )}

      {/* ══════ 작업자요청 (시트6 사양: 작업인력호출 리스트) ══════ */}
      {activeTab === "worker_request" && (
        <WorkerRequestList navigate={navigate} />
      )}

      {/* ══════ 가이드 ══════ */}
      {activeTab === "guide" && (
        <GuideSection>
          <CardTitle>홈프로 가이드</CardTitle>
          <CardDesc>'이대로만 따라해요!' 홈프로를 위한 안내서</CardDesc>
          <HScrollRow>
            <GuideCard $bg={THEME.background} onClick={() => navigate("/guide/1")}>
              <GuideIconWrap><IoDocumentTextOutline size={32} color={THEME.primary} /><GuideSubIcon><IoSendOutline size={18} color={THEME.primary} /></GuideSubIcon></GuideIconWrap>
              <GuideText>첫 견적 보내기,{"\n"}이렇게 하면 쉬워요</GuideText>
            </GuideCard>
            <GuideCard $bg={THEME.background} onClick={() => navigate("/guide/2")}>
              <GuideIconWrap><IoStarOutline size={32} color={THEME.primary} /><GuideSubIcon><IoChatbubbleOutline size={18} color={THEME.primary} /></GuideSubIcon></GuideIconWrap>
              <GuideText>고객 리뷰를 늘리는{"\n"}가장 효과적인 방법</GuideText>
            </GuideCard>
            <GuideCard $bg={THEME.background} onClick={() => navigate("/guide/3")}>
              <GuideIconWrap><IoWalletOutline size={32} color={THEME.primary} /><GuideSubIcon><IoCashOutline size={18} color={THEME.primary} /></GuideSubIcon></GuideIconWrap>
              <GuideText>홈프로캐시 보상은{"\n"}언제 이루어지나요?</GuideText>
            </GuideCard>
            <GuideCard $bg={THEME.background} onClick={() => navigate("/guide/4")}>
              <GuideIconWrap><IoCameraOutline size={32} color={THEME.primary} /></GuideIconWrap>
              <GuideText>프로필 사진,{"\n"}이렇게 찍으세요</GuideText>
            </GuideCard>
            <GuideCard $bg={THEME.background} onClick={() => navigate("/guide/5")}>
              <GuideIconWrap><IoStarOutline size={32} color={THEME.primary} /></GuideIconWrap>
              <GuideText>등급 시스템{"\n"}포인트로 올리세요</GuideText>
            </GuideCard>
          </HScrollRow>
        </GuideSection>
      )}

      {/* 사업자 정보·약관은 마이페이지로 옮김 (대표 9/17) */}
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
                  <SheetItemName>
                    {d}
                    {DISTANCE_RADIUS_HINT[d] && <DistHint>{DISTANCE_RADIUS_HINT[d]}</DistHint>}
                  </SheetItemName>
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

      {/* 정렬 바텀시트 */}
      {showSortSheet && (
        <SheetOverlay onClick={() => setShowSortSheet(false)}>
          <SheetContent onClick={(e) => e.stopPropagation()}>
            <SheetHandle />
            <SheetHeader>
              <SheetTitle>정렬</SheetTitle>
              <SheetCloseBtn onClick={() => setShowSortSheet(false)}>
                <IoCloseOutline size={24} color={THEME.text} />
              </SheetCloseBtn>
            </SheetHeader>
            <SheetList>
              {SORT_OPTIONS.map((s) => (
                <SheetItem key={s} onClick={() => { setActiveSort(s); setShowSortSheet(false); }}>
                  <SheetItemName>{s}</SheetItemName>
                  {activeSort === s && <IoCheckmarkCircle size={22} color={THEME.primary} />}
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

/* ── PC 보유자산 — 왼쪽 잔액·기간, 오른쪽 내역 표 ── */
const PC_POINT_COLS = "160px minmax(0, 1fr) 160px";
const PcAssetGrid = styled.div` display: grid; grid-template-columns: 300px minmax(0, 1fr); gap: 24px; align-items: start; `;
const PcAssetLabel = styled.div` font-size: 15px; color: #14181F; `;
const PcAssetValue = styled.div` font-size: 32px; font-weight: 800; color: #00963F; margin-top: 6px; `;
const PcPeriodList = styled.div` margin-top: 16px; background: #fff; border: 1px solid #dfe3e8; `;
const PcPeriodBtn = styled.button`
  display: block; width: 100%; text-align: left; border: none; border-top: 1px solid #dfe3e8; cursor: pointer; font-family: inherit;
  padding: 13px 18px; font-size: 15px; color: #14181F;
  background: ${({ $on }) => ($on ? "#e9ecf1" : "#fff")}; font-weight: ${({ $on }) => ($on ? 800 : 500)};
  &:first-child { border-top: none; }
`;
const PcTabTitle = styled.h1`
  font-size: 26px; font-weight: 800; color: #14181F; margin: 0; padding: 30px 32px 6px;
`;

/* ===================== Pull-to-Refresh styles ===================== */

const PullContainer = styled.div`
  overflow-y: auto;
  height: 100%;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
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
  font-size: 22px;
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
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.primary};
  margin-bottom: 4px;
`;

const UpdateContent = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.text};
  line-height: 1.4;
  margin-bottom: 6px;
`;

const UpdateText = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;

/* ===================== 공통 styles ===================== */

const PageWrap = styled.div`
  padding: 0;
  display: flex;
  flex-direction: column;
  background: ${THEME.background};
  min-height: 100vh;
`;

/* 상단 포인트 카드 (섹션 1-2) */
const PointLine = styled.div`
  .pc-mode & { display: none; } /* 등급·포인트는 PC 위 줄에 있다 */
  display: flex;
  background: ${THEME.surface};
  border-bottom: 1px solid #F2F4F7;
  position: sticky;
  top: 0;
  z-index: 20;
`;

const PointCell = styled.div`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  cursor: pointer;
`;

const PointCellDivider = styled.div`
  width: 1px;
  margin: 10px 0;
  background: #EFF1F4;
`;

const PointCellLabel = styled.div`
  font-size: 13px;
  color: #2b2f36;
`;

const PointLineTier = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  margin-top: 2px;
`;

const PointLineValue = styled.div`
  font-size: 20px;
  font-weight: 800;
  color: ${THEME.primary};
  margin-top: 1px;
`;

const PointCard = styled.div`
  margin: 10px 12px 12px;
  padding: 14px 16px;
  background: ${THEME.button};
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  border-radius: 12px;
  cursor: pointer;
  &:active { opacity: 0.9; }
`;

const PointCardLeft = styled.div`
  min-width: 0;
`;

const PointCardLabel = styled.div`
  font-size: 14px;
  opacity: 0.9;
`;

const PointCardTier = styled.div`
  margin-top: 4px;
  font-size: 14px;
  font-weight: 700;
  text-decoration: underline;
`;

const PointCardValue = styled.div`
  font-size: 26px;
  font-weight: 700;
  white-space: nowrap;
`;

/* 탭 줄 — 두 줄 (섹션 2-2) */
const HomeTabGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 6px;
  padding: 10px 12px;
`;

const HomeTabCell = styled.button`
  padding: 10px 6px;
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  background: ${({ $active }) => ($active ? THEME.purpleLight : THEME.surface)};
  color: ${({ $active }) => ($active ? THEME.primaryDark : THEME.text)};
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  border-radius: 8px;
  &:active { opacity: 0.85; }
`;

/* 요약 줄 (섹션 5-1) */
const SummaryLine = styled.div`
  margin: 12px 14px 0;
  font-size: 14px;
  color: #2b2f36;
  b { color: ${THEME.primaryDark}; }
`;

/* 필터 접기 줄 (섹션 3-1) */
const FilterToggleRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
  /* 탭 줄 바로 밑에 붙어 보여 위 여백을 늘림 (형 9/17) */
  padding: 20px 16px 12px;
`;

const FilterToggleBtn = styled.button`
  border: 1px solid ${({ $on }) => ($on ? THEME.primary : THEME.border)};
  background: ${({ $on }) => ($on ? THEME.purpleLight : THEME.surface)};
  color: ${THEME.text};
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  padding: 7px 10px 7px 12px;
  border-radius: 8px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
`;

const FilterChevron = styled.span`
  display: inline-flex;
  transition: transform 0.15s;
  transform: rotate(${({ $open }) => ($open ? "180deg" : "0deg")});
`;

const FilterFoldBtn = styled.button`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  width: 100%;
  height: 44px;
  border: none;
  border-top: 1px solid ${THEME.border};
  background: none;
  color: ${THEME.text};
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  margin-bottom: -6px;
`;

const ActiveChip = styled.button`
  border: 1px solid ${THEME.primary};
  background: ${THEME.surface};
  color: ${THEME.primaryDark};
  font-size: 13px;
  font-family: inherit;
  padding: 8px 10px;
  border-radius: 8px;
  cursor: pointer;
`;

const FilterCount = styled.span`
  margin-left: auto;
  font-size: 14px;
  color: ${THEME.text};
`;

/* 예약접수 — 화면 아래 고정 동그라미 버튼 (대표 9/17) */
const RoundCta = styled.button`
  position: fixed;
  left: 50%;
  transform: translateX(-50%);
  bottom: calc(78px + env(safe-area-inset-bottom, 0px));
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 46px;
  padding: 0 22px;
  border: none;
  border-radius: 24px;
  background: ${THEME.button};
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.18);
  z-index: 90;
  &:active { opacity: 0.9; }
  &:focus { outline: none; }
`;

const PointHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 14px 10px;
`;

/* 차수(1차수/2차수) 표시 — 텍스트+색 (대표 지시 7/29) */
const TierValue = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${({ $tier1 }) => ($tier1 ? THEME.primary : THEME.textSecondary)};
`;

const PointValue = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.primary};
  background: ${THEME.purpleLight};
  padding: 4px 10px;
  border-radius: 20px;
`;

const Card = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  margin: 12px 12px;
  box-shadow: ${THEME.cardShadow};
`;

const CardTitle = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const CardDesc = styled.div`
  font-size: 16px;
  color: ${THEME.muted};
  margin-top: 4px;
  font-weight: 400;
`;

const Greeting = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const GreetingSub = styled.div`
  font-size: 16px;
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
  font-size: 16px;
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
  font-size: 24px;
  font-weight: 600;
  color: ${THEME.text};
`;

const StatLabel = styled.div`
  font-size: 15px;
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
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.textSecondary};
  background: ${THEME.background};
  padding: 8px 10px;
  border-radius: 8px;
  margin: 16px 0 8px;
  &:first-child { margin-top: 4px; }
`;

const CatName = styled.div`
  font-size: 14px;
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
  background: ${THEME.button};
  color: #fff;
  font-size: 16px;
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
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.text};
`;

const StepDesc = styled.div`
  font-size: 15px;
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
  font-size: 16px;
  font-weight: 400;
  border-radius: 10px;
  z-index: 9999;
  white-space: nowrap;
  animation: ${slideDown} 0.3s ease-out;
`;

const BottomSpacer = styled.div`
  height: calc(16px + env(safe-area-inset-bottom, 0px));
`;

/* ===================== 사업자 정보 푸터 ===================== */

const CompanyFooter = styled.footer`
  margin: 28px 12px 8px;
  padding: 20px 8px 0;
  border-top: 1px solid ${THEME.border || "#F0F0F4"};
`;

const CompanyLinks = styled.div`
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  margin-top: 12px;
  line-height: 1.7;
  font-size: 14px;
  line-height: 1.4;
  button {
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    font-weight: 600;
    color: ${THEME.text};
    cursor: pointer;
  }
  column-gap: 12px;
  row-gap: 6px;
  button + button::before {
    content: "";
    display: inline-block;
    width: 1px;
    height: 12px;
    margin-right: 12px;
    background: ${THEME.border || "#E5E7EB"};
    vertical-align: -1px;
  }
`;

const CompanyName = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 8px;
`;

/* 사업자 정보 펼치기 — 박스 없이 글자만 (대표 9/17) */
const CompanyToggle = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
  padding: 13px 14px;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const CompanyRows = styled.div`
  display: flex;
  flex-direction: column;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
  padding: 14px;
  gap: 7px;
  font-size: 14px;
  line-height: 1.7;
  color: ${THEME.muted};
  span { word-break: keep-all; }
`;

const CompanyCopy = styled.div`
  margin-top: 16px;
  font-size: 13px;
  line-height: 1.7;
  color: ${THEME.muted};
  opacity: 0.7;
`;

/* ===================== 초대코드 탭 styles ===================== */

const InviteWrap = styled.div`
  /* PC — 카드 네 장을 두 칸으로 */
  .pc-mode & { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; max-width: 980px; }
  .pc-mode & > * { margin: 0; }
  padding: 0;
`;

const InviteCard = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  margin-top: 12px;
  box-shadow: ${THEME.cardShadow};
  &:first-child { margin-top: 0; }
`;

const InviteCardTitle = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

const InviteCardDesc = styled.div`
  font-size: 15px;
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
  font-size: 18px;
  font-weight: 600;
  color: ${THEME.primary};
  letter-spacing: 0.05em;
`;

const InviteCopyBtn = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 10px;
  background: ${THEME.button};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const ShareBtnRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 14px;
`;

const ShareBtn = styled.button`
  flex: 1;
  padding: 12px 0;
  border: 1px solid ${({ $primary }) => ($primary ? THEME.button : THEME.border)};
  border-radius: 10px;
  background: ${({ $primary }) => ($primary ? THEME.button : "#fff")};
  color: ${({ $primary }) => ($primary ? "#fff" : THEME.text)};
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  &:active { opacity: 0.8; }
`;

const InviteRegenBtn = styled.button`
  margin-top: 10px;
  background: none;
  border: none;
  font-size: 15px;
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
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
`;

const InviteStatLabel = styled.div`
  font-size: 14px;
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
  font-size: 17px;
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
  background: ${THEME.button};
  color: #fff;
  font-size: 17px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
  &:active { opacity: 0.85; }
  &:disabled { background: ${THEME.border}; color: ${THEME.muted}; }
`;

const ReferredList = styled.div`
  margin-top: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const ReferredRow = styled.div`
  font-size: 15px;
  color: #2b2f36;
  line-height: 1.6;
  word-break: keep-all;
`;

const ReferredStrong = styled.b`
  color: ${THEME.text};
  font-weight: 700;
`;

const InviteToast = styled.div`
  position: fixed;
  bottom: 100px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0,0,0,0.8);
  color: #fff;
  font-size: 16px;
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
  background: ${THEME.surface};
  border-bottom: 1px solid ${THEME.border};
  position: sticky;
  top: 61px; /* 포인트 줄(두 칸) 높이만큼 — 안 맞으면 스크롤 시 포인트 줄을 덮는다 */
  z-index: 20;
  &::-webkit-scrollbar { display: none; }
`;

const HomeTabBtn = styled.button`
  flex: ${({ $wide }) => ($wide ? 1.6 : 1)};
  /* 탭 높이 조금 키움 (형 9/18 "좀 작아 보여서") */
  padding: 14px 8px 12px;
  border: none;
  border-bottom: 3px solid ${({ $active }) => $active ? THEME.primary : "transparent"};
  background: ${THEME.surface};
  color: ${({ $active }) => $active ? THEME.primary : THEME.textSecondary};
  font-size: 15px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
  &:active { opacity: 0.8; }
  &:focus { outline: none; }
`;

const DistHint = styled.span`
  display: block;
  margin-top: 3px;
  font-size: 13px;
  font-weight: 500;
  color: #2b2f36;
`;

const HomeTabSub = styled.span`
  font-size: 13px;
  font-weight: 700;
  color: ${({ $active }) => $active ? THEME.primary : THEME.muted};
`;

/* 보유자산 (포인트 잔액 + 내역) */
/* 비회원 안내 (대표 9/17) */
const GuestNotice = styled.div`
  min-height: calc(100vh - 320px);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  margin: 0 14px;
  padding: 24px 18px;
  text-align: center;
`;

const GuestTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
`;

const GuestDesc = styled.div`
  margin-top: 10px;
  font-size: 15px;
  line-height: 1.6;
  color: #2b2f36;
  word-break: keep-all;
`;

const GuestBtnRow = styled.div`
  margin-top: 20px;
  width: 100%;
  max-width: 320px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const GuestPrimary = styled.button`
  height: 50px;
  border: none;
  border-radius: 10px;
  background: ${THEME.button};
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
`;

const GuestGhost = styled.button`
  height: 50px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
`;

const AssetWrap = styled.div`
  .pc-mode & { padding: 14px 32px 80px; }
  padding: 12px 16px 16px;
  display: flex;
  flex-direction: column;
`;

/* 한 상자 탭 — 위 홈 탭(밑줄)과 겹쳐 보이지 않게 (시안 1번, 형 9/18) */
const AssetSubTabs = styled.div`
  .pc-mode & { width: 300px; margin-bottom: 22px; }
  display: flex;
  margin: 0 0 14px;
  border: 1px solid #D9DDE3;
  background: ${THEME.surface};
`;

const AssetSubTab = styled.button`
  flex: 1;
  height: 48px;
  border: none;
  & + & { border-left: 1px solid #D9DDE3; }
  background: ${({ $active }) => ($active ? "#E9ECF1" : THEME.surface)};
  color: ${THEME.text};
  font-size: 16px;
  font-weight: ${({ $active }) => ($active ? 700 : 500)};
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
  &:focus { outline: none; }
`;

/* 색 면을 빼고 한 줄로 담백하게 (대표 9/17 "크고 색이 들어가 부담스럽다") */
const PointBalanceCard = styled.div`
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  background: ${THEME.surface};
  border: 1px solid ${THEME.border};
  border-radius: 12px;
  padding: 16px 16px;
`;

const PointBalanceLabel = styled.div`
  font-size: 15px;
  color: #2b2f36;
`;

const PointBalanceValue = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: ${THEME.text};
`;

const AssetListHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 20px 0 10px;
`;

const AssetListTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
`;

const PeriodChipRow = styled.div`
  display: flex;
  gap: 6px;
  overflow-x: auto;
  padding: 0 0 12px;
  &::-webkit-scrollbar { display: none; }
  scrollbar-width: none;
`;

const PeriodChip = styled.button`
  flex-shrink: 0;
  padding: 6px 14px;
  font-size: 15px;
  font-weight: 600;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  border-radius: 20px;
  background: ${({ $active }) => ($active ? THEME.primary : "#fff")};
  color: ${({ $active }) => ($active ? "#fff" : THEME.muted)};
  cursor: pointer;
  white-space: nowrap;
  &:focus { outline: none; }
`;

const AssetHistoryList = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  overflow: hidden;
`;

const AssetHistoryItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;

const AssetHistoryReason = styled.div`
  font-size: 17px;
  font-weight: 500;
  color: ${THEME.text};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const AssetHistoryDate = styled.div`
  font-size: 15px;
  color: ${THEME.muted};
  margin-top: 2px;
`;

const AssetHistoryAmt = styled.div`
  font-size: 18px;
  font-weight: 700;
  flex-shrink: 0;
  color: ${({ $type }) => $type === "earn" ? THEME.primary : $type === "use" ? THEME.danger : THEME.text};
`;

const AssetEmpty = styled.div`
  text-align: center;
  padding: 50px 0;
  font-size: 16px;
  color: ${THEME.muted};
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
  background: ${THEME.button};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  border: none;
  border-radius: 4px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.15);
  cursor: pointer;
  z-index: 90;
  &:active { opacity: 0.85; }
`;

const SectionTitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${THEME.text};
  padding: 16px 16px 0;
`;

/* 글자 상향 + 필터 추가로 한 줄에 안 들어가서 줄바꿈 허용 (가로 스크롤이면 뒤쪽 버튼이 안 보임) */
const FilterBtnRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

/* 펼친 필터 — 항목 이름으로 묶는다 (대표 9/17) */
const FilterPanel = styled.div`
  margin: 0 12px 12px;
  padding: 14px;
  background: ${THEME.surface};
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  gap: 14px;
`;

const FilterGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const FilterGroupLabel = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.text};
`;

const FilterLabel = styled.div`
  font-size: 15px;
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
  padding: 9px 14px;
  border-radius: 8px;
  border: 1px solid ${({ $active }) => $active ? THEME.primary : THEME.border};
  background: ${({ $active }) => $active ? `${THEME.primary}10` : THEME.surface};
  color: ${({ $active }) => $active ? THEME.primary : THEME.textSecondary};
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  &:focus { outline: none; }
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
  font-size: 15px;
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
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 15px;
  font-weight: 600;
  color: ${({ $active }) => $active ? THEME.primary : THEME.muted};
  border-bottom: 2px solid ${({ $active }) => $active ? THEME.primary : "transparent"};
  cursor: pointer;
  white-space: nowrap;
  margin-bottom: -2px;
  &:active { opacity: 0.7; }
`;

const StatusCount = styled.span`
  font-size: 14px;
  font-weight: 600;
  color: ${({ $active }) => $active ? "#fff" : THEME.muted};
  background: ${({ $active }) => $active ? THEME.button : THEME.border};
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
  font-size: 16px;
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
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
  display: flex;
  align-items: center;
  flex-wrap: wrap;
`;

const OrderQuote = styled.span`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const QuoteNum = styled.span`
  font-weight: 600;
  color: ${THEME.primary};
`;

const OrderTime = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  flex-shrink: 0;
`;

const OrderMiddle = styled.div`
  margin-top: 14px;
`;

const OrderCatName = styled.div`
  font-size: 16px;
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
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  word-break: keep-all;
  line-height: 1.4;
`;

const MatchBadge = styled.span`
  font-size: 14px;
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
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.textSecondary};
`;

const OrderDesc = styled.div`
  margin-top: 8px;
  font-size: 16px;
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
  font-size: 17px;
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
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  color: ${({ $primary }) => ($primary ? THEME.primary : THEME.textSecondary)};
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

/* ─── 테이블 스타일 ─── */

/* 가로 스크롤 힌트 컨테이너 (페이드/화살표를 표 위에 얹기 위한 기준) */
const TableScrollOuter = styled.div`
  position: relative;
  margin: 0 12px;
`;

const TableWrap = styled.div`
  /* 목록만 세로로 스크롤한다. 위쪽(지역·포인트·탭·필터)과 하단 탭은 제자리에 남는다 (대표 9/17) */
  /* 위쪽(지역·포인트·탭·필터)을 뺀 나머지를 모두 목록에 준다 — 하단 탭 바로 위까지 (대표 9/17) */
  height: calc(var(--app-h, 100vh) - 252px - env(safe-area-inset-bottom, 0px));
  min-height: 300px;
  background: ${THEME.surface};
  overflow: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  border: 1px solid ${THEME.border};
  scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;

/* 우측 페이드 — 표가 오른쪽으로 더 있다는 신호 */
const ScrollFade = styled.div`
  position: absolute;
  top: 1px;
  right: 1px;
  bottom: 1px;
  width: 40px;
  pointer-events: none;
  background: linear-gradient(to right, rgba(255,255,255,0), ${THEME.surface} 72%);
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transition: opacity 0.25s ease;
`;

/* 우측 chevron — 표가 더 있다는 정적 인디케이터 (애니메이션·클릭 없음) */
const ScrollHintArrow = styled.div`
  position: absolute;
  top: 50%;
  right: 6px;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  color: ${THEME.muted};
  pointer-events: none;
  opacity: ${({ $show }) => ($show ? 1 : 0)};
  transition: opacity 0.25s ease;
`;

const TableHeader = styled.div`
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  padding: 8px 12px;
  gap: 4px;
  background: #E9ECF1;
  border-bottom: 1px solid #D9DDE3;
  align-items: center;
  min-width: 600px;
`;

const ThCell = styled.div`
  ${({ $stickw }) => ($stickw ? `position: sticky; left: 0; z-index: 3; flex: 0 0 ${$stickw}px; width: ${$stickw}px; background: #E9ECF1;` : "")}
  flex: ${({ $flex, $stickw }) => ($stickw ? "0 0 " + $stickw + "px" : $flex || 1)};
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  white-space: nowrap;
`;

/* 행 띠(배경) 강조 제거 — 상태 글자에만 색 (형 리뷰 7/29) */
const TableRow = styled.div`
  display: flex;
  padding: 8px 12px;
  gap: 4px;
  background: ${({ $odd }) => ($odd ? "#F7F8FA" : THEME.surface)};
  border-bottom: 1px solid #EEF0F3;
  cursor: pointer;
  align-items: center;
  min-height: 40px;
  min-width: 600px;
  &:last-child { border-bottom: none; }
  &:active { background: #EDEFF3; }
`;

const TdCell = styled.div`
  ${({ $stickw }) => ($stickw ? `position: sticky; left: 0; z-index: 1; flex: 0 0 ${$stickw}px; width: ${$stickw}px; background: inherit;` : "")}
  flex: ${({ $flex, $stickw }) => ($stickw ? "0 0 " + $stickw + "px" : $flex || 1)};
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
  font-size: 14px;
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
  font-size: 13px;
  color: ${THEME.muted};
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TdCatName = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${({ $accent }) => ($accent ? "#fff" : THEME.text)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;


const TdBadge = styled.span`
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.primary};
  background: ${THEME.purpleLight};
  padding: 1px 5px;
  border-radius: 3px;
`;

const TdSub = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  margin-top: 2px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const TdLocation = styled.div`
  font-size: 15px;
  color: ${({ $accent }) => ($accent ? "#fff" : THEME.textSecondary)};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  text-align: center;
`;

const TdPrice = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.text};
  white-space: nowrap;
`;

const TdQuote = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.primary};
`;

const TdQuoteUnit = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-left: 1px;
`;

const TdTime = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
`;

const TdDate = styled.div`
  font-size: 15px;
  font-weight: ${({ $urgent }) => $urgent ? 700 : 400};
  /* 접수 행($accent)은 진한 보라 배경 위라 긴급 빨강 대신 흰 글씨 (굵기로 긴급 구분) */
  color: ${({ $urgent, $accent }) => $accent ? "#fff" : ($urgent ? THEME.danger : THEME.text)};
  white-space: nowrap;
`;

/* 상태: 뱃지 배경 없이 작은 점 + 텍스트+색 (숨고풍 담백) */
const TdStatus = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 600;
  white-space: nowrap;
`;

const StatusDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  flex-shrink: 0;
`;

const TdAmount = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
  text-align: right;
  white-space: nowrap;
`;

const ViewAllBtn = styled.div`
  text-align: center;
  padding: 16px;
  font-size: 16px;
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
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.textSecondary};
`;

const EmptySubText = styled.div`
  font-size: 15px;
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
  font-size: 20px;
  font-weight: 600;
  color: ${THEME.text};
`;

const TabPlaceholderDesc = styled.div`
  font-size: 16px;
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
  font-size: 17px;
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
  max-width: var(--app-max, 400px);
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
  font-size: 19px;
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
  font-size: 17px;
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
  font-size: 17px;
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
  font-size: 17px;
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
  background: ${THEME.button};
  color: #fff;
  font-size: 17px;
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
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.primary};
  letter-spacing: -0.02em;
`;

const CalDesc = styled.div`
  font-size: 16px;
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
  background: linear-gradient(135deg, ${THEME.button}, ${THEME.buttonDark || "#007A33"});
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
  font-size: 18px;
  font-weight: 700;
  color: #fff;
`;

const AICardDesc = styled.div`
  font-size: 15px;
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
  font-size: 13px;
  font-weight: 400;
  margin-bottom: 10px;
`;

const PostTitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${THEME.text};
  line-height: 1.4;
  letter-spacing: -0.02em;
`;

const PostDesc = styled.div`
  font-size: 15px;
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
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 17px;
  font-weight: 500;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  line-height: 1.45;
  white-space: pre-line;
`;
