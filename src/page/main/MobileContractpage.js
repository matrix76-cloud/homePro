/* eslint-disable */
import React, { useContext, useEffect, useState } from "react";
import styled from "styled-components";
import { useAtomValue } from "jotai";
import { collection, query, where, getDocs } from "firebase/firestore";
import { HiOutlineDocumentCheck } from "react-icons/hi2";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { MOBILEMAINMENU } from "../../utility/constants";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { appModeAtom } from "../../store/store";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";

const STATUS_TABS = ["전체", "진행중", "완료"];

const CONTRACTS_COLLECTION = "homepro_contracts";

/* 상태 표시 색상 (뱃지 없이 텍스트 색으로만) — 진행중=블루, 완료=회색 */
const statusColor = (status) => (status === "완료" ? THEME.muted : THEME.primary);

const toDateSafe = (ts) => (ts?.toDate ? ts.toDate() : new Date(ts || 0));

const formatDate = (ts) => {
  const d = toDateSafe(ts);
  if (!d || isNaN(d.getTime())) return "";
  return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
};

const formatAmount = (contract) => {
  if (contract.priceText) return contract.priceText;
  const amt = Number(contract.amount) || 0;
  return amt > 0 ? `${amt.toLocaleString()}원` : "금액 협의";
};

const MobileContractpage = () => {
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const appMode = useAtomValue(appModeAtom);
  const isPro = appMode === "pro";

  const uid = user?.uid || userData?.uid || user?.USERS_ID || user?.primaryUid;

  const [activeTab, setActiveTab] = useState("전체");
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const ref = collection(db, CONTRACTS_COLLECTION);
        // 내가 의뢰인이거나 홈프로인 계약을 각각 조회해 병합
        const [asClient, asPro] = await Promise.all([
          getDocs(query(ref, where("clientUid", "==", uid))),
          getDocs(query(ref, where("proUid", "==", uid))),
        ]);
        const map = {};
        [...asClient.docs, ...asPro.docs].forEach((d) => {
          map[d.id] = { id: d.id, ...d.data() };
        });
        const merged = Object.values(map).sort(
          (a, b) => toDateSafe(b.createdAt) - toDateSafe(a.createdAt)
        );
        if (!cancelled) setContracts(merged);
      } catch (err) {
        console.error("계약 조회 실패:", err);
        if (!cancelled) setContracts([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  const counts = {
    전체: contracts.length,
    진행중: contracts.filter((c) => c.status === "진행중").length,
    완료: contracts.filter((c) => c.status === "완료").length,
  };

  const filtered = activeTab === "전체"
    ? contracts
    : contracts.filter((c) => c.status === activeTab);

  return (
    <MainListLayout NAME="계약" hideBack footerType={MOBILEMAINMENU.HOME}>
      <PageWrap>
        {/* 상태 탭 */}
        <TabRow>
          {STATUS_TABS.map((tab) => (
            <TabItem key={tab} $active={activeTab === tab} onClick={() => setActiveTab(tab)}>
              {tab}
              <TabCount $active={activeTab === tab}>{counts[tab]}</TabCount>
            </TabItem>
          ))}
        </TabRow>

        <ListWrap>
          {loading ? (
            <EmptyWrap>
              <EmptyDesc>계약을 불러오는 중이에요</EmptyDesc>
            </EmptyWrap>
          ) : filtered.length === 0 ? (
            <EmptyWrap>
              <IconCircle>
                <HiOutlineDocumentCheck size={44} color={THEME.primary} />
              </IconCircle>
              <EmptyTitle>
                {activeTab === "전체" ? "아직 계약 내역이 없어요" : `${activeTab}인 계약이 없어요`}
              </EmptyTitle>
              <EmptyDesc>
                {isPro
                  ? "고객과 계약이 성사되면\n여기에서 관리할 수 있어요"
                  : "전문가와 계약이 성사되면\n여기에서 확인할 수 있어요"}
              </EmptyDesc>
            </EmptyWrap>
          ) : (
            filtered.map((c) => {
              const iAmClient = c.clientUid === uid;
              const counterLabel = iAmClient ? "홈프로" : "의뢰인";
              const counterName = iAmClient ? (c.proName || "홈프로") : (c.clientName || "의뢰인");
              return (
                <ContractCard key={c.id}>
                  <CardTop>
                    <CategoryText>{c.categoryName || "작업"}</CategoryText>
                    <StatusText $color={statusColor(c.status)}>{c.status}</StatusText>
                  </CardTop>
                  <CardTitle>{c.title}</CardTitle>
                  <MetaRow>
                    <MetaText>{counterLabel} {counterName}</MetaText>
                    {c.location ? <MetaText>{c.location}</MetaText> : null}
                  </MetaRow>
                  <CardBottom>
                    <DateText>{formatDate(c.createdAt)}</DateText>
                    <AmountText>{formatAmount(c)}</AmountText>
                  </CardBottom>
                </ContractCard>
              );
            })
          )}
        </ListWrap>
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
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 14px 16px;
  font-size: 15px;
  font-weight: 400;
  color: ${({ $active }) => ($active ? THEME.text : THEME.muted)};
  border-bottom: 2px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const TabCount = styled.span`
  font-size: 12px;
  font-weight: 500;
  color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
`;

const ListWrap = styled.div`
  flex: 1;
  min-height: 420px;
  display: flex;
  flex-direction: column;
  padding: 12px;
  gap: 10px;
`;

const ContractCard = styled.div`
  background: ${THEME.surface};
  border: 1px solid ${THEME.border};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  padding: 18px 18px 16px;
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;

const CategoryText = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const StatusText = styled.div`
  font-size: 13px;
  font-weight: 600;
  color: ${({ $color }) => $color};
`;

const CardTitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  line-height: 1.4;
  margin-bottom: 12px;
`;

const MetaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 14px;
`;

const MetaText = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.textSecondary};
`;

const CardBottom = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 12px;
  border-top: 1px solid ${THEME.border};
`;

const DateText = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const AmountText = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
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
  width: 88px;
  height: 88px;
  border-radius: 50%;
  background: ${THEME.surface};
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: ${THEME.cardShadow};
  margin-bottom: 22px;
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
