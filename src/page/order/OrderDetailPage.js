/* eslint-disable */
import React, { useState, useEffect, useCallback, useContext } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { THEME, CATEGORIES } from "../../config/homeproConfig";
import { getOrder, formatOrderTime, hasMyQuote, sendQuote, getQuotes, acceptQuote } from "../../service/OrderService";
import { createChatRoom } from "../../service/ChatService";
import { getMyProDocs } from "../../service/ProService";
import { getUserProfileByUid } from "../../service/UserProfileService";
import { useAuth } from "../../context/AuthContext";
import { UserContext } from "../../context/User";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import {
  IoLocationOutline,
  IoCalendarOutline,
  IoPersonOutline,
  IoCashOutline,
  IoChatbubbleEllipsesOutline,
  IoCallOutline,
  IoHomeOutline,
  IoChevronBack,
  IoChevronForward,
  IoCloseOutline,
  IoCheckmarkCircle,
  IoPersonCircleOutline,
} from "react-icons/io5";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { CATEGORY_ICONS } from "../../utility/CategoryIcons";
import { SCHEDULE_OPTIONS } from "../../config/homeproConfig";
import { GradeBadge } from "../../utility/gradeUtils";

const STATUS_BADGE = {
  "접수": { bg: THEME.purple, text: "#fff" },
  "지원가능": { bg: THEME.primary, text: "#fff" },
  "배차대기": { bg: "#F59E0B", text: "#fff" },
  "진행중": { bg: THEME.primary, text: "#fff" },
  "작업완료": { bg: THEME.success, text: "#fff" },
  "취소": { bg: THEME.danger, text: "#fff" },
  "완료": { bg: THEME.success, text: "#fff" },
};

const OrderDetailPage = () => {
  const { state } = useLocation();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const [fetchedOrder, setFetchedOrder] = useState(null);
  const order = state?.order || fetchedOrder;
  const category = state?.category || (order ? CATEGORIES.find((c) => c.id === order.categoryId) : null);
  const myUid = userData?.uid || user?.USERS_ID;

  // state 없으면 Firestore에서 직접 조회
  useEffect(() => {
    if (state?.order || !orderId) return;
    getOrder(orderId).then((data) => {
      if (data) setFetchedOrder(data);
    }).catch((err) => console.error("오더 조회 실패:", err));
  }, [orderId, state?.order]);

  const [photoIdx, setPhotoIdx] = useState(0);
  const [toast, setToast] = useState("");
  const [proDocs, setProDocs] = useState(null);
  const [showQuoteSheet, setShowQuoteSheet] = useState(false);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteMsg, setQuoteMsg] = useState("");
  const [quoteSending, setQuoteSending] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const isOwner = order?.createdBy === myUid;

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); }, []);

  useEffect(() => {
    if (!myUid) return;
    getMyProDocs(myUid).then(setProDocs).catch(() => setProDocs([]));
  }, [myUid]);

  // 견적 목록 로드 (프로 등급 포함)
  const loadQuotes = useCallback(async () => {
    if (!order?.id) return;
    try {
      const raw = await getQuotes(order.id);
      const enriched = await Promise.all(raw.map(async (q) => {
        try {
          const profile = await getUserProfileByUid(q.proUid);
          return { ...q, proGrade: profile?.grade || "rookie" };
        } catch { return { ...q, proGrade: "rookie" }; }
      }));
      setQuotes(enriched);
    } catch {}
  }, [order?.id]);

  useEffect(() => { loadQuotes(); }, [loadQuotes]);

  const checkPermission = () => {
    if (isOwner) { showToast("본인이 등록한 오더입니다"); return false; }
    if (!proDocs || proDocs.length === 0) { showToast("비즈프로필에 등록된 사업자가 아닙니다"); return false; }
    const hasPending = proDocs.some((d) => d.status === "pending");
    const hasApproved = proDocs.some((d) => d.status === "approved");
    if (!hasApproved && hasPending) { showToast("전문분야 승인 대기 중입니다"); return false; }
    if (!hasApproved) { showToast("비즈프로필에 등록된 사업자가 아닙니다"); return false; }
    return true;
  };

  const handleCall = async () => {
    if (!checkPermission()) return;
    let phone = "";
    if (order.contactType === "customer" && order.customerPhone) {
      phone = order.customerPhone;
    } else {
      try {
        const profile = await getUserProfileByUid(order.createdBy);
        phone = profile?.phoneE164 || profile?.phone || "";
      } catch (e) {}
    }
    if (!phone) { showToast("연락처 정보가 없습니다"); return; }
    window.location.href = `tel:${phone}`;
  };

  const handleQuote = async () => {
    if (!checkPermission()) return;
    const already = await hasMyQuote(order.id, myUid);
    if (already) { showToast("이미 견적을 보낸 오더입니다"); return; }
    setQuotePrice("");
    setQuoteMsg("");
    setShowQuoteSheet(true);
  };

  const handleSendQuote = async () => {
    if (quoteSending) return;
    setQuoteSending(true);
    try {
      const proName = userData?.nickname || userData?.name || "전문가";
      const proPhoto = userData?.profileImage || userData?.photoURL || "";
      const approvedPro = proDocs?.find((d) => d.status === "approved");
      await sendQuote(order.id, {
        proUid: myUid,
        proName,
        proPhoto,
        proGrade: userData?.grade || "rookie",
        categoryId: approvedPro?.categoryId || "",
        price: Number(quotePrice) || 0,
        message: quoteMsg.trim(),
      });
      // 푸시 알림
      try {
        await addDoc(collection(db, "notifications"), {
          targetUids: [order.createdBy],
          title: "견적 도착",
          body: `${proName}님이 견적을 보냈습니다`,
          type: "quote",
          data: { orderId: order.id },
          read: false,
          sent: false,
          createdAt: serverTimestamp(),
        });
      } catch (e) {}
      // 채팅방 자동 생성 + 시스템 메시지
      try {
        const { createChatRoom, sendSystemMessage } = await import("../../service/ChatService");
        const roomId = await createChatRoom(
          myUid, proName, proPhoto,
          order.createdBy, order.writer || "고객", order.writerPhoto || "",
          { orderId: order.id, quoteId: "" }
        );
        const priceText = (Number(quotePrice) || 0).toLocaleString();
        await sendSystemMessage(roomId, {
          text: `견적을 보냈습니다.\n금액: ${priceText}원${quoteMsg.trim() ? `\n${quoteMsg.trim()}` : ""}`,
          type: "quote",
          quoteData: { price: Number(quotePrice) || 0, message: quoteMsg.trim(), proName, proUid: myUid },
        });
        setShowQuoteSheet(false);
        showToast("견적을 보냈습니다");
        navigate(`/chat/${roomId}`);
      } catch (chatErr) {
        console.warn("채팅방 생성 실패:", chatErr);
        setShowQuoteSheet(false);
        showToast("견적을 보냈습니다");
      }
      loadQuotes();
    } catch (e) {
      console.error("견적 전송 실패:", e);
      showToast("견적 전송에 실패했습니다");
    } finally {
      setQuoteSending(false);
    }
  };

  const handleAcceptQuote = async (quote) => {
    try {
      await acceptQuote(order.id, quote.id, quote.proUid);
      // 채팅방 quoteStatus 업데이트
      try {
        const { updateQuoteStatus } = await import("../../service/ChatService");
        // orderId로 채팅방 찾기
        const { getDocs, query, where, collection: col } = await import("firebase/firestore");
        const q = query(col(db, "chatRooms"), where("orderId", "==", order.id), where("participants", "array-contains", quote.proUid));
        const snap = await getDocs(q);
        if (!snap.empty) {
          await updateQuoteStatus(snap.docs[0].id, quote.id, "accepted", order.id);
        }
      } catch (e) { console.warn("채팅방 상태 업데이트 실패:", e); }
      // 프로에게 푸시
      try {
        await addDoc(collection(db, "notifications"), {
          targetUids: [quote.proUid],
          title: "견적 수락",
          body: "견적이 수락되었습니다! 대화를 시작하세요",
          type: "quote_accepted",
          data: { orderId: order.id },
          read: false,
          sent: false,
          createdAt: serverTimestamp(),
        });
      } catch (e) {}
      showToast("견적을 수락했습니다");
      loadQuotes();
    } catch (e) {
      showToast("수락에 실패했습니다");
    }
  };

  if (!order) {
    return (
      <SimpleBackLayout NAME="요청 상세" hideFooter>
        <EmptyWrap>
          <EmptyText>요청 정보를 불러올 수 없습니다.</EmptyText>
        </EmptyWrap>
      </SimpleBackLayout>
    );
  }

  const photos = order.photos || [];
  const badgeColor = STATUS_BADGE[order.orderStatus] || STATUS_BADGE["접수"];
  const timeLabel = formatOrderTime(order.createdAt);
  const headerName = category ? category.name : "요청 상세";
  const scheduleLabel = SCHEDULE_OPTIONS.find((o) => o.key === order.schedule)?.label || order.schedule || "-";

  return (
    <SimpleBackLayout NAME={headerName} hideFooter>
      <Wrapper>
        {/* ── 제목 (최상단) ── */}
        <TitleSection>
          <OrderTitle>{order.title}</OrderTitle>
          <WriterRow>
            <IoPersonOutline size={14} color={THEME.muted} />
            <WriterText>{order.writer}</WriterText>
            <TimeLabel style={{ color: THEME.muted, marginLeft: "auto" }}>{timeLabel}</TimeLabel>
          </WriterRow>
        </TitleSection>

        {/* ── 업무 분류 ── */}
        {(order.subcategory || order.matchType || order.spaceType) && (
          <DetailSection>
            <SectionTitle>업무 분류</SectionTitle>
            <TagSection>
              {order.subcategory && order.subcategory.split(", ").map((s, i) => (
                <SubTag key={i}>{s.trim()}</SubTag>
              ))}
              {order.spaceType && <SpaceTag>{order.spaceType}</SpaceTag>}
              {order.matchType && <MatchTag>{order.matchType}</MatchTag>}
            </TagSection>
          </DetailSection>
        )}

        {/* ── 사진 ── */}
        {photos.length > 0 && (
          <DetailSection>
            <SectionTitle>첨부 사진</SectionTitle>
            <PhotoWrap>
              <HeroPhoto src={photos[photoIdx]} alt={`사진${photoIdx + 1}`} style={{ borderRadius: 10 }} />
              {photos.length > 1 && (
                <PhotoNavRow>
                  <NavBtnInline onClick={() => setPhotoIdx((p) => (p - 1 + photos.length) % photos.length)}>
                    <IoChevronBack size={18} color={THEME.muted} />
                  </NavBtnInline>
                  <PhotoCounterInline>{photoIdx + 1} / {photos.length}</PhotoCounterInline>
                  <NavBtnInline onClick={() => setPhotoIdx((p) => (p + 1) % photos.length)}>
                    <IoChevronForward size={18} color={THEME.muted} />
                  </NavBtnInline>
                </PhotoNavRow>
              )}
            </PhotoWrap>
          </DetailSection>
        )}

        {/* ── 기본 정보 ── */}
        <DetailSection>
          <SectionTitle>기본 정보</SectionTitle>
          <ConditionRow>
            <ConditionLabel>지역</ConditionLabel>
            <ConditionValue>{order.location || "-"}</ConditionValue>
          </ConditionRow>
          <ConditionRow>
            <ConditionLabel>일정</ConditionLabel>
            <ConditionValue>{scheduleLabel}</ConditionValue>
          </ConditionRow>
          <ConditionRow>
            <ConditionLabel>금액</ConditionLabel>
            <ConditionValue>{order.price || "-"}</ConditionValue>
          </ConditionRow>
          {order.spaceType && (
            <ConditionRow>
              <ConditionLabel>공간 유형</ConditionLabel>
              <ConditionValue>{order.spaceType}</ConditionValue>
            </ConditionRow>
          )}
        </DetailSection>

        {/* ── 작업 일정 ── */}
        {(order.workDate || order.workTime) && (
          <DetailSection>
            <SectionTitle>작업 일정</SectionTitle>
            {order.workDate && (
              <ConditionRow>
                <ConditionLabel>작업날짜</ConditionLabel>
                <ConditionValue>{order.workDate}{order.workDatePicker ? ` (${order.workDatePicker})` : ""}</ConditionValue>
              </ConditionRow>
            )}
            {order.workTime && (
              <ConditionRow>
                <ConditionLabel>작업시간</ConditionLabel>
                <ConditionValue>{typeof order.workTime === "object" ? `${order.workTime.start} ~ ${order.workTime.end}` : order.workTime}</ConditionValue>
              </ConditionRow>
            )}
          </DetailSection>
        )}

        {/* ── 연락처 ── */}
        {(order.ordererPhone || order.clientPhone) && (
          <DetailSection>
            <SectionTitle>연락처</SectionTitle>
            {order.ordererPhone && (
              <ConditionRow>
                <ConditionLabel>접수자</ConditionLabel>
                <ConditionValue>{order.ordererPhone}</ConditionValue>
              </ConditionRow>
            )}
            {order.clientPhone && (
              <ConditionRow>
                <ConditionLabel>고객(실무자)</ConditionLabel>
                <ConditionValue>{order.clientPhone}</ConditionValue>
              </ConditionRow>
            )}
          </DetailSection>
        )}

        {/* ── 단가 · 결제 ── */}
        {(order.b2bPriceType || order.paymentMethod) && (
          <DetailSection>
            <SectionTitle>단가 · 결제</SectionTitle>
            {order.b2bPriceType && (
              <ConditionRow>
                <ConditionLabel>단가유형</ConditionLabel>
                <ConditionValue>
                  {order.b2bPriceType === "fixed" ? "확정가" : order.b2bPriceType === "balance" ? "잔금" : order.b2bPriceType === "onsite" ? "현장견적후" : order.b2bPriceType === "quote" ? "견적제시형" : order.b2bPriceType}
                  {order.b2bPriceAmount ? ` ${Number(order.b2bPriceAmount).toLocaleString()}원` : ""}
                </ConditionValue>
              </ConditionRow>
            )}
            {order.paymentMethod && (
              <ConditionRow>
                <ConditionLabel>결제수단</ConditionLabel>
                <ConditionValue>{order.paymentMethod}</ConditionValue>
              </ConditionRow>
            )}
          </DetailSection>
        )}

        {/* ── 소개 수수료 ── */}
        {order.referralFee && (
          <DetailSection>
            <SectionTitle>소개(캐시백) 수수료</SectionTitle>
            <ConditionRow>
              <ConditionLabel>수수료</ConditionLabel>
              <ConditionValue>
                {order.referralFee.type === "fixed"
                  ? `정액 ${Number(order.referralFee.amount).toLocaleString()}원`
                  : `정률 ${order.referralFee.rate}%`}
              </ConditionValue>
            </ConditionRow>
            {order.referralPayMethod && (
              <ConditionRow>
                <ConditionLabel>지급방법</ConditionLabel>
                <ConditionValue>{order.referralPayMethod}</ConditionValue>
              </ConditionRow>
            )}
          </DetailSection>
        )}

        {/* ── 매칭 방식 ── */}
        {order.matchType && (
          <DetailSection>
            <SectionTitle>홈프로 선택</SectionTitle>
            <ConditionRow>
              <ConditionLabel>매칭방식</ConditionLabel>
              <ConditionValue>{order.matchType}</ConditionValue>
            </ConditionRow>
          </DetailSection>
        )}

        {/* ── 요청 상세 내용 ── */}
        <DetailSection>
          <SectionTitle>요청 상세 내용</SectionTitle>
          <DetailText>{order.description || "-"}</DetailText>
        </DetailSection>

        {/* 견적 확인/수락은 채팅방에서 처리 */}

        <BottomSpacer />
      </Wrapper>

      {/* 고정 하단 CTA */}
      <FixedBottom>
        <ActionRow>
          <SmallBtn onClick={handleCall}>
            <IoCallOutline size={20} color="#555" />
          </SmallBtn>
          <MainCTA onClick={handleQuote}>견적 보내기</MainCTA>
        </ActionRow>
      </FixedBottom>

      {/* 견적 바텀시트 */}
      {showQuoteSheet && (
        <SheetOverlay onClick={() => setShowQuoteSheet(false)}>
          <SheetContent onClick={(e) => e.stopPropagation()}>
            <SheetHandle />
            <SheetHeader>
              <SheetTitle>견적 보내기</SheetTitle>
              <SheetCloseBtn onClick={() => setShowQuoteSheet(false)}>
                <IoCloseOutline size={24} color={THEME.text} />
              </SheetCloseBtn>
            </SheetHeader>
            <SheetBody>
              <SheetLabel>견적 금액</SheetLabel>
              <SheetInputRow>
                <SheetInput
                  inputMode="numeric"
                  placeholder="0"
                  value={quotePrice ? Number(quotePrice).toLocaleString() : ""}
                  onChange={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, "");
                    setQuotePrice(raw);
                  }}
                />
                <SheetUnit>원</SheetUnit>
              </SheetInputRow>
              <SheetHint>0원 입력 시 "현장 방문 후 결정"으로 표시됩니다</SheetHint>

              <SheetLabel style={{ marginTop: 16 }}>제안하기</SheetLabel>
              <SheetTextarea
                placeholder="작업 방식, 일정 등을 제안해보세요"
                value={quoteMsg}
                onChange={(e) => setQuoteMsg(e.target.value.slice(0, 200))}
                maxLength={200}
                rows={5}
              />
              <SheetCharCount>{quoteMsg.length}/200</SheetCharCount>

              <SheetSubmitBtn onClick={handleSendQuote} disabled={quoteSending}>
                {quoteSending ? "보내는 중..." : "보내기"}
              </SheetSubmitBtn>
            </SheetBody>
          </SheetContent>
        </SheetOverlay>
      )}

      {toast && <DetailToast>{toast}</DetailToast>}
    </SimpleBackLayout>
  );
};

export default OrderDetailPage;

/* ===================== styles ===================== */

const Wrapper = styled.div`
  background: ${THEME.background};
  min-height: 100%;
`;

const HeroArea = styled.div`
  width: 100%;
  height: 300px;
  background: ${({ $bg }) => $bg};
  position: relative;
`;

const HeroCompact = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
`;

const HeroPhoto = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const NavBtn = styled.button`
  position: absolute;
  top: 50%;
  ${({ $left }) => ($left ? "left: 8px;" : "right: 8px;")}
  transform: translateY(-50%);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: none;
  background: rgba(0,0,0,0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 2;
`;

const PhotoCounter = styled.div`
  position: absolute;
  bottom: 10px;
  right: 12px;
  padding: 3px 10px;
  border-radius: 10px;
  background: rgba(0,0,0,0.5);
  color: #fff;
  font-size: 11px;
  font-weight: 400;
`;

const BadgeRow = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  padding: 12px 16px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
`;

const Badge = styled.span`
  padding: 5px 12px;
  border-radius: 8px;
  font-size: 12px;
  font-weight: 400;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

const TimeLabel = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: rgba(255, 255, 255, 0.8);
`;

const TagSection = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
`;

const SubTag = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 400;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const SpaceTag = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 400;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const TitleSection = styled.div`
  padding: 20px 16px 0;
`;

const OrderTitle = styled.h1`
  margin: 0;
  font-size: 20px;
  font-weight: 400;
  color: ${THEME.text};
  letter-spacing: -0.03em;
  line-height: 1.4;
`;

const WriterRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
`;

const WriterText = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const InfoCard = styled.div`
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 4px 0;
  box-shadow: ${THEME.cardShadow};
`;

const InfoRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
`;

const InfoIcon = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const InfoContent = styled.div`
  flex: 1;
`;

const InfoLabel = styled.div`
  font-size: 11px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-bottom: 2px;
`;

const InfoValue = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.text};
`;

const Divider = styled.div`
  height: 1px;
  background: ${THEME.border};
  margin: 0 16px;
`;

const DetailSection = styled.div`
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px 16px;
  box-shadow: ${THEME.cardShadow};
`;

const SectionTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 12px;
`;

const DetailText = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  line-height: 1.7;
  white-space: pre-line;
`;

const ConditionRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;

const ConditionLabel = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${THEME.muted};
`;

const ConditionValue = styled.div`
  font-size: 13px;
  font-weight: 500;
  color: ${THEME.text};
  text-align: right;
`;

const PhotoWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
`;

const PhotoNavRow = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
`;

const NavBtnInline = styled.button`
  background: ${THEME.background};
  border: 1px solid ${THEME.border};
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const PhotoCounterInline = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  font-weight: 500;
`;

const MatchTag = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 500;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const BottomSpacer = styled.div`
  height: 100px;
`;

const FixedBottom = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  background: ${THEME.surface};
  border-top: 1px solid ${THEME.border};
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
  z-index: 900;
  box-sizing: border-box;
`;

const ActionRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SmallBtn = styled.button`
  width: 48px;
  height: 48px;
  border-radius: 10px;
  border: 1.5px solid #D1D5DB;
  background: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  &:active {
    background: #F3F4F6;
  }
`;

const MainCTA = styled.button`
  flex: 1;
  height: 48px;
  border-radius: 10px;
  border: 1.5px solid #D1D5DB;
  background: #fff;
  color: #333;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  &:active {
    background: #F3F4F6;
  }
`;

const EmptyWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 100px 20px;
`;

const EmptyText = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const toastUp = keyframes`
  from { transform: translate(-50%, 10px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
`;

const DetailToast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #333;
  color: #fff;
  font-size: 14px;
  font-weight: 400;
  border-radius: 10px;
  z-index: 9999;
  white-space: nowrap;
  animation: ${toastUp} 0.25s ease-out;
`;

/* ── 견적 목록 ── */
const QuoteSection = styled.div`
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px 16px;
  box-shadow: ${THEME.cardShadow};
`;

const QuoteCard = styled.div`
  padding: 14px 0;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;

const QuoteTop = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const QuoteAvatar = styled.img`
  width: 36px;
  height: 36px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const QuoteAvatarPlaceholder = styled.div`
  width: 36px;
  height: 36px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const QuoteInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const QuoteNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
`;

const QuoteName = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
`;

const QuoteTime = styled.div`
  font-size: 11px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 2px;
`;

const QuotePrice = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.primary};
  flex-shrink: 0;
`;

const QuoteMessage = styled.div`
  margin-top: 8px;
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  line-height: 1.5;
`;

const QuoteBottom = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
`;

const QuoteAcceptBtn = styled.button`
  padding: 8px 20px;
  border: none;
  border-radius: 8px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
`;

const QuoteStatusBadge = styled.span`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  background: ${({ $accepted }) => $accepted ? THEME.success : THEME.muted};
  color: #fff;
`;

/* ── 견적 바텀시트 ── */
const SheetOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const SheetContent = styled.div`
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  display: flex;
  flex-direction: column;
  animation: sheetUp 0.25s ease-out;
  @keyframes sheetUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;

const SheetHandle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: ${THEME.border};
  margin: 10px auto 0;
`;

const SheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
`;

const SheetTitle = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.text};
`;

const SheetCloseBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const SheetBody = styled.div`
  padding: 0 16px 24px;
`;

const SheetLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 8px;
`;

const SheetInputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const SheetInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 18px;
  font-weight: 600;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${THEME.primary}; }
  &::placeholder { color: ${THEME.muted}; font-weight: 400; }
`;

const SheetUnit = styled.span`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.text};
  flex-shrink: 0;
`;

const SheetHint = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 6px;
`;

const SheetTextarea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  resize: none;
  box-sizing: border-box;
  &:focus { border-color: ${THEME.primary}; }
  &::placeholder { color: ${THEME.muted}; }
`;

const SheetCharCount = styled.div`
  text-align: right;
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const SheetSubmitBtn = styled.button`
  width: 100%;
  margin-top: 16px;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: default; }
`;
