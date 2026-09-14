/**
 * 결제 화면 /pay?purpose=insurance_yearly|insurance_order&refId=<오더id>
 *
 *  ① 서버 tossPrepare 가 금액·상품명을 정한다 (앞단 금액 불신) → ② 토스 결제위젯 → [결제하기] → 토스 결제창
 *  → 성공 /pay/success (서버 승인) · 실패 /pay/fail
 *  월 구독형(insurance_monthly)은 결제위젯이 아니라 카드 등록(빌링키)이라 이 화면을 쓰지 않는다 (/insurance 에서 바로 연다).
 */
import React, { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { useAuth } from "../../context/AuthContext";
import { isTossTestKey, PAY_PURPOSE_LABEL } from "../../utility/tossConfig";
import { preparePayment, initTossWidgets, requestTossPayment } from "../../service/payService";
import { won } from "../../service/InsuranceService";
import {
  Wrap, Card, CardTitle, CardNote, KV, KVRow, K, V, PrimaryBtn, GhostBtn, FixedBar, Notice, PageTitle, PageSub,
} from "../insurance/insuranceStyles";

const WIDGET_MIN_H = 420; // 결제수단(약 300) + 약관(약 100) — 위젯이 늦게 떠도 화면이 흔들리지 않게
const VALID_PURPOSES = ["insurance_yearly", "insurance_order", "subscription"];

const PayPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [params] = useSearchParams();
  const { currentUser, userData, loading: authLoading } = useAuth();
  const uid = userData?.uid || currentUser?.uid;
  const purpose = params.get("purpose") || "";
  const refId = params.get("refId") || null;
  const pointsUsed = Number(params.get("pointsUsed") || 0); // 구독료 H-포인트 사용분 (SubscriptionPage 에서 정함)

  const [prep, setPrep] = useState(null);        // { tossOrderId, amount, orderName }
  const [widgets, setWidgets] = useState(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const inited = useRef(false);

  // 로그인 없으면 로그인으로 (돌아올 곳 기억)
  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) navigate("/MobileLogin", { state: { from: location.pathname + location.search }, replace: true });
  }, [authLoading, currentUser, navigate, location]);

  // 결제 준비 + 위젯은 한 번만 (StrictMode 이중 실행 방지)
  useEffect(() => {
    if (!uid || inited.current) return;
    if (!VALID_PURPOSES.includes(purpose)) { setErr("결제 목적이 올바르지 않습니다."); return; }
    if (purpose === "insurance_order" && !refId) { setErr("오더 정보가 없습니다."); return; }
    inited.current = true;
    let alive = true;
    (async () => {
      try {
        const p = await preparePayment({ purpose, refId, pointsUsed });
        if (p.pointsOnly) { navigate("/pay/success?pointsOnly=1&purpose=" + purpose, { replace: true }); return; }
        if (!alive) return;
        setPrep(p);
        const w = await initTossWidgets({ amount: p.amount, customerKey: uid });
        if (!alive) return;
        setWidgets(w); setReady(true);
      } catch (e) {
        console.error("[pay] 결제 준비 실패", e);
        if (alive) setErr(e?.message || "결제창을 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.");
      }
    })();
    return () => { alive = false; };
  }, [uid, purpose, refId, pointsUsed]); // eslint-disable-line react-hooks/exhaustive-deps

  const pay = async () => {
    if (!widgets || !prep || busy) return;
    setBusy(true); setErr("");
    try {
      await requestTossPayment({
        widgets,
        tossOrderId: prep.tossOrderId,
        orderName: prep.orderName || PAY_PURPOSE_LABEL[purpose] || "홈프로 보험",
        customerName: userData?.name || userData?.nickname || undefined,
        customerEmail: currentUser?.email || undefined,
        purpose,
        refId,
      });
      // 여기서 토스 결제창으로 넘어간다 (성공 시 /pay/success, 실패 시 /pay/fail)
    } catch (e) {
      console.error("[pay] 결제 요청 실패", e);
      if (e?.code !== "USER_CANCEL") setErr(e?.message || "결제를 시작하지 못했습니다.");
      setBusy(false);
    }
  };

  const back = purpose === "insurance_order" && refId ? `/order/detail/${refId}` : "/insurance";
  const label = PAY_PURPOSE_LABEL[purpose] || "결제";

  return (
    <SimpleBackLayout NAME="결제" hideFooter onBack={() => navigate(back)}>
      <Wrap $bottom={110}>
        <Card>
          <PageTitle>{label}</PageTitle>
          <PageSub>
            {purpose === "insurance_order"
              ? "이 오더의 체크인부터 체크아웃까지 보장되는 건당 단기보험입니다."
              : purpose === "insurance_yearly"
                ? "결제일부터 1년 동안 모든 오더에 보험이 적용됩니다."
                : "결제를 진행합니다."}
          </PageSub>
          <KV>
            <KVRow><K>상품</K><V $bold>{prep?.orderName || (err ? "-" : "확인 중...")}</V></KVRow>
            <KVRow><K>결제 금액</K><V $bold $big>{prep ? won(prep.amount) : (err ? "-" : "확인 중...")}</V></KVRow>
            {prep?.tossOrderId && <KVRow><K>주문번호</K><V style={{ fontSize: 13 }}>{prep.tossOrderId}</V></KVRow>}
          </KV>
        </Card>

        {!err && (
          <WidgetBox>
            {!ready && <WidgetLoading>결제창을 불러오는 중</WidgetLoading>}
            <div id="toss-methods" />
            <div id="toss-agreement" />
          </WidgetBox>
        )}

        {err && (
          <>
            <Notice $danger>{err}</Notice>
            <GhostBtn onClick={() => navigate(back)}>돌아가기</GhostBtn>
          </>
        )}

        <Card>
          <CardTitle>결제 안내</CardTitle>
          <CardNote>
            결제가 끝나면 보험 가입이 바로 처리되고 안심케어의 내 보험에서 확인할 수 있습니다.
            {purpose === "insurance_order" ? " 결제 기록이 있어야 이 오더의 체크인이 열립니다." : ""}
            {isTossTestKey() ? " 지금은 토스 테스트 키로 열려 있어 실제로 돈이 빠지지 않습니다." : ""}
          </CardNote>
        </Card>
      </Wrap>

      {!err && (
        <FixedBar>
          <PrimaryBtn onClick={pay} disabled={!ready || busy}>
            {busy ? "결제창을 여는 중..." : prep ? `${won(prep.amount)} 결제하기` : "준비 중..."}
          </PrimaryBtn>
        </FixedBar>
      )}
    </SimpleBackLayout>
  );
};

export default PayPage;

const WidgetBox = styled.div`
  position: relative;
  min-height: ${WIDGET_MIN_H}px;
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  padding: 8px 0;
`;

const WidgetLoading = styled.div`
  position: absolute;
  top: 40px;
  left: 0;
  right: 0;
  text-align: center;
  font-size: 15px;
  color: ${THEME.muted};
`;
