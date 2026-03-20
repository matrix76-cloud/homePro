/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { IoHomeOutline, IoHome, IoChatbubbleEllipsesOutline, IoChatbubbleEllipses, IoPersonOutline, IoPerson, IoAddCircle, IoBriefcaseOutline, IoBriefcase } from "react-icons/io5";
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
    key: MOBILEMAINMENU.BIZPROFILE,
    label: "비즈프로필",
    path: "/biz-profile",
    ActiveIcon: IoBriefcase,
    InactiveIcon: IoBriefcaseOutline,
  },
  {
    key: MOBILEMAINMENU.CREATE,
    label: "",
    path: "/order/create",
    isCenter: true,
  },
  {
    key: MOBILEMAINMENU.CHAT,
    label: "채팅",
    path: "/MobileChat",
    ActiveIcon: IoChatbubbleEllipses,
    InactiveIcon: IoChatbubbleEllipsesOutline,
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
    if (tab.key === MOBILEMAINMENU.HOME) {
      navigate(tab.path, { state: { resetTab: Date.now() }, replace: location.pathname === tab.path });
    } else {
      navigate(tab.path);
    }
  };

  return (
    <div className="site-mobile-footer">
      <div className="buttonview">
        {TAB_LIST.map((tab) => {
          if (tab.isCenter) {
            return (
              <button key={tab.key} className="button" onClick={() => handleTab(tab)} style={{ position: "relative" }}>
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
                }}>
                  <IoAddCircle key={location.pathname} size={62} color={THEME.primary} className="fab-spin" />
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
                <Icon size={22} color={isActive ? THEME.text : "#8B95A1"} />
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
  );
};

export default MobileFooter;
