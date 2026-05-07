/* eslint-disable */
import React, { useState, useContext, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import CommonHeaderHome from "../Header/CommonHeaderHome";
import MobileFooter from "../Footer/MobileFooter";
import RegionSelectModal from "../../../modal/RegionSelectModal";
import { MOBILEMAINMENU } from "../../../utility/constants";
import { IoNavigateOutline, IoMapOutline } from "react-icons/io5";
import { UserContext } from "../../../context/User";
import { useAuth } from "../../../context/AuthContext";
import { isInRnWebView, requestLocationAsync } from "../../../bridge/webviewBridge";
import { reverseGeocode, mapToKrArea, regionToDisplayName, getWebLocation } from "../../../utility/regionUtils";
import { upsertUserProfile } from "../../../service/UserProfileService";

const REGION_STORAGE_KEY = "homepro.region";

const Container = styled.div`
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
  max-width: 400px;
  margin: 0 auto;
  box-shadow: 0 0 20px rgba(0, 0, 0, 0.08);
`;

const Main = styled.main`
  flex: 1;
  width: 100%;
  box-sizing: border-box;
  padding-top: calc(env(safe-area-inset-top, 0px) + 52px);
  padding-bottom: calc(60px + env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
  overflow-x: hidden;
  -webkit-overflow-scrolling: touch;
  background: #F7F8FA;
  scrollbar-width: none;
  -ms-overflow-style: none;
  &::-webkit-scrollbar { display: none; }
`;

const HomeLayout = (props) => {
  const navigate = useNavigate();
  const location = useLocation();
  const [showRegion, setShowRegion] = useState(false);
  const [showLocationMenu, setShowLocationMenu] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);

  const footerType = useMemo(() => {
    const p = location.pathname;
    if (p.startsWith("/my-orders")) return MOBILEMAINMENU.MYORDERS;
    if (p.startsWith("/MobileChat") || p.startsWith("/chat")) return MOBILEMAINMENU.CHAT;
    if (p.startsWith("/MobileConfig")) return MOBILEMAINMENU.CONFIG;
    if (p.startsWith("/order/create")) return MOBILEMAINMENU.CREATE;
    return MOBILEMAINMENU.HOME;
  }, [location.pathname]);
  const { user, dispatch } = useContext(UserContext);
  const { userData } = useAuth();
  const autoLocated = useRef(false);

  // 초기 지역 로드 (Firestore → localStorage → GPS)
  useEffect(() => {
    if (autoLocated.current) return;
    autoLocated.current = true;

    (async () => {
      // 1) Firestore 프로필에 지역이 있으면 사용
      if (userData?.region?.sido) {
        const display = regionToDisplayName(userData.region);
        dispatch({ USERINFO: { address_name: display } });
        try { localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(userData.region)); } catch {}
        return;
      }

      // 2) localStorage 캐시
      try {
        const cached = JSON.parse(localStorage.getItem(REGION_STORAGE_KEY));
        if (cached?.sido) {
          dispatch({ USERINFO: { address_name: regionToDisplayName(cached) } });
          return;
        }
      } catch {}

      // 3) GPS 자동 감지
      let coords = null;
      if (isInRnWebView()) {
        const res = await requestLocationAsync(8000);
        if (res?.latitude && res?.longitude) {
          coords = { latitude: res.latitude, longitude: res.longitude };
        }
      } else {
        coords = await getWebLocation(8000);
      }

      if (coords) {
        const geo = await reverseGeocode(coords.latitude, coords.longitude);
        const mapped = mapToKrArea(geo);
        if (mapped) {
          const display = regionToDisplayName(mapped);
          dispatch({ USERINFO: { address_name: display } });
          try { localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(mapped)); } catch {}
        }
      }
    })();
  }, [userData?.region?.sido]);

  const handleRegionSelect = async ({ sido, gu }) => {
    const region = { sido, gu };
    const display = regionToDisplayName(region);
    dispatch({ USERINFO: { address_name: display } });

    // localStorage 캐시
    try { localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(region)); } catch {}

    // Firestore에 저장
    const uid = userData?.uid;
    if (uid) {
      try {
        await upsertUserProfile(uid, { region });
      } catch (e) {
        console.warn("지역 저장 실패:", e.message);
      }
    }
  };

  // 현재위치로 설정 (GPS)
  const handleSetCurrentLocation = useCallback(async () => {
    setShowLocationMenu(false);
    setGpsLoading(true);
    try {
      let coords = null;
      const inRn = isInRnWebView();
      console.log("[HomeLayout] isInRnWebView:", inRn, "ReactNativeWebView:", typeof window?.ReactNativeWebView);
      if (inRn) {
        const res = await requestLocationAsync(8000);
        console.log("[HomeLayout] requestLocationAsync result:", JSON.stringify(res));
        if (res?.latitude && res?.longitude) coords = { latitude: res.latitude, longitude: res.longitude };
      } else {
        coords = await getWebLocation(8000);
        console.log("[HomeLayout] getWebLocation result:", JSON.stringify(coords));
      }
      if (coords) {
        const geo = await reverseGeocode(coords.latitude, coords.longitude);
        const mapped = mapToKrArea(geo);
        if (mapped) {
          const display = regionToDisplayName(mapped);
          dispatch({ USERINFO: { address_name: display } });
          try { localStorage.setItem(REGION_STORAGE_KEY, JSON.stringify(mapped)); } catch {}
          const uid = userData?.uid;
          if (uid) {
            try { await upsertUserProfile(uid, { region: mapped }); } catch {}
          }
        } else {
          alert("위치를 인식할 수 없습니다.");
        }
      } else {
        alert("위치 정보를 가져올 수 없습니다.\n위치 권한을 확인해주세요.");
      }
    } catch {
      alert("위치 설정에 실패했습니다.");
    } finally {
      setGpsLoading(false);
    }
  }, [dispatch, userData?.uid]);

  // 지역으로 설정
  const handleOpenRegionSelect = () => {
    setShowLocationMenu(false);
    setShowRegion(true);
  };

  // 현재 주소에서 기본값 추출
  const addr = user?.USERINFO?.address_name || "";
  const parts = addr.trim().split(" ");
  const rawSido = (parts[0] || "서울").replace(/시$|도$/, "");
  const defaultRegion = {
    sido: rawSido,
    gu: parts.length >= 2 ? parts.slice(1).join(" ") : "전체",
  };

  return (
    <Container>
      <CommonHeaderHome
        onCalendarClick={() => navigate("/calendar")}
        onLocationClick={() => setShowLocationMenu((v) => !v)}
        onSearchClick={() => navigate("/search")}
        onNoticeClick={() => navigate("/notice")}
      />
      {/* 위치 설정 드롭다운 */}
      {showLocationMenu && (
        <>
          <LocationMenuOverlay onClick={() => setShowLocationMenu(false)} />
          <LocationMenu>
            <LocationMenuItem onClick={handleSetCurrentLocation}>
              <IoNavigateOutline size={16} />
              현재위치로 설정
            </LocationMenuItem>
            <LocationMenuDivider />
            <LocationMenuItem onClick={handleOpenRegionSelect}>
              <IoMapOutline size={16} />
              지역으로 설정
            </LocationMenuItem>
          </LocationMenu>
        </>
      )}
      {/* GPS 로딩 스피너 */}
      {gpsLoading && (
        <SpinnerOverlay>
          <SpinnerBox>
            <Spinner />
            <SpinnerText>현재 위치를 확인하고 있습니다...</SpinnerText>
          </SpinnerBox>
        </SpinnerOverlay>
      )}
      <Main>{props.children}</Main>
      <MobileFooter type={footerType} />
      <RegionSelectModal
        open={showRegion}
        onClose={() => setShowRegion(false)}
        onSelect={handleRegionSelect}
        defaultValue={defaultRegion}
      />
    </Container>
  );
};

/* ─── 위치 설정 드롭다운 ─── */

const LocationMenuOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 998;
`;

const LocationMenu = styled.div`
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 52px + 4px);
  left: 16px;
  background: #fff;
  border-radius: 10px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 999;
  overflow: hidden;
`;

const LocationMenuItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 20px;
  font-size: 14px;
  font-weight: 500;
  color: #191F28;
  cursor: pointer;
  white-space: nowrap;
  &:active { background: #F7F8FA; }
`;

const LocationMenuDivider = styled.div`
  height: 1px;
  background: #F0F0F4;
`;

const SpinnerOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const SpinnerBox = styled.div`
  background: #fff;
  border-radius: 10px;
  padding: 16px 24px;
  display: flex;
  align-items: center;
  gap: 12px;
`;

const spinAnim = keyframes`
  to { transform: rotate(360deg); }
`;

const Spinner = styled.div`
  width: 20px;
  height: 20px;
  border: 2px solid #E5E7EB;
  border-top-color: #7C5CFC;
  border-radius: 50%;
  animation: ${spinAnim} 0.8s linear infinite;
  flex-shrink: 0;
`;

const SpinnerText = styled.div`
  font-size: 13px;
  color: #191F28;
  font-weight: 500;
`;

export default HomeLayout;
