import React, { createContext, useState } from "react";

const initialUser = {
  // 클라이언트 전용 상태
  locationGranted: false,
  pushGranted: false,
  popupStep: "init",
  startTrigger: false,
  showPermissionBlockPopup: false,

  // 대표 UID (전화번호 기준 머징)
  primaryUid: "",

  // 서버에서 내려오는 필드
  USERS_ID: "",
  DEVICEID: "",
  simulate: false,
  popupOpen: false,

  // 사용자 정보
  USERINFO: {
    nickname: "",
    phone: "",
    userimg: "",
    latitude: null,
    longitude: null,
    token: "",
    address_name: "서울시 중구",
  },

  // 회원 유형: guest / member / pro
  userType: "guest",

  // 구독 상태
  subscription: {
    active: false,
    expiresAt: null,
  },

  // 추천인
  referral: {
    myCode: "",
    referredBy: "",
  },

  // 캐시
  cash: {
    balance: 0,
  },
};

const UserContext = createContext({
  user: initialUser,
  dispatch: () => { },
});

const UserProvider = ({ children }) => {
  const [user, setUser] = useState(initialUser);

  const dispatch = (payload) => {
    if (payload === null) {
      setUser(initialUser);
      return;
    }

    setUser((prev) => {
      const base = prev ?? initialUser;
      return {
        ...base,
        ...payload,
        USERINFO: {
          ...(base.USERINFO ?? {}),
          ...(payload.USERINFO ?? {}),
        },
        subscription: {
          ...(base.subscription ?? {}),
          ...(payload.subscription ?? {}),
        },
        referral: {
          ...(base.referral ?? {}),
          ...(payload.referral ?? {}),
        },
        cash: {
          ...(base.cash ?? {}),
          ...(payload.cash ?? {}),
        },
      };
    });
  };

  return (
    <UserContext.Provider value={{ user, dispatch }}>
      {children}
    </UserContext.Provider>
  );
};

export { UserContext, UserProvider };
