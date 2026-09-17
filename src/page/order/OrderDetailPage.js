/* eslint-disable */
import React, { useState, useEffect, useCallback, useContext } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { THEME, CATEGORIES, ORDER_STATUS } from "../../config/homeproConfig";
import ORDER_FORM_CONFIG from "../../config/orderFormConfig";
import { getOrder, formatOrderTime, hasMyQuote, sendQuote, getQuotes, acceptQuote, updateOrderStatus, addOrderLog, getOrderLogs } from "../../service/OrderService";
import { createChatRoom } from "../../service/ChatService";
import { getMyProDocs } from "../../service/ProService";
import { getUserProfileByUid } from "../../service/UserProfileService";
import {
  getReferralFeeAmount, isCheckInBlockedByReferral, isWorkPayApplicable, getUserAccount,
  buildTossSendUrl, openExternal, markReferralSent, confirmReferralReceived, markWorkPaySent, confirmWorkPayReceived,
} from "../../service/PayFlowService";
import { isInsuranceRequired, getOrderInsuranceState, needsInsuranceDecision, computeOrderPremium, autoApplyPolicy, skipOrderInsurance, resetOrderInsurance, findActivePolicy, INSURANCE_TYPE_LABEL } from "../../service/OrderInsuranceService";
import { useAuth } from "../../context/AuthContext";
import { UserContext } from "../../context/User";
// TODO: 에이전트A가 만들 함수들 — 아직 없으면 런타임에서 에러 catch
let acceptOrder, applyToOrder, setOrderWaiting, getApplicants, selectPro;
try {
  const os = require("../../service/OrderService");
  acceptOrder = os.acceptOrder;
  applyToOrder = os.applyToOrder;
  setOrderWaiting = os.setOrderWaiting;
  getApplicants = os.getApplicants;
  selectPro = os.selectPro;
} catch (e) {}
let isBlockedEither;
try {
  const bs = require("../../service/BlockService");
  isBlockedEither = bs.isBlockedEither;
} catch (e) {}
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
  IoCopyOutline,
} from "react-icons/io5";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import { CATEGORY_ICONS } from "../../utility/CategoryIcons";
import { SCHEDULE_OPTIONS } from "../../config/homeproConfig";
import { GradeBadge } from "../../utility/gradeUtils";
import { getAccessTier, getTierDelaySec, getAcceptRemainSec, formatAcceptRemain, TIER_LABEL } from "../../utility/tierUtils";

const STATUS_BADGE = {
  "접수": { bg: THEME.purple, text: "#fff" },
  "지원가능": { bg: THEME.primary, text: "#fff" },
  "배차대기": { bg: "#F59E0B", text: "#fff" },
  "진행중": { bg: THEME.primary, text: "#fff" },
  "작업완료": { bg: THEME.success, text: "#fff" },
  "취소": { bg: THEME.danger, text: "#fff" },
  "완료": { bg: THEME.success, text: "#fff" },
};

const PRICE_TYPE_LABEL = { fixed: "시공금액", balance: "잔금", hpoint: "H-포인트", onsite: "현장견적", estimate: "견적요청", quote: "견적요청", info: "정보공유" };
const MATCH_TYPE_LABEL = { priority: "빠른배정", compare: "비교선정", direct: "지정배정" };
const HP_ASSIGNED_STATUSES = new Set(["배정", "선정대기", "업체선택대기", "완료", "마감"]);
// 종료된 오더 — 되돌릴 수 없으므로 접수자의 대기·재접수·취소를 모두 막는다 (대표 지시 8/5)
const CLOSED_STATUSES = new Set(["완료", "취소", "거부", "마감", "리뷰"]);

const OrderDetailPage = () => {
  const { state } = useLocation();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const [fetchedOrder, setFetchedOrder] = useState(null);
  const order = fetchedOrder || state?.order; // 액션 후 재조회분이 우선
  const category = state?.category || (order ? CATEGORIES.find((c) => c.id === order.categoryId) : null);
  const myUid = userData?.uid || user?.USERS_ID;
  const myName = userData?.nickname || userData?.name || "사용자";

  // state 없으면 Firestore에서 직접 조회
  useEffect(() => {
    if (state?.order || !orderId) return;
    getOrder(orderId).then((data) => {
      if (data) setFetchedOrder(data);
    }).catch((err) => console.error("오더 조회 실패:", err));
  }, [orderId, state?.order]);

  const [photoIdx, setPhotoIdx] = useState(0);
  const [toast, setToast] = useState("");
  const [orderLogs, setOrderLogs] = useState([]);
  const [proDocs, setProDocs] = useState(null);
  const [showQuoteSheet, setShowQuoteSheet] = useState(false);
  const [quotePrice, setQuotePrice] = useState("");
  const [quoteMsg, setQuoteMsg] = useState("");
  const [quoteSending, setQuoteSending] = useState(false);
  const [quotes, setQuotes] = useState([]);
  const [isBlocked, setIsBlocked] = useState(false);
  const [applicants, setApplicants] = useState([]);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [matchedProInfo, setMatchedProInfo] = useState(null); // 배정된 홈프로 프로필(접수자 시점)
  const isOwner = order?.createdBy === myUid;
  const matchType = order?.matchType; // "priority" | "compare" | "direct"
  const isMatchedPro = order?.matchedProUid === myUid;
  // 비교선정에 지원했고 아직 선정 전 → 상태 "선정대기" + 접수자와 전화/채팅 가능 (대표 지시 7/24)
  const isApplicant = !isOwner && !isMatchedPro && (order?.applicantUids || []).includes(myUid);
  const isPendingApplicant = isApplicant && !order?.matchedProUid;
  const isUnselectedApplicant = isApplicant && !!order?.matchedProUid;
  // 금액 미정 단가유형(현장견적/견적요청) — 수락 단계에서 금액 입력 X.
  // 명세 D8/E11: 매칭방식(빠른/비교)으로 먼저 수락·배정되고, 견적가는 배정 후 전송.
  // (현장견적·견적요청 모두 동일 흐름으로 통합 — 견적 먼저 보내기 패러다임 폐지)
  const isUnpriced = ["onsite", "estimate", "quote"].includes(order?.b2bPriceType);
  // 정보공유 오더 — 견적·체크인 없이 리드 확인 → 계약 성사로 진행 (대표 지시 8/20)
  const isInfoOrder = order?.b2bPriceType === "info";

  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); }, []);

  /* ── 돈·H-포인트 흐름 (대표 확정 9/13): 캐시백 송금 → 입금 확인 / 후불 대금 지급 → 입금 확인 ── */
  const [payAccount, setPayAccount] = useState(undefined); // 접수자 정산계좌 (undefined=미조회, null=없음)
  const [payBusy, setPayBusy] = useState(false);
  const receiptInputRef = React.useRef(null);
  const referralFeeInfo = order ? getReferralFeeAmount(order) : { amount: 0, pending: false };
  const referralOpen = !!(order && order.matchedProUid && order.orderStatus !== "취소" && order.orderStatus !== "거부"
    && (referralFeeInfo.pending || referralFeeInfo.amount > 0));
  useEffect(() => {
    if (!order?.createdBy || !referralOpen) return;
    getUserAccount(order.createdBy).then(setPayAccount).catch(() => setPayAccount(null));
  }, [order?.createdBy, referralOpen]);
  const refreshOrder = async () => { const u = await getOrder(order.id); if (u) setFetchedOrder(u); };

  /* ── 보험 적용 (대표 8/20 · 형 확정 9/13): 월·1년 가입자는 자동, 아니면 건당 결제 또는 보험 없이 진행. 정하기 전엔 체크인 잠금 ── */
  const insuranceState = order ? getOrderInsuranceState(order) : "pending";
  const insuranceNeeded = order ? needsInsuranceDecision(order) : false;
  const insuranceRequired = order ? isInsuranceRequired(order) : false;
  const [premium, setPremium] = useState(null); // { amount, pending, plan }
  const [insBusy, setInsBusy] = useState(false);
  useEffect(() => {
    if (!order?.id || !isMatchedPro || !insuranceNeeded) return;
    let alive = true;
    (async () => {
      try {
        const applied = await autoApplyPolicy(order, myUid);
        if (applied) { if (alive) await refreshOrder(); return; }
        const p = await computeOrderPremium(order);
        if (alive) setPremium(p);
      } catch (e) { console.warn("[insurance]", e); }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order?.id, isMatchedPro, insuranceNeeded, order?.onsiteQuotedPrice, order?.b2bPriceAmount]);
  const handleInsurancePay = () => navigate(`/pay?purpose=insurance_order&refId=${order.id}`);

  // 보험은 선택 옵션 — 배정 뒤 홈프로가 원하면 가입 (대표 9/14 카톡). 수락 게이트 없음
  const handleInsuranceSkip = async () => {
    if (insBusy) return;
    if (!window.confirm("보험 없이 진행하시겠습니까?\n현장 사고가 나도 보험 보장을 받을 수 없습니다.")) return;
    setInsBusy(true);
    try { await skipOrderInsurance(order.id); showToast("보험 없이 진행으로 표시했습니다"); await refreshOrder(); }
    catch (e) { showToast(e.message || "처리에 실패했습니다"); }
    finally { setInsBusy(false); }
  };
  const handleInsuranceReset = async () => {
    if (insBusy) return;
    setInsBusy(true);
    try { await resetOrderInsurance(order.id); await refreshOrder(); }
    catch (e) { showToast(e.message || "처리에 실패했습니다"); }
    finally { setInsBusy(false); }
  };
  const handleCopyAccount = async () => {
    if (!payAccount) return;
    const text = `${payAccount.bank} ${payAccount.number} ${payAccount.holder}`;
    try { await navigator.clipboard.writeText(text); showToast("계좌번호를 복사했습니다"); }
    catch { window.prompt("계좌번호를 복사하세요", text); }
  };
  const handleTossSend = () => {
    if (!payAccount) { showToast("접수자 정산계좌가 없습니다"); return; }
    openExternal(buildTossSendUrl({ bank: payAccount.bank, number: payAccount.number, amount: referralFeeInfo.amount }));
  };
  const handleReferralSent = async (file) => {
    if (payBusy) return;
    setPayBusy(true);
    try {
      await markReferralSent(order, { byUid: myUid, byName: myName, receiptFile: file || null });
      showToast("입금 완료로 표시했습니다. 접수자 확인을 기다려 주세요");
      await refreshOrder();
    } catch (e) { showToast(e.message || "처리에 실패했습니다"); }
    finally { setPayBusy(false); }
  };
  const handleReferralConfirm = async () => {
    if (payBusy) return;
    if (!window.confirm("캐시백 입금을 확인하셨습니까?")) return;
    setPayBusy(true);
    try { await confirmReferralReceived(order, { byUid: myUid }); showToast("입금 확인 완료"); await refreshOrder(); }
    catch (e) { showToast(e.message || "처리에 실패했습니다"); }
    finally { setPayBusy(false); }
  };
  const handleWorkPaySent = async () => {
    if (payBusy) return;
    if (!window.confirm("작업 대금을 홈프로에게 지급하셨습니까?")) return;
    setPayBusy(true);
    try { await markWorkPaySent(order, { byUid: myUid }); showToast("지급 완료로 표시했습니다"); await refreshOrder(); }
    catch (e) { showToast(e.message || "처리에 실패했습니다"); }
    finally { setPayBusy(false); }
  };
  const handleWorkPayConfirm = async () => {
    if (payBusy) return;
    if (!window.confirm("작업 대금 입금을 확인하셨습니까?")) return;
    setPayBusy(true);
    try { await confirmWorkPayReceived(order, { byUid: myUid }); showToast("입금 확인 완료"); await refreshOrder(); }
    catch (e) { showToast(e.message || "처리에 실패했습니다"); }
    finally { setPayBusy(false); }
  };

  /* ── 차수(등급) 게이트 — 대표 지시 7/29 ──
     1차수: 오더 접수 즉시 수락 / 2차수: 오더 등록 후 300초(5분) 경과해야 수락 가능.
     지원하기(다중비교)는 게이트 대상 아님. 접수자 본인 화면에도 영향 없음. */
  const [nowMs, setNowMs] = useState(() => Date.now());
  const myTier = getAccessTier(userData);
  const myDelaySec = getTierDelaySec(userData); // 0차수 0초 · 1차수 3분 · 2차수 7분 (대표 9/14)
  const acceptRemainSec = myDelaySec > 0 && !isOwner ? getAcceptRemainSec(order, nowMs, myDelaySec) : 0;
  const acceptLocked = acceptRemainSec > 0;
  const acceptDelayMin = Math.round(myDelaySec / 60);
  const tierGateText = `${TIER_LABEL[myTier]} 회원은 오더 등록 ${acceptDelayMin}분 후부터 수락할 수 있습니다`;

  // 남은 시간 1초 카운트다운 (0 되면 인터벌 스스로 정리 → 버튼 정상 복귀)
  useEffect(() => {
    if (myTier !== "tier2" || isOwner || !order) return;
    if (getAcceptRemainSec(order, Date.now()) <= 0) return;
    const timer = setInterval(() => {
      const n = Date.now();
      setNowMs(n);
      if (getAcceptRemainSec(order, n) <= 0) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [myTier, isOwner, order?.id, order?.createdAt]);

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

  // 오더 활동 이력 로드
  const loadLogs = useCallback(() => {
    if (!order?.id) return;
    getOrderLogs(order.id).then(setOrderLogs).catch(() => {});
  }, [order?.id]);
  useEffect(() => { loadLogs(); }, [loadLogs]);

  // 거부 체크
  useEffect(() => {
    if (!myUid || !order?.createdBy || !isBlockedEither) return;
    isBlockedEither(myUid, order.createdBy).then(setIsBlocked).catch(() => {});
  }, [myUid, order?.createdBy]);

  // 다중비교 지원자 목록 (접수자 전용)
  useEffect(() => {
    if (!isOwner || matchType !== "compare" || !order?.id || !getApplicants) return;
    getApplicants(order.id).then(setApplicants).catch(() => setApplicants([]));
  }, [isOwner, matchType, order?.id]);

  // 배정된 홈프로 프로필 로드 (접수자 시점 — 누가 배정됐는지 확인)
  useEffect(() => {
    if (!isOwner || !order?.matchedProUid) { setMatchedProInfo(null); return; }
    getUserProfileByUid(order.matchedProUid)
      .then((p) => setMatchedProInfo(p))
      .catch(() => setMatchedProInfo(null));
  }, [isOwner, order?.matchedProUid]);

  // 호출 유형별 핸들러
  // 나의오더현황으로 이동
  const goMyOrders = () => {
    try { sessionStorage.setItem("homepro.main.activeTab", "my_orders"); } catch (e) {}
    navigate("/MobileMain");
  };

  // 채팅 시작 — 오더 기준 방 생성/재사용 후 진입 (당근식: 오더별 대화방)
  const handleStartChat = async (otherUid, otherName, otherPhoto) => {
    if (!otherUid) { showToast("상대 정보를 찾을 수 없습니다"); return; }
    try {
      const myPhoto = userData?.profileImage || userData?.photoURL || "";
      const roomId = await createChatRoom(
        myUid, myName, myPhoto,
        otherUid, otherName || "상대", otherPhoto || "",
        { orderId: order.id }
      );
      navigate(`/chat/${roomId}`);
    } catch (e) {
      showToast("채팅방을 열지 못했습니다");
    }
  };
  // 리뷰 작성 — 리뷰 저장은 채팅방(roomId) 기준이라 배정 홈프로와의 방을 열고 시트를 띄운다
  const handleWriteReview = async () => {
    const proUid = order?.matchedProUid;
    if (!proUid) { showToast("배정된 홈프로가 없습니다"); return; }
    try {
      const myPhoto = userData?.profileImage || userData?.photoURL || "";
      const roomId = await createChatRoom(
        myUid, myName, myPhoto,
        proUid, matchedProInfo?.companyName || matchedProInfo?.name || "홈프로", matchedProInfo?.profileImage || "",
        { orderId: order.id }
      );
      navigate(`/chat/${roomId}`, { state: { openReview: true } });
    } catch (e) {
      showToast("리뷰 화면을 열지 못했습니다");
    }
  };

  const handlePhoneCall = (phone) => {
    if (!phone) { showToast("등록된 전화번호가 없습니다"); return; }
    window.location.href = `tel:${phone}`;
  };

  const handleAcceptOrder = async () => {
    if (isBlocked) { showToast("거부된 오더입니다"); return; }
    // 블랙리스트 확정 사용자 — 관리자가 차단한 계정은 오더 수락 불가 (형 지시 7/31)
    if (userData?.orderBlocked) { showToast("관리자에 의해 오더 수락 권한이 차단된 계정입니다"); return; }
    // 차수 게이트 방어 (버튼 우회 대비) — 2차수는 오더 등록 후 5분 경과 전 수락 불가
    if (myDelaySec > 0) {
      const remain = getAcceptRemainSec(order, Date.now(), myDelaySec);
      if (remain > 0) {
        showToast(`${tierGateText} (${formatAcceptRemain(remain)} 남음)`);
        return;
      }
    }
    if (order.orderStatus === "대기") { showToast("접수자가 보류 중인 오더입니다. 다시 접수되면 수락할 수 있어요"); return; }
    if (!window.confirm("해당 오더를 수락 하시겠습니까?")) return; // 팝업 확인
    try {
      if (!acceptOrder) throw new Error("acceptOrder 함수 없음");
      await acceptOrder(order.id, myUid);
      await addOrderLog(order.id, { type: "accept", message: "홈프로가 수락 → 배정", byUid: myUid, byName: myName, byRole: "홈프로" });
      goMyOrders(); // 수락 → 자동으로 나의오더현황 이동
    } catch (e) {
      if (e.message?.includes("배정")) showToast("배정된 오더입니다");
      else showToast(e.message || "수락에 실패했습니다");
    }
  };

  const handleApplyOrder = async () => {
    if (isBlocked) { showToast("거부된 오더입니다"); return; }
    // 블랙리스트 확정 사용자 — 관리자가 차단한 계정은 오더 지원 불가 (형 지시 7/31)
    if (userData?.orderBlocked) { showToast("관리자에 의해 오더 수락 권한이 차단된 계정입니다"); return; }
    if (!window.confirm("해당 오더에 지원 하시겠습니까?")) return; // 팝업 확인
    try {
      if (!applyToOrder) throw new Error("applyToOrder 함수 없음");
      const proName = userData?.nickname || userData?.name || "전문가";
      const proProfile = userData?.profileImage || userData?.photoURL || "";
      await applyToOrder(order.id, myUid, { proName, proProfile });
      await addOrderLog(order.id, { type: "apply", message: "홈프로 지원", byUid: myUid, byName: myName, byRole: "홈프로" });
      goMyOrders(); // 지원 → 자동으로 나의오더현황 이동
    } catch (e) {
      if (e.message?.includes("이미")) showToast("이미 지원한 오더입니다");
      else showToast(e.message || "지원에 실패했습니다");
    }
  };

  const handleRejectDirect = async () => {
    try {
      if (!setOrderWaiting) throw new Error("setOrderWaiting 함수 없음");
      await setOrderWaiting(order.id);
      showToast("거절되었습니다");
      navigate(-1);
    } catch (e) {
      showToast(e.message || "거절에 실패했습니다");
    }
  };

  // 접수자 핸들러
  const handleOwnerWaiting = async () => {
    try {
      if (!setOrderWaiting) throw new Error("setOrderWaiting 함수 없음");
      await setOrderWaiting(order.id);
      await addOrderLog(order.id, { type: "status", message: "대기 전환", byUid: myUid, byName: myName, byRole: "접수자" });
      showToast("대기 상태로 변경되었습니다");
      const updated = await getOrder(order.id);
      if (updated) setFetchedOrder(updated);
    } catch (e) {
      showToast(e.message || "상태 변경에 실패했습니다");
    }
  };

  const handleOwnerReregister = async () => {
    try {
      await updateOrderStatus(order.id, ORDER_STATUS.REGISTERED);
      await addOrderLog(order.id, { type: "status", message: "재접수", byUid: myUid, byName: myName, byRole: "접수자" });
      showToast("재접수되었습니다");
      const updated = await getOrder(order.id);
      if (updated) setFetchedOrder(updated);
    } catch (e) {
      showToast(e.message || "재접수에 실패했습니다");
    }
  };

  const handleOwnerCancel = async () => {
    if (!cancelReason) { showToast("취소 사유를 선택해주세요"); return; }
    try {
      // 상태 + 취소사유를 한 번에 (기존엔 잘못된 'orders' 컬렉션에 써서 누락되던 버그 수정)
      await updateOrderStatus(order.id, ORDER_STATUS.CANCELLED, { cancelReason });
      await addOrderLog(order.id, { type: "cancel", message: `접수자가 취소 (사유: ${cancelReason})`, byUid: myUid, byName: myName, byRole: "접수자" });
      setShowCancelModal(false);
      showToast("오더가 취소되었습니다");
      navigate(-1);
    } catch (e) {
      showToast(e.message || "취소에 실패했습니다");
    }
  };

  const handleSelectPro = async (proUid) => {
    if (order.matchedProUid) { showToast("이미 1팀이 선정된 오더입니다"); return; } // 중복선정 방지
    if (!window.confirm("이 홈프로를 선정 하시겠습니까?\n선정 후 자동으로 배정됩니다.")) return; // 팝업 확인
    try {
      if (!selectPro) throw new Error("selectPro 함수 없음");
      await selectPro(order.id, proUid); // 자동 배정(orderStatus="배정") + 나머지 지원자 rejected
      // 선정된 홈프로에게 푸시
      try {
        await addDoc(collection(db, "notifications"), {
          targetUids: [proUid],
          title: "홈프로 선정",
          body: "선정되었습니다! 배정된 오더를 확인하세요",
          type: "pro_selected",
          data: { orderId: order.id },
          read: false,
          sent: false,
          createdAt: serverTimestamp(),
        });
      } catch (e) {}
      // 선정되지 않은 나머지 홈프로에게 마감 알림 (B-2)
      try {
        const others = applicants.filter((a) => a.proUid !== proUid).map((a) => a.proUid);
        if (others.length) {
          await addDoc(collection(db, "notifications"), {
            targetUids: others,
            title: "선정 마감",
            body: "아쉽지만 다른 홈프로가 선정되어 마감되었습니다.",
            type: "select_closed",
            data: { orderId: order.id },
            read: false,
            sent: false,
            createdAt: serverTimestamp(),
          });
        }
      } catch (e) {}
      await addOrderLog(order.id, { type: "select", message: "선정완료", byUid: myUid, byName: myName, byRole: "접수자" });
      showToast("홈프로가 선정되었습니다");
      const updated = await getOrder(order.id);
      if (updated) setFetchedOrder(updated);
      if (getApplicants) getApplicants(order.id).then(setApplicants).catch(() => {});
    } catch (e) {
      showToast(e.message || "선정에 실패했습니다");
    }
  };

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
  // 예약날짜(구 희망날짜지정)는 문구 없이 날짜만 표기
  const isReserveDate = (v) => v === "예약날짜" || v === "희망날짜지정";
  const scheduleLabel = (() => {
    if (isReserveDate(order.schedule)) return order.workDatePicker || "예약날짜";
    return SCHEDULE_OPTIONS.find((o) => o.key === order.schedule)?.label || order.schedule || "-";
  })();

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
              {order.matchType && <MatchTag>{MATCH_TYPE_LABEL[order.matchType] || order.matchType}</MatchTag>}
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
            <ConditionValue>
              {(isOwner || isMatchedPro)
                ? (order.location || "-")
                : (order.location ? order.location.split(" ").slice(0, 2).join(" ") : "-")}
            </ConditionValue>
          </ConditionRow>
          <ConditionRow>
            <ConditionLabel>일정</ConditionLabel>
            <ConditionValue>{scheduleLabel}</ConditionValue>
          </ConditionRow>
          <ConditionRow>
            <ConditionLabel>금액</ConditionLabel>
            <ConditionValue>{(() => {
              if (order.b2bPriceType) {
                const label = PRICE_TYPE_LABEL[order.b2bPriceType] || order.b2bPriceType;
                if (order.b2bPriceAmount) return `${label} ${Number(order.b2bPriceAmount).toLocaleString()}${order.b2bPriceType === "hpoint" ? "P" : "원"}`;
                return label;
              }
              return order.price || "-";
            })()}</ConditionValue>
          </ConditionRow>
          {order.spaceType && (
            <ConditionRow>
              <ConditionLabel>공간 유형</ConditionLabel>
              <ConditionValue>{order.spaceType}</ConditionValue>
            </ConditionRow>
          )}
        </DetailSection>

        {/* ── 접수 상세 정보 ── 접수폼에서 고른 속성·입력값·수량 (검수 7/28: 입력만 받고
            아무 데도 표시하지 않아 홈프로가 견적에 필요한 정보를 못 보던 문제 수정) */}
        {(() => {
          const fc = ORDER_FORM_CONFIG[order.categoryId] || {};
          const rows = [];
          if (order.buildingType) rows.push(["건물유형", order.buildingType]);
          if (order.areaValue) rows.push(["면적", order.areaValue]);
          // 선택 속성 (오염유형·발생시점 등) — config 라벨로 표시
          if (order.attrs) {
            const labelOf = (key) => (fc.attrSections || []).find((s) => s.key === key)?.label || key;
            Object.entries(order.attrs).forEach(([k, v]) => rows.push([labelOf(k), Array.isArray(v) ? v.join(", ") : String(v)]));
          }
          // 직접 입력값 (주소·치수·차량정보 등)
          if (order.inputs) {
            Object.entries(order.inputs).forEach(([secKey, fields]) => {
              const sec = (fc.inputSections || []).find((s) => s.key === secKey);
              const fieldLabel = (fk) => sec?.fields?.find((f) => f.key === fk);
              Object.entries(fields).forEach(([fk, fv]) => {
                const f = fieldLabel(fk);
                rows.push([`${sec?.label || secKey} ${f?.label || fk}`, `${fv}${f?.unit || ""}`]);
              });
            });
          }
          // 종목별 수량
          if (order.itemQty) {
            Object.entries(order.itemQty).forEach(([k, v]) => {
              const name = k.includes(":") ? k.split(":")[1] : k;
              rows.push([`${name} 수량`, `${v}${fc.qtyPerSelected?.unit || "개"}`]);
            });
          }
          if (order.options?.length) rows.push(["옵션", order.options.join(", ")]);
          if (order.customInput) rows.push(["기타 입력", order.customInput]);
          if (!rows.length) return null;
          return (
            <DetailSection>
              <SectionTitle>접수 상세 정보</SectionTitle>
              {rows.map(([label, value], i) => (
                <ConditionRow key={i}>
                  <ConditionLabel>{label}</ConditionLabel>
                  <ConditionValue>{value}</ConditionValue>
                </ConditionRow>
              ))}
            </DetailSection>
          );
        })()}

        {/* ── 작업 일정 ── */}
        {(order.workDate || order.workTime) && (
          <DetailSection>
            <SectionTitle>작업 일정</SectionTitle>
            {order.workDate && (
              <ConditionRow>
                <ConditionLabel>작업날짜</ConditionLabel>
                <ConditionValue>{isReserveDate(order.workDate) ? (order.workDatePicker || "예약날짜") : order.workDate}</ConditionValue>
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

        {/* ── 배정 홈프로 (접수자 시점) — 누가 배정됐는지 + 프로필 ── */}
        {isOwner && order.matchedProUid && (
          <DetailSection>
            <SectionTitle>배정 홈프로</SectionTitle>
            <ApplicantCard
              style={{ cursor: "pointer" }}
              onClick={() => navigate(`/profile/${order.matchedProUid}`, { state: { fallbackName: matchedProInfo?.nickname || matchedProInfo?.name, fallbackPhoto: matchedProInfo?.profileImage || matchedProInfo?.photoURL } })}
            >
              <ApplicantTop>
                {(matchedProInfo?.profileImage || matchedProInfo?.photoURL) ? (
                  <QuoteAvatar src={matchedProInfo.profileImage || matchedProInfo.photoURL} alt="배정 홈프로" />
                ) : (
                  <QuoteAvatarPlaceholder>
                    <IoPersonCircleOutline size={36} color={THEME.muted} />
                  </QuoteAvatarPlaceholder>
                )}
                <ApplicantInfo>
                  <ApplicantName>{matchedProInfo?.nickname || matchedProInfo?.name || "배정된 홈프로"}</ApplicantName>
                  <ProfileHint>프로필 보기</ProfileHint>
                </ApplicantInfo>
              </ApplicantTop>
              <ContactRow onClick={(e) => e.stopPropagation()}>
                <ContactBtn onClick={() => handlePhoneCall(matchedProInfo?.phoneE164 || matchedProInfo?.phone)}>
                  <IoCallOutline size={16} /> 전화
                </ContactBtn>
                <ContactBtn $primary onClick={() => handleStartChat(order.matchedProUid, matchedProInfo?.nickname || matchedProInfo?.name, matchedProInfo?.profileImage || matchedProInfo?.photoURL)}>
                  <IoChatbubbleEllipsesOutline size={16} /> 채팅
                </ContactBtn>
              </ContactRow>
            </ApplicantCard>
          </DetailSection>
        )}

        {/* ── 연락처 (배정 후에만 공개) ──
            전수검사 7/29: 접수폼은 contactPhone/customerPhone 으로 저장하는데 여기선
            ordererPhone/clientPhone 만 읽어 섹션이 영원히 안 뜨던 필드 불일치 수정
            (구 필드는 폴백으로 유지) */}
        {(isOwner || isMatchedPro) && (order.contactPhone || order.customerPhone || order.ordererPhone || order.clientPhone) && (
          <DetailSection>
            <SectionTitle>연락처</SectionTitle>
            {(order.contactPhone || order.ordererPhone) && (
              <ConditionRow>
                <ConditionLabel>접수자</ConditionLabel>
                <ConditionValue>{order.contactPhone || order.ordererPhone}</ConditionValue>
              </ConditionRow>
            )}
            {(order.customerPhone || order.clientPhone) && (
              <ConditionRow>
                <ConditionLabel>고객(실무자)</ConditionLabel>
                <ConditionValue>{order.customerPhone || order.clientPhone}</ConditionValue>
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
                  {PRICE_TYPE_LABEL[order.b2bPriceType] || order.b2bPriceType}
                  {order.b2bPriceAmount ? ` ${Number(order.b2bPriceAmount).toLocaleString()}${order.b2bPriceType === "hpoint" ? "P" : "원"}` : ""}
                </ConditionValue>
              </ConditionRow>
            )}
            {isInfoOrder && order.infoIncentive && (
              <ConditionRow>
                <ConditionLabel>소개비(인센티브)</ConditionLabel>
                <ConditionValue>{(order.infoIncentive.type === "rate" ? `정률 ${order.infoIncentive.rate}%` : `정액 ${Number(order.infoIncentive.amount || 0).toLocaleString()}원`)}</ConditionValue>
              </ConditionRow>
            )}
            {isInfoOrder && !order.infoIncentive && (
              <>
                <ConditionRow>
                  <ConditionLabel>정보제공 리워드</ConditionLabel>
                  <ConditionValue>{order.infoReward ? `${Number(order.infoReward).toLocaleString()}원` : "-"}</ConditionValue>
                </ConditionRow>
                <ConditionRow>
                  <ConditionLabel>계약성사 인센티브</ConditionLabel>
                  <ConditionValue>{order.contractBonus ? `${Number(order.contractBonus).toLocaleString()}원` : "-"}</ConditionValue>
                </ConditionRow>
              </>
            )}
            {order.paymentMethod && (
              <ConditionRow>
                <ConditionLabel>{order.payMode ? "결제방식" : "결제수단"}</ConditionLabel>
                <ConditionValue>{order.paymentMethod}</ConditionValue>
              </ConditionRow>
            )}
          </DetailSection>
        )}

        {/* ── 캐시백 ── */}
        {order.referralFee && (
          <DetailSection>
            <SectionTitle>캐시백</SectionTitle>
            <ConditionRow>
              <ConditionLabel>수수료</ConditionLabel>
              <ConditionValue>
                {order.referralFee.type === "fixed"
                  ? `정액 ${Number(order.referralFee.amount).toLocaleString()}원`
                  : order.referralFee.type === "hpoint"
                    ? `H-포인트 ${Number(order.referralFee.point).toLocaleString()}P`
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

        {/* ── 캐시백 송금 / 후불 대금 / H-포인트 보관 — 앱은 상태 버튼만 둔다 (대표 확정 9/13) ── */}
        {(isOwner || isMatchedPro) && referralOpen && (
          <DetailSection>
            <SectionTitle>캐시백 송금</SectionTitle>
            {referralFeeInfo.pending ? (
              <PayNote>금액이 확정되면 캐시백이 계산되고 송금 버튼이 생깁니다.</PayNote>
            ) : order.referralPay?.status === "confirmed" ? (
              <PayNote $done>캐시백 {Number(order.referralPay.amount || referralFeeInfo.amount).toLocaleString()}원 · 입금 확인 완료</PayNote>
            ) : order.referralPay?.status === "sent" ? (
              <>
                <ConditionRow><ConditionLabel>금액</ConditionLabel><ConditionValue>{Number(order.referralPay.amount).toLocaleString()}원</ConditionValue></ConditionRow>
                {order.referralPay.receiptUrl && <ReceiptImg src={order.referralPay.receiptUrl} alt="송금증" onClick={() => window.open(order.referralPay.receiptUrl, "_blank")} />}
                {isOwner ? (
                  <>
                    <PayNote>홈프로가 송금했다고 표시했습니다. 통장을 확인한 뒤 눌러 주세요.</PayNote>
                    <ActionRow style={{ marginTop: 10 }}><PrimaryCTA onClick={handleReferralConfirm} disabled={payBusy}>입금 확인</PrimaryCTA></ActionRow>
                  </>
                ) : (
                  <PayNote>입금 완료로 표시했습니다. 접수자 확인을 기다리는 중입니다.</PayNote>
                )}
              </>
            ) : isMatchedPro ? (
              <>
                <ConditionRow><ConditionLabel>보낼 금액</ConditionLabel><ConditionValue>{referralFeeInfo.amount.toLocaleString()}원</ConditionValue></ConditionRow>
                {payAccount ? (
                  <ConditionRow><ConditionLabel>받는 계좌</ConditionLabel><ConditionValue>{payAccount.bank} {payAccount.number}<br />{payAccount.holder}</ConditionValue></ConditionRow>
                ) : payAccount === null ? (
                  <PayNote>접수자가 정산계좌를 아직 등록하지 않았습니다. 채팅으로 계좌를 확인해 주세요.</PayNote>
                ) : null}
                <PayNote>매칭 직후 접수자 계좌로 보내는 것이 원칙이지만, 작업 완료 전후에 보내도 됩니다. 송금 후 [입금 완료]를 누르고 송금증을 붙여 주세요.</PayNote>
                <ActionRow style={{ marginTop: 10 }}>
                  <OutlinedBtn onClick={handleTossSend} disabled={!payAccount}>토스로 송금</OutlinedBtn>
                  <OutlinedBtn onClick={handleCopyAccount} disabled={!payAccount}><IoCopyOutline size={17} /> 계좌 복사</OutlinedBtn>
                </ActionRow>
                <ActionRow style={{ marginTop: 8 }}>
                  <PrimaryCTA onClick={() => receiptInputRef.current?.click()} disabled={payBusy}>{payBusy ? "처리 중..." : "입금 완료 (송금증 첨부)"}</PrimaryCTA>
                  <input ref={receiptInputRef} type="file" accept="image/*" style={{ display: "none" }}
                    onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; handleReferralSent(f); }} />
                </ActionRow>
                <PayNote style={{ marginTop: 6 }}>송금증이 없으면 <button type="button" onClick={() => handleReferralSent(null)} style={{ background: "none", border: "none", padding: 0, color: THEME.button, fontSize: "inherit", fontFamily: "inherit", textDecoration: "underline" }}>첨부 없이 입금 완료</button></PayNote>
              </>
            ) : (
              <>
                <ConditionRow><ConditionLabel>받을 금액</ConditionLabel><ConditionValue>{referralFeeInfo.amount.toLocaleString()}원</ConditionValue></ConditionRow>
                {payAccount === null ? (
                  <PayNote $warn>정산계좌가 없어 홈프로가 송금할 수 없습니다. <button type="button" onClick={() => navigate("/biz-profile")} style={{ background: "none", border: "none", padding: 0, color: THEME.button, fontSize: "inherit", fontFamily: "inherit", textDecoration: "underline" }}>비즈프로필에서 정산계좌 등록</button></PayNote>
                ) : (
                  <PayNote>홈프로가 캐시백을 송금하면 입금 확인 요청이 옵니다.</PayNote>
                )}
              </>
            )}
          </DetailSection>
        )}
        {/* ── 보험 적용 — 일하는 홈프로가 정한다. 체크인 전까지 (정보공유 제외) ── */}
        {order.matchedProUid && (isOwner || isMatchedPro) && order.b2bPriceType !== "info" && (insuranceState !== "pending" || insuranceNeeded) && (
          <DetailSection>
            <SectionTitle>보험 적용{insuranceRequired ? " · 보험가입 필수" : ""}</SectionTitle>
            {insuranceRequired && insuranceState !== "applied" && (
              <PayNote $warn>접수자가 보험가입 필수로 등록한 오더입니다. 건당·월·년 중 하나로 가입해야 현장 체크인을 할 수 있습니다.</PayNote>
            )}
            {insuranceState === "applied" ? (
              <PayNote $done>보험 적용 · {INSURANCE_TYPE_LABEL[order.insurance?.type] || "가입"}{order.insurance?.type === "perOrder" ? " (이 오더 결제 완료)" : ""}</PayNote>
            ) : insuranceState === "skipped" ? (
              <>
                <PayNote $warn>보험 적용 제외 — 보험 없이 진행합니다.</PayNote>
                {isMatchedPro && !order.checkInAt && (
                  <ActionRow style={{ marginTop: 10 }}><OutlinedBtn onClick={handleInsuranceReset} disabled={insBusy}>다시 정하기</OutlinedBtn></ActionRow>
                )}
                {/* 필수 오더인데 예전에 '보험 없이 진행'으로 표시된 경우 */}
              </>
            ) : isMatchedPro ? (
              <>
                {premium === null ? (
                  <PayNote>보험 가입 여부를 확인하는 중입니다.</PayNote>
                ) : premium.pending ? (
                  <PayNote>금액이 확정되면 건당 보험료(금액의 {premium.plan.rate}%)가 계산됩니다. 월·1년 보험에 가입돼 있으면 자동으로 적용됩니다.</PayNote>
                ) : (
                  <>
                    <ConditionRow><ConditionLabel>건당 보험료</ConditionLabel><ConditionValue>{premium.amount.toLocaleString()}원 <span style={{ fontWeight: 400, color: THEME.muted }}>({premium.plan.groupLabel} · 금액의 {premium.plan.rate}%, 최소 {premium.plan.minPrice.toLocaleString()}원)</span></ConditionValue></ConditionRow>
                    <PayNote>이 오더의 체크인부터 체크아웃까지 보장됩니다. 보험은 선택이며, 월·1년 보험에 가입하면 건마다 결제하지 않아도 됩니다.</PayNote>
                  </>
                )}
                <ActionRow style={{ marginTop: 10 }}>
                  <PrimaryCTA onClick={handleInsurancePay} disabled={!premium || premium.pending || insBusy}>건당 보험료 결제</PrimaryCTA>
                  <OutlinedBtn onClick={() => navigate("/insurance")}>월·년 가입</OutlinedBtn>
                </ActionRow>
                {!insuranceRequired && <PayNote style={{ marginTop: 6 }}><button type="button" onClick={handleInsuranceSkip} style={{ background: "none", border: "none", padding: 0, color: THEME.muted, fontSize: "inherit", fontFamily: "inherit", textDecoration: "underline" }}>보험 없이 진행</button></PayNote>}
              </>
            ) : (
              <PayNote>{insuranceRequired ? "보험가입 필수 오더 — 배정된 홈프로가 건당·월·년 중 하나로 가입한 뒤 체크인합니다." : "홈프로가 원하면 이 오더에 보험을 적용합니다(선택)."}</PayNote>
            )}
          </DetailSection>
        )}
        {(isOwner || isMatchedPro) && order.b2bPriceType === "hpoint" && order.hpointEscrow && (
          <DetailSection>
            <SectionTitle>H-포인트 보관</SectionTitle>
            <PayNote $done={order.hpointEscrow.status !== "held"}>
              {order.hpointEscrow.status === "held" && `대금 ${Number(order.hpointEscrow.amount).toLocaleString()}P를 앱이 보관 중입니다. 완료되면 홈프로에게 배분됩니다.`}
              {order.hpointEscrow.status === "released" && `배분 완료 · 홈프로 ${Number(order.hpointEscrow.toPro ?? order.hpointEscrow.amount).toLocaleString()}P${order.hpointEscrow.referral ? ` · 접수자 캐시백 ${Number(order.hpointEscrow.referral).toLocaleString()}P` : ""}`}
              {order.hpointEscrow.status === "refunded" && `취소되어 ${Number(order.hpointEscrow.amount).toLocaleString()}P를 접수자에게 돌려드렸습니다.`}
            </PayNote>
          </DetailSection>
        )}
        {(isOwner || isMatchedPro) && isWorkPayApplicable(order) && (
          <DetailSection>
            <SectionTitle>작업 대금 (후불)</SectionTitle>
            {order.workPay?.status === "confirmed" ? (
              <PayNote $done>작업 대금 · 입금 확인 완료</PayNote>
            ) : order.workPay?.status === "sent" ? (
              isMatchedPro ? (
                <>
                  <PayNote>접수자가 대금을 지급했다고 표시했습니다. 통장을 확인한 뒤 눌러 주세요.</PayNote>
                  <ActionRow style={{ marginTop: 10 }}><PrimaryCTA onClick={handleWorkPayConfirm} disabled={payBusy}>입금 확인</PrimaryCTA></ActionRow>
                </>
              ) : (
                <PayNote>지급 완료로 표시했습니다. 홈프로 확인을 기다리는 중입니다.</PayNote>
              )
            ) : isOwner ? (
              <>
                <PayNote>대금은 앱 밖에서 직접 지급합니다. 지급한 뒤 눌러 주세요.</PayNote>
                <ActionRow style={{ marginTop: 10 }}><OutlinedBtn onClick={handleWorkPaySent} disabled={payBusy}>대금 지급 완료</OutlinedBtn></ActionRow>
              </>
            ) : (
              <PayNote>접수자가 대금을 지급하면 입금 확인 요청이 옵니다.</PayNote>
            )}
          </DetailSection>
        )}

        {/* ── 요청 방식 (매칭) ── */}
        {order.matchType && (
          <DetailSection>
            <SectionTitle>요청 방식</SectionTitle>
            <ConditionRow>
              <ConditionLabel>매칭방식</ConditionLabel>
              <ConditionValue>{MATCH_TYPE_LABEL[order.matchType] || order.matchType}</ConditionValue>
            </ConditionRow>
            {order.b2bPriceType !== "info" && !order.selfOrder && (
              <ConditionRow>
                <ConditionLabel>보험</ConditionLabel>
                <ConditionValue>{insuranceRequired ? "보험가입 필수" : "선택"}</ConditionValue>
              </ConditionRow>
            )}
          </DetailSection>
        )}

        {/* ── 요청 상세 내용 ── */}
        <DetailSection>
          <SectionTitle>요청 상세 내용</SectionTitle>
          <DetailText>{order.description || "-"}</DetailText>
        </DetailSection>

        {/* ── 활동 이력 ── 취소/상태변경/견적통보/수락/지원/선정 타임라인 */}
        {(isOwner || isMatchedPro || (order.applicantUids || []).includes(myUid)) && orderLogs.length > 0 && (
          <DetailSection>
            <SectionTitle>오더이력</SectionTitle>
            {orderLogs.map((log) => (
              <LogRow key={log.id}>
                <LogDot $type={log.type} />
                <LogBody>
                  <LogMsg>{log.message}</LogMsg>
                  <LogMeta>
                    {log.byName ? `${log.byName}` : ""}{log.byRole ? ` · ${log.byRole}` : ""}{" · "}{formatOrderTime(log.createdAt)}
                  </LogMeta>
                </LogBody>
              </LogRow>
            ))}
          </DetailSection>
        )}

        {/* ── 접수자 프로필 (홈프로 시점) ── */}
        {!isOwner && (order.writer || order.writerPhoto) && (
          <DetailSection>
            <SectionTitle>접수자 프로필</SectionTitle>
            <ApplicantCard style={{ cursor: "pointer" }} onClick={() => navigate(`/profile/${order.createdBy}`, { state: { fallbackName: order.writer, fallbackPhoto: order.writerPhoto } })}>
              <ApplicantTop>
                {order.writerPhoto ? (
                  <QuoteAvatar src={order.writerPhoto} alt={order.writer || "접수자"} />
                ) : (
                  <QuoteAvatarPlaceholder>
                    <IoPersonCircleOutline size={36} color={THEME.muted} />
                  </QuoteAvatarPlaceholder>
                )}
                <ApplicantInfo>
                  <ApplicantName>{order.writer || "접수자"}</ApplicantName>
                  <ProfileHint>프로필 보기</ProfileHint>
                </ApplicantInfo>
              </ApplicantTop>
            </ApplicantCard>
          </DetailSection>
        )}

        {/* ── 받은견적 (접수자 시점) ── 사양 R83: 금액/범위/조건 표시, 수정 불가 */}
        {isOwner && quotes.length > 0 && (
          <DetailSection>
            <SectionTitle>받은견적</SectionTitle>
            {quotes.map((q) => (
              <QuoteCard key={q.id}>
                <ApplicantTop>
                  <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => navigate(`/profile/${q.proUid}`, { state: { fallbackName: q.proName, fallbackPhoto: q.proPhoto } })}>
                  {q.proPhoto ? (
                    <QuoteAvatar src={q.proPhoto} alt={q.proName} />
                  ) : (
                    <QuoteAvatarPlaceholder>
                      <IoPersonCircleOutline size={32} color={THEME.muted} />
                    </QuoteAvatarPlaceholder>
                  )}
                  <ApplicantInfo>
                    <ApplicantName>{q.proName || "전문가"}</ApplicantName>
                    <ConditionValue>{Number(q.price || 0).toLocaleString()}원</ConditionValue>
                    {q.message && <ApplicantIntro>{q.message}</ApplicantIntro>}
                  </ApplicantInfo>
                  </div>
                  {q.status !== "accepted" ? (
                    <SelectProBtn onClick={() => handleAcceptQuote(q)}>수락</SelectProBtn>
                  ) : (
                    <ConditionValue style={{ color: THEME.success, fontWeight: 600 }}>수락됨</ConditionValue>
                  )}
                </ApplicantTop>
              </QuoteCard>
            ))}
          </DetailSection>
        )}

        {/* ── 단가 안내 (홈프로 시점) ── 금액미정은 수락→배정 후 통보, 고정가는 입력 불필요 */}
        {!isOwner && order.b2bPriceType && (
          <DetailSection>
            <SectionTitle>{isUnpriced ? "견적가 안내" : "단가 안내"}</SectionTitle>
            <DetailText style={{ color: THEME.muted }}>
              {/* 현장견적은 방문이 필수, 견적요청은 선택 (대표 확정 8/7) */}
              {isInfoOrder
                ? "정보공유 오더는 견적서·현장 체크인 없이 진행합니다. 제보된 정보를 확인하면 정보제공 리워드를, 그 업체와 계약이 성사되면 계약성사 인센티브를 접수자(제보자)에게 지급합니다."
                : !isUnpriced
                ? `${PRICE_TYPE_LABEL[order.b2bPriceType] || order.b2bPriceType} 단가는 견적 작성이 필요하지 않습니다`
                : order.b2bPriceType === "onsite"
                  ? "이 오더는 수락 시 견적 금액을 입력하지 않습니다. 먼저 오더를 수락하여 배정받은 후, 반드시 현장을 직접 방문하여 현장상태·실측 결과·특이 사항을 확인한 뒤 최종 금액을 산정·확정해 접수자에게 제안합니다."
                  : "이 오더는 수락 시 견적 금액을 입력하지 않습니다. 먼저 오더를 수락하여 배정받은 후, 등록된 작업 요구사항과 사진 등을 확인하거나 현장을 직접 방문하여 견적가를 접수자에게 제안합니다."}
            </DetailText>
          </DetailSection>
        )}

        {/* ── 비교선정 지원 홈프로 목록 (접수자 전용) — 견적가 비교 후 선정 ── */}
        {isOwner && matchType === "compare" && applicants.length > 0 && (
          <DetailSection>
            <SectionTitle>지원 홈프로 ({applicants.length}) · 견적가 비교 후 선정</SectionTitle>
            {applicants.map((app) => (
              <ApplicantCard key={app.proUid}>
                <ApplicantTop>
                  <div style={{ display: "flex", gap: 12, flex: 1, minWidth: 0, cursor: "pointer" }} onClick={() => navigate(`/profile/${app.proUid}`, { state: { fallbackName: app.proName, fallbackPhoto: app.proProfile } })}>
                  {app.proProfile ? (
                    <QuoteAvatar src={app.proProfile} alt={app.proName} />
                  ) : (
                    <QuoteAvatarPlaceholder>
                      <IoPersonCircleOutline size={36} color={THEME.muted} />
                    </QuoteAvatarPlaceholder>
                  )}
                  <ApplicantInfo>
                    <ApplicantName>{app.proName || "홈프로"}</ApplicantName>
                    <ConditionValue style={{ textAlign: "left", color: app.quotedPrice > 0 ? THEME.primary : THEME.muted, fontWeight: 600 }}>
                      {app.quotedPrice > 0 ? `견적가 ${Number(app.quotedPrice).toLocaleString()}원` : "견적가 미통보"}
                    </ConditionValue>
                    {app.quoteMessage && <ApplicantIntro>{app.quoteMessage}</ApplicantIntro>}
                  </ApplicantInfo>
                  </div>
                  {order.matchedProUid
                    ? (order.matchedProUid === app.proUid
                        ? <ConditionValue style={{ color: THEME.primary, fontWeight: 700 }}>배정됨</ConditionValue>
                        : <ConditionValue style={{ color: THEME.muted }}>미선정</ConditionValue>)
                    : <SelectProBtn onClick={() => handleSelectPro(app.proUid)}>선정</SelectProBtn>}
                </ApplicantTop>
                <ContactRow onClick={(e) => e.stopPropagation()}>
                  <ContactBtn onClick={() => handlePhoneCall(app.proPhone || app.phone)}>
                    <IoCallOutline size={15} /> 전화
                  </ContactBtn>
                  <ContactBtn $primary onClick={() => handleStartChat(app.proUid, app.proName, app.proProfile)}>
                    <IoChatbubbleEllipsesOutline size={15} /> 채팅
                  </ContactBtn>
                </ContactRow>
              </ApplicantCard>
            ))}
          </DetailSection>
        )}

        {/* 견적 확인/수락은 채팅방에서 처리 */}

        <BottomSpacer />
      </Wrapper>

      {/* 고정 하단 CTA — 호출 유형별 분기 */}
      <FixedBottom>
        {isOwner ? (
          /* 접수자 버튼 — 대기 상태면 재접수 / 그 외면 대기후수정 (홈프로 배정 후엔 비활성) */
          <>
          {/* 완료 오더는 리뷰 작성이 최우선 행동 (리뷰 8/5: 체크아웃 후 진입점을 못 찾는다는 지적) */}
          {order.orderStatus === "완료" && !order.reviewed && order.matchedProUid && (
            <ActionRow>
              <PrimaryCTA onClick={handleWriteReview}>리뷰 작성</PrimaryCTA>
            </ActionRow>
          )}
          <ActionRow>
            <OutlinedBtn
              onClick={() => { if (!HP_ASSIGNED_STATUSES.has(order.orderStatus)) navigate("/order/create", { state: { order } }); }}
              disabled={HP_ASSIGNED_STATUSES.has(order.orderStatus)}
              style={HP_ASSIGNED_STATUSES.has(order.orderStatus) ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            >
              수정
            </OutlinedBtn>
            {order.orderStatus === "대기" ? (
              <OutlinedBtn onClick={handleOwnerReregister}>재접수</OutlinedBtn>
            ) : (
              <OutlinedBtn
                onClick={() => { if (!CLOSED_STATUSES.has(order.orderStatus)) handleOwnerWaiting(); }}
                disabled={CLOSED_STATUSES.has(order.orderStatus)}
                style={CLOSED_STATUSES.has(order.orderStatus) ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
              >대기</OutlinedBtn>
            )}
            <OutlinedBtn
              $danger
              onClick={() => { if (!CLOSED_STATUSES.has(order.orderStatus)) setShowCancelModal(true); }}
              disabled={CLOSED_STATUSES.has(order.orderStatus)}
              style={CLOSED_STATUSES.has(order.orderStatus) ? { opacity: 0.4, cursor: "not-allowed" } : undefined}
            >취소</OutlinedBtn>
          </ActionRow>
          </>
        ) : isMatchedPro ? (
          /* 이미 배정받은 오더 — 접수자에게 전화/채팅 + 현장기록 (작업완료·취소는 나의오더현황 카드) */
          <>
            <ActionRow>
              <OutlinedBtn onClick={() => handlePhoneCall(order.ordererPhone || order.contactPhone)}>
                <IoCallOutline size={18} /> 전화
              </OutlinedBtn>
              <PrimaryCTA onClick={() => handleStartChat(order.createdBy, order.writer, order.writerPhoto)}>
                <IoChatbubbleEllipsesOutline size={18} style={{ marginRight: 6, verticalAlign: "middle" }} /> 접수자와 채팅
              </PrimaryCTA>
            </ActionRow>
            {/* 정보공유 오더는 체크인 생략 (대표 지시 8/20) */}
            {!isInfoOrder && (() => {
              // 캐시백 입금 확인 전에는 체크인을 막는다 (대표 확정 9/13)
              // 체크인은 캐시백 입금 확인·보험 적용과 무관하게 열어 둔다 (대표 9/14 카톡)
              // 단 접수자가 '보험가입 필수'로 등록한 오더는 보험 적용 전 체크인 불가 (대표 9/15 카톡 8번)
              const blocked = !order.checkInAt && insuranceRequired && insuranceState !== "applied";
              return (
                <ActionRow>
                  <OutlinedBtn
                    onClick={() => { if (blocked) { showToast("보험가입 필수 오더입니다. 건당·월·년 중 하나로 가입한 뒤 체크인해 주세요"); return; } navigate(`/order/worklog/${order.id}`); }}
                    style={blocked ? { opacity: 0.45 } : undefined}
                  >
                    {order.checkInAt ? "현장기록" : "현장 체크인"}
                  </OutlinedBtn>
                </ActionRow>
              );
            })()}
          </>
        ) : isPendingApplicant ? (
          /* 비교선정 지원 완료(선정 전) — 상태 선정대기 + 접수자와 전화/채팅 */
          <>
            <ApplyStatusLine>지원 완료 · <b>선정대기</b></ApplyStatusLine>
            <ActionRow>
              <OutlinedBtn onClick={() => handlePhoneCall(order.ordererPhone || order.contactPhone)}>
                <IoCallOutline size={18} /> 전화
              </OutlinedBtn>
              <PrimaryCTA onClick={() => handleStartChat(order.createdBy, order.writer, order.writerPhoto)}>
                <IoChatbubbleEllipsesOutline size={18} style={{ marginRight: 6, verticalAlign: "middle" }} /> 접수자와 채팅
              </PrimaryCTA>
            </ActionRow>
          </>
        ) : isUnselectedApplicant ? (
          /* 비교선정 미선정 — 다른 홈프로가 선정됨 */
          <ApplyStatusLine $muted>미선정 · 다른 홈프로가 선정되었습니다</ApplyStatusLine>
        ) : matchType === "priority" ? (
          /* 우선배정호출 — 전화 제거, 수락하기만 (2차수는 등록 5분 후 해제) */
          <>
            {acceptLocked && <TierGateNote>{tierGateText}</TierGateNote>}
            <ActionRow>
              {acceptLocked ? (
                <PrimaryCTA disabled $locked>수락 가능까지 {formatAcceptRemain(acceptRemainSec)}</PrimaryCTA>
              ) : (
                <PrimaryCTA onClick={handleAcceptOrder}>{order.orderStatus === "대기" ? "보류 중 (수락 불가)" : "수락하기"}</PrimaryCTA>
              )}
            </ActionRow>
          </>
        ) : matchType === "compare" ? (
          /* 다중비교호출 — 전화 제거, 지원하기만 */
          <ActionRow>
            <PrimaryCTA onClick={handleApplyOrder}>지원하기</PrimaryCTA>
          </ActionRow>
        ) : matchType === "direct" ? (
          /* 지정배정 — 지정된 번호의 홈프로만 수락/거절 가능 (전수검사 7/29:
             가드가 없어 아무 프로나 수락하거나, 거절하기로 남의 오더를 통째로
             '대기' 상태로 내려버릴 수 있었음) */
          (() => {
            const digits = (s) => String(s || "").replace(/[^0-9]/g, "").replace(/^82/, "0");
            const isDesignated = !!order.directPhone
              && digits(order.directPhone) === digits(userData?.phoneE164 || userData?.phone);
            return isDesignated ? (
              <>
                {acceptLocked && <TierGateNote>{tierGateText}</TierGateNote>}
                <ActionRow>
                  <OutlinedBtn $danger onClick={handleRejectDirect}>거절하기</OutlinedBtn>
                  {acceptLocked ? (
                    <PrimaryCTA disabled $locked>수락 가능까지 {formatAcceptRemain(acceptRemainSec)}</PrimaryCTA>
                  ) : (
                    <PrimaryCTA onClick={handleAcceptOrder}>{order.orderStatus === "대기" ? "보류 중 (수락 불가)" : "수락하기"}</PrimaryCTA>
                  )}
                </ActionRow>
              </>
            ) : (
              <ApplyStatusLine $muted>지정배정 오더 · 지정된 홈프로만 수락할 수 있습니다</ApplyStatusLine>
            );
          })()
        ) : (
          /* fallback — 매칭방식 미지정 시에도 수락 흐름 (전화 제거) */
          <>
            {acceptLocked && <TierGateNote>{tierGateText}</TierGateNote>}
            <ActionRow>
              {acceptLocked ? (
                <PrimaryCTA disabled $locked>수락 가능까지 {formatAcceptRemain(acceptRemainSec)}</PrimaryCTA>
              ) : (
                <PrimaryCTA onClick={handleAcceptOrder}>{order.orderStatus === "대기" ? "보류 중 (수락 불가)" : "수락하기"}</PrimaryCTA>
              )}
            </ActionRow>
          </>
        )}
      </FixedBottom>

      {/* 취소 사유 선택 모달 */}
      {showCancelModal && (
        <SheetOverlay onClick={() => setShowCancelModal(false)}>
          <CancelSheet onClick={(e) => e.stopPropagation()}>
            <SheetHandle />
            <SheetHeader>
              <SheetTitle>취소 사유 선택</SheetTitle>
              <SheetCloseBtn onClick={() => setShowCancelModal(false)}>
                <IoCloseOutline size={24} color={THEME.text} />
              </SheetCloseBtn>
            </SheetHeader>
            <CancelOptions>
              {["잘못접수", "일정변경", "오더수정", "기타"].map((reason) => (
                <CancelOption key={reason} $selected={cancelReason === reason} onClick={() => setCancelReason(reason)}>
                  <CancelRadio $selected={cancelReason === reason} />
                  <CancelLabel>{reason}</CancelLabel>
                </CancelOption>
              ))}
            </CancelOptions>
            <CancelConfirmBtn onClick={handleOwnerCancel} disabled={!cancelReason}>확인</CancelConfirmBtn>
          </CancelSheet>
        </SheetOverlay>
      )}

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
  font-size: 13px;
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
  font-size: 14px;
  font-weight: 400;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

const TimeLabel = styled.div`
  font-size: 14px;
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
  font-size: 14px;
  font-weight: 400;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const SpaceTag = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 400;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const TitleSection = styled.div`
  padding: 20px 16px 0;
`;

const OrderTitle = styled.h1`
  margin: 0;
  font-size: 22px;
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
  font-size: 15px;
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
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-bottom: 2px;
`;

const InfoValue = styled.div`
  font-size: 16px;
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
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 12px;
`;

const DetailText = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  line-height: 1.7;
  white-space: pre-line;
`;

/* ── 활동 이력 ── */
const LOG_DOT_COLORS = { cancel: "#EF4444", quote: "#00963F", select: "#00963F", accept: "#10B981", apply: "#3B82F6", status: "#F59E0B" };
const LogRow = styled.div`
  display: flex;
  gap: 10px;
  padding: 8px 0;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;
const LogDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  margin-top: 5px;
  flex-shrink: 0;
  background: ${({ $type }) => LOG_DOT_COLORS[$type] || THEME.muted};
`;
const LogBody = styled.div`
  flex: 1;
  min-width: 0;
`;
const LogMsg = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: ${THEME.text};
`;
const LogMeta = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  margin-top: 2px;
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
  font-size: 15px;
  font-weight: 500;
  color: ${THEME.muted};
`;

const ConditionValue = styled.div`
  font-size: 15px;
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
  font-size: 15px;
  color: ${THEME.muted};
  font-weight: 500;
`;

const MatchTag = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 14px;
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

/* 지원 홈프로 상태 표기 (선정대기 / 미선정) */
const ApplyStatusLine = styled.div`
  font-size: 17px;
  color: ${(p) => (p.$muted ? THEME.muted : THEME.textSecondary)};
  margin-bottom: ${(p) => (p.$muted ? 0 : "10px")};
  text-align: center;
  b { color: ${(p) => (p.$muted ? THEME.muted : THEME.primary)}; font-weight: 700; }
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
  font-size: 18px;
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
  font-size: 17px;
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
  font-size: 16px;
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
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

const QuoteTime = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 2px;
`;

const QuotePrice = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.primary};
  flex-shrink: 0;
`;

const QuoteMessage = styled.div`
  margin-top: 8px;
  font-size: 15px;
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
  background: ${THEME.button};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
`;

const QuoteStatusBadge = styled.span`
  padding: 4px 10px;
  border-radius: 6px;
  font-size: 14px;
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
  font-size: 19px;
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
  font-size: 16px;
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
  font-size: 20px;
  font-weight: 600;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${THEME.primary}; }
  &::placeholder { color: ${THEME.muted}; font-weight: 400; }
`;

const SheetUnit = styled.span`
  font-size: 18px;
  font-weight: 400;
  color: ${THEME.text};
  flex-shrink: 0;
`;

const SheetHint = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 6px;
`;

const SheetTextarea = styled.textarea`
  width: 100%;
  padding: 12px 16px;
  border: 1.5px solid ${THEME.border};
  border-radius: 10px;
  font-size: 16px;
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
  font-size: 14px;
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
  background: ${THEME.button};
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: default; }
`;

/* ── 호출 유형별 CTA ── */
const PrimaryCTA = styled.button`
  flex: 1;
  height: 48px;
  border-radius: 10px;
  border: none;
  background: ${({ $locked }) => ($locked ? "#E5E7EB" : THEME.button)};
  color: ${({ $locked }) => ($locked ? THEME.muted : "#fff")};
  font-size: 18px;
  font-weight: 600;
  font-family: inherit;
  cursor: ${({ $locked }) => ($locked ? "not-allowed" : "pointer")};
  font-variant-numeric: tabular-nums;
  &:active { opacity: ${({ $locked }) => ($locked ? 1 : 0.85)}; }
`;

/* 차수 게이트 안내 (2차수 수락 대기) — 대표 지시 7/29 */
const TierGateNote = styled.div`
  font-size: 14px;
  color: ${THEME.textSecondary};
  text-align: center;
  margin-bottom: 8px;
`;

const ProfileHint = styled.div`
  font-size: 14px;
  color: ${THEME.primary};
  margin-top: 2px;
`;

const ContactRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid ${THEME.border};
`;

const ContactBtn = styled.button`
  flex: 1;
  height: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  border: 1px solid ${({ $primary }) => ($primary ? THEME.button : THEME.border)};
  background: ${({ $primary }) => ($primary ? THEME.button : THEME.surface)};
  color: ${({ $primary }) => ($primary ? "#fff" : THEME.text)};
  &:active { opacity: 0.85; }
`;

const AssignedNote = styled.div`
  flex: 1;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: ${THEME.background};
  color: ${THEME.muted};
  font-size: 16px;
  font-weight: 500;
`;

/* 돈 흐름 안내 문구 — 상태는 뱃지 없이 글씨 굵기·색으로만 */
const PayNote = styled.div`
  font-size: 15px;
  line-height: 1.55;
  color: ${({ $done, $warn }) => ($done ? "#15803d" : $warn ? THEME.danger : THEME.textSecondary)};
  font-weight: ${({ $done }) => ($done ? 700 : 400)};
  margin-top: 6px;
  word-break: keep-all;
`;
const ReceiptImg = styled.img`
  display: block;
  width: 120px;
  height: 120px;
  object-fit: cover;
  border: 1px solid #E5E7EB;
  border-radius: 10px;
  margin-top: 8px;
  cursor: pointer;
`;

const OutlinedBtn = styled.button`
  flex: 1;
  height: 48px;
  border-radius: 10px;
  border: 1.5px solid ${({ $danger }) => $danger ? THEME.danger : "#D1D5DB"};
  background: #fff;
  color: ${({ $danger }) => $danger ? THEME.danger : "#333"};
  font-size: 17px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { background: #F3F4F6; }
`;

/* ── 지원자 목록 ── */
const ApplicantCard = styled.div`
  padding: 14px 0;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;

const ApplicantTop = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const ApplicantInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ApplicantName = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

const ApplicantIntro = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 2px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const SelectProBtn = styled.button`
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: ${THEME.button};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  flex-shrink: 0;
  &:active { opacity: 0.85; }
`;

/* ── 취소 사유 모달 ── */
const CancelSheet = styled.div`
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
  animation: sheetUp 0.25s ease-out;
  @keyframes sheetUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;

const CancelOptions = styled.div`
  padding: 8px 16px 16px;
`;

const CancelOption = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 0;
  cursor: pointer;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;

const CancelRadio = styled.div`
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid ${({ $selected }) => $selected ? THEME.button : "#D1D5DB"};
  background: ${({ $selected }) => $selected ? THEME.button : "#fff"};
  flex-shrink: 0;
  position: relative;
  &::after {
    content: "";
    display: ${({ $selected }) => $selected ? "block" : "none"};
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #fff;
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
  }
`;

const CancelLabel = styled.div`
  font-size: 17px;
  font-weight: 500;
  color: ${THEME.text};
`;

const CancelConfirmBtn = styled.button`
  width: calc(100% - 32px);
  margin: 0 16px;
  padding: 14px;
  border: none;
  border-radius: 10px;
  background: ${THEME.button};
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
  &:disabled { opacity: 0.5; cursor: default; }
`;
