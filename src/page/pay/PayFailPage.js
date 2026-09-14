/**
 * 결제 실패 복귀 /pay/fail — 토스가 code·message·orderId(토스 주문번호) 를 붙여 돌려보낸다. 승인 전이라 돈은 빠지지 않았다.
 * 카드 등록(빌링) 실패도 같은 주소로 온다 — 세션의 purpose 가 insurance_monthly 면 "카드 등록" 문구로.
 */
import React, { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { TOSS_FAIL_REASON } from "../../utility/tossConfig";
import { readPaySession, clearPaySession } from "../../service/payService";
import { Wrap, CardNote, PrimaryBtn, GhostBtn, FixedBar, Centered, PageTitle, PageSub, BtnRow } from "../insurance/insuranceStyles";

const PayFailPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [session] = useState(() => readPaySession());
  const code = params.get("code") || "";
  const message = TOSS_FAIL_REASON[code] || params.get("message") || "결제를 마치지 못했습니다.";
  const canceled = code === "PAY_PROCESS_CANCELED" || code === "USER_CANCEL";

  const purpose = session?.purpose || "";
  const refId = session?.refId || null;
  const isOrder = purpose === "insurance_order";
  const isBilling = purpose === "insurance_monthly";
  const what = isBilling ? "카드 등록" : "결제";

  const goBack = () => { clearPaySession(); navigate(isOrder && refId ? `/order/detail/${refId}` : "/insurance", { replace: true }); };
  const retry = () => {
    clearPaySession();
    if (isBilling) navigate("/insurance", { replace: true });
    else if (isOrder && refId) navigate(`/pay?purpose=insurance_order&refId=${refId}`, { replace: true });
    else if (purpose) navigate(`/pay?purpose=${purpose}`, { replace: true });
    else navigate("/insurance", { replace: true });
  };

  return (
    <SimpleBackLayout NAME={`${what} 결과`} hideFooter onBack={goBack}>
      <Wrap $bottom={110}>
        <Centered>
          <PageTitle style={{ color: THEME.danger }}>{canceled ? `${what}를 취소했습니다` : `${what}를 마치지 못했습니다`}</PageTitle>
          <PageSub>{message}</PageSub>
          <CardNote>
            승인 전 단계라 카드에서 돈이 빠지지 않았습니다.{code ? ` (코드 ${code})` : ""}
          </CardNote>
        </Centered>
      </Wrap>
      <FixedBar>
        <BtnRow>
          <GhostBtn onClick={goBack}>{isOrder ? "오더로" : "보험으로"}</GhostBtn>
          <PrimaryBtn onClick={retry} style={{ flex: 2 }}>다시 시도</PrimaryBtn>
        </BtnRow>
      </FixedBar>
    </SimpleBackLayout>
  );
};

export default PayFailPage;
