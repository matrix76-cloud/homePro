/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import { getOrdersByCategory, formatOrderTime } from "../../service/OrderService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";

/* ─── 오더 상태 라벨 색상 ─── */
const STATUS_STYLE = {
  "접수": { bg: THEME.purpleLight, color: THEME.purple },
  "지원가능": { bg: "#DBEAFE", color: THEME.primary },
  "배차대기": { bg: "#FEF3C7", color: "#B45309" },
  "취소": { bg: "#FEE2E2", color: THEME.danger },
  "완료": { bg: "#D1FAE5", color: THEME.success },
};

const OrderListPage = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const categoryId = searchParams.get("category");
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const headerName = category ? category.name : "오더 리스트";

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) { setLoading(false); return; }
    let cancelled = false;
    (async () => {
      try {
        const data = await getOrdersByCategory(categoryId);
        if (!cancelled) setOrders(data);
      } catch (err) {
        console.error("오더 조회 실패:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [categoryId]);

  const handleCardClick = (order) => {
    navigate(`/order/detail/${order.id}`, { state: { order, category } });
  };

  return (
    <SimpleBackLayout NAME={headerName} hideFooter>
      <ListWrap>
        {loading ? (
          <EmptyState><EmptyText>불러오는 중...</EmptyText></EmptyState>
        ) : orders.length === 0 ? (
          <EmptyState>
            <EmptyText>
              {category
                ? `아직 ${category.name} 요청이 없습니다.`
                : "등록된 오더가 없습니다."}
              <br />
              새로운 요청이 들어오면 알려드릴게요!
            </EmptyText>
          </EmptyState>
        ) : (
          orders.map((order) => {
            const st = STATUS_STYLE[order.orderStatus] || STATUS_STYLE["접수"];
            return (
              <CardWrap key={order.id} onClick={() => handleCardClick(order)}>
                <CardHeader>
                  <OrderBadge $color={st.bg} $textColor={st.color}>
                    {order.orderStatus}
                  </OrderBadge>
                  <TimeText>{formatOrderTime(order.createdAt)}</TimeText>
                </CardHeader>
                <TagRow>
                  {order.subcategory && <SubTag>{order.subcategory}[{order.matchType}]</SubTag>}
                  {order.spaceType && <SpaceTag>{order.spaceType}</SpaceTag>}
                </TagRow>
                <OrderTitle>{order.title}</OrderTitle>
                <OrderDesc>{order.description}</OrderDesc>
                <BottomRow>
                  <OrderLocation>{order.location}</OrderLocation>
                  <OrderSchedule>{order.price}</OrderSchedule>
                </BottomRow>
              </CardWrap>
            );
          })
        )}
      </ListWrap>
    </SimpleBackLayout>
  );
};

export default OrderListPage;

/* ===================== styles ===================== */

const ListWrap = styled.div`
  padding: 12px 0 20px;
  background: ${THEME.background};
  min-height: 100%;
`;

const CardWrap = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  margin: 0 16px 10px;
  padding: 16px;
  box-shadow: ${THEME.cardShadow};
  cursor: pointer;
  &:active { transform: scale(0.99); }
  transition: transform 0.1s;
`;

const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const OrderBadge = styled.span`
  display: inline-block;
  padding: 4px 10px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 400;
  background: ${({ $color }) => $color};
  color: ${({ $textColor }) => $textColor};
`;

const TimeText = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const TagRow = styled.div`
  display: flex;
  gap: 6px;
  margin-bottom: 8px;
`;

const SubTag = styled.span`
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 400;
  background: ${THEME.purpleLight};
  color: ${THEME.purple};
`;

const SpaceTag = styled.span`
  padding: 3px 8px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 400;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const OrderTitle = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  line-height: 1.4;
`;

const OrderDesc = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 6px;
  line-height: 1.5;
  white-space: pre-line;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const BottomRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${THEME.border};
`;

const OrderLocation = styled.span`
  font-size: 12px;
  color: ${THEME.muted};
  font-weight: 400;
`;

const OrderSchedule = styled.span`
  font-size: 12px;
  color: ${THEME.primary};
  font-weight: 400;
`;

const EmptyState = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
`;

const EmptyText = styled.div`
  font-weight: 400;
  color: ${THEME.muted};
  line-height: 1.6;
  text-align: center;
`;
