/**
 * 카드 등록 성공 복귀 /pay/billing-success — 토스가 authKey·customerKey 를 붙여 돌려보낸다.
 * 여기서 서버 tossBillingIssue 를 한 번만 호출한다 → 빌링키 발급 + 첫 달 즉시 승인까지 서버가 끝낸다.
 *
 * purpose 로 두 가지를 받는다 (대표 지시 9/16: 앱 월 구독도 자동결제):
 *   insurance_monthly → 월 구독형 보험 policy 생성
 *   subscription      → 앱 월 구독(0차수) users.subscription
 * purpose 는 successUrl 쿼리로 오고, 없으면 결제 세션에서 읽는다(WebView 리로드로 세션이 비는 경우 대비).
 *
 * 서버 반환: { ok, resumed, policyId?, paymentId, amount, endAt(ISO), nextChargeAt(ISO), cardCompany, cardNumberMasked }
 */
import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { issueBilling, readPaySession } from "../../service/payService";
import { won, formatDate } from "../../service/InsuranceService";
import {
  Wrap, Card, CardTitle, CardNote, KV, KVRow, K, V, PrimaryBtn, GhostBtn, FixedBar, Centered, PageTitle, PageSub, BtnRow,
} from "../insurance/insuranceStyles";

const BillingSuccessPage = () => {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const once = useRef(false);
  const [state, setState] = useState("issuing");   // issuing · done · failed
  const [info, setInfo] = useState(null);
  const [message, setMessage] = useState("");

  const purpose = params.get("purpose") || readPaySession()?.purpose || "insurance_monthly";
  const isSub = purpose === "subscription";

  useEffect(() => {
    if (once.current) return;
    once.current = true;
    const authKey = params.get("authKey");
    const customerKey = params.get("customerKey");
    if (!authKey || !customerKey) { setState("failed"); setMessage("카드 등록 정보를 받지 못했습니다."); return; }
    (async () => {
      try {
        const r = await issueBilling({ authKey, customerKey, purpose });
        setInfo(r); setState("done");
      } catch (e) {
        console.error("[pay] 빌링키 발급 실패", e);
        setMessage(e?.message || "자동결제 등록을 마치지 못했습니다."); setState("failed");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const goBack = () => navigate(isSub ? "/subscription" : "/insurance", { replace: true });
  const goMy = () => navigate(isSub ? "/mypage" : "/insurance/my", { replace: true });
  const card = info?.cardCompany || info?.cardNumberMasked
    ? `${info?.cardCompany || ""}${info?.cardCompany && info?.cardNumberMasked ? " " : ""}${info?.cardNumberMasked || ""}`
    : "";

  return (
    <SimpleBackLayout NAME="자동결제 등록" hideFooter onBack={goBack}>
      <Wrap $bottom={140}>
        {state === "issuing" && (
          <Centered>
            <PageTitle>카드를 등록하고 있습니다</PageTitle>
            <PageSub>{isSub ? "첫 달 구독료를 결제하고 있습니다. 이 화면을 닫지 마세요." : "첫 달 보험료를 결제하고 가입을 처리하는 중입니다. 이 화면을 닫지 마세요."}</PageSub>
          </Centered>
        )}

        {state === "failed" && (
          <Centered>
            <PageTitle style={{ color: THEME.danger }}>자동결제 등록을 마치지 못했습니다</PageTitle>
            <PageSub>{message || "다시 시도해 주세요."}</PageSub>
            <CardNote>등록이 끝나지 않았다면 카드에서 돈이 빠지지 않았습니다. 빠졌다면 고객센터에 알려 주세요.</CardNote>
          </Centered>
        )}

        {state === "done" && (
          <>
            <Card>
              <PageTitle>{isSub ? "월 구독이 시작됐습니다" : "월 구독형 보험에 가입됐습니다"}</PageTitle>
              <PageSub>
                {isSub
                  ? (info?.resumed
                      ? "이미 결제해 둔 구독 기간이 남아 있어 지금은 청구하지 않았습니다. 만료일에 맞춰 첫 자동결제가 이뤄집니다."
                      : "첫 달 구독료가 결제됐고 매월 같은 날 자동으로 결제됩니다. 해지는 마이페이지 > 구독 관리에서 언제든 할 수 있으며, 해지해도 만료일까지는 0차수가 유지됩니다.")
                  : "첫 달 보험료가 결제됐고 매월 같은 날 자동으로 결제됩니다. 해지는 안심케어의 내 보험 관리에서 언제든 할 수 있으며, 해지해도 만료일까지 보장됩니다."}
                {!isSub && info?.resumed ? " (이미 등록된 카드라 기존 가입을 이어갑니다)" : ""}
              </PageSub>
              <KV>
                {info?.amount != null && <KVRow><K>결제 금액</K><V $bold $big>{won(info.amount)}</V></KVRow>}
                {card && <KVRow><K>결제 카드</K><V>{card}</V></KVRow>}
                {info?.endAt && <KVRow><K>{isSub ? "구독 만료일" : "보장 만료일"}</K><V>{formatDate(info.endAt)}</V></KVRow>}
                {info?.nextChargeAt && <KVRow><K>다음 결제일</K><V>{formatDate(info.nextChargeAt)}</V></KVRow>}
              </KV>
            </Card>
            <Card>
              <CardTitle>다음 단계</CardTitle>
              <CardNote>
                {isSub
                  ? "이제 오더가 접수되는 즉시(0초) 수락할 수 있습니다. 결제 내역과 해지는 마이페이지 > 구독 관리에서 볼 수 있습니다."
                  : "오더를 진행할 때 추가 결제 없이 보험이 적용됩니다. 사고가 나면 안심케어의 내 보험 관리에서 접수하세요."}
              </CardNote>
            </Card>
          </>
        )}
      </Wrap>

      <FixedBar>
        {state === "done" && (
          <BtnRow>
            <GhostBtn onClick={goMy}>{isSub ? "마이페이지" : "내 보험 관리"}</GhostBtn>
            <PrimaryBtn onClick={goBack} style={{ flex: 2 }}>{isSub ? "구독 관리로 가기" : "보험으로 가기"}</PrimaryBtn>
          </BtnRow>
        )}
        {state === "failed" && (
          <PrimaryBtn onClick={goBack}>{isSub ? "구독 관리로 돌아가기" : "보험으로 돌아가기"}</PrimaryBtn>
        )}
        {state === "issuing" && <PrimaryBtn disabled>처리 중...</PrimaryBtn>}
      </FixedBar>
    </SimpleBackLayout>
  );
};

export default BillingSuccessPage;
