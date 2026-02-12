/* eslint-disable */
import React, { useContext, useEffect } from "react";
import { Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { useMediaQuery } from "react-responsive";
import styled, { createGlobalStyle } from "styled-components";

import { UserContext } from "./context/User";
import useWebMessageListener from "./hooks/useWebMessageListener";
import { attachMessageListener } from "./bridge/webviewBridge";

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
import OrderCreatePage from "./page/order/OrderCreatePage";
import OrderListPage from "./page/order/OrderListPage";
import OrderDetailPage from "./page/order/OrderDetailPage";
import AIEstimatePage from "./page/order/AIEstimatePage";
import MyOrdersPage from "./page/order/MyOrdersPage";
import CategoryProListPage from "./page/category/CategoryProListPage";
import ServiceDetailPage from "./page/category/ServiceDetailPage";
import ProCategoryRegisterPage from "./page/pro/ProCategoryRegisterPage";
import ProCategoryListPage from "./page/pro/ProCategoryListPage";
import ProCategoryDetailPage from "./page/pro/ProCategoryDetailPage";
import TermsPage from "./page/legal/TermsPage";
import PrivacyPage from "./page/legal/PrivacyPage";
import LocationTermsPage from "./page/legal/LocationTermsPage";
import NoticePage from "./page/notice/NoticePage";
import SupportPage from "./page/support/SupportPage";
import CalendarPage from "./page/calendar/CalendarPage";
import ScheduleCreatePage from "./page/calendar/ScheduleCreatePage";

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
  width: ${({ $isGalaxyFlipUnfolded }) => ($isGalaxyFlipUnfolded ? "60%" : "100%")};
  margin: ${({ $isGalaxyFlipUnfolded }) => ($isGalaxyFlipUnfolded ? "0 auto" : "0")};
`;

const GlobalStyle = createGlobalStyle`
  html, body {
    margin: 0;
    padding: 0;
    height: 100%;
    overscroll-behavior: none;
    touch-action: none;
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

  return (
    <AnimatePresence mode="wait">
      <Container $isGalaxyFlipUnfolded={isGalaxyFlipUnfolded}>
        <Routes location={location} key={location.pathname}>
          {/* Main */}
          <Route path="/" element={<Navigate to="/MobileSplash" replace />} />
          <Route path="/MobileSplash" element={wrap(<MobileSplashpage />)} />
          <Route path="/MobileLogin" element={wrap(<MobileLoginpage />)} />
          <Route path="/MobileSignup" element={wrap(<MobileSignuppage />)} />
          <Route path="/MobileLinkPhone" element={wrap(<MobileLinkPhonepage />)} />
          <Route path="/MobileSetNickname" element={wrap(<MobileSetNicknamepage />)} />
          <Route path="/MobileMain" element={wrap(<MobileMainpage />)} />
          <Route path="/MobileConfig" element={wrap(<MobileConfigpage />)} />
          <Route path="/MobileChat" element={wrap(<MobileChatpage />)} />
          <Route path="/MobileContract" element={wrap(<MobileContractpage />)} />

          {/* Pro */}
          <Route path="/pro/register-category" element={wrap(<ProCategoryRegisterPage />)} />
          <Route path="/pro/categories" element={wrap(<ProCategoryListPage />)} />
          <Route path="/pro/category-detail/:categoryId" element={wrap(<ProCategoryDetailPage />)} />

          {/* Category & Service */}
          <Route path="/category/:categoryId" element={wrap(<CategoryProListPage />)} />
          <Route path="/service/:categoryId/:serviceId" element={wrap(<ServiceDetailPage />)} />

          {/* Notice */}
          <Route path="/notice" element={wrap(<NoticePage />)} />
          <Route path="/support" element={wrap(<SupportPage />)} />

          {/* Legal */}
          <Route path="/legal/terms" element={wrap(<TermsPage />)} />
          <Route path="/legal/privacy" element={wrap(<PrivacyPage />)} />
          <Route path="/legal/location" element={wrap(<LocationTermsPage />)} />

          {/* Order */}
          <Route path="/order/ai-estimate" element={wrap(<AIEstimatePage />)} />
          <Route path="/order/my-orders" element={wrap(<MyOrdersPage />)} />
          <Route path="/order/create" element={wrap(<OrderCreatePage />)} />
          <Route path="/order/create/:categoryId" element={wrap(<OrderCreatePage />)} />
          <Route path="/order/list" element={wrap(<OrderListPage />)} />
          <Route path="/order/detail/:orderId" element={wrap(<OrderDetailPage />)} />

          {/* Calendar */}
          <Route path="/calendar" element={wrap(<CalendarPage />)} />
          <Route path="/calendar/create" element={wrap(<ScheduleCreatePage />)} />
        </Routes>
      </Container>
    </AnimatePresence>
  );
};

function App() {
  return (
    <>
      <GlobalStyle />
      <AnimatedRoutes />
    </>
  );
}

export default App;
