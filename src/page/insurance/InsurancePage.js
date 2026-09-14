/**
 * 홈프로 도급배상책임보험 — /insurance (하단탭 안심케어)
 *
 * 대표 8/20 기획 · 형 확정 2026-09-13 (docs/insurance-dev-spec.md 4절)
 *   내 보험 상태 → 가입 유형 3카드 → 보장 내용 → [가입하기]
 *   → 본인 확인 단계(이름·휴대폰, 인증사 연동 자리) → yearly 는 /pay 결제위젯, monthly 는 토스 카드 등록(빌링키)
 *   perOrder(건당)는 오더 진행 화면에서만 결제된다 — 여기서는 안내만.
 *
 * 보험료는 settings/insurance 값(없으면 임시값). 보장 한도·자기부담금은 보험사 확정 전엔 안내 문구만.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoShieldCheckmarkOutline, IoCheckmarkCircle, IoChevronForward } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { useAuth } from "../../context/AuthContext";
import { formatPhone } from "../../utility/common";
import { isTossTestKey } from "../../utility/tossConfig";
import { requestBillingAuth } from "../../service/payService";
import {
  getInsuranceSettings, getMyPolicies, pickActivePolicy, computePerOrderPremium, perOrderRateRangeText,
  formatDate, won, PLAN_DESC, PLAN_KEYS, PER_ORDER_GROUP_KEYS,
} from "../../service/InsuranceService";
import {
  Wrap, Card, CardTitle, CardText, CardNote, KV, KVRow, K, V, PrimaryBtn, GhostBtn, BtnRow, FixedBar, Toast, Notice,
  SelectCard, SelectTitleRow, SelectTitle, SelectPrice, SelectDesc, SelectMeta, CheckRow, StatusText, LinkLine,
} from "./insuranceStyles";

const InsurancePage = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const uid = userData?.uid || currentUser?.uid;
  const userName = userData?.name || userData?.nickname || "";
  const userPhone = userData?.phone || userData?.phoneE164 || "";

  const [settings, setSettings] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState("home");     // home · identity
  const [plan, setPlan] = useState("");          // yearly · monthly
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(""), 2400); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [s, p] = await Promise.all([
        getInsuranceSettings(),
        uid ? getMyPolicies(uid).catch((e) => { console.warn("가입 조회 실패:", e.message); return []; }) : Promise.resolve([]),
      ]);
      if (!alive) return;
      setSettings(s); setPolicies(p); setLoading(false);
    })();
    return () => { alive = false; };
  }, [uid]);

  const active = useMemo(() => pickActivePolicy(policies), [policies]);
  const plans = settings?.plans;
  const coverage = settings?.coverage;
  const perOrderExample = useMemo(() => computePerOrderPremium(300000, settings), [settings]);   // 예시: g1 요율
  const rateRange = useMemo(() => perOrderRateRangeText(settings), [settings]);
  const perOrderMin = settings?.perOrder?.minPrice ?? plans?.perOrder?.minPrice ?? 3000;

  const priceText = (key) => {
    const p = plans?.[key];
    if (!p) return "";
    if (key === "yearly") return `${won(p.price)} / 1년`;
    if (key === "monthly") return `${won(p.price)} / 월`;
    return `시공단가의 ${rateRange}`;
  };

  const startJoin = () => {
    if (!plan) { showToast("가입 유형을 선택해 주세요"); return; }
    if (!uid) { showToast("로그인 후 가입할 수 있습니다"); return; }
    setAgree(false);
    setStep("identity");
    window.scrollTo(0, 0);
  };

  const proceed = async () => {
    if (!agree || busy) return;
    if (plan === "yearly") {
      navigate("/pay?purpose=insurance_yearly");
      return;
    }
    if (plan === "monthly") {
      setBusy(true);
      try {
        await requestBillingAuth({ customerKey: uid, customerName: userName, customerEmail: currentUser?.email || undefined });
        // 토스 카드 등록창으로 넘어간다 (성공 시 /pay/billing-success, 실패 시 /pay/fail)
      } catch (e) {
        if (e?.code !== "USER_CANCEL") showToast(e?.message || "카드 등록창을 열지 못했습니다");
        setBusy(false);
      }
    }
  };

  const activeTypeLabel = active ? (plans?.[active.type]?.label || active.type) : "";
  const autoPayText = active?.type === "monthly"
    ? (active.status === "canceled" ? "해지됨 (만료일까지 보장)" : active.billing?.billingKey ? `자동결제 켜짐${active.billing?.cardCompany ? ` · ${active.billing.cardCompany}` : ""}` : "자동결제 정보 없음")
    : "해당 없음";

  /* ───────── 본인 확인 단계 ───────── */
  if (step === "identity") {
    const p = plans?.[plan];
    return (
      <MainListLayout NAME="안심케어" footerType="insurance" hideBack>
        <Wrap $bottom={130}>
          <Card>
            <CardTitle>본인 확인</CardTitle>
            <CardText>보험 가입에는 가입자 본인 확인이 필요합니다. 아래 정보가 본인 것인지 확인해 주세요.</CardText>
            <KV>
              <KVRow><K>가입 유형</K><V $bold>{p?.label || plan}</V></KVRow>
              <KVRow><K>보험료</K><V $bold>{priceText(plan)}</V></KVRow>
              <KVRow><K>이름</K><V>{userName || "-"}</V></KVRow>
              <KVRow><K>휴대폰</K><V>{userPhone ? formatPhone(userPhone) : "-"}</V></KVRow>
            </KV>
            <CardNote>이름이나 번호가 다르면 마이페이지에서 먼저 고쳐 주세요.</CardNote>
          </Card>

          <Notice>휴대폰 본인인증은 인증사 연동 후 열립니다. 그전까지는 위 이름·휴대폰 확인으로 대신합니다.</Notice>

          <Card>
            <CheckRow>
              <input type="checkbox" checked={agree} onChange={(e) => setAgree(e.target.checked)} />
              <span>위 정보가 본인 것이 맞으며, 보험 가입과 사고 처리를 위해 이름·연락처·오더 정보를 보험대리점에 제공하는 것에 동의합니다.</span>
            </CheckRow>
          </Card>

          {plan === "monthly" && (
            <CardNote style={{ marginTop: 0, padding: "0 6px" }}>
              다음 단계에서 토스페이먼츠 카드 등록창이 열립니다. 등록이 끝나면 첫 달 보험료가 바로 결제되고, 이후 매월 같은 날 자동으로 결제됩니다.
              {isTossTestKey() ? " 지금은 토스 테스트 키로 열려 있어 실제로 돈이 빠지지 않습니다." : ""}
            </CardNote>
          )}
        </Wrap>
        <FixedBar $tab>
          <BtnRow>
            <GhostBtn onClick={() => setStep("home")} disabled={busy}>이전</GhostBtn>
            <PrimaryBtn onClick={proceed} disabled={!agree || busy} style={{ flex: 2 }}>
              {busy ? "카드 등록창 여는 중..." : plan === "monthly" ? "카드 등록하고 가입" : "결제로 진행"}
            </PrimaryBtn>
          </BtnRow>
        </FixedBar>
        {toast && <Toast>{toast}</Toast>}
      </MainListLayout>
    );
  }

  /* ───────── 홈 ───────── */
  return (
    <MainListLayout NAME="안심케어" footerType="insurance" hideBack>
      <Wrap $bottom={120}>
        <Hero>
          <HeroRow>
            <IoShieldCheckmarkOutline size={20} color={THEME.primary} />
            홈프로 도급배상책임보험
          </HeroRow>
          <HeroSub>작업 중 고객 재물 파손이나 대인 피해가 생겼을 때 사장님 대신 배상하는 보험입니다. 회원이면 누구나 가입할 수 있습니다.</HeroSub>
        </Hero>

        <Card>
          <TitleRow>
            <CardTitle>내 보험</CardTitle>
            <LinkLine onClick={() => navigate("/insurance/my")} style={{ display: "flex", alignItems: "center", gap: 2 }}>
              관리 <IoChevronForward size={15} />
            </LinkLine>
          </TitleRow>
          {loading ? (
            <CardText>확인 중...</CardText>
          ) : active ? (
            <KV>
              <KVRow><K>상태</K><V><StatusText $tone="on">보장 중</StatusText></V></KVRow>
              <KVRow><K>가입 유형</K><V $bold>{activeTypeLabel}</V></KVRow>
              <KVRow><K>만료일</K><V>{formatDate(active.endAt)}</V></KVRow>
              <KVRow><K>자동결제</K><V>{autoPayText}</V></KVRow>
            </KV>
          ) : (
            <>
              <KV>
                <KVRow><K>상태</K><V><StatusText $tone="none">미가입</StatusText></V></KVRow>
              </KV>
              <CardNote>가입하지 않은 상태에서 오더를 진행하면 오더별로 건당 단기보험을 결제할 수 있습니다.</CardNote>
            </>
          )}
        </Card>

        <SectionTitle>가입 유형</SectionTitle>
        {PLAN_KEYS.map((key) => {
          const p = plans?.[key];
          const d = PLAN_DESC[key];
          const isPer = key === "perOrder";
          const on = plan === key;
          const inactive = p && p.active === false;
          return (
            <SelectCard
              key={key}
              type="button"
              $on={on}
              disabled={isPer || inactive || loading}
              onClick={() => setPlan(on ? "" : key)}
            >
              <SelectTitleRow>
                <SelectTitle>{p?.label || d.desc}</SelectTitle>
                <SelectPrice $on={on}>{loading ? "" : priceText(key)}</SelectPrice>
              </SelectTitleRow>
              <SelectDesc>{d.desc}</SelectDesc>
              <SelectMeta>보장 기간: {d.period} · 결제: {d.pay}</SelectMeta>
              {isPer && (
                <SelectMeta>
                  최소 {won(perOrderMin)}{perOrderExample ? ` (예: 1그룹 시공단가 300,000원이면 ${won(perOrderExample)})` : ""}. 오더 진행 화면에서 결제합니다 — 여기서는 선택할 수 없습니다.
                </SelectMeta>
              )}
              {inactive && <SelectMeta>지금은 가입을 받지 않습니다.</SelectMeta>}
              {on && (
                <SelectedLine><IoCheckmarkCircle size={17} color={THEME.primary} /> 선택됨</SelectedLine>
              )}
            </SelectCard>
          );
        })}

        <Card>
          <CardTitle>보장 내용</CardTitle>
          {coverage?.items?.length ? (
            <ItemList>
              {coverage.items.map((t, i) => <Item key={i}>{t}</Item>)}
            </ItemList>
          ) : null}
          <KV>
            {coverage?.maxText ? (
              <KVRow><K>보장 한도</K><V>{coverage.maxText}</V></KVRow>
            ) : PER_ORDER_GROUP_KEYS.some((g) => coverage?.maxByGroup?.[g]) ? (
              PER_ORDER_GROUP_KEYS.map((g) => (
                <KVRow key={g}>
                  <K>{settings?.perOrder?.groups?.[g]?.label || g} 한도</K>
                  <V>{coverage?.maxByGroup?.[g] || "보험사 확정 후 안내"}</V>
                </KVRow>
              ))
            ) : (
              <KVRow><K>보장 한도</K><V>보험사 확정 후 안내 (작업 위험도 그룹별로 다를 수 있습니다)</V></KVRow>
            )}
            <KVRow><K>자기부담금</K><V>{coverage?.deductibleText || "30만원 (공통)"}</V></KVRow>
          </KV>
        </Card>

        <Card>
          <CardTitle>보장이 적용되려면</CardTitle>
          <ItemList>
            <Item>오더의 체크인·체크아웃 기록이 서버에 있어야 그 작업이 보장됩니다. 매칭 오더와 직접 수주한 오더 모두 같습니다.</Item>
            <Item>월 구독형·1년형 가입자는 오더마다 추가 결제 없이 "보험 적용" 안내만 받습니다.</Item>
            <Item>가입하지 않은 회원은 오더 진행 시 건당 보험료를 결제해야 체크인을 할 수 있습니다.</Item>
            <Item>사고가 나면 안심케어의 내 보험 관리에서 사고 접수를 합니다. 현장기록의 사진·시각·위치가 증빙이 됩니다.</Item>
          </ItemList>
        </Card>

        <Disclaimer>
          보험료는 보험사 확정 전 임시 금액이며 계약 확정 시 바뀔 수 있습니다. 보장 내용·인수 조건은 보험사 심사 결과에 따라 달라질 수 있습니다.
        </Disclaimer>
      </Wrap>

      <FixedBar $tab>
        <PrimaryBtn onClick={startJoin} disabled={loading || !plan}>
          {plan ? `${plans?.[plan]?.label || ""} 가입하기` : "가입 유형을 선택해 주세요"}
        </PrimaryBtn>
      </FixedBar>
      {toast && <Toast>{toast}</Toast>}
    </MainListLayout>
  );
};

export default InsurancePage;

/* ===================== styles (이 화면 전용) ===================== */

const Hero = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 22px 20px;
  box-shadow: ${THEME.cardShadow};
`;

const HeroRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 21px;
  font-weight: 700;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const HeroSub = styled.div`
  margin-top: 8px;
  font-size: 16px;
  color: ${THEME.textSecondary};
  line-height: 1.6;
  word-break: keep-all;
`;

const TitleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const SectionTitle = styled.div`
  margin: 6px 6px 0;
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
`;

const SelectedLine = styled.div`
  margin-top: 10px;
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.primaryDark};
`;

const ItemList = styled.ul`
  margin: 12px 0 0;
  padding: 0;
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const Item = styled.li`
  position: relative;
  padding-left: 14px;
  font-size: 15px;
  line-height: 1.6;
  color: ${THEME.textSecondary};
  word-break: keep-all;
  &::before { content: "·"; position: absolute; left: 2px; top: 0; font-weight: 700; color: ${THEME.text}; }
`;

const Disclaimer = styled.div`
  padding: 4px 6px;
  font-size: 13px;
  line-height: 1.6;
  color: ${THEME.muted};
  word-break: keep-all;
`;
