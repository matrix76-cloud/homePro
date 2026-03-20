/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { CATEGORIES, THEME, COLLECTIONS } from "../../config/homeproConfig";
import { getOrdersByUser, formatOrderTime } from "../../service/OrderService";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../api/config";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoDocumentTextOutline } from "react-icons/io5";

/* ─── 상태 탭 ─── */
const STATUS_TABS = ["전체", "요청", "결제", "완료", "리뷰", "취소"];
const STATUS_STYLE = {
  "요청": { bg: THEME.purple, color: "#fff" },
  "결제": { bg: THEME.primary, color: "#fff" },
  "완료": { bg: THEME.success, color: "#fff" },
  "리뷰": { bg: "#F59E0B", color: "#fff" },
  "취소": { bg: THEME.danger, color: "#fff" },
};

/* 탭 내장용 콘텐츠 컴포넌트 */
export const MyOrdersContent = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = userData?.uid || user?.USERS_ID || user?.uid;
  const [activeTab, setActiveTab] = useState("전체");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrdersByUser(uid);
        if (!cancelled) setOrders(data);
      } catch (err) {
        console.error("내 오더 조회 실패:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [uid]);

  const handleCancel = async (e, orderId) => {
    e.stopPropagation();
    if (!window.confirm("요청을 취소하시겠습니까?\n취소 후에는 되돌릴 수 없습니다.")) return;
    try {
      await updateDoc(doc(db, COLLECTIONS.ORDERS, orderId), { orderStatus: "취소" });
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, orderStatus: "취소" } : o));
    } catch (e) {
      alert("취소 처리에 실패했습니다.");
    }
  };

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
            <EmptyText>해당 상태의 요청이 없습니다</EmptyText>
          </EmptyWrap>
        ) : (
          filtered.map((order) => {
            const cat = CATEGORIES.find((c) => c.id === order.categoryId);
            const st = STATUS_STYLE[order.orderStatus] || STATUS_STYLE["요청"];
            const canCancel = !["완료", "리뷰", "취소"].includes(order.orderStatus);
            return (
              <OrderCard key={order.id}>
                <CardTop>
                  <StatusBadge $bg={st.bg} $color={st.color}>{order.orderStatus}</StatusBadge>
                  <OrderDate>{formatOrderTime(order.createdAt)}</OrderDate>
                </CardTop>
                <CardTitle>{order.title}</CardTitle>
                <TagRow>
                  <Tag>{cat?.shortName}</Tag>
                  {order.subcategory && order.subcategory.split(", ").map((s, i) => (
                    <Tag key={i}>{s.trim()}</Tag>
                  ))}
                  {order.matchType && <MatchTag>[{order.matchType}]</MatchTag>}
                </TagRow>
                <CardBottom>
                  <BottomLeft>
                    <BottomText>{order.location}</BottomText>
                    <BottomText>{order.writer}</BottomText>
                  </BottomLeft>
                  <PriceText>{order.price}</PriceText>
                </CardBottom>
                {canCancel && (
                  <CancelRow>
                    <CancelOrderBtn onClick={(e) => handleCancel(e, order.id)}>취소하기</CancelOrderBtn>
                  </CancelRow>
                )}
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
  flex-wrap: wrap;
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

const CancelRow = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid ${THEME.border};
  display: flex;
  justify-content: flex-end;
`;

const CancelOrderBtn = styled.button`
  border: 1px solid ${THEME.danger};
  background: transparent;
  color: ${THEME.danger};
  font-size: 13px;
  font-weight: 500;
  padding: 6px 16px;
  border-radius: 8px;
  cursor: pointer;
  &:active { opacity: 0.7; }
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
