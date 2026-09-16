/* eslint-disable */
/**
 * 월 구독 결제 — 1차수(접수 즉시 수락) 권리
 *  대표 확정 9/12: 월 16,500원(부가세 포함), H-포인트로 내면 16,500P.
 *  형 확정 9/13: 결제 화면에 "H-포인트 사용하기" 체크박스 → 전액 사용 또는 사용할 포인트 직접 입력, 나머지 금액만 토스로 결제. 100P 단위(카드 최소 100원).
 *  서버(tossPrepare purpose=subscription)가 금액을 다시 계산하고, 승인 뒤에 포인트를 차감한다. 전액 포인트면 PG 없이 바로 적용.
 *
 *  대표 지시 9/16: 구독은 단건이 아니라 토스 빌링(자동결제)로. 형 확정: 자동결제는 전액 카드만.
 *   → 두 경로를 나란히 둔다.
 *     [자동결제로 구독] requestBillingAuth(purpose:subscription) → /pay/billing-success → tossBillingIssue
 *                      : 전액 카드, 매달 자동 갱신(서버 subscriptionAutoCharge 03:20 KST)
 *     [이번 달만 결제] 기존 단건 경로 — H-포인트 혼합 가능, 자동 갱신 없음
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { getPointPolicy } from "../../service/PointService";
import { preparePayment, requestBillingAuth, cancelBilling } from "../../service/payService";
import { isSubscriber } from "../../utility/tierUtils";

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { userData, refreshUser } = useAuth();
  const [policy, setPolicy] = useState(null);
  const [usePoints, setUsePoints] = useState(false);
  const [pointMode, setPointMode] = useState("all"); // all | custom
  const [customPoints, setCustomPoints] = useState("");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const userPoints = Number(userData?.referralPoints || 0);
  const monthlyFee = Number(policy?.monthlySubscriptionPoint || 16500);
  const isTier1 = isSubscriber(userData);
  const sub = userData?.subscription;
  const subEnd = sub?.endAt?.toDate ? sub.endAt.toDate() : (sub?.endAt ? new Date(sub.endAt) : null);
  const autoOn = sub?.status === "active" && sub?.autoRenew === true;
  const billing = sub?.billing || null;
  const nextChargeAt = billing?.nextChargeAt?.toDate ? billing.nextChargeAt.toDate() : (billing?.nextChargeAt ? new Date(billing.nextChargeAt) : null);
  const cardLabel = [billing?.cardCompany, billing?.cardNumberMasked].filter(Boolean).join(" ");
  const ymd = (d) => (d ? `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}` : "");

  useEffect(() => { getPointPolicy().then(setPolicy).catch(() => setPolicy(null)); }, []);
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

  // 사용 포인트 계산 — 100P 단위, 잔액·구독료 이내
  const maxUsable = Math.floor(Math.min(userPoints, monthlyFee) / 100) * 100;
  let pointsUsed = 0;
  if (usePoints) pointsUsed = pointMode === "all" ? maxUsable : Math.min(maxUsable, Math.floor((Number(customPoints) || 0) / 100) * 100);
  const cardAmount = monthlyFee - pointsUsed;
  const cardTooSmall = cardAmount > 0 && cardAmount < 100;

  // 자동결제 등록 — 카드 등록창으로 이동. 전액 카드(포인트 혼합 없음, 형 확정 9/16)
  const handleAutoSubscribe = async () => {
    if (!userData?.uid) { showToast("로그인이 필요합니다"); return; }
    if (busy) return;
    setBusy(true);
    try {
      await requestBillingAuth({
        customerKey: userData.uid,
        customerName: userData.nickname || userData.name || undefined,
        purpose: "subscription",
      });
    } catch (e) {
      showToast(e.message || "카드 등록창을 열지 못했습니다");
      setBusy(false);
    }
  };

  // 자동결제 해지 — 만료일까지는 0차수 유지, 다음 달부터 청구 안 함
  const handleCancelAuto = async () => {
    if (busy) return;
    if (!window.confirm(`자동결제를 해지할까요?\n${subEnd ? `${ymd(subEnd)}까지는 0차수가 그대로 유지되고, ` : ""}다음 달부터 결제되지 않습니다.`)) return;
    setBusy(true);
    try {
      await cancelBilling({ target: "subscription" });
      if (refreshUser) await refreshUser();
      showToast("자동결제를 해지했습니다");
    } catch (e) {
      showToast(e.message || "해지에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  const handleSubscribe = async () => {
    if (!userData?.uid) { showToast("로그인이 필요합니다"); return; }
    if (cardTooSmall) { showToast("카드 결제 금액은 100원 이상이어야 해요. 포인트 사용액을 조정해 주세요"); return; }
    if (busy) return;
    setBusy(true);
    try {
      if (cardAmount === 0) {
        // 전액 H-포인트 — 서버가 바로 차감·적용
        await preparePayment({ purpose: "subscription", pointsUsed });
        if (refreshUser) await refreshUser();
        showToast("H-포인트로 구독이 시작되었습니다");
        setTimeout(() => navigate("/pay/success?pointsOnly=1&purpose=subscription", { replace: true }), 600);
        return;
      }
      navigate(`/pay?purpose=subscription&pointsUsed=${pointsUsed}`);
    } catch (e) {
      showToast(e.message || "결제 준비에 실패했습니다");
    } finally {
      setBusy(false);
    }
  };

  return (
    <SimpleBackLayout NAME="월 구독" hideFooter>
      <Wrap>
        <Hero>
          <HeroTitle>홈프로 월 구독 · 0차수</HeroTitle>
          <HeroPrice>월 {monthlyFee.toLocaleString()}원 <Small>(부가세 포함)</Small></HeroPrice>
          <HeroDesc>오더가 접수되는 즉시 0초에 수락할 수 있습니다. 미구독은 2만P 이상 보유(1차수) 3분 뒤, 무료회원(2차수) 7분 뒤부터 수락됩니다.</HeroDesc>
        </Hero>

        {isTier1 && (
          <StatusBox>
            <b>구독 중</b>{subEnd ? ` · ${ymd(subEnd)}까지` : ""}
            <div style={{ marginTop: 4, color: THEME.muted }}>
              {autoOn
                ? `자동결제가 켜져 있어 매달 이어집니다${nextChargeAt ? ` (다음 결제 ${ymd(nextChargeAt)})` : ""}.`
                : "지금 결제하면 만료일 뒤로 한 달이 이어집니다."}
            </div>
          </StatusBox>
        )}

        {/* 자동결제 — 전액 카드 (대표 지시 9/16) */}
        <Section>
          <Label>자동결제로 구독</Label>
          {autoOn ? (
            <>
              <AutoRow><span>상태</span><b style={{ color: "#15803d" }}>자동결제 중</b></AutoRow>
              {cardLabel && <AutoRow><span>결제 카드</span><b>{cardLabel}</b></AutoRow>}
              {nextChargeAt && <AutoRow><span>다음 결제일</span><b>{ymd(nextChargeAt)}</b></AutoRow>}
              <AutoRow><span>매달 청구</span><b>{monthlyFee.toLocaleString()}원</b></AutoRow>
              <OutlineBtn onClick={handleCancelAuto} disabled={busy}>자동결제 해지</OutlineBtn>
              <AutoNote>해지해도 {subEnd ? `${ymd(subEnd)}까지는` : "만료일까지는"} 0차수가 그대로 유지되고, 다음 달부터 결제되지 않습니다.</AutoNote>
            </>
          ) : (
            <>
              <AutoNote style={{ marginTop: 0 }}>
                카드를 한 번 등록해 두면 매달 {monthlyFee.toLocaleString()}원이 자동으로 결제돼 구독이 끊기지 않습니다.
                자동결제는 전액 카드로만 되고, H-포인트를 섞어 내려면 아래 &lsquo;이번 달만 결제&rsquo;를 쓰세요.
                {isTier1 && subEnd ? ` 지금 등록해도 ${ymd(subEnd)}까지는 청구되지 않고, 그날부터 자동결제가 시작됩니다.` : ""}
              </AutoNote>
              <PrimaryBtn onClick={handleAutoSubscribe} disabled={busy}>
                {busy ? "처리 중..." : "카드 등록하고 자동결제 시작"}
              </PrimaryBtn>
            </>
          )}
        </Section>

        <SectionTitle>이번 달만 결제</SectionTitle>
        <Section>
          <Label>H-포인트 사용하기</Label>
          <CheckRow onClick={() => setUsePoints((v) => !v)}>
            <CheckBox $on={usePoints}>{usePoints ? "✓" : ""}</CheckBox>
            <CheckText>보유 {userPoints.toLocaleString()}P 중에서 구독료에 씁니다 (1P = 1원, 100P 단위)</CheckText>
          </CheckRow>
          {usePoints && (
            <>
              <Radio onClick={() => setPointMode("all")}>
                <RadioDot $on={pointMode === "all"} />
                <RadioText>전액 사용 ({maxUsable.toLocaleString()}P)</RadioText>
              </Radio>
              <Radio onClick={() => setPointMode("custom")}>
                <RadioDot $on={pointMode === "custom"} />
                <RadioText>사용할 포인트 직접 입력</RadioText>
              </Radio>
              {pointMode === "custom" && (
                <InputRow>
                  <Input inputMode="numeric" placeholder="예: 5000" value={customPoints}
                    onChange={(e) => setCustomPoints(e.target.value.replace(/[^0-9]/g, ""))} />
                  <Unit>P</Unit>
                </InputRow>
              )}
            </>
          )}
        </Section>

        <Summary>
          <Row><span>구독료</span><b>{monthlyFee.toLocaleString()}원</b></Row>
          <Row><span>H-포인트 사용</span><b>- {pointsUsed.toLocaleString()}P</b></Row>
          <Row $total><span>카드 결제(토스)</span><b>{cardAmount.toLocaleString()}원</b></Row>
          {cardTooSmall && <Warn>카드 결제 금액은 100원 이상이어야 합니다.</Warn>}
        </Summary>

        <Notice>H-포인트는 보상으로만 쌓이고, 돈으로 살 수 없으며, 출금되지 않습니다. 이 경로는 한 달치만 결제하는 방식이라 다음 달에 다시 결제해야 합니다.</Notice>

        <SubmitBtn onClick={handleSubscribe} disabled={busy || cardTooSmall}>
          {busy ? "처리 중..." : cardAmount === 0 ? `${pointsUsed.toLocaleString()}P로 한 달 결제` : `${cardAmount.toLocaleString()}원 결제하고 한 달 구독`}
        </SubmitBtn>
        <BottomSpacer />
      </Wrap>
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default SubscriptionPage;

const Wrap = styled.div` background: ${THEME.background}; min-height: 100%; padding: 12px; `;
const Hero = styled.div` background: #fff; border: 1px solid ${THEME.border}; border-radius: 16px; padding: 20px; margin-bottom: 12px; `;
const HeroTitle = styled.div` font-size: 17px; font-weight: 700; color: ${THEME.text}; margin-bottom: 6px; `;
const HeroPrice = styled.div` font-size: 28px; font-weight: 800; color: ${THEME.text}; margin-bottom: 8px; `;
const Small = styled.span` font-size: 14px; font-weight: 400; color: ${THEME.muted}; `;
const HeroDesc = styled.div` font-size: 15px; line-height: 1.55; color: ${THEME.textSecondary}; word-break: keep-all; `;
const StatusBox = styled.div` background: #fff; border: 1px solid ${THEME.border}; border-radius: 16px; padding: 14px 16px; margin-bottom: 12px; font-size: 15px; color: #15803d; `;
const Section = styled.div` background: #fff; border: 1px solid ${THEME.border}; border-radius: 16px; padding: 16px; margin-bottom: 12px; `;
const SectionTitle = styled.div` font-size: 16px; font-weight: 700; color: ${THEME.text}; margin: 18px 4px 8px; `;
const AutoRow = styled.div` display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 7px 0; font-size: 15px; color: ${THEME.text}; b { font-weight: 700; } `;
const AutoNote = styled.div` margin-top: 10px; font-size: 14px; line-height: 1.55; color: ${THEME.textSecondary}; word-break: keep-all; `;
const PrimaryBtn = styled.button` width: 100%; min-height: 50px; margin-top: 12px; border: none; border-radius: 10px; background: #1b1f27; color: #fff; font-size: 16px; font-weight: 700; font-family: inherit; cursor: pointer; &:disabled { opacity: .5; cursor: default; } `;
const OutlineBtn = styled.button` width: 100%; min-height: 48px; margin-top: 12px; border: 1px solid ${THEME.border}; border-radius: 10px; background: #fff; color: ${THEME.text}; font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer; &:disabled { opacity: .5; cursor: default; } `;
const Label = styled.div` font-size: 16px; font-weight: 700; color: ${THEME.text}; margin-bottom: 10px; `;
const CheckRow = styled.div` display: flex; align-items: flex-start; gap: 10px; cursor: pointer; padding: 4px 0 10px; `;
const CheckBox = styled.div`
  width: 22px; height: 22px; flex: none; border-radius: 6px; display: flex; align-items: center; justify-content: center;
  border: 1.5px solid ${({ $on }) => ($on ? THEME.primary : "#C9CED6")}; background: ${({ $on }) => ($on ? THEME.primary : "#fff")};
  color: #fff; font-size: 14px; font-weight: 800;
`;
const CheckText = styled.div` font-size: 15px; line-height: 1.5; color: ${THEME.text}; word-break: keep-all; `;
const Radio = styled.div` display: flex; align-items: center; gap: 10px; padding: 9px 0; cursor: pointer; `;
const RadioDot = styled.div`
  width: 20px; height: 20px; border-radius: 50%; flex: none;
  border: 1.5px solid ${({ $on }) => ($on ? THEME.primary : "#C9CED6")};
  background: ${({ $on }) => ($on ? `radial-gradient(circle, ${THEME.primary} 45%, #fff 50%)` : "#fff")};
`;
const RadioText = styled.div` font-size: 15px; color: ${THEME.text}; `;
const InputRow = styled.div` display: flex; align-items: center; gap: 8px; margin-top: 4px; `;
const Input = styled.input`
  flex: 1; height: 46px; border: 1px solid ${THEME.border}; border-radius: 10px; padding: 0 14px; font-size: 16px; font-family: inherit;
  &:focus { outline: none; border-color: ${THEME.primary}; }
`;
const Unit = styled.span` font-size: 15px; color: ${THEME.muted}; `;
const Summary = styled.div` background: #fff; border: 1px solid ${THEME.border}; border-radius: 16px; padding: 14px 16px; margin-bottom: 12px; `;
const Row = styled.div`
  display: flex; justify-content: space-between; font-size: ${({ $total }) => ($total ? "17px" : "15px")}; padding: 6px 0;
  color: ${THEME.text}; ${({ $total }) => ($total ? `border-top: 1px solid ${THEME.border}; margin-top: 6px; padding-top: 12px; font-weight: 700;` : "")}
`;
const Warn = styled.div` font-size: 14px; color: ${THEME.danger}; margin-top: 6px; `;
const Notice = styled.div` font-size: 14px; line-height: 1.55; color: ${THEME.textSecondary}; padding: 0 4px 12px; word-break: keep-all; `;
const SubmitBtn = styled.button`
  width: 100%; height: 52px; border: none; border-radius: 10px; background: ${THEME.primary}; color: #fff; font-size: 17px; font-weight: 700;
  font-family: inherit; cursor: pointer; &:disabled { opacity: 0.5; cursor: not-allowed; } &:active { opacity: 0.85; }
`;
const BottomSpacer = styled.div` height: 40px; `;
const Toast = styled.div`
  position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); color: #fff;
  padding: 12px 20px; border-radius: 10px; font-size: 15px; z-index: 1000; white-space: nowrap;
`;
