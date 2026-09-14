/* eslint-disable */
/**
 * 운영자 — PG(토스) 결제 내역 로그. 형 지시 9/14.
 *  payments 컬렉션 전부(월 구독·보험 1년/월/건당). 용도·상태·기간 필터, 합계, CSV.
 *  스타일은 보험대리점 관리자와 같은 결(insAdminUi) — 형 규칙(뱃지·좌측바·stat 카드 금지).
 */
import React, { useEffect, useMemo, useState } from "react";
import { collection, getDocs, orderBy, query, limit } from "firebase/firestore";
import { db } from "../../api/config";
import {
  Page, PageHead, PageTitle, PageDesc, HeadRight, SmallBtn, FilterRow, FilterLabel, Select, Input, Count,
  SummaryTable, TableWrap, Table, Th, Td, Tr, Empty, Loading, Status, Mono,
} from "../insurance-admin/insAdminUi";
import { PAY_PURPOSE_LABEL, TOSS_METHOD_LABEL } from "../../utility/tossConfig";

const STATUS_LABEL = { done: "완료", ready: "대기", fail: "실패", refund: "환불" };
const STATUS_COLOR = { done: "#15803d", ready: "#545E6B", fail: "#b91c1c", refund: "#b45309" };
const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const fmt = (d) => (d ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "");
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export default function AdminPaymentsPage() {
  const [rows, setRows] = useState(null);
  const [purpose, setPurpose] = useState("all");
  const [status, setStatus] = useState("all");
  const today = new Date();
  const [from, setFrom] = useState(ymd(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(ymd(today));
  const [q, setQ] = useState("");

  useEffect(() => {
    let alive = true;
    getDocs(query(collection(db, "payments"), orderBy("createdAt", "desc"), limit(1000)))
      .then((snap) => { if (alive) setRows(snap.docs.map((d) => ({ id: d.id, ...d.data() }))); })
      .catch((e) => { console.error(e); if (alive) setRows([]); });
    return () => { alive = false; };
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const f = from ? new Date(from + "T00:00:00") : null;
    const t = to ? new Date(to + "T23:59:59") : null;
    const needle = q.trim().toLowerCase();
    return rows.filter((p) => {
      if (purpose !== "all" && p.purpose !== purpose) return false;
      if (status !== "all" && p.status !== status) return false;
      const d = toDate(p.approvedAt || p.createdAt);
      if (f && d && d < f) return false;
      if (t && d && d > t) return false;
      if (needle && !(`${p.uid || ""} ${p.tossOrderId || ""} ${p.orderName || ""} ${p.meta?.orderId || ""}`.toLowerCase().includes(needle))) return false;
      return true;
    });
  }, [rows, purpose, status, from, to, q]);

  const sum = (st) => filtered.filter((p) => p.status === st).reduce((a, p) => a + Number(p.amount || 0), 0);
  const pointsSum = filtered.filter((p) => p.status === "done").reduce((a, p) => a + Number(p.meta?.pointsUsed || 0), 0);

  const downloadCsv = () => {
    const head = ["일시", "용도", "상태", "금액(원)", "H-포인트 사용", "수단", "회원 uid", "주문번호", "결제키", "오더", "실패 사유"];
    const lines = filtered.map((p) => [
      fmt(toDate(p.approvedAt || p.createdAt)), PAY_PURPOSE_LABEL[p.purpose] || p.purpose, STATUS_LABEL[p.status] || p.status,
      Number(p.amount || 0), Number(p.meta?.pointsUsed || 0), p.method === "points" ? "H-포인트" : (TOSS_METHOD_LABEL[p.tossMethod] || p.tossMethod || p.method || ""),
      p.uid || "", p.tossOrderId || p.id, p.paymentKey || "", p.meta?.orderId || "", p.failMessage || "",
    ].map((v) => `"${String(v).replace(/"/g, '""')}"`).join(","));
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `pg결제내역_${from}_${to}.csv`; a.click(); URL.revokeObjectURL(a.href);
  };

  return (
    <Page>
      <PageHead>
        <div>
          <PageTitle>PG 결제 내역</PageTitle>
          <PageDesc>토스페이먼츠로 들어온 월 구독료·보험료 전부. 회원 간 대금·캐시백은 플랫폼이 받지 않으므로 여기 없습니다.</PageDesc>
        </div>
        <HeadRight><SmallBtn type="button" onClick={downloadCsv} disabled={!filtered.length}>CSV 다운로드</SmallBtn></HeadRight>
      </PageHead>

      <FilterRow>
        <FilterLabel>용도</FilterLabel>
        <Select value={purpose} onChange={(e) => setPurpose(e.target.value)}>
          <option value="all">전체</option>
          {Object.entries(PAY_PURPOSE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <FilterLabel>상태</FilterLabel>
        <Select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">전체</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </Select>
        <FilterLabel>기간</FilterLabel>
        <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        <span>~</span>
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        <Input placeholder="회원 uid · 주문번호 · 오더" value={q} onChange={(e) => setQ(e.target.value)} style={{ minWidth: 220 }} />
        <Count>{filtered.length}건</Count>
      </FilterRow>

      <SummaryTable>
        <tbody>
          <tr>
            <th>완료 합계</th><td>{sum("done").toLocaleString()}원</td>
            <th>H-포인트 사용 합계</th><td>{pointsSum.toLocaleString()}P</td>
            <th>환불</th><td>{sum("refund").toLocaleString()}원</td>
            <th>실패</th><td>{filtered.filter((p) => p.status === "fail").length}건</td>
          </tr>
        </tbody>
      </SummaryTable>

      {rows === null ? <Loading>불러오는 중...</Loading> : filtered.length === 0 ? <Empty>조건에 맞는 결제가 없습니다.</Empty> : (
        <TableWrap>
          <Table $minW="1100px">
            <thead>
              <tr>
                <Th>일시</Th><Th>용도</Th><Th>상태</Th><Th style={{ textAlign: "right" }}>금액</Th><Th>H-포인트</Th><Th>수단</Th><Th>회원</Th><Th>주문번호</Th><Th>오더</Th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <Tr key={p.id}>
                  <Td>{fmt(toDate(p.approvedAt || p.createdAt))}</Td>
                  <Td>{PAY_PURPOSE_LABEL[p.purpose] || p.purpose}</Td>
                  <Td><Status $color={STATUS_COLOR[p.status]} $weight={700}>{STATUS_LABEL[p.status] || p.status}</Status>{p.status === "fail" && p.failMessage ? <div style={{ fontSize: 13, color: "#b91c1c" }}>{p.failMessage}</div> : null}</Td>
                  <Td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{Number(p.amount || 0).toLocaleString()}원</Td>
                  <Td>{Number(p.meta?.pointsUsed || 0) ? `${Number(p.meta.pointsUsed).toLocaleString()}P` : ""}</Td>
                  <Td>{p.method === "points" ? "H-포인트" : (TOSS_METHOD_LABEL[p.tossMethod] || p.tossMethod || p.method || "")}</Td>
                  <Td><Mono>{p.uid}</Mono></Td>
                  <Td><Mono>{p.tossOrderId || p.id}</Mono>{p.receiptUrl ? <div><a href={p.receiptUrl} target="_blank" rel="noreferrer" style={{ fontSize: 13 }}>영수증</a></div> : null}</Td>
                  <Td>{p.meta?.orderId ? <a href={`/order/detail/${p.meta.orderId}`} target="_blank" rel="noreferrer" style={{ fontSize: 14 }}>{p.meta.orderId.slice(0, 8)}…</a> : ""}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </TableWrap>
      )}
    </Page>
  );
}
