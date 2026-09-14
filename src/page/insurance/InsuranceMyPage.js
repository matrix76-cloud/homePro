/**
 * 내 보험 관리 /insurance/my
 *   가입 목록(유형·상태·기간·자동결제 카드·[자동결제 해지]) · 결제 이력(payments purpose insurance_*) · 사고 접수 목록 · [사고 접수하기]
 *   자동결제 해지는 서버 tossBillingCancel — 해지해도 endAt 까지 보장은 유지되고 자동 연장만 끊긴다.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { useAuth } from "../../context/AuthContext";
import { PAY_PURPOSE_LABEL, TOSS_METHOD_LABEL } from "../../utility/tossConfig";
import { cancelBilling } from "../../service/payService";
import {
  getInsuranceSettings, getMyPolicies, getMyInsurancePayments, getMyClaims, tsToDate,
  formatPeriod, formatDate, formatDateTime, won, POLICY_STATUS_LABEL, CLAIM_STATUS_LABEL, DAMAGE_LEVEL_LABEL,
} from "../../service/InsuranceService";
import {
  Wrap, Card, CardTitle, CardNote, KV, KVRow, K, V, PrimaryBtn, SmallBtn, FixedBar, Toast,
  StatusText, ListRow, ListMain, ListSub, ListRight, Empty,
} from "./insuranceStyles";

const PAY_STATUS_LABEL = { ready: "결제 전", done: "결제 완료", fail: "실패", refund: "환불" };

const InsuranceMyPage = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const uid = userData?.uid || currentUser?.uid;

  const [settings, setSettings] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [payments, setPayments] = useState([]);
  const [claims, setClaims] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [toast, setToast] = useState("");
  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(""), 2400); }, []);

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) { setLoading(false); return; }
      const safe = (p) => p.catch((e) => { console.warn("내 보험 조회 실패:", e.message); return []; });
      const [s, po, pa, cl] = await Promise.all([
        getInsuranceSettings(), safe(getMyPolicies(uid)), safe(getMyInsurancePayments(uid)), safe(getMyClaims(uid)),
      ]);
      if (!alive) return;
      setSettings(s); setPolicies(po); setPayments(pa); setClaims(cl); setLoading(false);
    })();
    return () => { alive = false; };
  }, [uid]);

  const now = Date.now();
  const planLabel = (type) => settings?.plans?.[type]?.label || PAY_PURPOSE_LABEL[`insurance_${type === "perOrder" ? "order" : type}`] || type;

  /** 화면 표시용 상태 — active 라도 endAt 이 지났으면 만료로 보여 준다 */
  const displayStatus = (p) => {
    const end = tsToDate(p.endAt)?.getTime() || 0;
    if (p.status === "active" && end && end < now) return { text: "만료", tone: "none" };
    if (p.status === "canceled" && end > now) return { text: "해지됨 (만료일까지 보장)", tone: "on" };
    if (p.status === "active") return { text: "보장 중", tone: "on" };
    return { text: POLICY_STATUS_LABEL[p.status] || p.status, tone: p.status === "pending" ? "off" : "none" };
  };

  const canCancel = (p) => p.type === "monthly" && p.status === "active" && !!p.billing?.billingKey;

  const doCancel = async (p) => {
    if (busyId) return;
    const ok = window.confirm(`자동결제를 해지할까요?\n해지해도 ${formatDate(p.endAt)}까지는 보장이 유지되고, 그 뒤로는 갱신되지 않습니다.`);
    if (!ok) return;
    setBusyId(p.id);
    try {
      const r = await cancelBilling({ policyId: p.id });
      setPolicies((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "canceled", endAt: r?.endAt || x.endAt, canceledAt: new Date() } : x)));
      showToast(r?.already ? "이미 해지된 자동결제입니다" : "자동결제를 해지했습니다");
    } catch (e) {
      showToast(e?.message || "해지에 실패했습니다");
    }
    setBusyId("");
  };

  const sortedPolicies = useMemo(() => policies, [policies]);

  return (
    <SimpleBackLayout NAME="내 보험 관리" hideFooter onBack={() => navigate("/insurance")}>
      <Wrap $bottom={110}>
        <Card>
          <CardTitle>가입 내역</CardTitle>
          {loading ? <Empty>확인 중...</Empty> : sortedPolicies.length === 0 ? (
            <Empty>가입한 보험이 없습니다.</Empty>
          ) : sortedPolicies.map((p) => {
            const st = displayStatus(p);
            return (
              <PolicyBox key={p.id}>
                <PolicyHead>
                  <PolicyTitle>{planLabel(p.type)}</PolicyTitle>
                  <StatusText $tone={st.tone}>{st.text}</StatusText>
                </PolicyHead>
                <KV style={{ marginTop: 8 }}>
                  <KVRow><K>보장 기간</K><V>{formatPeriod(p.startAt, p.endAt) || "-"}</V></KVRow>
                  {p.price != null && <KVRow><K>보험료</K><V>{won(p.price)}{p.type === "monthly" ? " / 월" : ""}</V></KVRow>}
                  {p.type === "perOrder" && p.orderId && (
                    <KVRow><K>오더</K><V><LinkText onClick={() => navigate(`/order/detail/${p.orderId}`)}>오더 보기</LinkText></V></KVRow>
                  )}
                  {p.type === "monthly" && (
                    <>
                      <KVRow>
                        <K>결제 카드</K>
                        <V>{p.billing?.cardCompany || p.billing?.cardNumberMasked ? `${p.billing?.cardCompany || ""} ${p.billing?.cardNumberMasked || ""}`.trim() : "-"}</V>
                      </KVRow>
                      <KVRow>
                        <K>다음 결제</K>
                        <V>{p.status === "active" && p.billing?.nextChargeAt ? formatDate(p.billing.nextChargeAt) : "없음 (자동 연장 안 함)"}</V>
                      </KVRow>
                    </>
                  )}
                </KV>
                {canCancel(p) && (
                  <div style={{ marginTop: 12, display: "flex", justifyContent: "flex-end" }}>
                    <SmallBtn onClick={() => doCancel(p)} disabled={busyId === p.id}>
                      {busyId === p.id ? "해지 중..." : "자동결제 해지"}
                    </SmallBtn>
                  </div>
                )}
              </PolicyBox>
            );
          })}
        </Card>

        <Card>
          <CardTitle>결제 이력</CardTitle>
          {loading ? <Empty>확인 중...</Empty> : payments.length === 0 ? (
            <Empty>보험 결제 기록이 없습니다.</Empty>
          ) : payments.map((pay) => (
            <ListRow key={pay.id}>
              <ListMain>
                {pay.orderName || PAY_PURPOSE_LABEL[pay.purpose] || pay.purpose}
                <ListSub>
                  {formatDateTime(pay.approvedAt || pay.createdAt)}
                  {pay.tossMethod ? ` · ${TOSS_METHOD_LABEL[pay.tossMethod] || pay.tossMethod}` : ""}
                </ListSub>
              </ListMain>
              <ListRight>
                {won(pay.amount)}
                <ListSub style={{ textAlign: "right" }}>
                  <StatusText $tone={pay.status === "done" ? "on" : pay.status === "fail" ? "off" : "none"} style={{ fontWeight: 600 }}>
                    {PAY_STATUS_LABEL[pay.status] || pay.status}
                  </StatusText>
                </ListSub>
              </ListRight>
            </ListRow>
          ))}
        </Card>

        <Card>
          <CardTitle>사고 접수</CardTitle>
          {loading ? <Empty>확인 중...</Empty> : claims.length === 0 ? (
            <Empty>접수한 사고가 없습니다.</Empty>
          ) : claims.map((c) => (
            <ListRow key={c.id}>
              <ListMain>
                {DAMAGE_LEVEL_LABEL[c.damageLevel] || "사고"} · {c.place || "-"}
                <ListSub>발생 {formatDateTime(c.occurredAt)} · 접수 {formatDate(c.createdAt)}</ListSub>
              </ListMain>
              <ListRight>
                <StatusText $tone={c.status === "done" ? "none" : "on"}>{CLAIM_STATUS_LABEL[c.status] || c.status}</StatusText>
              </ListRight>
            </ListRow>
          ))}
          <CardNote>접수 후 보험대리점 담당자가 연락드립니다. 처리 상태는 이 목록에서 확인할 수 있습니다.</CardNote>
        </Card>
      </Wrap>

      <FixedBar>
        <PrimaryBtn onClick={() => navigate("/insurance/claim")}>사고 접수하기</PrimaryBtn>
      </FixedBar>
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default InsuranceMyPage;

const PolicyBox = styled.div`
  margin-top: 12px;
  padding: 14px 16px;
  border: 1px solid #d9dde3;
  border-radius: 10px;
  background: ${THEME.surface};
`;

const PolicyHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  font-size: 15px;
`;

const PolicyTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const LinkText = styled.span`
  font-weight: 600;
  color: ${THEME.primaryDark};
  cursor: pointer;
`;
