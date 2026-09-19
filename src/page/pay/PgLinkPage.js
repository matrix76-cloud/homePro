/* eslint-disable */
/**
 * 고객용 결제링크 화면 /pg/:id — 로그인 없이 연다 (대표 리뷰 9/17)
 *  사업자가 보낸 결제 요청을 보여 주고, 제휴 PG 결제창으로 넘긴다.
 *  제휴 PG 계약 전이라 결제 버튼은 준비 중 안내만 한다. 연결되면 여기서 PG 결제창을 띄우고
 *  status 를 paying 으로 바꾼 뒤, 승인(paid)은 PG Webhook 서버 함수가 확정한다.
 */
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import { getPgRequest, PG_KIND } from "../../service/PgPaymentService";

const PgLinkPage = () => {
  const { id } = useParams();
  const [r, setR] = useState(undefined);
  const [notice, setNotice] = useState("");

  useEffect(() => { getPgRequest(id).then(setR).catch(() => setR(null)); }, [id]);

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
          <Row $last><K>결제 금액</K><Amount>{Number(r.amount).toLocaleString()}원</Amount></Row>
        </Box>
        {done ? (
          <DoneText>결제가 완료되었습니다.</DoneText>
        ) : (
          <PayBtn type="button" onClick={() => setNotice("카드결제는 제휴 PG사 연결 후 이 화면에서 바로 이용할 수 있습니다.")}>
            카드로 결제하기
          </PayBtn>
        )}
        {notice && <Notice>{notice}</Notice>}
        <Foot>결제 대금은 PG사를 통해 사업자 계좌로 직접 정산됩니다. 홈프로는 결제 편의를 제공하며 거래 당사자가 아닙니다.</Foot>
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
`;
const Notice = styled.div` margin-top: 12px; font-size: 15px; color: ${THEME.text}; line-height: 1.5; text-align: center; word-break: keep-all; `;
const DoneText = styled.div` margin-top: 20px; font-size: 17px; font-weight: 700; color: #15803d; text-align: center; `;
const Msg = styled.div` padding: 60px 0; font-size: 16px; color: ${THEME.text}; text-align: center; word-break: keep-all; `;
const Foot = styled.div` margin-top: 24px; font-size: 13px; line-height: 1.55; color: ${THEME.textSecondary}; word-break: keep-all; `;
