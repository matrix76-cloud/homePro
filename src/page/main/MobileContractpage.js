/* eslint-disable */
import React, { useContext } from "react";
import styled from "styled-components";
import { useAtomValue } from "jotai";
import { HiOutlineDocumentCheck } from "react-icons/hi2";
import { THEME } from "../../config/homeproConfig";
import { MOBILEMAINMENU } from "../../utility/constants";
import { UserContext } from "../../context/User";
import { appModeAtom } from "../../store/store";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";

const MobileContractpage = () => {
  const { user } = useContext(UserContext);
  const appMode = useAtomValue(appModeAtom);
  const isPro = appMode === "pro";

  return (
    <MainListLayout NAME="계약" hideBack footerType={MOBILEMAINMENU.HOME}>
      <PageWrap>
        {/* 상태 탭 */}
        <TabRow>
          <TabItem $active>전체</TabItem>
          <TabItem>진행중</TabItem>
          <TabItem>완료</TabItem>
        </TabRow>

        {/* 빈 상태 */}
        <EmptyWrap>
          <IconCircle>
            <HiOutlineDocumentCheck size={48} color={THEME.primary} />
          </IconCircle>
          <EmptyTitle>아직 계약 내역이 없어요</EmptyTitle>
          <EmptyDesc>
            {isPro
              ? "고객과 계약이 성사되면\n여기에서 관리할 수 있어요"
              : "전문가와 계약이 성사되면\n여기에서 확인할 수 있어요"}
          </EmptyDesc>
        </EmptyWrap>
      </PageWrap>
    </MainListLayout>
  );
};

export default MobileContractpage;

/* ─── styles ─── */

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: ${THEME.background};
`;

const TabRow = styled.div`
  display: flex;
  background: ${THEME.surface};
  border-bottom: 1px solid ${THEME.border};
  padding: 0 16px;
`;

const TabItem = styled.div`
  padding: 14px 16px;
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? "700" : "500")};
  color: ${({ $active }) => ($active ? THEME.text : THEME.muted)};
  border-bottom: 2px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
  cursor: pointer;
  &:active { opacity: 0.6; }
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
  font-weight: 800;
  color: ${THEME.text};
  letter-spacing: -0.03em;
  margin-bottom: 8px;
`;

const EmptyDesc = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.muted};
  text-align: center;
  line-height: 1.6;
  white-space: pre-line;
`;
