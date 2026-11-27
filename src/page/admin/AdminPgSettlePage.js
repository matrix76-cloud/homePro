/* eslint-disable */
/**
 * 운영자 — PG 결제 정산 (대표 리뷰 2026-11-27 "소개수수료 수령 수단 · PG안전결제 받기")
 *
 *  수락자가 소개수수료를 카드로 결제하면 돈은 토스 → 홈프로(플랫폼) 계좌로 들어온다.
 *  운영자가 결제수수료 3.5%(VAT 포함)를 뺀 금액을 접수자 정산계좌로 보내고, 여기서 [정산 완료 처리]를 누른다.
 *  자동 송금(지급대행)은 아직 없다 — 이 화면은 "누구 계좌로 얼마를 보낼지"와 "보냈다"는 기록만 맡는다.
 *
 *  읽는 곳: pg_payment_requests 중 결제가 끝났고(status paid) 플랫폼을 거치는 것(settleRoute platform).
 *    소개수수료(referralOrder) 는 feeAmount · settleAmount 가 적혀 있다. 그 전에 만든 결제 링크(작업대금)는 수수료 값이 없어 결제 금액 그대로 보여 준다.
 *  쓰는 것: settleStatus "settled", distribution { status "done", doneAt, by, amount } + 받는 사람에게 알림.
 *  환불: 카드로 낸 뒤 오더가 취소되거나 대기로 돌아가면 앱이 요청에 refundNeeded 를 적는다(OrderService.flagReferralPgRefund).
 *    그런 건은 정산하지 않고, 토스 상점관리자에서 결제를 취소한 뒤 [환불 완료 처리]를 누른다 → settleStatus "refunded".
 *  스타일은 PG 결제 내역(AdminPaymentsPage)과 같은 결 — 뱃지 · 좌측 바 · stat 카드 금지.
 */
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, getDoc, doc, updateDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import {
  Page, PageHead, PageTitle, PageDesc, HeadRight, SmallBtn, FilterRow, FilterLabel, Select, Input, Count,
  SummaryTable, TableWrap, Table, Th, Td, Tr, Empty, Loading, Status, Mono,
} from "../insurance-admin/insAdminUi";
import { referralPgSettle } from "../../config/referralReceive";

const PG_COL = "pg_payment_requests";
const KIND_LABEL = { referral: "소개수수료", work: "작업대금" };
const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) => (d ? `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}` : "");
const won = (n) => `${Number(n || 0).toLocaleString()}원`;
const isSettled = (r) => r.settleStatus === "settled" || r.distribution?.status === "done";
const isRefunded = (r) => r.settleStatus === "refunded";
const needsRefund = (r) => r.refundNeeded === true && !isRefunded(r);
/** 아직 운영자가 할 일이 남았나 — 정산 대기이거나 환불 필요 */
const isOpen = (r) => !isRefunded(r) && (needsRefund(r) || !isSettled(r));

/** 결제 금액 · 결제수수료 · 정산 금액 — 소개수수료는 문서에 적힌 값, 없으면 3.5%로 계산. 그 밖(작업대금)은 수수료 규칙이 없어 그대로 */
const moneyOf = (r) => {
  const amount = Number(r.amount) || 0;
  if (r.referralOrder === true || r.kind === "referral") {
    if (r.settleAmount != null && r.feeAmount != null) return { amount, fee: Number(r.feeAmount) || 0, settle: Number(r.settleAmount) || 0 };
    return referralPgSettle(amount);
  }
  return { amount, fee: null, settle: amount };
};

const adminName = () => {
  try { const s = JSON.parse(localStorage.getItem("adminSession") || "null"); return s?.name || s?.id || s?.email || "운영자"; }
  catch (e) { return "운영자"; }
};

export default function AdminPgSettlePage() {
  const [rows, setRows] = useState(null);
  const [kind, setKind] = useState("all");
  const [state, setState] = useState("pending");
  const [q, setQ] = useState("");
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    try {
      const snap = await getDocs(collection(db, PG_COL));
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }))
        .filter((r) => r.status === "paid" && r.settleRoute === "platform")
        .sort((a, b) => (toDate(b.paidAt)?.getTime() || 0) - (toDate(a.paidAt)?.getTime() || 0));
      // 받을 계좌가 요청에 안 적혀 있으면(만들 때 미등록) 지금 회원 정보의 정산계좌를 읽어 채운다
      const need = [...new Set(list.filter((r) => !r.distribution?.account?.number && (r.distribution?.toUid || r.uid)).map((r) => r.distribution?.toUid || r.uid))];
      const accounts = {};
      await Promise.all(need.map(async (uid) => {
        try { const u = await getDoc(doc(db, "users", uid)); accounts[uid] = u.exists() ? (u.data().account || null) : null; } catch (e) { accounts[uid] = null; }
      }));
      setRows(list.map((r) => {
        const toUid = r.distribution?.toUid || r.uid;
        const acc = r.distribution?.account?.number ? r.distribution.account : (accounts[toUid]?.number ? accounts[toUid] : null);
        return { ...r, _toUid: toUid, _account: acc, _accountFromProfile: !r.distribution?.account?.number && !!acc };
      }));
    } catch (e) { console.error(e); setRows([]); }
  };
  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = q.trim().toLowerCase();
    return rows.filter((r) => {
      if (kind !== "all" && (r.kind || "work") !== kind) return false;
      if (state === "pending" && !isOpen(r)) return false;
      if (state === "settled" && isOpen(r)) return false;
      if (needle && !(`${r.sellerName || ""} ${r.customerName || ""} ${r.orderTitle || ""} ${r.memo || ""} ${r._toUid || ""} ${r.orderId || ""} ${r._account?.holder || ""}`.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [rows, kind, state, q]);

  const sumSettle = (list) => list.reduce((a, r) => a + moneyOf(r).settle, 0);
  const pendingAll = (rows || []).filter((r) => !isSettled(r) && !isRefunded(r) && !needsRefund(r));
  const settledAll = (rows || []).filter((r) => isSettled(r) && !isRefunded(r));
  const refundAll = (rows || []).filter((r) => needsRefund(r));

  const markRefunded = async (r) => {
    if (!window.confirm(`토스 상점관리자에서 이 결제(${won(r.amount)})를 취소했습니까?\n\n[확인]을 누르면 환불 완료로 기록합니다. 실제 결제 취소는 여기서 되지 않습니다.`)) return;
    setBusyId(r.id);
    try {
      await updateDoc(doc(db, PG_COL, r.id), {
        settleStatus: "refunded",
        "distribution.status": "refunded",
        refundDoneAt: serverTimestamp(),
        refundDoneBy: adminName(),
        updatedAt: serverTimestamp(),
      });
      if (r.payerUid) {
        await addDoc(collection(db, "notifications"), {
          targetUids: [r.payerUid],
          title: "소개수수료 결제 취소",
          body: `카드로 결제한 소개수수료 ${won(r.amount)}의 결제를 취소했습니다. 카드사에 따라 반영까지 며칠 걸릴 수 있습니다.`,
          type: "pg_refunded",
          data: { orderId: r.orderId || null, requestId: r.id },
          read: false, sent: false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }
      await load();
    } catch (e) { console.error(e); window.alert("환불 완료 처리에 실패했습니다. 다시 시도해 주세요."); }
    setBusyId(null);
  };

  const markSettled = async (r) => {
    const m = moneyOf(r);
    if (!r._account?.number) { window.alert("받을 정산계좌가 없습니다. 회원에게 정산계좌 등록을 요청해 주세요."); return; }
    const line = `${r._account.bank || ""} ${r._account.number} ${r._account.holder || ""}`.trim();
    if (!window.confirm(`${r.sellerName || "회원"}님에게 ${won(m.settle)}을 보냈습니까?\n\n받는 계좌: ${line}\n\n[확인]을 누르면 정산 완료로 기록하고 회원에게 알림을 보냅니다.`)) return;
    setBusyId(r.id);
    try {
      await updateDoc(doc(db, PG_COL, r.id), {
        settleStatus: "settled",
        "distribution.status": "done",
        "distribution.doneAt": serverTimestamp(),
        "distribution.by": adminName(),
        "distribution.amount": m.settle,
        "distribution.account": { bank: r._account.bank || "", number: r._account.number || "", holder: r._account.holder || "" },
        updatedAt: serverTimestamp(),
      });
      if (r._toUid) {
        await addDoc(collection(db, "notifications"), {
          targetUids: [r._toUid],
          title: `${KIND_LABEL[r.kind] || "결제 대금"} 정산 입금`,
          body: `${won(m.settle)}을 정산계좌로 입금했습니다.${m.fee != null ? ` (결제 ${won(m.amount)} − 결제수수료 ${won(m.fee)})` : ""}`,
          type: "pg_settled",
          data: { orderId: r.orderId || null, requestId: r.id },
          read: false, sent: false,
          createdAt: serverTimestamp(),
        }).catch(() => {});
      }
      await load();
    } catch (e) { console.error(e); window.alert("정산 완료 처리에 실패했습니다. 다시 시도해 주세요."); }
    setBusyId(null);
  };

  const downloadCsv = () => {
    const head = ["결제 일시", "종류", "오더", "낸 사람", "받는 사람", "받는 사람 uid", "결제 금액", "결제수수료", "정산 금액", "은행", "계좌번호", "예금주", "정산 상태", "정산 처리 일시"];
    const lines = filtered.map((r) => {
      const m = moneyOf(r);
      return [
        fmt(toDate(r.paidAt)), KIND_LABEL[r.kind] || r.kind || "", r.orderTitle || r.memo || "", r.customerName || "", r.sellerName || "", r._toUid || "",
        m.amount, m.fee == null ? "" : m.fee, m.settle, r._account?.bank || "", r._account?.number || "", r._account?.holder || "",
        isRefunded(r) ? "환불 완료" : needsRefund(r) ? `환불 필요(${r.refundReason || ""})` : isSettled(r) ? "정산 완료" : "정산 대기", fmt(toDate(r.distribution?.doneAt)),
      ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",");
    });
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "pg결제정산.csv"; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <Page>
      <PageHead>
        <div>
          <PageTitle>PG 결제 정산</PageTitle>
          <PageDesc>카드로 결제된 소개수수료입니다. 결제수수료 3.5%(VAT 포함)를 뺀 정산 금액을 받는 사람 정산계좌로 보낸 뒤 [정산 완료 처리]를 눌러 주세요. 결제 뒤 오더가 취소된 건은 '환불 필요'로 뜹니다 — 토스 상점관리자에서 결제를 취소한 뒤 [환불 완료 처리]를 누릅니다.</PageDesc>
        </div>
        <HeadRight><SmallBtn type="button" onClick={downloadCsv} disabled={!filtered.length}>CSV 다운로드</SmallBtn></HeadRight>
      </PageHead>

      <FilterRow>
        <FilterLabel>정산 상태</FilterLabel>
        <Select value={state} onChange={(e) => setState(e.target.value)}>
          <option value="pending">처리할 것 (정산 대기 · 환불 필요)</option>
          <option value="settled">처리 끝난 것</option>
          <option value="all">전체</option>
        </Select>
        <FilterLabel>종류</FilterLabel>
        <Select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="all">전체</option>
          <option value="referral">소개수수료</option>
          <option value="work">작업대금</option>
        </Select>
        <Input placeholder="받는 사람 · 낸 사람 · 오더 · 예금주" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 260 }} />
        <Count>{filtered.length}건</Count>
      </FilterRow>

      <SummaryTable>
        <tbody>
          <tr>
            <th>정산 대기</th><td>{pendingAll.length}건 · {won(sumSettle(pendingAll))}</td>
            <th>정산 완료</th><td>{settledAll.length}건 · {won(sumSettle(settledAll))}</td>
            <th>환불 필요</th><td>{refundAll.length}건 · {won(refundAll.reduce((a, r) => a + (Number(r.amount) || 0), 0))}</td>
          </tr>
        </tbody>
      </SummaryTable>

      {rows === null ? <Loading>불러오는 중...</Loading> : filtered.length === 0 ? <Empty>{state === "pending" ? "처리할 결제가 없습니다." : "조건에 맞는 결제가 없습니다."}</Empty> : (
        <TableWrap>
          <Table $minW="1280px">
            <thead>
              <tr>
                <Th>결제 일시</Th><Th>종류</Th><Th>오더</Th><Th>낸 사람</Th><Th>받는 사람</Th>
                <Th style={{ textAlign: "right" }}>결제 금액</Th><Th style={{ textAlign: "right" }}>결제수수료</Th><Th style={{ textAlign: "right" }}>정산 금액</Th>
                <Th>정산 계좌</Th><Th>정산 상태</Th><Th>처리</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const m = moneyOf(r);
                const done = isSettled(r);
                const refunded = isRefunded(r);
                const refund = needsRefund(r);
                return (
                  <Tr key={r.id}>
                    <Td>{fmt(toDate(r.paidAt))}</Td>
                    <Td>{KIND_LABEL[r.kind] || r.kind || ""}</Td>
                    <Td style={{ whiteSpace: "normal", minWidth: 180 }}>
                      {r.orderId
                        ? <a href={`/order/detail/${r.orderId}`} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }}>{r.orderTitle || r.memo || r.orderId}</a>
                        : (r.orderTitle || r.memo || "")}
                    </Td>
                    <Td>{r.customerName || ""}</Td>
                    <Td>{r.sellerName || ""}<div><Mono>{r._toUid}</Mono></div></Td>
                    <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{won(m.amount)}</Td>
                    <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{m.fee == null ? "" : won(m.fee)}</Td>
                    <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600 }}>{won(m.settle)}</Td>
                    <Td style={{ whiteSpace: "normal", minWidth: 190 }}>
                      {r._account
                        ? <>{r._account.bank} {r._account.number}<div>{r._account.holder}{r._accountFromProfile ? " (회원 정보의 계좌)" : ""}</div></>
                        : <Status $color="#b91c1c">정산계좌 미등록</Status>}
                    </Td>
                    <Td>
                      {refunded ? (
                        <Status $color="#545E6B">환불 완료</Status>
                      ) : refund ? (
                        <>
                          <Status $color="#b91c1c" $weight={700}>환불 필요</Status>
                          <div style={{ fontSize: 14, whiteSpace: "normal" }}>{r.refundReason || "오더가 취소됨"}{done ? " · 이미 정산한 건입니다. 회원에게 회수가 필요합니다" : ""}</div>
                        </>
                      ) : (
                        <Status $color={done ? "#15803d" : "#b45309"} $weight={done ? 500 : 700}>{done ? "정산 완료" : "정산 대기"}</Status>
                      )}
                      {done && <div style={{ fontSize: 14 }}>{fmt(toDate(r.distribution?.doneAt))}{r.distribution?.by ? ` · ${r.distribution.by}` : ""}</div>}
                    </Td>
                    <Td>
                      {refund
                        ? <SmallBtn type="button" onClick={() => markRefunded(r)} disabled={busyId === r.id}>{busyId === r.id ? "처리 중" : "환불 완료 처리"}</SmallBtn>
                        : (!done && !refunded) && <SmallBtn type="button" onClick={() => markSettled(r)} disabled={busyId === r.id}>{busyId === r.id ? "처리 중" : "정산 완료 처리"}</SmallBtn>}
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Page>
  );
}
