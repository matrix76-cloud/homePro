/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoHomeOutline, IoHome, IoChatbubbleEllipsesOutline, IoChatbubbleEllipses, IoPersonOutline, IoPerson, IoAddCircle, IoCreateOutline, IoSparklesOutline, IoBookOutline, IoBook, IoConstructOutline, IoConstruct, IoSwapHorizontal, IoSwapHorizontalOutline, IoBusiness, IoBusinessOutline } from "react-icons/io5";
import { THEME } from "../../../config/homeproConfig";
import { MOBILEMAINMENU } from "../../../utility/constants";
import { useAuth } from "../../../context/AuthContext";
import { subscribeChatRooms } from "../../../service/ChatService";
import "./Footer.css";

const TAB_LIST = [
  {
    key: MOBILEMAINMENU.HOME,
    label: "홈",
    path: "/MobileMain",
    ActiveIcon: IoHome,
    InactiveIcon: IoHomeOutline,
  },
  {
    key: "brokerage",
    label: "공동중개",
    path: "/brokerage",
    ActiveIcon: IoBusiness,
    InactiveIcon: IoBusinessOutline,
  },
  {
    key: MOBILEMAINMENU.CHAT,
    label: "채팅",
    path: "/MobileChat",
    ActiveIcon: IoChatbubbleEllipses,
    InactiveIcon: IoChatbubbleEllipsesOutline,
  },
  {
    key: "education",
    label: "교육.장터",
    path: "/education-market",
    ActiveIcon: IoBook,
    InactiveIcon: IoBookOutline,
  },
  {
    key: MOBILEMAINMENU.CONFIG,
    label: "마이",
    path: "/MobileConfig",
    ActiveIcon: IoPerson,
    InactiveIcon: IoPersonOutline,
  },
];

const MobileFooter = ({ type }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const [unreadCount, setUnreadCount] = useState(0);
  const [showMenu, setShowMenu] = useState(false);

  useEffect(() => {
    const uid = userData?.uid;
    if (!uid) return;
    const unsub = subscribeChatRooms(uid, (rooms) => {
      const total = rooms.reduce((sum, r) => sum + (r.unreadCount?.[uid] || 0), 0);
      setUnreadCount(total);
    });
    return () => unsub();
  }, [userData?.uid]);

  const handleTab = (tab) => {
    if (tab.isCenter) {
      setShowMenu((prev) => !prev);
      return;
    }
    if (tab.key === MOBILEMAINMENU.HOME) {
      navigate(tab.path, { state: { resetTab: Date.now() }, replace: location.pathname === tab.path });
    } else {
      navigate(tab.path);
    }
  };

  return (
    <>
      {/* FAB 메뉴 백드롭 */}
      {showMenu && (
        <div onClick={() => setShowMenu(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.3)", zIndex: 99,
        }} />
      )}

      {/* FAB 위 팝업 메뉴 */}
      {showMenu && (
        <div style={{
          position: "fixed", bottom: 80, left: "50%", transform: "translateX(-50%)",
          background: "#fff", borderRadius: 16, boxShadow: "0 8px 30px rgba(0,0,0,0.18)",
          zIndex: 100, overflow: "hidden", minWidth: 220,
          animation: "fabPopIn 0.15s ease-out",
        }}>
          <div onClick={() => { setShowMenu(false); navigate("/order/create"); }} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "#F3EEFF",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IoCreateOutline size={20} color={THEME.purple} />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>견적 요청</div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>전문가에게 직접 견적을 받아요</div>
            </div>
          </div>
          <div style={{ height: 1, background: "#f0f0f0" }} />
          <div onClick={() => { setShowMenu(false); navigate("/order/ai-estimate"); }} style={{
            display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", cursor: "pointer",
          }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10, background: "#FFF3E0",
              display: "flex", alignItems: "center", justifyContent: "center",
            }}>
              <IoSparklesOutline size={20} color="#F59E0B" />
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: THEME.text }}>AI 견적</div>
              <div style={{ fontSize: 11, color: THEME.muted, marginTop: 1 }}>AI가 즉시 견적을 알려줘요</div>
            </div>
          </div>
        </div>
      )}

      <div className="site-mobile-footer">
        <div className="buttonview">
          {TAB_LIST.map((tab) => {
            if (tab.isCenter) {
              return (
                <button key={tab.key} className="button" onClick={() => handleTab(tab)} style={{ position: "relative", zIndex: showMenu ? 100 : 1 }}>
                  <div style={{
                    position: "absolute",
                    top: "-22px",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 60,
                    height: 60,
                    borderRadius: "50%",
                    background: "#fff",
                    boxShadow: "0 -1px 4px rgba(0,0,0,0.06)",
                    transition: "transform 0.2s",
                    transform: showMenu ? "rotate(45deg)" : "rotate(0deg)",
                  }}>
                    <IoAddCircle size={62} color={showMenu ? THEME.text : THEME.primary} />
                  </div>
                </button>
              );
            }
            const isActive = type === tab.key;
            const Icon = isActive ? tab.ActiveIcon : tab.InactiveIcon;
            const showBadge = tab.key === MOBILEMAINMENU.CHAT && unreadCount > 0;
            return (
              <button key={tab.key} className="button" onClick={() => handleTab(tab)}>
                <div style={{ position: "relative", display: "inline-flex" }}>
                  <Icon size={22} color={isActive ? THEME.primary : "#8B95A1"} />
                  {showBadge && (
                    <span style={{
                      position: "absolute",
                      top: -4,
                      right: -8,
                      minWidth: 16,
                      height: 16,
                      borderRadius: 8,
                      background: THEME.primary,
                      color: "#fff",
                      fontSize: 10,
                      fontWeight: 700,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "0 4px",
                    }}>
                      {unreadCount > 99 ? "99+" : unreadCount}
                    </span>
                  )}
                </div>
                <span className={isActive ? "buttonEnableText" : "buttonDisableText"}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </>
  );
};

export default MobileFooter;
