/* eslint-disable */
/**
 * 고객용 결제링크 화면 /pg/:id — 로그인 없이 연다 (대표 리뷰 9/17)
 *  사업자가 보낸 결제 요청을 보여 주고, [카드로 결제하기]로 토스페이먼츠 카드 결제창을 연다 (2026-10-14 연결).
 *  결제가 끝나면 토스가 이 화면으로 paymentKey·orderId·amount 를 붙여 돌려보내고, 여기서 서버 승인(payLinkConfirm)을 한 번 요청한다.
 *  서버가 승인한 뒤 요청 문서를 paid 로 바꾼다. 분배(홈프로 정산계좌 → 사업자)는 아직 없다.
 */
import React, { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import { getPgRequest, PG_KIND } from "../../service/PgPaymentService";
import { requestPayLinkPayment, confirmPayLinkPayment } from "../../service/payService";
import { TOSS_BILLING_CLIENT_KEY, TOSS_FAIL_REASON } from "../../utility/tossConfig";

const PgLinkPage = () => {
  const { id } = useParams();
  const [r, setR] = useState(undefined);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useSearchParams();
  const once = useRef(false);

  const load = () => getPgRequest(id).then(setR).catch(() => setR(null));

  useEffect(() => {
    const paymentKey = params.get("paymentKey");
    const orderId = params.get("orderId");
    const amount = params.get("amount");
    // 토스 결제창에서 돌아온 경우 — 승인을 한 번만 요청하고 주소의 결제 값은 지운다(새로고침으로 다시 부르지 않게)
    if (paymentKey && orderId && amount) {
      if (once.current) return;
      once.current = true;
      setBusy(true);
      setNotice("결제를 확인하고 있습니다. 이 화면을 닫지 마세요.");
      confirmPayLinkPayment({ paymentKey, orderId, amount })
        .then(() => setNotice(""))
        .catch((e) => setNotice(e?.message || "결제를 마치지 못했습니다."))
        .finally(() => { setBusy(false); setParams({}, { replace: true }); load(); });
      return;
    }
    if (params.get("fail")) {
      const code = params.get("code");
      setNotice(TOSS_FAIL_REASON[code] || params.get("message") || "결제를 마치지 못했습니다. 다시 시도해 주세요.");
      setParams({}, { replace: true });
    }
    load();
    // eslint-disable-next-line
  }, [id]);

  const pay = async () => {
    if (busy) return;
    setBusy(true); setNotice("");
    try { await requestPayLinkPayment(id); }
    catch (e) {
      // 결제창을 닫은 것은 오류로 보이지 않게
      if (e?.code !== "USER_CANCEL" && e?.code !== "PAY_PROCESS_CANCELED") setNotice(e?.message || "결제창을 열지 못했습니다. 잠시 후 다시 시도해 주세요.");
    } finally { setBusy(false); }
  };

  const body = () => {
    if (r === undefined) return <Msg>불러오는 중...</Msg>;
    if (!r || r.status === "requested") return <Msg>결제 요청을 찾을 수 없습니다. 링크를 다시 확인해 주세요.</Msg>;
    if (r.status === "canceled") return <Msg>사업자가 취소한 결제 요청입니다.</Msg>;
    const done = r.status === "paid";
    return (
      <>
        <Seller>{r.sellerName || "홈프로 사업자"}</Seller>
        <Sub>결제를 요청했습니다</Sub>
        <Box>
          <Row><K>청구 내용</K><V>{r.memo || r.orderTitle || PG_KIND[r.kind]?.label}</V></Row>
          <Row><K>받는 분</K><V>{r.customerName}</V></Row>
          {r.workDate && <Row><K>작업 날짜</K><V>{r.workDate}</V></Row>}
          <Row $last><K>결제 금액</K><Amount>{Number(r.amount).toLocaleString()}원</Amount></Row>
        </Box>
        {done ? (
          <DoneText>결제가 완료되었습니다.</DoneText>
        ) : (
          <PayBtn type="button" onClick={pay} disabled={busy}>
            {busy ? "잠시만 기다려 주세요" : "카드로 결제하기"}
          </PayBtn>
        )}
        {notice && <Notice>{notice}</Notice>}
        {!done && String(TOSS_BILLING_CLIENT_KEY).startsWith("test_") && <Notice>지금은 테스트 결제입니다. 실제로 돈이 빠지지 않습니다.</Notice>}
        {/* 결제 링크는 어디서 만들었든 PG → 홈프로 정산계좌 → 사업자에게 분배 (형 확정 2026-10-13) */}
        <Foot>결제 대금은 홈프로를 거쳐 사업자에게 정산됩니다.</Foot>
      </>
    );
  };

  return (
    <Page>
      <Inner>
        <Brand>홈프로 결제</Brand>
        {body()}
      </Inner>
    </Page>
  );
};

export default PgLinkPage;

const Page = styled.div` min-height: 100vh; background: ${THEME.background}; `;
const Inner = styled.div` max-width: var(--app-max, 400px); margin: 0 auto; padding: 28px 20px 48px; box-sizing: border-box; `;
const Brand = styled.div` font-size: 16px; font-weight: 700; color: ${THEME.primary}; margin-bottom: 28px; `;
const Seller = styled.div` font-size: 23px; font-weight: 700; color: ${THEME.text}; word-break: keep-all; `;
const Sub = styled.div` font-size: 16px; color: ${THEME.textSecondary}; margin: 4px 0 20px; `;
const Box = styled.div` background: #fff; border: 1px solid #d9dde3; border-radius: 12px; padding: 4px 16px; `;
const Row = styled.div` display: flex; justify-content: space-between; gap: 12px; padding: 14px 0; border-bottom: ${({ $last }) => ($last ? "none" : "1px solid #eceef2")}; `;
const K = styled.div` font-size: 15px; color: ${THEME.textSecondary}; flex-shrink: 0; `;
const V = styled.div` font-size: 15px; font-weight: 600; color: ${THEME.text}; text-align: right; word-break: keep-all; `;
const Amount = styled.div` font-size: 20px; font-weight: 700; color: ${THEME.text}; `;
const PayBtn = styled.button`
  width: 100%; min-height: 56px; margin-top: 20px; border: none; border-radius: 10px; background: ${THEME.button}; color: #fff;
  font-size: 17px; font-weight: 700; font-family: inherit; cursor: pointer;
  &:disabled { opacity: 0.6; cursor: default; }
`;
const Notice = styled.div` margin-top: 12px; font-size: 15px; color: ${THEME.text}; line-height: 1.5; text-align: center; word-break: keep-all; `;
const DoneText = styled.div` margin-top: 20px; font-size: 17px; font-weight: 700; color: #15803d; text-align: center; `;
const Msg = styled.div` padding: 60px 0; font-size: 16px; color: ${THEME.text}; text-align: center; word-break: keep-all; `;
const Foot = styled.div` margin-top: 24px; font-size: 13px; line-height: 1.55; color: ${THEME.textSecondary}; word-break: keep-all; `;
