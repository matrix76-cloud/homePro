/* eslint-disable */
import React, { useState, useContext, useEffect, useRef, useMemo, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import CommonHeaderHome from "../Header/CommonHeaderHome";
import MobileFooter from "../Footer/MobileFooter";
import RegionSelectModal from "../../../modal/RegionSelectModal";
import { MOBILEMAINMENU } from "../../../utility/constants";
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
      if (isInRnWebView()) {
        const res = await requestLocationAsync(8000);
        if (res?.latitude && res?.longitude) coords = { latitude: res.latitude, longitude: res.longitude };
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
      />
      {/* 위치 설정 드롭다운 */}
      {showLocationMenu && (
        <>
          <LocationMenuOverlay onClick={() => setShowLocationMenu(false)} />
          <LocationMenu>
            <LocationMenuItem onClick={handleSetCurrentLocation}>
              <IoLocateIcon>📍</IoLocateIcon>
              {gpsLoading ? "위치 확인 중..." : "현재위치로 설정"}
            </LocationMenuItem>
            <LocationMenuDivider />
            <LocationMenuItem onClick={handleOpenRegionSelect}>
              <IoLocateIcon>🗺️</IoLocateIcon>
              지역으로 설정
            </LocationMenuItem>
          </LocationMenu>
        </>
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
  top: calc(env(safe-area-inset-top, 0px) + 52px);
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 368px;
  background: #fff;
  border-radius: 12px;
  box-shadow: 0 4px 20px rgba(0,0,0,0.12);
  z-index: 999;
  overflow: hidden;
`;

const LocationMenuItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  font-size: 14px;
  font-weight: 500;
  color: #191F28;
  cursor: pointer;
  &:active { background: #F7F8FA; }
`;

const LocationMenuDivider = styled.div`
  height: 1px;
  background: #F0F0F4;
  margin: 0 16px;
`;

const IoLocateIcon = styled.span`
  font-size: 18px;
`;

export default HomeLayout;
