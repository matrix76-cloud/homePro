/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import { getOrdersByUser, formatOrderTime } from "../../service/OrderService";
import { UserContext } from "../../context/User";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoDocumentTextOutline } from "react-icons/io5";

/* ─── 상태 탭 ─── */
const STATUS_TABS = ["전체", "접수", "진행중", "작업완료", "취소"];
const STATUS_STYLE = {
  "접수": { bg: THEME.purpleLight, color: THEME.purple },
  "진행중": { bg: "#DBEAFE", color: THEME.primary },
  "배차완료": { bg: "#FEF3C7", color: "#B45309" },
  "작업완료": { bg: "#D1FAE5", color: THEME.success },
  "취소": { bg: "#FEE2E2", color: THEME.danger },
};

/* 탭 내장용 콘텐츠 컴포넌트 */
export const MyOrdersContent = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const [activeTab, setActiveTab] = useState("전체");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrdersByUser(user.uid);
        if (!cancelled) setOrders(data);
      } catch (err) {
        console.error("내 오더 조회 실패:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user?.uid]);

  const filtered = activeTab === "전체"
    ? orders
    : orders.filter((o) => o.orderStatus === activeTab);

  return (
    <PageWrap>
        {/* 상태 탭 */}
        <TabRow>
          {STATUS_TABS.map((tab) => {
            const count = tab === "전체" ? orders.length : orders.filter((o) => o.orderStatus === tab).length;
            return (
              <TabItem key={tab} $active={activeTab === tab} onClick={() => setActiveTab(tab)}>
                {tab}
                <TabCount $active={activeTab === tab}>{count}</TabCount>
              </TabItem>
            );
          })}
        </TabRow>

        {/* 오더 리스트 */}
        {loading ? (
          <EmptyWrap>
            <EmptyText>불러오는 중...</EmptyText>
          </EmptyWrap>
        ) : filtered.length === 0 ? (
          <EmptyWrap>
            <IoDocumentTextOutline size={48} color={THEME.muted} />
            <EmptyText>해당 상태의 오더가 없습니다</EmptyText>
          </EmptyWrap>
        ) : (
          filtered.map((order) => {
            const cat = CATEGORIES.find((c) => c.id === order.categoryId);
            const st = STATUS_STYLE[order.orderStatus] || STATUS_STYLE["접수"];
            return (
              <OrderCard key={order.id}>
                <CardTop>
                  <StatusBadge $bg={st.bg} $color={st.color}>{order.orderStatus}</StatusBadge>
                  <OrderDate>{formatOrderTime(order.createdAt)}</OrderDate>
                </CardTop>
                <CardTitle>{order.title}</CardTitle>
                <TagRow>
                  <Tag>{cat?.shortName}</Tag>
                  <Tag>{order.subcategory}</Tag>
                  <MatchTag>[{order.matchType}]</MatchTag>
                </TagRow>
                <CardBottom>
                  <BottomLeft>
                    <BottomText>{order.location}</BottomText>
                    <BottomText>{order.writer}</BottomText>
                  </BottomLeft>
                  <PriceText>{order.price}</PriceText>
                </CardBottom>
              </OrderCard>
            );
          })
        )}
    </PageWrap>
  );
};

const MyOrdersPage = () => (
  <SimpleBackLayout NAME="나의 오더" hideFooter>
    <MyOrdersContent />
  </SimpleBackLayout>
);

export default MyOrdersPage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: ${THEME.background};
`;

const TabRow = styled.div`
  display: flex;
  background: ${THEME.surface};
  border-bottom: 2px solid ${THEME.border};
  padding: 0 12px;
`;

const TabItem = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 12px 0;
  font-size: 13px;
  font-weight: 400;
  color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
  border-bottom: 2px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
  cursor: pointer;
  white-space: nowrap;
  margin-bottom: -2px;
  &:active { opacity: 0.7; }
`;

const TabCount = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${({ $active }) => $active ? "#fff" : THEME.muted};
  background: ${({ $active }) => $active ? THEME.primary : THEME.border};
  border-radius: 4px;
  padding: 2px 8px;
  min-width: 20px;
  text-align: center;
`;

const _StatDivider = styled.div`
  width: 1px;
  height: 32px;
  background: ${THEME.border};
`;

const OrderCard = styled.div`
  background: ${THEME.surface};
  margin: 6px 12px;
  padding: 16px;
  border-radius: 4px;
  border: 1px solid ${THEME.border};
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const StatusBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 400;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

const OrderDate = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const CardTitle = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  margin-bottom: 8px;
`;

const TagRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
`;

const Tag = styled.span`
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 400;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const MatchTag = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.purple};
`;

const CardBottom = styled.div`
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding-top: 10px;
  border-top: 1px solid ${THEME.border};
`;

const BottomLeft = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const BottomText = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const PriceText = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.primary};
`;

const EmptyWrap = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 12px;
`;

const EmptyText = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
`;
