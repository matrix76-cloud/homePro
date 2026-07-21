/* eslint-disable */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { doc, getDoc, addDoc, collection, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { applyPointPayment, getPointPolicy } from "../../service/PointService";

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { userData, refreshUser } = useAuth();
  const [policy, setPolicy] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("card"); // "card" | "point" | "mix"
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const userPoints = userData?.referralPoints || 0;
  const monthlyFee = policy?.monthlySubscriptionPoint || 16500;

  useEffect(() => {
    getPointPolicy().then(setPolicy).catch(() => setPolicy(null));
  }, []);

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  const handleSubscribe = async () => {
    if (!userData?.uid) { showToast("로그인이 필요합니다"); return; }
    setBusy(true);
    try {
      if (paymentMethod === "point") {
        if (userPoints < monthlyFee) { showToast(`포인트 부족 (보유 ${userPoints}P)`); setBusy(false); return; }
        await applyPointPayment(userData.uid, userData.nickname || userData.name || "사용자", monthlyFee, "월 구독료 결제");
      } else if (paymentMethod === "mix") {
        const usedPoint = Math.min(userPoints, monthlyFee);
        const cardCharge = monthlyFee - usedPoint;
        if (usedPoint > 0) {
          await applyPointPayment(userData.uid, userData.nickname || userData.name || "사용자", usedPoint, "월 구독료 (포인트 차액)");
        }
        // TODO: 카드결제 차액 cardCharge — 결제 모듈 연동 필요
        showToast(`포인트 ${usedPoint}P + 카드 ${cardCharge.toLocaleString()}원 (카드 결제 연동 예정)`);
      } else {
        // 카드결제 — placeholder
        showToast("카드 결제 모듈 연동 예정");
      }
      // 구독 기록 (placeholder)
      await addDoc(collection(db, "homepro_subscriptions"), {
        uid: userData.uid,
        method: paymentMethod,
        amount: monthlyFee,
        startedAt: serverTimestamp(),
        status: "active",
      });
      if (refreshUser) await refreshUser();
      showToast("구독이 완료되었습니다");
      setTimeout(() => navigate(-1), 1000);
    } catch (e) {
      showToast(e.message || "결제 실패");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SimpleBackLayout NAME="구독 신청" hideFooter>
      <Wrap>
        <HeroBox>
          <HeroTitle>홈프로 월 구독</HeroTitle>
          <HeroPrice>월 16,500원 <Small>(부가세 포함)</Small></HeroPrice>
          <HeroDesc>도급·양도·매매 게시판, 기술전수교육 등록, 프리미엄 알림 등</HeroDesc>
        </HeroBox>

        <Section>
          <Label>결제수단</Label>
          <Radio onClick={() => setPaymentMethod("card")}>
            <RadioDot $on={paymentMethod === "card"} />
            <RadioText>카드 결제</RadioText>
          </Radio>
          <Radio onClick={() => setPaymentMethod("point")}>
            <RadioDot $on={paymentMethod === "point"} />
            <RadioText>포인트 결제 (보유 {userPoints.toLocaleString()}P)</RadioText>
          </Radio>
          <Radio onClick={() => setPaymentMethod("mix")}>
            <RadioDot $on={paymentMethod === "mix"} />
            <RadioText>포인트 + 카드 (차액)</RadioText>
          </Radio>
        </Section>

        <NoticeBox>
          <strong>안내</strong>
          포인트는 현금으로 인출되지 않으며, 앱 내 유료 서비스에 사용 가능합니다.
        </NoticeBox>

        <SubmitBtn onClick={handleSubscribe} disabled={busy}>
          {busy ? "결제 중..." : `${monthlyFee.toLocaleString()}P 결제하고 구독 시작`}
        </SubmitBtn>
        <BottomSpacer />
      </Wrap>
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default SubscriptionPage;

const Wrap = styled.div`
  background: ${THEME.background};
  min-height: 100%;
`;

const HeroBox = styled.div`
  margin: 12px;
  padding: 24px 20px;
  background: linear-gradient(135deg, #2571e3 0%, #6ba3f0 100%);
  border-radius: 16px;
  color: #fff;
  text-align: center;
`;

const HeroTitle = styled.div`
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
  opacity: 0.9;
`;

const HeroPrice = styled.div`
  font-size: 28px;
  font-weight: 700;
  margin-bottom: 8px;
`;

const Small = styled.span`
  font-size: 12px;
  font-weight: 400;
  opacity: 0.8;
`;

const HeroDesc = styled.div`
  font-size: 12px;
  opacity: 0.85;
  line-height: 1.5;
`;

const Section = styled.div`
  background: #fff;
  margin: 8px 12px;
  padding: 16px;
  border-radius: 12px;
`;

const Label = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 12px;
`;

const Radio = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 0;
  cursor: pointer;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;

const RadioDot = styled.div`
  width: 18px;
  height: 18px;
  border-radius: 50%;
  border: 2px solid ${({ $on }) => ($on ? THEME.primary : THEME.border)};
  background: ${({ $on }) => ($on ? THEME.primary : "transparent")};
  flex-shrink: 0;
`;

const RadioText = styled.div`
  font-size: 13px;
  color: ${THEME.text};
`;

const NoticeBox = styled.div`
  margin: 8px 12px;
  padding: 12px 14px;
  background: #FEF3C7;
  border-radius: 10px;
  font-size: 12px;
  color: #92400E;
  line-height: 1.5;
  strong {
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
    color: #78350F;
  }
`;

const SubmitBtn = styled.button`
  margin: 16px 12px 8px;
  padding: 14px;
  width: calc(100% - 24px);
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: ${({ disabled }) => (disabled ? THEME.muted : THEME.primary)};
  border: none;
  border-radius: 10px;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
`;

const BottomSpacer = styled.div`
  height: 40px;
`;

const Toast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 13px;
  border-radius: 20px;
  z-index: 1000;
`;
