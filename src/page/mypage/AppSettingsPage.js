/* eslint-disable */
/* 앱 설정 — 알림(오더·채팅) · 푸시 방해 금지 시간 · 화면 다크모드 (형 지시 8/8)
 * users/{uid}.appSettings 에 저장 + localStorage 미러(즉시 로드용) */
import React, { useState, useEffect, useRef } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { pcOnly, PC } from "../../pc/pcKit";

const LS_KEY = "homepro.appSettings";

const DEFAULT_SETTINGS = {
  orderNotif: true,
  chatNotif: true,
  dnd: { enabled: false, start: "22:00", end: "08:00" },
  darkMode: false,
};

const loadLocal = () => {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return DEFAULT_SETTINGS;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_SETTINGS, ...parsed, dnd: { ...DEFAULT_SETTINGS.dnd, ...(parsed.dnd || {}) } };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

const AppSettingsPage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const uid = userData?.uid;
  const [settings, setSettings] = useState(loadLocal);
  const loadedRemote = useRef(false);

  // Firestore 저장본이 있으면 우선
  useEffect(() => {
    if (!uid || loadedRemote.current) return;
    loadedRemote.current = true;
    (async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("../../api/config");
        const snap = await getDoc(doc(db, "users", uid));
        const remote = snap.exists() ? snap.data().appSettings : null;
        if (remote) {
          setSettings({ ...DEFAULT_SETTINGS, ...remote, dnd: { ...DEFAULT_SETTINGS.dnd, ...(remote.dnd || {}) } });
        }
      } catch {}
    })();
  }, [uid]);

  const persist = async (next) => {
    setSettings(next);
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
    if (!uid) return;
    try {
      const { upsertUserProfile } = await import("../../service/UserProfileService");
      await upsertUserProfile(uid, { appSettings: next });
    } catch {}
  };

  const toggle = (key) => persist({ ...settings, [key]: !settings[key] });
  const toggleDnd = () => persist({ ...settings, dnd: { ...settings.dnd, enabled: !settings.dnd.enabled } });
  const setDndTime = (field, value) => persist({ ...settings, dnd: { ...settings.dnd, [field]: value } });

  return (
    <SimpleBackLayout NAME="앱 설정" onBack={() => navigate(-1)}>
      {/* PC: 세 묶음을 한 줄 3칸으로. 폰에서는 display: contents */}
      <PcShell>
      <SectionCard>
        <SectionTitle>알림 설정</SectionTitle>
        <ToggleRow>
          <ToggleText>
            <ToggleLabel>오더 알림</ToggleLabel>
            <ToggleDesc>새 오더 접수·배정·상태 변경 푸시</ToggleDesc>
          </ToggleText>
          <ToggleSwitch $on={settings.orderNotif} onClick={() => toggle("orderNotif")} />
        </ToggleRow>
        <ToggleRow $last>
          <ToggleText>
            <ToggleLabel>채팅 알림</ToggleLabel>
            <ToggleDesc>새 채팅 메시지 푸시</ToggleDesc>
          </ToggleText>
          <ToggleSwitch $on={settings.chatNotif} onClick={() => toggle("chatNotif")} />
        </ToggleRow>
      </SectionCard>

      <SectionCard>
        <SectionTitle>방해 금지 시간</SectionTitle>
        <ToggleRow $last={!settings.dnd.enabled}>
          <ToggleText>
            <ToggleLabel>방해 금지 시간 사용</ToggleLabel>
            <ToggleDesc>설정한 시간에는 푸시 알림이 오지 않습니다</ToggleDesc>
          </ToggleText>
          <ToggleSwitch $on={settings.dnd.enabled} onClick={toggleDnd} />
        </ToggleRow>
        {settings.dnd.enabled && (
          <TimeRow>
            <TimeField>
              <TimeLabel>시작</TimeLabel>
              <TimeInput type="time" value={settings.dnd.start} onChange={(e) => setDndTime("start", e.target.value)} />
            </TimeField>
            <TimeDash>~</TimeDash>
            <TimeField>
              <TimeLabel>종료</TimeLabel>
              <TimeInput type="time" value={settings.dnd.end} onChange={(e) => setDndTime("end", e.target.value)} />
            </TimeField>
          </TimeRow>
        )}
      </SectionCard>

      <SectionCard>
        <SectionTitle>화면</SectionTitle>
        <ToggleRow $last>
          <ToggleText>
            <ToggleLabel>다크모드</ToggleLabel>
            <ToggleDesc>어두운 테마는 화면별로 순차 적용됩니다</ToggleDesc>
          </ToggleText>
          <ToggleSwitch $on={settings.darkMode} onClick={() => toggle("darkMode")} />
        </ToggleRow>
      </SectionCard>
      </PcShell>

      <BottomSpacer />
    </SimpleBackLayout>
  );
};

export default AppSettingsPage;

const PcShell = styled.div`
  display: contents;
  ${pcOnly`display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; align-items: stretch; max-width: 1180px; margin: 0 auto; box-sizing: border-box; padding: 28px 32px 40px; word-break: keep-all; @media (max-width: 1100px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }`}
`;

const SectionCard = styled.div`
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
  ${pcOnly`margin: 0; border-radius: 0; box-shadow: none; border: 1px solid ${PC.line}; padding: 24px 26px; box-sizing: border-box;`}
`;

const SectionTitle = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.text};
  letter-spacing: -0.03em;
  margin-bottom: 6px;
  ${pcOnly`font-size: 18px; font-weight: 800; margin-bottom: 10px;`}
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 0;
  border-bottom: ${({ $last }) => ($last ? "none" : `1px solid ${THEME.border}`)};
`;

const ToggleText = styled.div`
  flex: 1;
  min-width: 0;
`;

const ToggleLabel = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${THEME.text};
`;

const ToggleDesc = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 3px;
  ${pcOnly`font-size: 15px; color: ${PC.body}; line-height: 1.5;`}
`;

const ToggleSwitch = styled.div`
  width: 46px;
  height: 26px;
  border-radius: 13px;
  background: ${({ $on }) => ($on ? THEME.button : THEME.border)};
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
  transition: background 0.2s;
  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${({ $on }) => ($on ? "22px" : "2px")};
    width: 22px;
    height: 22px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
`;

const TimeRow = styled.div`
  display: flex;
  align-items: flex-end;
  gap: 10px;
  padding-top: 14px;
`;

const TimeField = styled.div`
  flex: 1;
`;

const TimeLabel = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.textSecondary};
  margin-bottom: 6px;
  ${pcOnly`color: ${PC.ink}; font-weight: 700;`}
`;

const TimeInput = styled.input`
  width: 100%;
  padding: 12px 14px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 16px;
  font-weight: 500;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  box-sizing: border-box;
  background: ${THEME.surface};
  &:focus { border-color: ${THEME.primary}; }
  ${pcOnly`height: 46px; padding: 0 12px; border-width: 1px; border-color: ${PC.line};`}
`;

const TimeDash = styled.div`
  font-size: 16px;
  color: ${THEME.muted};
  padding-bottom: 14px;
`;

const BottomSpacer = styled.div`
  height: 24px;
`;
