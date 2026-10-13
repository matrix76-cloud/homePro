/* eslint-disable */
/**
 * 월 구독 — 0차수(접수 즉시 수락) 권리
 *  대표 확정 9/12: 월 16,500원(부가세 포함). 대표 지시 9/16: 토스 빌링(자동결제)로.
 *  형 확정 10/13: 구독료는 실제 금액(카드)으로만 — H-포인트 사용·'이번 달만 결제' 화면 삭제.
 *  형 확정 10/13: 스카이링크처럼 1·3·6·12개월 상품, 길게 끊을수록 할인(subscriptionPlans.js). 고른 기간마다 같은 금액으로 자동 갱신.
 *   requestBillingAuth(purpose:subscription) → /pay/billing-success → tossBillingIssue, 매달 갱신은 서버 subscriptionAutoCharge(03:20 KST)
 */
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
import { requestBillingAuth, cancelBilling } from "../../service/payService";
import { isSubscriber, getAccessTier, tierFullLabel, TIER_GUIDE } from "../../utility/tierUtils";
import { pcOnly, PC } from "../../pc/pcKit";
import { isIosApp } from "../../bridge/webviewBridge";
import { buildSubscriptionPlans, findSubscriptionPlan } from "../../utility/subscriptionPlans";

const SubscriptionPage = () => {
  const navigate = useNavigate();
  const { userData, refreshUser } = useAuth();
  const [policy, setPolicy] = useState(null);
  const [planId, setPlanId] = useState("m1");
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const monthlyFee = Number(policy?.monthlySubscriptionPoint || 16500);
  const plans = buildSubscriptionPlans(monthlyFee);
  const plan = findSubscriptionPlan(plans, planId);
  const isTier1 = isSubscriber(userData);
  const sub = userData?.subscription;
  const subEnd = sub?.endAt?.toDate ? sub.endAt.toDate() : (sub?.endAt ? new Date(sub.endAt) : null);
  const autoOn = sub?.status === "active" && sub?.autoRenew === true;
  const billing = sub?.billing || null;
  const nextChargeAt = billing?.nextChargeAt?.toDate ? billing.nextChargeAt.toDate() : (billing?.nextChargeAt ? new Date(billing.nextChargeAt) : null);
  const myPlan = findSubscriptionPlan(plans, sub?.planId); // 구독 중인 상품(예전 구독자는 1개월)
  const cardLabel = [billing?.cardCompany, billing?.cardNumberMasked].filter(Boolean).join(" ");
  // 아이폰 앱: 구독 상태·해지만 보이고 결제는 없다 (애플 3.1.1, 형 결정 9/25)
  const ios = isIosApp();
  const ymd = (d) => (d ? `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}` : "");

  useEffect(() => { getPointPolicy().then(setPolicy).catch(() => setPolicy(null)); }, []);
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2500); };

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
        planId: plan.id,
      });
    } catch (e) {
      showToast(e.message || "카드 등록창을 열지 못했습니다");
      setBusy(false);
    }
  };

  // 자동결제 해지 — 만료일까지는 0차수 유지, 다음 달부터 청구 안 함
  const handleCancelAuto = async () => {
    if (busy) return;
    if (!window.confirm(`자동결제를 해지할까요?\n${subEnd ? `${ymd(subEnd)}까지는 0차수가 그대로 유지되고, ` : ""}그 뒤로는 결제되지 않습니다.`)) return;
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

  return (
    <SimpleBackLayout NAME="구독" hideFooter>
      <Wrap>
        {/* PC: 왼쪽 상품 설명·결제 방식 / 오른쪽 고정 결제 요약. 폰에서는 두 묶음 모두 display: contents */}
        <LeftCol>
        <Hero>
          <HeroTitle>홈프로 구독 · 0차수</HeroTitle>
          {!ios && <HeroPrice>월 {monthlyFee.toLocaleString()}원 <Small>(부가세 포함 · 길게 구독하면 할인)</Small></HeroPrice>}
          <HeroDesc>오더가 접수되는 즉시 0초에 수락할 수 있습니다. 미구독은 2만P 이상 보유(1차수) 3분 뒤, 무료회원(2차수) 7분 뒤부터 수락됩니다.</HeroDesc>
        </Hero>

        {/* 파트너 등급 안내 (대표 10/2 원문) — 내 등급 줄은 굵게 */}
        <Section>
          <Label>홈프로 등급 안내</Label>
          {TIER_GUIDE.map((g) => {
            const mine = getAccessTier(userData) === g.tier;
            return (
              <TierRow key={g.tier}>
                <TierName $mine={mine}>{tierFullLabel(g.tier)}{mine ? " · 내 등급" : ""}</TierName>
                <TierText>{g.who}</TierText>
                <TierText><b>{g.rule}</b></TierText>
              </TierRow>
            );
          })}
        </Section>

        {isTier1 && (
          <StatusBox>
            <b>구독 중</b>{subEnd ? ` · ${ymd(subEnd)}까지` : ""}
            <div style={{ marginTop: 4, color: THEME.muted }}>
              {autoOn
                ? `자동결제가 켜져 있어 매달 이어집니다${nextChargeAt ? ` (다음 결제 ${ymd(nextChargeAt)})` : ""}.`
                : ios ? "만료일까지 0차수가 유지됩니다." : "지금 결제하면 만료일 뒤로 한 달이 이어집니다."}
            </div>
          </StatusBox>
        )}

        {ios && !isTier1 && (
          <StatusBox><b>구독하지 않은 상태입니다</b></StatusBox>
        )}

        </LeftCol>

        {/* 결제 칸 하나 — 자동결제(카드 등록)만. 형 확정 10/13: H-포인트로 구독료는 내지 않는다 → '이번 달만 결제'·포인트 혼합 화면 삭제 */}
        <RightCol>
        {autoOn ? (
          <Section>
            <Label>자동결제</Label>
            <AutoRow><span>상태</span><b style={{ color: "#15803d" }}>자동결제 중</b></AutoRow>
            {cardLabel && <AutoRow><span>결제 카드</span><b>{cardLabel}</b></AutoRow>}
            {nextChargeAt && <AutoRow><span>다음 결제일</span><b>{ymd(nextChargeAt)}</b></AutoRow>}
            <AutoRow><span>구독 상품</span><b>{myPlan.name}</b></AutoRow>
            <AutoRow><span>{myPlan.months === 1 ? "매달 청구" : `${myPlan.months}개월마다 청구`}</span><b>{myPlan.price.toLocaleString()}원</b></AutoRow>
            <OutlineBtn onClick={handleCancelAuto} disabled={busy}>자동결제 해지</OutlineBtn>
            <AutoNote>해지해도 {subEnd ? `${ymd(subEnd)}까지는` : "만료일까지는"} 0차수가 그대로 유지되고, 그 뒤로는 결제되지 않습니다.</AutoNote>
          </Section>
        ) : !ios && (
          <>
            <Section>
              <Label>구독 상품</Label>
              {plans.map((p) => (
                <PlanOption key={p.id} $on={p.id === plan.id} onClick={() => setPlanId(p.id)}>
                  <RadioDot $on={p.id === plan.id} />
                  <PlanBody>
                    <PlanTop>
                      <PlanName $on={p.id === plan.id}>{p.name}</PlanName>
                      <PlanPrice>{p.price.toLocaleString()}원</PlanPrice>
                    </PlanTop>
                    {p.months > 1 && (
                      <PlanDesc>한 달에 {p.perMonth.toLocaleString()}원 꼴 · <Save>{p.percent}% 할인</Save></PlanDesc>
                    )}
                  </PlanBody>
                </PlanOption>
              ))}
            </Section>

            <Summary>
              <Row><span>{plan.name} 구독료</span><b>{plan.full.toLocaleString()}원</b></Row>
              {plan.saved > 0 && <Row><span>장기 구독 할인 ({plan.percent}%)</span><b>- {plan.saved.toLocaleString()}원</b></Row>}
              <Row $total><span>카드 결제(토스)</span><b>{plan.price.toLocaleString()}원</b></Row>
            </Summary>

            <Notice>
              다음 화면에서 카드를 등록하면 {plan.price.toLocaleString()}원이 결제되고 구독이 시작됩니다.
              {plan.months === 1 ? " 매달" : ` ${plan.months}개월마다`} 같은 금액으로 자동 결제되며, 언제든 해지할 수 있습니다.
              {isTier1 && subEnd ? ` 지금 등록해도 ${ymd(subEnd)}까지는 청구되지 않고, 그날부터 자동결제가 시작됩니다.` : ""}
            </Notice>

            <SubmitBtn onClick={handleAutoSubscribe} disabled={busy}>
              {busy ? "처리 중..." : `${plan.name} 구독 시작하기`}
            </SubmitBtn>
          </>
        )}
        </RightCol>
        <BottomSpacer />
      </Wrap>
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default SubscriptionPage;

const Wrap = styled.div` background: ${THEME.background}; min-height: 100%; padding: 12px;  ${pcOnly`max-width: 1180px; margin: 0 auto; box-sizing: border-box; padding: 28px 32px 60px; display: grid; grid-template-columns: minmax(0, 1fr) 420px; gap: 24px; align-items: start; word-break: keep-all; @media (max-width: 1040px) { grid-template-columns: minmax(0, 1fr); }`} `;
const Hero = styled.div` background: #fff; border: 1px solid ${THEME.border}; border-radius: 16px; padding: 20px; margin-bottom: 12px;  ${pcOnly`border-radius: 0; border: 1px solid ${PC.line}; padding: 24px 26px; margin-bottom: 16px;`} `;
const HeroTitle = styled.div` font-size: 17px; font-weight: 700; color: ${THEME.text}; margin-bottom: 6px; `;
const HeroPrice = styled.div` font-size: 28px; font-weight: 800; color: ${THEME.text}; margin-bottom: 8px; `;
const Small = styled.span` font-size: 14px; font-weight: 400; color: ${THEME.muted}; `;
const HeroDesc = styled.div` font-size: 15px; line-height: 1.55; color: ${THEME.textSecondary}; word-break: keep-all;  ${pcOnly`color: ${PC.body};`} `;
const StatusBox = styled.div` background: #fff; border: 1px solid ${THEME.border}; border-radius: 16px; padding: 14px 16px; margin-bottom: 12px; font-size: 15px; color: #15803d;  ${pcOnly`border-radius: 0; border: 1px solid ${PC.line}; padding: 18px 26px; margin-bottom: 16px;`} `;
const Section = styled.div` background: #fff; border: 1px solid ${THEME.border}; border-radius: 16px; padding: 16px; margin-bottom: 12px;  ${pcOnly`border-radius: 0; border: 1px solid ${PC.line}; padding: 24px 26px; margin-bottom: 16px;`} `;
const SectionTitle = styled.div` font-size: 16px; font-weight: 700; color: ${THEME.text}; margin: 18px 4px 8px;  ${pcOnly`font-size: 18px; font-weight: 800; margin: 28px 0 12px;`} `;
const AutoRow = styled.div` display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 7px 0; font-size: 15px; color: ${THEME.text}; b { font-weight: 700; }  ${pcOnly`justify-content: flex-start; max-width: 460px; & > span { width: 140px; flex: none; }`} `;
const AutoNote = styled.div` margin-top: 10px; font-size: 14px; line-height: 1.55; color: ${THEME.textSecondary}; word-break: keep-all;  ${pcOnly`font-size: 15px; color: ${PC.body};`} `;
const TierRow = styled.div` padding: 12px 0; border-top: 1px solid ${THEME.border}; &:first-of-type { border-top: none; padding-top: 2px; } `;
const TierName = styled.div` font-size: 16px; font-weight: 700; color: ${({ $mine }) => ($mine ? THEME.primary : THEME.text)}; margin-bottom: 4px; `;
const TierText = styled.div` font-size: 15px; line-height: 1.55; color: ${THEME.text}; word-break: keep-all; b { font-weight: 700; } `;
const PrimaryBtn = styled.button` width: 100%; min-height: 50px; margin-top: 12px; border: none; border-radius: 10px; background: ${THEME.button}; color: #fff; font-size: 16px; font-weight: 700; font-family: inherit; cursor: pointer; &:disabled { opacity: .5; cursor: default; }  ${pcOnly`margin-top: 18px;`} `;
const OutlineBtn = styled.button` width: 100%; min-height: 48px; margin-top: 12px; border: 1px solid ${THEME.border}; border-radius: 10px; background: #fff; color: ${THEME.text}; font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer; &:disabled { opacity: .5; cursor: default; }  ${pcOnly`width: auto; padding: 0 26px; margin-top: 18px;`} `;
const PayOption = styled.div`
  display: flex; align-items: flex-start; gap: 12px; padding: 14px 16px; margin-bottom: 10px; cursor: pointer; background: #fff;
  border: 1px solid ${({ $on }) => ($on ? THEME.primary : THEME.border)}; border-radius: 10px;
  ${pcOnly`border-radius: 0;`}
`;
const PayName = styled.div` font-size: 16px; font-weight: ${({ $on }) => ($on ? 800 : 600)}; color: ${THEME.text}; margin-bottom: 4px; `;
const PayDesc = styled.div` font-size: 14px; line-height: 1.5; color: ${THEME.text}; word-break: keep-all; `;
const PointBox = styled.div` margin-top: 14px; padding-top: 14px; border-top: 1px solid ${THEME.border}; `;
const PlanOption = styled.div`
  display: flex; align-items: center; gap: 12px; min-height: 60px; padding: 12px 16px; margin-bottom: 10px; cursor: pointer; background: #fff; box-sizing: border-box;
  border: 1px solid ${({ $on }) => ($on ? THEME.primary : THEME.border)}; border-radius: 10px;
  &:last-child { margin-bottom: 0; }
  ${pcOnly`border-radius: 0;`}
`;
const PlanBody = styled.div` flex: 1; min-width: 0; `;
const PlanTop = styled.div` display: flex; align-items: baseline; justify-content: space-between; gap: 10px; `;
const PlanName = styled.div` font-size: 16px; font-weight: ${({ $on }) => ($on ? 800 : 600)}; color: ${THEME.text}; `;
const PlanPrice = styled.div` font-size: 17px; font-weight: 800; color: ${THEME.text}; `;
const PlanDesc = styled.div` margin-top: 3px; font-size: 14px; line-height: 1.5; color: ${THEME.text}; word-break: keep-all; `;
const Save = styled.span` font-weight: 700; color: ${THEME.primary}; `;
const Label = styled.div` font-size: 16px; font-weight: 700; color: ${THEME.text}; margin-bottom: 10px; `;
const CheckRow = styled.div` display: flex; align-items: flex-start; gap: 10px; cursor: pointer; padding: 4px 0 10px; `;
const CheckBox = styled.div`
  width: 22px; height: 22px; flex: none; border-radius: 6px; display: flex; align-items: center; justify-content: center;
  border: 1.5px solid ${({ $on }) => ($on ? THEME.button : "#C9CED6")}; background: ${({ $on }) => ($on ? THEME.button : "#fff")};
  color: #fff; font-size: 14px; font-weight: 800;
`;
const CheckText = styled.div` font-size: 15px; line-height: 1.5; color: ${THEME.text}; word-break: keep-all; `;
const Radio = styled.div` display: flex; align-items: center; gap: 10px; padding: 9px 0; cursor: pointer; `;
const RadioDot = styled.div`
  width: 20px; height: 20px; border-radius: 50%; flex: none;
  border: 1.5px solid ${({ $on }) => ($on ? THEME.button : "#C9CED6")};
  background: ${({ $on }) => ($on ? `radial-gradient(circle, ${THEME.button} 45%, #fff 50%)` : "#fff")};
`;
const RadioText = styled.div` font-size: 15px; color: ${THEME.text}; `;
const InputRow = styled.div` display: flex; align-items: center; gap: 8px; margin-top: 4px;  ${pcOnly`max-width: 260px; margin-left: 30px;`} `;
const Input = styled.input`
  flex: 1; height: 46px; border: 1px solid ${THEME.border}; border-radius: 10px; padding: 0 14px; font-size: 16px; font-family: inherit;
  &:focus { outline: none; border-color: ${THEME.primary}; }
`;
const Unit = styled.span` font-size: 15px; color: ${THEME.muted}; `;
const Summary = styled.div` background: #fff; border: 1px solid ${THEME.border}; border-radius: 16px; padding: 14px 16px; margin-bottom: 12px;  ${pcOnly`border-radius: 0; border: 1px solid ${PC.line}; padding: 24px 26px; margin-bottom: 14px;`} `;
const Row = styled.div`
  display: flex; justify-content: space-between; font-size: ${({ $total }) => ($total ? "17px" : "15px")}; padding: 6px 0;
  color: ${THEME.text}; ${({ $total }) => ($total ? `border-top: 1px solid ${THEME.border}; margin-top: 6px; padding-top: 12px; font-weight: 700;` : "")}
`;
const Warn = styled.div` font-size: 14px; color: ${THEME.danger}; margin-top: 6px; `;
const Notice = styled.div` font-size: 14px; line-height: 1.55; color: ${THEME.textSecondary}; padding: 0 4px 12px; word-break: keep-all;  ${pcOnly`padding: 0 2px 16px; color: ${PC.body};`} `;
const SubmitBtn = styled.button`
  width: 100%; height: 52px; border: none; border-radius: 10px; background: ${THEME.button}; color: #fff; font-size: 17px; font-weight: 700;
  font-family: inherit; cursor: pointer; &:disabled { opacity: 0.5; cursor: not-allowed; } &:active { opacity: 0.85; }
`;
const BottomSpacer = styled.div` height: 40px;  ${pcOnly`display: none;`} `;
const LeftCol = styled.div` display: contents; ${pcOnly`display: block; min-width: 0;`} `;
const RightCol = styled.div` display: contents; ${pcOnly`display: block; min-width: 0;`} `;
const Toast = styled.div`
  position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%); background: rgba(0,0,0,0.85); color: #fff;
  padding: 12px 20px; border-radius: 10px; font-size: 15px; z-index: 1000; white-space: nowrap;
`;
