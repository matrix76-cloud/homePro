/* eslint-disable */
import React, { useContext, useEffect, useRef } from "react";
import { Routes, Route, useLocation, useNavigate, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useMediaQuery } from "react-responsive";
import styled, { createGlobalStyle } from "styled-components";

import { UserContext } from "./context/User";
import { AuthProvider, useAuth } from "./context/AuthContext";
import useWebMessageListener from "./hooks/useWebMessageListener";
import usePcWide from "./hooks/usePcWide";
import PcHeader from "./components/pc/PcHeader";
import { PcSidebar, PcTopBar, PC_SIDE_W, PC_TOP_H } from "./components/pc/PcAppShell";
import PcOrdersPage from "./pc/PcOrdersPage";
import { attachMessageListener, postToRN, sendNavState } from "./bridge/webviewBridge";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// 앱(RN 셸) 기준 "첫 화면" — 여기서 뒤로가기는 앱 종료 흐름(두 번 눌러 종료)으로 간다
const APP_ROOT_PATHS = ["/", "/MobileSplash", "/MobileLogin", "/MobileMain", "/intro"];

// 대표 도메인 접속 여부 — 이 주소로 온 사람에겐 인트로(/intro)가 첫 화면이다
const IS_BRAND_DOMAIN =
  typeof window !== "undefined" && /(^|\.)tryhomepro\.com$/i.test(window.location.hostname);

// 첫 주소(/) — 대표 도메인: 로그인 전이면 홍보(/intro), 로그인돼 있으면 바로 오더목록. 그 밖(앱·web.app)은 스플래시
function RootRedirect() {
  const { loading, isLoggedIn } = useAuth();
  if (!IS_BRAND_DOMAIN) return <Navigate to="/MobileSplash" replace />;
  if (loading) return null;
  return <Navigate to={isLoggedIn ? "/MobileMain" : "/intro"} replace />;
}

// 푸시 data → 이동할 화면. 서버(onNotificationSend)가 data 에 type·orderId·roomId 를 실어 보낸다
function pushTargetPath(d = {}) {
  if (d.deeplink && String(d.deeplink).startsWith("/")) return String(d.deeplink);
  if (d.roomId) return `/chat/${d.roomId}`;
  if (d.orderId) return `/order/detail/${d.orderId}`;
  return "";
}

const PushBanner = styled.div`
  cursor: pointer;
  .t { font-size: 15px; font-weight: 700; color: #1b1f27; }
  .b { font-size: 14px; color: #2b2f36; margin-top: 3px; line-height: 1.4; }
`;
import RequireAuth from "./components/guards/RequireAuth";
import RequirePhone from "./components/guards/RequirePhone";
import RequireAdmin from "./components/guards/RequireAdmin";
import AdminLayout from "./components/admin/AdminLayout";

/* Pages */
import ColorLab from "./dev/ColorLab";
import IconLab from "./dev/IconLab";
import DesignLab from "./dev/DesignLab";
import MobileSplashpage from "./page/main/MobileSplashpage";
import MobileLoginpage from "./page/main/MobileLoginpage";
import MobileSignuppage from "./page/main/MobileSignuppage";
import MobileLinkPhonepage from "./page/main/MobileLinkPhonepage";
import MobileSetNicknamepage from "./page/main/MobileSetNicknamepage";
import WelcomePage from "./page/main/WelcomePage";
import MobileMainpage from "./page/main/MobileMainpage";
import MobileConfigpage from "./page/main/MobileConfigpage";
import MobileChatpage from "./page/main/MobileChatpage";
import MobileContractpage from "./page/main/MobileContractpage";
import MobileFindAccountpage from "./page/main/MobileFindAccountpage";
import OrderCreatePage from "./page/order/OrderCreatePage";
import OrderListPage from "./page/order/OrderListPage";
import OrderDetailPage from "./page/order/OrderDetailPage";
import WorkLogPage from "./page/order/WorkLogPage";
import AIEstimatePage from "./page/order/AIEstimatePage";
import MyOrdersPage, { MyOrdersFooterPage } from "./page/order/MyOrdersPage";
import WorkerRequestCreatePage from "./page/order/WorkerRequestCreatePage";
import WorkerRequestDetailPage from "./page/order/WorkerRequestDetailPage";
import MarketplacePage from "./page/order/MarketplacePage";
import MarketplaceCreatePage from "./page/order/MarketplaceCreatePage";
import MarketplaceDetailPage from "./page/order/MarketplaceDetailPage";
import SubscriptionPage from "./page/mypage/SubscriptionPage";
import EducationMarketPage from "./page/main/EducationMarketPage";
import InsurancePage from "./page/insurance/InsurancePage";
import InsuranceMyPage from "./page/insurance/InsuranceMyPage";
import InsuranceClaimPage from "./page/insurance/InsuranceClaimPage";
import PayPage from "./page/pay/PayPage";
import PaySuccessPage from "./page/pay/PaySuccessPage";
import PayFailPage from "./page/pay/PayFailPage";
import BillingSuccessPage from "./page/pay/BillingSuccessPage";
import RequireInsuranceAdmin from "./page/insurance-admin/RequireInsuranceAdmin";
import InsuranceAdminLayout from "./page/insurance-admin/InsuranceAdminLayout";
import InsAdminDashboardPage from "./page/insurance-admin/InsAdminDashboardPage";
import InsAdminPoliciesPage from "./page/insurance-admin/InsAdminPoliciesPage";
import InsAdminSettlementPage from "./page/insurance-admin/InsAdminSettlementPage";
import InsAdminClaimsPage from "./page/insurance-admin/InsAdminClaimsPage";
import InsAdminSettingsPage from "./page/insurance-admin/InsAdminSettingsPage";
import AdminPaymentsPage from "./page/admin/AdminPaymentsPage";
import PaymentHistoryPage from "./page/mypage/PaymentHistoryPage";
import PgPaymentPage from "./page/mypage/PgPaymentPage";
import PgLinkPage from "./page/pay/PgLinkPage";
import BrokerageDetailPage from "./page/main/BrokerageDetailPage";
import ProfileViewPage from "./page/profile/ProfileViewPage";
import BrokeragePage from "./page/main/BrokeragePage";
import BrokerageCreatePage from "./page/main/BrokerageCreatePage";
import SeedLoginPage from "./page/test/SeedLoginPage";
import LandingPage from "./page/landing/LandingPage";
import CategoryProListPage from "./page/category/CategoryProListPage";
import ServiceDetailPage from "./page/category/ServiceDetailPage";
import ProCategoryRegisterPage from "./page/pro/ProCategoryRegisterPage";
import ProCategoryListPage from "./page/pro/ProCategoryListPage";
import ProCategoryDetailPage from "./page/pro/ProCategoryDetailPage";
import ProCategoryEditPage from "./page/pro/ProCategoryEditPage";
import BizProfilePage from "./page/pro/BizProfilePage";
import ProListPage from "./page/pro/ProListPage";
import TrainingPage from "./page/training/TrainingPage";
import TrainingCreatePage from "./page/training/TrainingCreatePage";
import TrainingDetailPage from "./page/training/TrainingDetailPage";
import SuppliesPage from "./page/supplies/SuppliesPage";
import SuppliesCreatePage from "./page/supplies/SuppliesCreatePage";
import SuppliesDetailPage from "./page/supplies/SuppliesDetailPage";
import TermsPage from "./page/legal/TermsPage";
import PrivacyPage from "./page/legal/PrivacyPage";
import LocationTermsPage from "./page/legal/LocationTermsPage";
import NoticePage from "./page/notice/NoticePage";
import SupportPage from "./page/support/SupportPage";
import CalendarPage from "./page/calendar/CalendarPage";
import ScheduleCreatePage from "./page/calendar/ScheduleCreatePage";
import SearchPage from "./page/search/SearchPage";
import ChatDetailPage from "./page/chat/ChatDetailPage";
import ChatMemoPage from "./page/chat/ChatMemoPage";
import CommunityPage from "./page/community/CommunityPage";
import CommunityDetailPage from "./page/community/CommunityDetailPage";
import CommunityWritePage from "./page/community/CommunityWritePage";
import GuidePage from "./page/guide/GuidePage";
import ReferralFriendsPage from "./page/referral/ReferralFriendsPage";
import ReferralPointsPage from "./page/referral/ReferralPointsPage";
import ReferralInputPage from "./page/referral/ReferralInputPage";
import BlockListPage from "./page/mypage/BlockListPage";
import AppSettingsPage from "./page/mypage/AppSettingsPage";
import BlacklistPage from "./page/mypage/BlacklistPage";
import BlacklistBoardPage from "./page/mypage/BlacklistBoardPage";

/* Admin Pages */
import AdminLoginPage from "./page/admin/AdminLoginPage";
import AdminDashboardPage from "./page/admin/AdminDashboardPage";
import AdminUsersPage from "./page/admin/AdminUsersPage";
import AdminMatchingPage from "./page/admin/AdminMatchingPage";
import AdminChatPage from "./page/admin/AdminChatPage";
import AdminAdsPage from "./page/admin/AdminAdsPage";
import AdminPointsPage from "./page/admin/AdminPointsPage";
import AdminNoticePage from "./page/admin/AdminNoticePage";
import AdminUpdatesPage from "./page/admin/AdminUpdatesPage";
import AdminSettingsPage from "./page/admin/AdminSettingsPage";
import AdminSettlementPage from "./page/admin/AdminSettlementPage";
import AdminProApprovalPage from "./page/admin/AdminProApprovalPage";
import AdminBlacklistPage from "./page/admin/AdminBlacklistPage";

/* Dev 전용 — 리뷰 허브 (프로덕션 빌드에서 라우트 게이트로 제외, lazy로 청크 분리) */
const AuthReview = React.lazy(() => import("./dev/AuthReview"));
const ReviewTable = React.lazy(() => import("./dev/ReviewTable"));
const ReviewLab = React.lazy(() => import("./dev/ReviewLab"));   // 리뷰 페이지 재구축 시안 랩 (2026-09-12)

/* ===================== motion wrappers ===================== */

const pageFade = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
};

const PageWrapper = ({ children }) => (
  <motion.div variants={pageFade} initial="initial" animate="animate" exit="exit" transition={{ duration: 0.5 }}>
    {children}
  </motion.div>
);

const wrap = (el) => <PageWrapper>{el}</PageWrapper>;

/* ===================== layout / global ===================== */

const Container = styled.div`
  max-width: var(--app-max, 400px);
  margin: 0 auto;
  background: #F2F4F6;
  min-height: 100vh;
  position: relative;
`;

const FullContainer = styled.div`
  width: 100%;
`;

/* PC 가운데 단 — transform 으로 안쪽 position:fixed(기존 화면의 고정 헤더·하단 버튼·시트)가
   창이 아니라 이 단 기준으로 붙게 한다. 스크롤은 안쪽 PcScroll 이 맡아 고정 요소는 따라 움직이지 않는다 */
const PcStage = styled.div`
  position: fixed; top: ${PC_TOP_H}px; left: ${PC_SIDE_W}px; right: 0; bottom: 0;
  background: #F7F8FA; display: flex; justify-content: center;
`;
const PcFrame = styled.div`
  width: var(--app-max); height: 100%; transform: translateZ(0); overflow: hidden; flex: 0 1 auto; min-width: 0;
  background: #F2F4F6; border-left: 1px solid #dfe3e8; border-right: 1px solid #dfe3e8; box-sizing: content-box;
  & + & { border-left: none; }
`;
const PcChatEmpty = styled.div`
  height: 100%; min-height: calc(100vh - ${PC_TOP_H}px); display: flex; align-items: center; justify-content: center;
  font-size: 17px; color: #14181F; background: #fff;
`;
// PC 본문 — on 이 꺼져 있으면 아무것도 감싸지 않는다(폰·앱·전폭 화면). left 가 있으면 좌우 2단(채팅: 목록 | 대화방)
const PcBody = ({ on, width, left, children }) => {
  if (!on) return children;
  const vars = (w) => ({ "--app-max": `${w}px`, "--app-h": `calc(100vh - ${PC_TOP_H}px)` });
  return (
    <PcStage>
      {left && <PcFrame style={vars(380)}><PcScroll><Container>{left}</Container></PcScroll></PcFrame>}
      <PcFrame style={vars(width)}><PcScroll>{children}</PcScroll></PcFrame>
    </PcStage>
  );
};
/* PC 용으로 옮긴 넓은 화면 — 세로 메뉴·위 줄만큼 비우고 창 스크롤을 그대로 쓴다 */
const PcWideBody = styled.div`
  min-height: 100vh; box-sizing: border-box; background: #F7F8FA;
  padding-left: ${PC_SIDE_W}px; padding-top: ${PC_TOP_H}px;
`;
const PcScroll = styled.div`
  height: 100%; overflow-y: auto; overflow-x: hidden;
  ${Container} { min-height: 100%; }
`;

const GlobalStyle = createGlobalStyle`
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    overscroll-behavior: none;
    touch-action: none;
    background: #F2F4F6;
    font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Malgun Gothic', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  #root, #app { height: 100vh; }

  * {
    box-sizing: border-box;
  }
`;

// 푸시 배너 모양 — 흰 면·얇은 테두리·각진 모서리. 상단 안전영역만큼 내린다
const PushToastStyle = createGlobalStyle`
  .Toastify__toast-container--top-center { top: calc(env(safe-area-inset-top, 0px) + 10px); width: calc(100% - 32px); max-width: 480px; }
  .Toastify__toast { border-radius: 0; border: 1px solid #d9dde3; box-shadow: 0 2px 10px rgba(0,0,0,0.08); background: #fff; color: #1b1f27; font-family: inherit; min-height: 56px; padding: 12px 16px; }
  .Toastify__toast-body { padding: 0; font-size: 15px; }
`;

/* ===================== routes ===================== */

const AnimatedRoutes = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, dispatch } = useContext(UserContext);
  const exitArmedAtRef = useRef(0);

  // 앱(RN): 화면이 바뀔 때마다 상태를 셸에 알린다 — 셸은 이걸 보고 뒤로가기를 웹에 넘길지 종료 흐름으로 갈지 정한다.
  // (안 보내면 셸은 늘 첫 화면이라 믿고 어느 화면에서든 종료 요청을 보낸다)
  useEffect(() => {
    const path = location.pathname || "/";
    const isRoot = APP_ROOT_PATHS.includes(path);
    sendNavState({ path, isRoot, canGoBackInWeb: !isRoot && window.history.length > 1 });
  }, [location.pathname]);

  const isGalaxyFlipUnfolded = useMediaQuery({ minWidth: 450, maxWidth: 767 });

  // RN 브릿지 메시지 리스너 초기화
  useEffect(() => {
    const detach = attachMessageListener();
    return () => detach?.();
  }, []);

  // RN → Web 메시지 수신 핸들러
  useWebMessageListener((data) => {
    const p = data?.payload || {};

    switch (data.type) {
      case "FCM_TOKEN":
      case "PUSH_TOKEN": {
        const tk = p.token || p.fcmToken || "";
        if (tk) dispatch({ pushGranted: true, USERINFO: { ...user?.USERINFO, token: tk } });
        break;
      }

      case "CURRENTPOSITION": {
        dispatch({
          locationGranted: true,
          USERINFO: { ...user?.USERINFO, latitude: p.latitude, longitude: p.longitude },
        });
        break;
      }

      case "PERMISSION_CONFIRMED": {
        dispatch({
          locationGranted: p.locationGranted,
          pushGranted: p.pushGranted,
          USERINFO: { ...user?.USERINFO, latitude: p.latitude, longitude: p.longitude, token: p.token },
        });
        break;
      }

      case "PERMISSION_REVOKED": {
        dispatch({
          locationGranted: p.locationGranted ?? false,
          pushGranted: p.pushGranted ?? false,
        });
        break;
      }

      case "BACK_REQUEST": {
        if (window.history.length > 1) {
          window.history.back();
        } else {
          navigate("/MobileMain", { replace: true });
        }
        break;
      }

      case "APP_EXIT_REQUEST": {
        // 첫 화면에서 뒤로가기 — 2초 안에 한 번 더 누르면 종료
        const now = Date.now();
        if (now - exitArmedAtRef.current < 2000) {
          postToRN("EXIT_APP", { at: now });
          break;
        }
        exitArmedAtRef.current = now;
        toast.info("한 번 더 누르면 앱이 종료됩니다.", { toastId: "app-exit", autoClose: 1800 });
        break;
      }

      case "PUSH_EVENT": {
        const target = pushTargetPath(p?.data || p);
        // 시스템 알림을 눌러 앱이 열린 경우 — 배너 없이 바로 이동
        if (p?.event === "opened") {
          if (target) navigate(target);
          break;
        }
        // 앱을 보고 있을 때 온 푸시 — 화면 위 배너
        if (!p?.title && !p?.body) break;
        toast(
          <PushBanner>
            <div className="t">{p?.title || "홈프로"}</div>
            {p?.body ? <div className="b">{p.body}</div> : null}
          </PushBanner>,
          {
            toastId: p?.messageId || `push-${p?.ts || Date.now()}`,
            position: "top-center",
            autoClose: 5000,
            onClick: () => { if (target) navigate(target); },
          }
        );
        break;
      }

      default:
        break;
    }
  });

  // PC 폭에서는 로그인 화면이 좌우 분할 전폭으로 뜬다 (폰·앱은 그대로 폭 400)
  const pcWide = usePcWide();
  const isFullWidth =
    (pcWide && location.pathname === "/MobileLogin") ||
    location.pathname.startsWith("/admin") ||
    location.pathname.startsWith("/insurance-admin") ||
    location.pathname.startsWith("/review") ||
    location.pathname.startsWith("/lab") ||
    location.pathname.startsWith("/iconlab") ||
    location.pathname.startsWith("/colorlab") ||
    location.pathname === "/intro";
  let Wrapper = isFullWidth ? FullContainer : Container;

  // PC 위 메뉴 — 관리자·리뷰·시안·결제 링크(고객용)·로그인·스플래시에는 달지 않는다
  const p = location.pathname;
  const pcBare =
    p === "/" || p === "/MobileLogin" || p === "/MobileSplash" || p === "/seed-login" ||
    p.startsWith("/admin") || p.startsWith("/insurance-admin") || p.startsWith("/review") ||
    p.startsWith("/lab") || p.startsWith("/iconlab") || p.startsWith("/colorlab") || p.startsWith("/pg/");
  // 홍보 화면(/intro)은 위 메뉴, 그 밖의 앱 화면은 왼쪽 세로 메뉴 틀 (시안 랩 pcshell 3번)
  const showPcHeader = pcWide && !pcBare && p === "/intro";
  const pcApp = pcWide && !pcBare && p !== "/intro";
  // 아직 PC 용으로 옮기지 않은 화면은 본문 가운데 단(폭 400)에 기존 화면 그대로 보여 준다
  // PC 용으로 옮긴 화면(넓은 본문) — 지금은 오더목록. 나머지는 가운데 단
  const pcTab = new URLSearchParams(location.search).get("tab");
  const pcWidePage = pcApp && p === "/MobileMain" && (!pcTab || pcTab === "all_orders");
  const pcColumn = pcApp && !pcWidePage;
  if (pcWidePage) Wrapper = PcWideBody;
  // 가운데 단 폭 — 기존 화면의 폭 제한(--app-max)을 PC 에서만 넓힌다. 가입·인증류는 좁게
  const pcNarrow = /^\/(MobileSignup|MobileFindAccount|MobileLinkPhone|MobileSetNickname|ReferralInput|welcome|legal)/.test(p);
  const pcChat = pcColumn && (p === "/MobileChat" || p.startsWith("/chat/"));
  const pcBodyWidth = pcChat ? 860 : pcNarrow ? 480 : 720;

  return (
    <>
    {showPcHeader && <PcHeader />}
    {pcApp && <><PcSidebar /><PcTopBar /></>}
    <PcBody on={pcColumn} width={pcBodyWidth} left={pcChat ? <MobileChatpage /> : null}>
    <AnimatePresence mode="wait">
      <Wrapper>
        <ToastContainer position="bottom-center" hideProgressBar closeButton={false} newestOnTop limit={2} />
        <PushToastStyle />
        <Routes location={location} key={location.pathname}>
          {/* Public - 인증 불필요 */}
          {/* 대표 도메인(tryhomepro.com)으로 들어오면 인트로가 첫 화면. 앱(WebView)·web.app 은 그대로 스플래시 */}
          <Route path="/" element={<RootRedirect />} />
          <Route path="/intro" element={<LandingPage />} />
          <Route path="/MobileSplash" element={wrap(<MobileSplashpage />)} />
          {/* 홈 — 비회원도 둘러볼 수 있다. 로그인한 사람만 전화번호 단계를 거친다 (대표 9/17) */}
          <Route element={<RequirePhone onlyIfLoggedIn />}>
            <Route path="/MobileMain" element={pcWidePage ? <PcOrdersPage /> : wrap(<MobileMainpage />)} />
          </Route>
          <Route path="/MobileLogin" element={wrap(<MobileLoginpage />)} />
          <Route path="/MobileSignup" element={wrap(<MobileSignuppage />)} />
          <Route path="/MobileFindAccount" element={wrap(<MobileFindAccountpage />)} />
          <Route path="/legal/terms" element={wrap(<TermsPage />)} />
          <Route path="/legal/privacy" element={wrap(<PrivacyPage />)} />
          <Route path="/legal/location" element={wrap(<LocationTermsPage />)} />
          {/* 고객용 PG 결제링크 — 로그인 없이 (대표 리뷰 9/17) */}
          <Route path="/pg/:id" element={wrap(<PgLinkPage />)} />
          <Route path="/seed-login" element={<SeedLoginPage />} />
          {/* 색 시안 랩 (대표 9/17) */}
          <Route path="/colorlab" element={<ColorLab />} />
          <Route path="/iconlab" element={<IconLab />} />
          <Route path="/lab" element={<DesignLab />} />

          {/* 리뷰 허브 (/review, /review-table) — 배포 공유용(Firestore). 어디서든 접속해 리뷰 */}
          <Route path="/review" element={<React.Suspense fallback={null}><AuthReview /></React.Suspense>} />
          <Route path="/review/:id" element={<React.Suspense fallback={null}><AuthReview /></React.Suspense>} />
          <Route path="/review-table" element={<React.Suspense fallback={null}><ReviewTable /></React.Suspense>} />
          <Route path="/reviewlab" element={<React.Suspense fallback={null}><ReviewLab /></React.Suspense>} />

          {/* Auth Required - 로그인 필요 */}
          <Route element={<RequireAuth />}>
            <Route path="/MobileLinkPhone" element={wrap(<MobileLinkPhonepage />)} />
            <Route path="/MobileSetNickname" element={wrap(<MobileSetNicknamepage />)} />
            <Route path="/ReferralInput" element={wrap(<ReferralInputPage />)} />
            {/* 가입 완료 안내 (대표 9/17) */}
            <Route path="/welcome" element={wrap(<WelcomePage />)} />

            {/* 전화번호 미등록이면 /MobileLinkPhone 으로 (형 지시 7/28 — 전화번호 단계 복원).
                번호가 계정 통합의 기준키라, 이 단계를 건너뛰면 같은 사람이 여러 계정으로 갈라진다. */}
            <Route element={<RequirePhone />}>
            <Route path="/MobileConfig" element={wrap(<MobileConfigpage />)} />
            <Route path="/MobileChat" element={pcChat ? <PcChatEmpty>왼쪽에서 대화를 고르면 이곳에 열립니다.</PcChatEmpty> : wrap(<MobileChatpage />)} />
            <Route path="/chat/:roomId" element={wrap(<ChatDetailPage />)} />
            <Route path="/chat/:roomId/memo" element={wrap(<ChatMemoPage />)} />
            <Route path="/MobileContract" element={wrap(<MobileContractpage />)} />

            {/* Pro */}
            <Route path="/biz-profile" element={wrap(<BizProfilePage />)} />
            <Route path="/pro/list" element={wrap(<ProListPage />)} />
            <Route path="/education-market" element={wrap(<EducationMarketPage />)} />
            {/* 일일 미니보험 안심케어 — 하단탭 (교육.장터 자리 대체, 대표 지시 8/4) */}
            <Route path="/insurance" element={wrap(<InsurancePage />)} />
            {/* 보험 가입·사고 접수·토스 결제 (9/13) */}
            <Route path="/insurance/my" element={wrap(<InsuranceMyPage />)} />
            <Route path="/insurance/claim" element={wrap(<InsuranceClaimPage />)} />
            <Route path="/insurance/claim/:orderId" element={wrap(<InsuranceClaimPage />)} />
            <Route path="/pay" element={wrap(<PayPage />)} />
            <Route path="/pay/success" element={wrap(<PaySuccessPage />)} />
            <Route path="/pay/fail" element={wrap(<PayFailPage />)} />
            <Route path="/pay/billing-success" element={wrap(<BillingSuccessPage />)} />
            {/* 공동중개 라운지 — 조회는 누구나, 글쓰기·손님공유 연결은 인증 공인중개사만 (대표 9/10 권한 구조, 9/13 반영). 판정은 페이지 안에서 */}
            <Route>
              <Route path="/brokerage" element={wrap(<BrokeragePage />)} />
              <Route path="/brokerage/create" element={wrap(<BrokerageCreatePage />)} />
              <Route path="/brokerage/:id" element={wrap(<BrokerageDetailPage />)} />
            <Route path="/profile/:uid" element={wrap(<ProfileViewPage />)} />
            </Route>
            <Route path="/training" element={wrap(<TrainingPage />)} />
            <Route path="/training/create" element={wrap(<TrainingCreatePage />)} />
            <Route path="/training/:id" element={wrap(<TrainingDetailPage />)} />
            <Route path="/supplies" element={wrap(<SuppliesPage />)} />
            <Route path="/supplies/create" element={wrap(<SuppliesCreatePage />)} />
            <Route path="/supplies/:id" element={wrap(<SuppliesDetailPage />)} />
            <Route path="/pro/register-category" element={wrap(<ProCategoryRegisterPage />)} />
            <Route path="/pro/categories" element={wrap(<ProCategoryListPage />)} />
            <Route path="/pro/category-detail/:categoryId" element={wrap(<ProCategoryDetailPage />)} />
            <Route path="/pro/category-edit/:categoryId" element={wrap(<ProCategoryEditPage />)} />

            {/* Category & Service */}
            <Route path="/category/:categoryId" element={wrap(<CategoryProListPage />)} />
            <Route path="/service/:categoryId/:serviceId" element={wrap(<ServiceDetailPage />)} />

            {/* Notice */}
            <Route path="/notice" element={wrap(<NoticePage />)} />
            <Route path="/support" element={wrap(<SupportPage />)} />

            {/* 내 요청 (풋터) */}
            <Route path="/my-orders" element={wrap(<MyOrdersFooterPage />)} />

            {/* Order */}
            <Route path="/order/ai-estimate" element={wrap(<AIEstimatePage />)} />
            <Route path="/order/my-orders" element={wrap(<MyOrdersPage />)} />
            <Route path="/order/create" element={wrap(<OrderCreatePage />)} />
            <Route path="/order/create/:categoryId" element={wrap(<OrderCreatePage />)} />
            <Route path="/order/list" element={wrap(<OrderListPage />)} />
            <Route path="/order/detail/:orderId" element={wrap(<OrderDetailPage />)} />
            {/* 현장 작업기록 — 체크인(Before)/작업중/체크아웃(After) */}
            <Route path="/order/worklog/:orderId" element={wrap(<WorkLogPage />)} />
            <Route path="/order/worker-request/create" element={wrap(<WorkerRequestCreatePage />)} />
            <Route path="/order/worker-request/detail/:requestId" element={wrap(<WorkerRequestDetailPage />)} />
            <Route path="/marketplace" element={wrap(<MarketplacePage />)} />
            <Route path="/marketplace/create" element={wrap(<MarketplaceCreatePage />)} />
            <Route path="/marketplace/:marketplaceId" element={wrap(<MarketplaceDetailPage />)} />
            <Route path="/subscription" element={wrap(<SubscriptionPage />)} />
            <Route path="/mypage/payments" element={wrap(<PaymentHistoryPage />)} />
            <Route path="/mypage/pg" element={wrap(<PgPaymentPage />)} />

            {/* Search */}
            <Route path="/search" element={wrap(<SearchPage />)} />

            {/* Calendar */}
            <Route path="/calendar" element={wrap(<CalendarPage />)} />
            <Route path="/calendar/create" element={wrap(<ScheduleCreatePage />)} />

            {/* Guide */}
            <Route path="/guide/:guideId" element={wrap(<GuidePage />)} />

            {/* Mypage */}
            <Route path="/mypage/blocks" element={wrap(<BlockListPage />)} />
            <Route path="/mypage/app-settings" element={wrap(<AppSettingsPage />)} />
            <Route path="/mypage/blacklist" element={wrap(<BlacklistPage />)} />
            <Route path="/blacklist-board" element={wrap(<BlacklistBoardPage />)} />

            {/* Community */}
            <Route path="/community" element={wrap(<CommunityPage />)} />
            <Route path="/community/write" element={wrap(<CommunityWritePage />)} />
            <Route path="/community/:postId" element={wrap(<CommunityDetailPage />)} />
            </Route>
          </Route>

          {/* Referral */}
          <Route element={<RequireAuth />}>
            <Route path="/referral/friends" element={wrap(<ReferralFriendsPage />)} />
            <Route path="/referral/points" element={wrap(<ReferralPointsPage />)} />
          </Route>

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          {/* 보험대리점 관리자 — 운영자 /admin 과 분리 (대표 8/20, 9/13 구현) */}
          <Route element={<RequireInsuranceAdmin />}>
            <Route path="/insurance-admin" element={<InsuranceAdminLayout />}>
              <Route index element={<InsAdminDashboardPage />} />
              <Route path="policies" element={<InsAdminPoliciesPage />} />
              <Route path="settlement" element={<InsAdminSettlementPage />} />
              <Route path="claims" element={<InsAdminClaimsPage />} />
              <Route path="settings" element={<InsAdminSettingsPage />} />
            </Route>
          </Route>
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:filter" element={<AdminUsersPage />} />
              <Route path="pro-approval" element={<AdminProApprovalPage />} />
              <Route path="pro-approval/:filter" element={<AdminProApprovalPage />} />
              <Route path="blacklist" element={<AdminBlacklistPage />} />
              <Route path="blacklist/:filter" element={<AdminBlacklistPage />} />
              <Route path="matching" element={<AdminMatchingPage />} />
              <Route path="matching/:filter" element={<AdminMatchingPage />} />
              <Route path="chat" element={<AdminChatPage />} />
              <Route path="chat/:filter" element={<AdminChatPage />} />
              <Route path="ads" element={<AdminAdsPage />} />
              <Route path="ads/:filter" element={<AdminAdsPage />} />
              <Route path="points" element={<AdminPointsPage />} />
              <Route path="points/:filter" element={<AdminPointsPage />} />
              <Route path="notice" element={<AdminNoticePage />} />
              <Route path="notice/:filter" element={<AdminNoticePage />} />
              <Route path="settlement" element={<AdminSettlementPage />} />
              <Route path="payments" element={<AdminPaymentsPage />} />
              <Route path="settlement/:filter" element={<AdminSettlementPage />} />
              <Route path="updates" element={<AdminUpdatesPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="settings/:filter" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </Wrapper>
    </AnimatePresence>
    </PcBody>
    </>
  );
};

function App() {
  // 초대 딥링크 캡처는 index.js 최상단(라우팅 마운트 전 동기 실행)으로 이동했다.
  // App useEffect 로 두면 로그아웃 상태 "/" 진입 시 로그인 리다이렉트가 먼저 실행돼 ?code 가 유실됨.

  return (
    <AuthProvider>
      <GlobalStyle />
      <AnimatedRoutes />
    </AuthProvider>
  );
}

export default App;
