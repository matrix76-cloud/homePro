/**
 * 결제 성공 복귀 /pay/success — 토스가 paymentKey·orderId(토스 주문번호)·amount 를 붙여 돌려보낸다.
 * 여기서 서버 승인(tossConfirm)을 한 번만 요청한다(그때 돈이 빠진다). 새로고침해도 두 번 승인되지 않는다(useRef 가드 + 서버 멱등).
 * 가입 처리(policy 생성·users.insurance·orders.insurance 갱신)는 서버가 한다.
 */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { TOSS_METHOD_LABEL, PAY_PURPOSE_LABEL } from "../../utility/tossConfig";
import { confirmPayment, readPaySession } from "../../service/payService";
import { won, formatDateTime } from "../../service/InsuranceService";
import {
  Wrap, Card, CardTitle, CardNote, KV, KVRow, K, V, PrimaryBtn, GhostBtn, FixedBar, Notice, Centered, PageTitle, PageSub, BtnRow,
} from "../insurance/insuranceStyles";

const PaySuccessPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const once = useRef(false);
  const [state, setState] = useState("confirming");   // confirming · done · failed
  const [info, setInfo] = useState(null);
  const [message, setMessage] = useState("");
  const [session] = useState(() => readPaySession());   // 승인 뒤 세션이 지워지므로 처음 값을 잡아둔다

  const tossOrderId = params.get("orderId");

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    if (params.get("pointsOnly") === "1") { setState("done"); setMessage("H-포인트로 결제가 완료되었습니다."); return; }
    const paymentKey = params.get("paymentKey");
    const amount = params.get("amount");
    if (!paymentKey || !tossOrderId || !amount) { setState("failed"); setMessage("결제 정보를 받지 못했습니다."); return; }
    (async () => {
      try {
        const r = await confirmPayment({ paymentKey, orderId: tossOrderId, amount: Number(amount) });
        setInfo(r); setState("done");
      } catch (e) {
        console.error("[pay] 승인 실패", e);
        setMessage(e?.message || "결제를 마치지 못했습니다."); setState("failed");
      }
    })();
  }, [params, tossOrderId]);

  const purpose = info?.purpose || session?.purpose || "";
  const refId = info?.meta?.orderId || session?.refId || null;   // 서버 meta.orderId 로 오더 이동
  const isOrder = purpose === "insurance_order";
  const label = PAY_PURPOSE_LABEL[purpose] || "결제";

  const goInsurance = () => navigate("/insurance", { replace: true });
  const goOrder = () => navigate(refId ? `/order/detail/${refId}` : "/order/my-orders", { replace: true });
  const retry = () => navigate(isOrder && refId ? `/pay?purpose=insurance_order&refId=${refId}` : purpose ? `/pay?purpose=${purpose}` : "/insurance", { replace: true });

  return (
    <SimpleBackLayout NAME="결제 결과" hideFooter onBack={isOrder ? goOrder : goInsurance}>
      <Wrap $bottom={140}>
        {state === "confirming" && (
          <Centered>
            <PageTitle>결제를 확인하고 있습니다</PageTitle>
            <PageSub>잠시만 기다려 주세요. 이 화면을 닫지 마세요.</PageSub>
          </Centered>
        )}

        {state === "failed" && (
          <Centered>
            <PageTitle style={{ color: THEME.danger }}>결제를 마치지 못했습니다</PageTitle>
            <PageSub>{message || "다시 시도해 주세요."}</PageSub>
            <CardNote>승인 전 단계에서 멈춘 것이라면 카드에서 돈이 빠지지 않았습니다. 빠졌다면 고객센터에 주문번호를 알려 주세요.</CardNote>
            {tossOrderId && <CardNote style={{ wordBreak: "break-all" }}>주문번호 {tossOrderId}</CardNote>}
          </Centered>
        )}

        {state === "done" && (
          <>
            <Card>
              <PageTitle>결제가 끝났습니다</PageTitle>
              <PageSub>
                {isOrder
                  ? "이 오더에 건당 단기보험이 적용됐습니다. 체크인부터 체크아웃까지 보장됩니다."
                  : `${label} 가입이 처리됐습니다. 안심케어의 내 보험에서 확인할 수 있습니다.`}
                {info?.already ? " (이미 승인된 결제입니다)" : ""}
              </PageSub>
              <KV>
                <KVRow><K>상품</K><V $bold>{info?.orderName || label}</V></KVRow>
                <KVRow><K>결제 금액</K><V $bold $big>{won(info?.amount ?? params.get("amount"))}</V></KVRow>
                {info?.method && <KVRow><K>결제 수단</K><V>{TOSS_METHOD_LABEL[info.method] || info.method}</V></KVRow>}
                {info?.approvedAt && <KVRow><K>승인 시각</K><V>{formatDateTime(info.approvedAt)}</V></KVRow>}
                <KVRow><K>주문번호</K><V style={{ fontSize: 13 }}>{info?.tossOrderId || tossOrderId}</V></KVRow>
              </KV>
            </Card>
            {info && info.ok === false && (
              <Notice $danger>결제는 승인됐지만 가입 처리에 실패했습니다. 고객센터에 주문번호를 알려 주세요.</Notice>
            )}
            <Card>
              <CardTitle>다음 단계</CardTitle>
              <CardNote>
                {isOrder
                  ? "오더 화면에서 체크인을 진행하세요. 체크인·체크아웃 기록이 서버에 있어야 보장이 적용됩니다."
                  : "오더를 진행할 때 추가 결제 없이 보험이 적용됩니다. 사고가 나면 안심케어의 내 보험 관리에서 접수하세요."}
              </CardNote>
            </Card>
          </>
        )}
      </Wrap>

      <FixedBar>
        {state === "done" && (
          <BtnRow>
            {info?.receiptUrl && <GhostBtn onClick={() => window.open(info.receiptUrl, "_blank", "noopener")}>영수증</GhostBtn>}
            {isOrder
              ? <PrimaryBtn onClick={goOrder} style={{ flex: 2 }}>오더로 가기</PrimaryBtn>
              : <PrimaryBtn onClick={goInsurance} style={{ flex: 2 }}>보험으로 가기</PrimaryBtn>}
          </BtnRow>
        )}
        {state === "failed" && (
          <BtnRow>
            <GhostBtn onClick={isOrder ? goOrder : goInsurance}>{isOrder ? "오더로" : "보험으로"}</GhostBtn>
            <PrimaryBtn onClick={retry} style={{ flex: 2 }}>다시 시도</PrimaryBtn>
          </BtnRow>
        )}
        {state === "confirming" && <PrimaryBtn disabled>확인 중...</PrimaryBtn>}
      </FixedBar>
    </SimpleBackLayout>
  );
};

export default PaySuccessPage;
