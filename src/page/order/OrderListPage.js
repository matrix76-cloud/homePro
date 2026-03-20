/* eslint-disable */
import React, { useState, useEffect, useCallback, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { IoLocationOutline } from "react-icons/io5";
import { CATEGORIES, THEME } from "../../config/homeproConfig";
import { getOrdersPaginated, formatOrderTime, hideOrder } from "../../service/OrderService";
import { useAuth } from "../../context/AuthContext";
import { UserContext } from "../../context/User";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";

const PAGE_SIZE = 20;

const OrderListPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.USERS_ID || userData?.uid;
  const [orders, setOrders] = useState([]);
  const [lastDoc, setLastDoc] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(""), 5000); };

  const handleHideOrder = async (orderId) => {
    if (!uid || !orderId) return;
    try {
      await hideOrder(orderId, uid);
      setOrders((prev) => prev.filter((o) => o.id !== orderId));
      showToast("오더가 삭제되었습니다");
    } catch (e) {
      console.error("오더 숨기기 실패:", e);
    }
  };

  const loadOrders = useCallback(async (cursor = null) => {
    const isFirst = !cursor;
    if (isFirst) setLoading(true); else setLoadingMore(true);
    try {
      const result = await getOrdersPaginated(cursor, PAGE_SIZE);
      setOrders((prev) => isFirst ? result.orders : [...prev, ...result.orders]);
      setLastDoc(result.lastDoc);
      setHasMore(result.hasMore);
    } catch (err) {
      console.error("오더 조회 실패:", err);
    } finally {
      if (isFirst) setLoading(false); else setLoadingMore(false);
    }
  }, []);

  useEffect(() => { loadOrders(); }, [loadOrders]);

  return (
    <SimpleBackLayout NAME="전체 오더" hideFooter>
      <ListWrap>
        {loading ? (
          <EmptyState><EmptyText>불러오는 중...</EmptyText></EmptyState>
        ) : orders.length === 0 ? (
          <EmptyState>
            <EmptyText>등록된 요청이 없습니다.<br />새로운 요청이 들어오면 알려드릴게요!</EmptyText>
          </EmptyState>
        ) : (
          <>
            {orders.filter((o) => !(o.hiddenBy || []).includes(uid) && !["결제", "완료", "리뷰", "취소"].includes(o.orderStatus)).map((order) => {
              const cat = CATEGORIES.find((c) => c.id === order.categoryId);
              const timeLabel = formatOrderTime(order.createdAt);
              const customerName = order.writer || order.customerName || order.nickname || "고객";
              const quoteCount = order.quoteCount || 0;
              const desc = order.description || order.details || "";
              const isPriority = order.matchType === "우선";
              return (
                <CardWrap key={order.id}>
                  <CardTop>
                    {order.writerPhoto ? (
                      <CardAvatarImg src={order.writerPhoto} alt="" />
                    ) : (
                      <CardAvatar>{customerName.charAt(0)}</CardAvatar>
                    )}
                    <CardTopInfo>
                      <CardCustomer>
                        {customerName}
                        <CardQuote> · 견적 보낸 프로 <CardQuoteNum>{quoteCount}</CardQuoteNum>명</CardQuote>
                      </CardCustomer>
                    </CardTopInfo>
                    <CardTime>{timeLabel}</CardTime>
                  </CardTop>

                  <CardMiddle>
                    <CardCatName>{order.categoryName}</CardCatName>
                    <CardSubRow>
                      <CardSubName>{order.subcategory}</CardSubName>
                      {isPriority && <CardMatchBadge>우선</CardMatchBadge>}
                    </CardSubRow>
                    {order.location && (
                      <CardLocation>
                        <IoLocationOutline size={14} color={THEME.textSecondary} />
                        {order.location}
                      </CardLocation>
                    )}
                    {desc && <CardDesc>{desc}</CardDesc>}
                    {order.price && (
                      <CardPrice>
                        {order.price === "협의 가능" ? (
                          <>협의 가능해요 <CardNegoDot /></>
                        ) : (
                          order.price
                        )}
                      </CardPrice>
                    )}
                  </CardMiddle>

                  <CardDivider />
                  <CardActions>
                    <CardActionBtn onClick={() => handleHideOrder(order.id)}>삭제하기</CardActionBtn>
                    <CardActionSep />
                    <CardActionBtn $primary onClick={() => navigate(`/order/detail/${order.id}`, { state: { order, category: cat } })}>자세히 보기</CardActionBtn>
                  </CardActions>
                </CardWrap>
              );
            })}

            {hasMore && (
              <LoadMoreBtn onClick={() => loadOrders(lastDoc)} disabled={loadingMore}>
                {loadingMore ? "불러오는 중..." : "더보기"}
              </LoadMoreBtn>
            )}
          </>
        )}
        {toast && <HideToast>{toast}</HideToast>}
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
  margin: 0 12px 12px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const CardTop = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const CardAvatar = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${THEME.purpleLight};
  color: ${THEME.primary};
  font-size: 14px;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const CardAvatarImg = styled.img`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const CardTopInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const CardCustomer = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
  display: flex;
  align-items: center;
  flex-wrap: wrap;
`;

const CardQuote = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const CardQuoteNum = styled.span`
  font-weight: 600;
  color: ${THEME.primary};
`;

const CardTime = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  flex-shrink: 0;
`;

const CardMiddle = styled.div`
  margin-top: 14px;
`;

const CardCatName = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
`;

const CardSubRow = styled.div`
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 2px;
`;

const CardSubName = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  word-break: keep-all;
  line-height: 1.4;
`;

const CardMatchBadge = styled.span`
  font-size: 12px;
  font-weight: 600;
  color: ${THEME.purple};
  background: ${THEME.purpleLight};
  padding: 2px 6px;
  border-radius: 4px;
`;

const CardLocation = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
`;

const CardDesc = styled.div`
  margin-top: 8px;
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
`;

const CardPrice = styled.div`
  margin-top: 8px;
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.primary};
  display: flex;
  align-items: center;
  gap: 6px;
`;

const CardNegoDot = styled.span`
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: ${THEME.danger};
`;

const CardDivider = styled.div`
  height: 1px;
  background: ${THEME.border};
  margin-top: 16px;
`;

const CardActions = styled.div`
  display: flex;
  align-items: center;
`;

const CardActionSep = styled.div`
  width: 1px;
  height: 20px;
  background: ${THEME.border};
`;

const CardActionBtn = styled.button`
  flex: 1;
  padding: 14px 0;
  border: none;
  background: none;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  color: ${({ $primary }) => ($primary ? THEME.primary : THEME.textSecondary)};
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const LoadMoreBtn = styled.button`
  display: block;
  margin: 8px auto 20px;
  padding: 12px 32px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.textSecondary};
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.7; }
  &:disabled { opacity: 0.5; cursor: default; }
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

const toastSlideDown = keyframes`
  from { transform: translate(-50%, -20px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
`;

const HideToast = styled.div`
  position: fixed;
  top: calc(env(safe-area-inset-top, 0px) + 60px);
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  font-size: 14px;
  font-weight: 400;
  border-radius: 10px;
  z-index: 9999;
  white-space: nowrap;
  animation: ${toastSlideDown} 0.3s ease-out;
`;
