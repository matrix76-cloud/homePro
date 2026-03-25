/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { CATEGORIES, THEME, COLLECTIONS } from "../../config/homeproConfig";
import { getOrdersByUser, formatOrderTime, updateOrderStatus, submitOrderReview } from "../../service/OrderService";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { MOBILEMAINMENU } from "../../utility/constants";
import { IoStarOutline } from "react-icons/io5";

/* ─── 상태 탭 ─── */
const STATUS_TABS = ["전체", "요청", "진행", "완료", "리뷰", "취소"];
const STATUS_DESC = {
  "전체": "내가 올린 모든 요청이에요.\n각 요청이 지금 어떤 단계인지 한눈에 볼 수 있어요.",
  "요청": "내 요청을 전문가들이 보고 있어요.\n곧 견적이 도착하면 채팅으로 알려드릴게요!",
  "진행": "전문가와 매칭되어 작업이 진행 중이에요.\n채팅으로 소통하세요.",
  "완료": "전문가가 작업을 마쳤어요.\n리뷰를 남겨주시면 전문가에게 큰 힘이 돼요!",
  "리뷰": "리뷰가 등록된 요청이에요.\n감사합니다!",
  "취소": "취소된 요청 목록이에요.\n같은 내용으로 다시 요청하실 수 있어요.",
};
const STATUS_STYLE = {
  "요청": { bg: "#F59E0B", color: "#fff" },
  "진행": { bg: THEME.primary, color: "#fff" },
  "완료": { bg: THEME.success, color: "#fff" },
  "리뷰": { bg: "#3B82F6", color: "#fff" },
  "취소": { bg: THEME.danger, color: "#fff" },
};
const STATUS_TRANSITIONS = {
  "요청": ["진행", "취소"],
  "진행": ["완료", "취소"],
  "완료": [],
  "리뷰": [],
  "취소": [],
};

const normalizeStatus = (s) => s === "결제" ? "진행" : s;

/* 탭 내장용 콘텐츠 컴포넌트 */
export const MyOrdersContent = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = userData?.uid || user?.USERS_ID || user?.uid;
  const [activeTab, setActiveTab] = useState("전체");
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reviewModal, setReviewModal] = useState(null);

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

  const handleStatusChange = async (e, orderId, newStatus) => {
    e.stopPropagation();
    const label = newStatus === "취소" ? "취소하시겠습니까?\n취소 후에는 되돌릴 수 없습니다." : `상태를 "${newStatus}"(으)로 변경하시겠습니까?`;
    if (!window.confirm(label)) return;
    try {
      await updateOrderStatus(orderId, newStatus);
      setOrders((prev) => prev.map((o) => o.id === orderId ? { ...o, orderStatus: newStatus } : o));
    } catch (e) {
      alert("상태 변경에 실패했습니다.");
    }
  };

  const handleReviewSubmit = async ({ rating, content }) => {
    if (!reviewModal) return;
    try {
      await submitOrderReview(reviewModal.orderId, {
        rating,
        content,
        reviewerUid: uid,
        reviewerName: userData?.name || "",
      });
      setOrders((prev) => prev.map((o) => o.id === reviewModal.orderId ? { ...o, orderStatus: "리뷰" } : o));
      setReviewModal(null);
      alert("리뷰가 등록되었습니다!");
    } catch (e) {
      alert("리뷰 등록에 실패했습니다.");
    }
  };

  const filtered = activeTab === "전체"
    ? orders
    : orders.filter((o) => normalizeStatus(o.orderStatus) === activeTab);

  return (
    <PageWrap>
        {/* 상태 탭 */}
        <TabRow>
          {STATUS_TABS.map((tab) => {
            const count = tab === "전체" ? orders.length : orders.filter((o) => normalizeStatus(o.orderStatus) === tab).length;
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
            const displayStatus = normalizeStatus(order.orderStatus);
            const st = STATUS_STYLE[displayStatus] || STATUS_STYLE["요청"];
            return (
              <OrderCard key={order.id}>
                <CardTop>
                  <StatusBadge $bg={st.bg} $color={st.color}>{displayStatus}</StatusBadge>
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

                {/* 상태 변경 콤보 */}
                {STATUS_TRANSITIONS[displayStatus]?.length > 0 && (
                  <ActionRow>
                    <StatusSelect
                      value=""
                      onChange={(e) => {
                        if (e.target.value) handleStatusChange(e, order.id, e.target.value);
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value="">상태 변경</option>
                      {STATUS_TRANSITIONS[displayStatus].map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </StatusSelect>
                  </ActionRow>
                )}

                {/* 완료 상태 → 리뷰 작성 버튼 */}
                {displayStatus === "완료" && (
                  <ActionRow>
                    <ReviewBtn onClick={(e) => { e.stopPropagation(); setReviewModal({ orderId: order.id, order }); }}>
                      <IoStarOutline size={16} /> 리뷰 작성
                    </ReviewBtn>
                  </ActionRow>
                )}
              </OrderCard>
            );
          })
        )}

        {/* 리뷰 모달 */}
        {reviewModal && (
          <ReviewModalOverlay onClick={() => setReviewModal(null)}>
            <ReviewModalBox onClick={(e) => e.stopPropagation()}>
              <ReviewModalTitle>리뷰 작성</ReviewModalTitle>
              <ReviewModalDesc>{reviewModal.order?.title}</ReviewModalDesc>
              <ReviewStars>
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    $active={star <= (reviewModal.rating || 0)}
                    onClick={() => setReviewModal((prev) => ({ ...prev, rating: star }))}
                  >
                    ★
                  </Star>
                ))}
              </ReviewStars>
              <ReviewTextarea
                placeholder="작업은 어떠셨나요? 후기를 남겨주세요."
                value={reviewModal.content || ""}
                onChange={(e) => setReviewModal((prev) => ({ ...prev, content: e.target.value }))}
                rows={4}
              />
              <ReviewBtnRow>
                <ReviewCancelBtn onClick={() => setReviewModal(null)}>취소</ReviewCancelBtn>
                <ReviewSubmitBtn
                  disabled={!reviewModal.rating}
                  onClick={() => handleReviewSubmit({ rating: reviewModal.rating, content: reviewModal.content || "" })}
                >
                  등록
                </ReviewSubmitBtn>
              </ReviewBtnRow>
            </ReviewModalBox>
          </ReviewModalOverlay>
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

const ActionRow = styled.div`
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid ${THEME.border};
  display: flex;
  justify-content: flex-end;
  gap: 8px;
`;

const StatusSelect = styled.select`
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 13px;
  padding: 6px 12px;
  border-radius: 8px;
  cursor: pointer;
  outline: none;
  &:focus { border-color: ${THEME.primary}; }
`;

const ReviewBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  border: 1px solid ${THEME.primary};
  background: ${THEME.primary}10;
  color: ${THEME.primary};
  font-size: 13px;
  font-weight: 500;
  padding: 6px 16px;
  border-radius: 8px;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const ReviewModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.4);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ReviewModalBox = styled.div`
  background: #fff;
  border-radius: 16px;
  padding: 24px;
  width: 100%;
  max-width: 360px;
`;

const ReviewModalTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 4px;
`;

const ReviewModalDesc = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  margin-bottom: 16px;
`;

const ReviewStars = styled.div`
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
  justify-content: center;
`;

const Star = styled.span`
  font-size: 32px;
  cursor: pointer;
  color: ${({ $active }) => $active ? "#F59E0B" : "#E5E7EB"};
  transition: color 0.15s;
`;

const ReviewTextarea = styled.textarea`
  width: 100%;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  padding: 12px;
  font-size: 14px;
  resize: none;
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${THEME.primary}; }
`;

const ReviewBtnRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 16px;
`;

const ReviewCancelBtn = styled.button`
  flex: 1;
  padding: 12px;
  border: 1px solid ${THEME.border};
  background: #fff;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
`;

const ReviewSubmitBtn = styled.button`
  flex: 1;
  padding: 12px;
  border: none;
  background: ${THEME.primary};
  color: #fff;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  &:disabled { opacity: 0.5; cursor: not-allowed; }
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
