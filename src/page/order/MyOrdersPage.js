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
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { MOBILEMAINMENU } from "../../utility/constants";
import { IoDocumentTextOutline } from "react-icons/io5";

/* ─── 상태 탭 ─── */
const STATUS_TABS = ["전체", "요청", "결제", "완료", "리뷰", "취소"];
const STATUS_DESC = {
  "전체": "내가 올린 모든 요청이에요.\n각 요청이 지금 어떤 단계인지 한눈에 볼 수 있어요.",
  "요청": "내 요청을 전문가들이 보고 있어요.\n곧 견적이 도착하면 채팅으로 알려드릴게요!",
  "결제": "전문가의 견적을 수락하고 결제까지 끝났어요.\n약속된 날짜에 전문가가 방문합니다.",
  "완료": "전문가가 작업을 마쳤어요.\n만족하셨다면 리뷰를 남겨주시면 전문가에게 큰 힘이 돼요!",
  "리뷰": "작업은 어떠셨나요? 별점과 한마디를 남겨주세요.\n다음 고객이 전문가를 선택할 때 큰 도움이 됩니다.",
  "취소": "취소된 요청 목록이에요.\n같은 내용으로 다시 요청하실 수 있어요.",
};
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
                <TabCount $active={activeTab === tab}>{count}</TabCount>
                <TabLabel>{tab}</TabLabel>
              </TabItem>
            );
          })}
        </TabRow>
        <TabDescWrap>
          <TabDescArrow $idx={STATUS_TABS.indexOf(activeTab)} />
          <TabDesc>{STATUS_DESC[activeTab]}</TabDesc>
        </TabDescWrap>

        {/* 오더 리스트 */}
        {loading ? (
          <EmptyWrap>
            <EmptyText>불러오는 중...</EmptyText>
          </EmptyWrap>
        ) : filtered.length === 0 ? null : (
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
  <SimpleBackLayout NAME="내 요청" hideFooter>
    <MyOrdersContent />
  </SimpleBackLayout>
);

export const MyOrdersFooterPage = () => (
  <MainListLayout NAME="내 요청" footerType={MOBILEMAINMENU.MYORDERS} hideBack>
    <MyOrdersContent />
  </MainListLayout>
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
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  gap: 8px;
  padding: 12px 12px 4px;
`;

const TabDescWrap = styled.div`
  position: relative;
  margin: 6px 12px 8px;
`;

const TabDescArrow = styled.div`
  position: absolute;
  top: -6px;
  left: calc(${({ $idx }) => ($idx * 100 / 6 + 100 / 12)}% - 6px);
  width: 12px;
  height: 12px;
  background: ${THEME.primary};
  transform: rotate(45deg);
  border-radius: 2px;
  transition: left 0.2s ease;
`;

const TabDesc = styled.div`
  font-size: 12px;
  color: #fff;
  text-align: left;
  padding: 10px 14px;
  background: ${THEME.primary};
  border-radius: 10px;
  line-height: 1.5;
  white-space: pre-line;
`;

const TabItem = styled.div`
  background: #fff;
  border-radius: 12px;
  padding: 8px 0;
  text-align: center;
  box-shadow: 0 1px 4px rgba(0,0,0,0.04);
  border: 1px solid ${({ $active }) => $active ? THEME.primary : "#EEEEED"};
  cursor: pointer;
  transition: all 0.15s;
  &:active { transform: scale(0.96); }
`;

const TabCount = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ $active }) => $active ? THEME.primary : THEME.muted};
  line-height: 1;
`;

const TabLabel = styled.div`
  font-size: 11px;
  color: ${THEME.muted};
  margin-top: 4px;
  font-weight: 500;
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
