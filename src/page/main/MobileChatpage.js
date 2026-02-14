/* eslint-disable */
import React, { useContext } from "react";
import styled from "styled-components";
import { useAtomValue } from "jotai";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import { MOBILEMAINMENU } from "../../utility/constants";
import { UserContext } from "../../context/User";
import { appModeAtom } from "../../store/store";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";

const MobileChatpage = () => {
  const { user } = useContext(UserContext);
  const appMode = useAtomValue(appModeAtom);
  const isPro = appMode === "pro";

  return (
    <MainListLayout NAME="채팅" hideBack footerType={MOBILEMAINMENU.CHAT}>
      <PageWrap>
        <EmptyWrap>
          <IconCircle>
            <IoChatbubbleEllipsesOutline size={48} color={THEME.primary} />
          </IconCircle>
          <EmptyTitle>아직 채팅이 없어요</EmptyTitle>
          <EmptyDesc>
            {isPro
              ? "고객의 요청에 견적을 보내면\n채팅이 시작됩니다"
              : "전문가에게 견적을 요청하면\n채팅이 시작됩니다"}
          </EmptyDesc>
        </EmptyWrap>
      </PageWrap>
    </MainListLayout>
  );
};

export default MobileChatpage;

/* ─── styles ─── */

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: ${THEME.background};
`;

const EmptyWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
`;

const IconCircle = styled.div`
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: ${THEME.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${THEME.cardShadow};
  margin-bottom: 24px;
`;

const EmptyTitle = styled.div`
  font-size: 18px;
  font-weight: 400;
  color: ${THEME.text};
  letter-spacing: -0.03em;
  margin-bottom: 8px;
`;

const EmptyDesc = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  text-align: center;
  line-height: 1.6;
  white-space: pre-line;
`;
