/* eslint-disable */
import React from "react";
import { useNavigate } from "react-router-dom";
import { IoHomeOutline, IoHome, IoChatbubbleEllipsesOutline, IoChatbubbleEllipses, IoPersonOutline, IoPerson, IoAddCircle, IoBriefcaseOutline, IoBriefcase } from "react-icons/io5";
import { THEME } from "../../../config/homeproConfig";
import { MOBILEMAINMENU } from "../../../utility/constants";
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
    path: "/pro/register-category",
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

  const handleTab = (tab) => {
    navigate(tab.path);
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
                  <IoAddCircle size={56} color={THEME.primary} />
                </div>
              </button>
            );
          }
          const isActive = type === tab.key;
          const Icon = isActive ? tab.ActiveIcon : tab.InactiveIcon;
          return (
            <button key={tab.key} className="button" onClick={() => handleTab(tab)}>
              <Icon size={22} color={isActive ? THEME.text : "#8B95A1"} />
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
