/* eslint-disable */
import React, { useContext, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useMediaQuery } from "react-responsive";
import styled, { createGlobalStyle } from "styled-components";

import { UserContext } from "./context/User";
import { AuthProvider } from "./context/AuthContext";
import useWebMessageListener from "./hooks/useWebMessageListener";
import { attachMessageListener, postToRN } from "./bridge/webviewBridge";
import RequireAuth from "./components/guards/RequireAuth";
// import RequirePhone from "./components/guards/RequirePhone";
import RequireAdmin from "./components/guards/RequireAdmin";
import AdminLayout from "./components/admin/AdminLayout";

/* Pages */
import MobileSplashpage from "./page/main/MobileSplashpage";
import MobileLoginpage from "./page/main/MobileLoginpage";
import MobileSignuppage from "./page/main/MobileSignuppage";
import MobileLinkPhonepage from "./page/main/MobileLinkPhonepage";
import MobileSetNicknamepage from "./page/main/MobileSetNicknamepage";
import MobileMainpage from "./page/main/MobileMainpage";
import MobileConfigpage from "./page/main/MobileConfigpage";
import MobileChatpage from "./page/main/MobileChatpage";
import MobileContractpage from "./page/main/MobileContractpage";
import MobileFindAccountpage from "./page/main/MobileFindAccountpage";
import OrderCreatePage from "./page/order/OrderCreatePage";
import OrderListPage from "./page/order/OrderListPage";
import OrderDetailPage from "./page/order/OrderDetailPage";
import AIEstimatePage from "./page/order/AIEstimatePage";
import MyOrdersPage, { MyOrdersFooterPage } from "./page/order/MyOrdersPage";
import WorkerRequestCreatePage from "./page/order/WorkerRequestCreatePage";
import WorkerRequestDetailPage from "./page/order/WorkerRequestDetailPage";
import MarketplacePage from "./page/order/MarketplacePage";
import MarketplaceCreatePage from "./page/order/MarketplaceCreatePage";
import MarketplaceDetailPage from "./page/order/MarketplaceDetailPage";
import SubscriptionPage from "./page/mypage/SubscriptionPage";
import WalletRegisterPage from "./page/mypage/WalletRegisterPage";
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
import OpenChatCreatePage from "./page/chat/OpenChatCreatePage";
import CommunityPage from "./page/community/CommunityPage";
import CommunityDetailPage from "./page/community/CommunityDetailPage";
import CommunityWritePage from "./page/community/CommunityWritePage";
import GuidePage from "./page/guide/GuidePage";
import ReferralFriendsPage from "./page/referral/ReferralFriendsPage";
import ReferralPointsPage from "./page/referral/ReferralPointsPage";
import ReferralInputPage from "./page/referral/ReferralInputPage";
import BlockListPage from "./page/mypage/BlockListPage";
import BlacklistPage from "./page/mypage/BlacklistPage";

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
  max-width: 400px;
  margin: 0 auto;
  background: #F2F4F6;
  min-height: 100vh;
  position: relative;
`;

const FullContainer = styled.div`
  width: 100%;
`;

const GlobalStyle = createGlobalStyle`
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    overscroll-behavior: none;
    touch-action: none;
    background: #F2F4F6;
    font-family: 'Pretendard Variable', Pretendard, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }
  #root, #app { height: 100vh; }

  * {
    box-sizing: border-box;
  }
`;

/* ===================== routes ===================== */

const AnimatedRoutes = () => {
  const location = useLocation();
  const { user, dispatch } = useContext(UserContext);

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
        }
        break;
      }

      case "APP_EXIT_REQUEST": {
        postToRN("EXIT_APP", { at: Date.now() });
        break;
      }

      case "PUSH_EVENT": {
        console.log("[PUSH]", p?.title, p?.body);
        break;
      }

      default:
        break;
    }
  });

  const isFullWidth =
    location.pathname.startsWith("/admin") ||
    location.pathname === "/intro";
  const Wrapper = isFullWidth ? FullContainer : Container;

  return (
    <AnimatePresence mode="wait">
      <Wrapper>
        <Routes location={location} key={location.pathname}>
          {/* Public - 인증 불필요 */}
          <Route path="/" element={<Navigate to="/MobileSplash" replace />} />
          <Route path="/intro" element={<LandingPage />} />
          <Route path="/MobileSplash" element={wrap(<MobileSplashpage />)} />
          <Route path="/MobileLogin" element={wrap(<MobileLoginpage />)} />
          <Route path="/MobileSignup" element={wrap(<MobileSignuppage />)} />
          <Route path="/MobileFindAccount" element={wrap(<MobileFindAccountpage />)} />
          <Route path="/legal/terms" element={wrap(<TermsPage />)} />
          <Route path="/legal/privacy" element={wrap(<PrivacyPage />)} />
          <Route path="/legal/location" element={wrap(<LocationTermsPage />)} />
          <Route path="/seed-login" element={<SeedLoginPage />} />

          {/* Auth Required - 로그인 필요 */}
          <Route element={<RequireAuth />}>
            <Route path="/MobileLinkPhone" element={wrap(<MobileLinkPhonepage />)} />
            <Route path="/MobileSetNickname" element={wrap(<MobileSetNicknamepage />)} />
            <Route path="/ReferralInput" element={wrap(<ReferralInputPage />)} />

            <Route path="/MobileMain" element={wrap(<MobileMainpage />)} />
            <Route path="/MobileConfig" element={wrap(<MobileConfigpage />)} />
            <Route path="/MobileChat" element={wrap(<MobileChatpage />)} />
            <Route path="/chat/open/create" element={wrap(<OpenChatCreatePage />)} />
            <Route path="/chat/:roomId" element={wrap(<ChatDetailPage />)} />
            <Route path="/chat/:roomId/memo" element={wrap(<ChatMemoPage />)} />
            <Route path="/MobileContract" element={wrap(<MobileContractpage />)} />

            {/* Pro */}
            <Route path="/biz-profile" element={wrap(<BizProfilePage />)} />
            <Route path="/pro/list" element={wrap(<ProListPage />)} />
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
            <Route path="/order/worker-request/create" element={wrap(<WorkerRequestCreatePage />)} />
            <Route path="/order/worker-request/detail/:requestId" element={wrap(<WorkerRequestDetailPage />)} />
            <Route path="/marketplace" element={wrap(<MarketplacePage />)} />
            <Route path="/marketplace/create" element={wrap(<MarketplaceCreatePage />)} />
            <Route path="/marketplace/:marketplaceId" element={wrap(<MarketplaceDetailPage />)} />
            <Route path="/subscription" element={wrap(<SubscriptionPage />)} />
            <Route path="/mypage/wallet" element={wrap(<WalletRegisterPage />)} />

            {/* Search */}
            <Route path="/search" element={wrap(<SearchPage />)} />

            {/* Calendar */}
            <Route path="/calendar" element={wrap(<CalendarPage />)} />
            <Route path="/calendar/create" element={wrap(<ScheduleCreatePage />)} />

            {/* Guide */}
            <Route path="/guide/:guideId" element={wrap(<GuidePage />)} />

            {/* Mypage */}
            <Route path="/mypage/blocks" element={wrap(<BlockListPage />)} />
            <Route path="/mypage/blacklist" element={wrap(<BlacklistPage />)} />

            {/* Community */}
            <Route path="/community" element={wrap(<CommunityPage />)} />
            <Route path="/community/write" element={wrap(<CommunityWritePage />)} />
            <Route path="/community/:postId" element={wrap(<CommunityDetailPage />)} />
          </Route>

          {/* Referral */}
          <Route element={<RequireAuth />}>
            <Route path="/referral/friends" element={wrap(<ReferralFriendsPage />)} />
            <Route path="/referral/points" element={wrap(<ReferralPointsPage />)} />
          </Route>

          {/* Admin */}
          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route element={<RequireAdmin />}>
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<AdminDashboardPage />} />
              <Route path="users" element={<AdminUsersPage />} />
              <Route path="users/:filter" element={<AdminUsersPage />} />
              <Route path="pro-approval" element={<AdminProApprovalPage />} />
              <Route path="pro-approval/:filter" element={<AdminProApprovalPage />} />
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
              <Route path="settlement/:filter" element={<AdminSettlementPage />} />
              <Route path="updates" element={<AdminUpdatesPage />} />
              <Route path="settings" element={<AdminSettingsPage />} />
              <Route path="settings/:filter" element={<AdminSettingsPage />} />
            </Route>
          </Route>
        </Routes>
      </Wrapper>
    </AnimatePresence>
  );
};

function App() {
  return (
    <AuthProvider>
      <GlobalStyle />
      <AnimatedRoutes />
    </AuthProvider>
  );
}

export default App;
