/* eslint-disable */
/**
 * 내 결제 내역 — PG(토스)로 낸 돈 전부 (월 구독·보험 1년/월/건당). 형 지시 9/14 "결제 이력 로그".
 *  payments 컬렉션(uid == 나)만 읽는다. 전액 H-포인트 결제(method points)도 같이 보인다.
 */
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from "../../api/config";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { PAY_PURPOSE_LABEL, TOSS_METHOD_LABEL } from "../../utility/tossConfig";
import usePcWide from "../../hooks/usePcWide";
import { pcOnly, PC, PcTable, PcTHead, PcTRow, PcEmpty } from "../../pc/pcKit";

const STATUS_LABEL = { done: "결제 완료", ready: "결제 대기", fail: "결제 실패", refund: "환불" };
const STATUS_COLOR = { done: "#15803d", ready: THEME.muted, fail: THEME.danger, refund: "#b45309" };

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const fmt = (d) => (d ? `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "");

const PaymentHistoryPage = () => {
  const { userData, currentUser } = useAuth();
  const uid = userData?.uid || currentUser?.uid;
  const [rows, setRows] = useState(null);
  const pcWide = usePcWide();

  useEffect(() => {
    if (!uid) return;
    let alive = true;
    getDocs(query(collection(db, "payments"), where("uid", "==", uid)))
      .then((snap) => {
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (toDate(b.approvedAt || b.createdAt)?.getTime() || 0) - (toDate(a.approvedAt || a.createdAt)?.getTime() || 0));
        if (alive) setRows(list);
      })
      .catch(() => { if (alive) setRows([]); });
    return () => { alive = false; };
  }, [uid]);

  return (
    <SimpleBackLayout NAME="결제 내역" hideFooter>
      <Wrap>
        <Intro>토스로 결제한 월 구독료와 보험료입니다. H-포인트로 전액 낸 건도 함께 보입니다.</Intro>
        {pcWide ? (
          <PcTable>
            <PcTHead $cols={PAY_COLS}><span>일시</span><span>내용</span><span>금액</span><span>결제 수단</span><span>상태</span><span>주문번호</span><span>영수증</span></PcTHead>
            {rows === null && <PcEmpty><b>불러오는 중...</b></PcEmpty>}
            {rows !== null && rows.length === 0 && <PcEmpty><b>아직 결제 내역이 없어요.</b><span>구독료·보험료를 결제하면 이곳에 쌓입니다.</span></PcEmpty>}
            {(rows || []).map((p) => {
              const when = toDate(p.approvedAt || p.createdAt);
              const method = p.method === "points" ? "H-포인트" : (TOSS_METHOD_LABEL[p.tossMethod] || TOSS_METHOD_LABEL[p.method] || p.tossMethod || p.method || "카드");
              const pointsUsed = Number(p.meta?.pointsUsed || 0);
              return (
                <PcTRow key={p.id} $cols={PAY_COLS} $click={false}>
                  <span>{fmt(when)}</span>
                  <b>{PAY_PURPOSE_LABEL[p.purpose] || p.orderName || p.purpose}</b>
                  <span><b>{Number(p.amount || 0).toLocaleString()}원</b>{pointsUsed > 0 ? <><br />H-포인트 {pointsUsed.toLocaleString()}P 사용</> : null}</span>
                  <span>{method}</span>
                  <span style={{ color: STATUS_COLOR[p.status] === THEME.muted ? PC.ink : (STATUS_COLOR[p.status] || PC.ink), fontWeight: 700 }}>
                    {STATUS_LABEL[p.status] || p.status}
                    {p.status === "fail" && p.failMessage ? <><br /><span style={{ fontWeight: 500 }}>{p.failMessage}</span></> : null}
                  </span>
                  <Mono style={{ wordBreak: "break-all", fontWeight: 500 }}>{p.tossOrderId || p.id}</Mono>
                  <span>{p.receiptUrl ? <Receipt href={p.receiptUrl} target="_blank" rel="noreferrer" style={{ marginTop: 0 }}>영수증 보기</Receipt> : "-"}</span>
                </PcTRow>
              );
            })}
          </PcTable>
        ) : rows === null ? (
          <Empty>불러오는 중...</Empty>
        ) : rows.length === 0 ? (
          <Empty>아직 결제 내역이 없어요.</Empty>
        ) : rows.map((p) => {
          const when = toDate(p.approvedAt || p.createdAt);
          const method = p.method === "points" ? "H-포인트" : (TOSS_METHOD_LABEL[p.tossMethod] || TOSS_METHOD_LABEL[p.method] || p.tossMethod || p.method || "카드");
          const pointsUsed = Number(p.meta?.pointsUsed || 0);
          return (
            <Card key={p.id}>
              <Top>
                <Title>{PAY_PURPOSE_LABEL[p.purpose] || p.orderName || p.purpose}</Title>
                <StatusText $c={STATUS_COLOR[p.status] || THEME.text}>{STATUS_LABEL[p.status] || p.status}</StatusText>
              </Top>
              <Row><span>금액</span><b>{Number(p.amount || 0).toLocaleString()}원{pointsUsed > 0 ? ` (H-포인트 ${pointsUsed.toLocaleString()}P 사용)` : ""}</b></Row>
              <Row><span>결제 수단</span><b>{method}</b></Row>
              <Row><span>일시</span><b>{fmt(when)}</b></Row>
              <Row><span>주문번호</span><Mono>{p.tossOrderId || p.id}</Mono></Row>
              {p.status === "fail" && p.failMessage && <Row><span>사유</span><b style={{ color: THEME.danger }}>{p.failMessage}</b></Row>}
              {p.receiptUrl && <Receipt href={p.receiptUrl} target="_blank" rel="noreferrer">영수증 보기</Receipt>}
            </Card>
          );
        })}
      </Wrap>
    </SimpleBackLayout>
  );
};

export default PaymentHistoryPage;

const PAY_COLS = "150px minmax(160px, 1.2fr) minmax(130px, 1fr) 110px 110px minmax(160px, 1.1fr) 100px";
const Wrap = styled.div` padding: 12px 12px 40px; background: ${THEME.background}; min-height: 100%;  ${pcOnly`max-width: 1180px; margin: 0 auto; box-sizing: border-box; padding: 28px 32px 60px; word-break: keep-all;`} `;
const Intro = styled.div` font-size: 15px; color: ${THEME.textSecondary}; line-height: 1.55; padding: 4px 4px 12px; word-break: keep-all;  ${pcOnly`font-size: 16px; color: ${PC.ink}; padding: 0 0 18px;`} `;
const Empty = styled.div` padding: 60px 20px; text-align: center; font-size: 16px; color: ${THEME.muted}; `;
const Card = styled.div` background: #fff; border: 1px solid ${THEME.border}; border-radius: 16px; padding: 16px; margin-bottom: 10px; `;
const Top = styled.div` display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 8px; `;
const Title = styled.div` font-size: 17px; font-weight: 700; color: ${THEME.text}; `;
const StatusText = styled.div` font-size: 15px; font-weight: 700; color: ${({ $c }) => $c}; white-space: nowrap; `;
const Row = styled.div`
  display: flex; justify-content: space-between; gap: 12px; font-size: 15px; padding: 4px 0; color: ${THEME.text};
  span { color: ${THEME.muted}; flex: none; } b { font-weight: 600; text-align: right; word-break: break-all; }
`;
const Mono = styled.b` font-family: ui-monospace, monospace; font-size: 13px; font-weight: 500; `;
const Receipt = styled.a` display: inline-block; margin-top: 8px; font-size: 15px; color: ${THEME.primary}; font-weight: 600; text-decoration: underline; `;
