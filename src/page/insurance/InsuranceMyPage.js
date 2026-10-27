/**
 * 내 보험 관리 /insurance/my
 *   가입 목록(유형·상태·기간·자동결제 카드·[자동결제 해지]) · 결제 이력(payments purpose insurance_*) · 사고 접수 목록 · [사고 접수하기]
 *   자동결제 해지는 서버 tossBillingCancel — 해지해도 endAt 까지 보장은 유지되고 자동 연장만 끊긴다.
 */
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { IoShieldCheckmarkOutline, IoDocumentTextOutline, IoRibbonOutline, IoSettingsOutline, IoAlertCircleOutline, IoChatbubbleEllipsesOutline } from "react-icons/io5";
import styled from "styled-components";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { useAuth } from "../../context/AuthContext";
import { PAY_PURPOSE_LABEL, TOSS_METHOD_LABEL } from "../../utility/tossConfig";
import { cancelBilling } from "../../service/payService";
import {
  getInsuranceSettings, getMyPolicies, getMyInsurancePayments, getMyClaims, tsToDate, pickActivePolicy,
  formatPeriod, formatDate, formatDateTime, won, POLICY_STATUS_LABEL, CLAIM_STATUS_LABEL, DAMAGE_LEVEL_LABEL,
} from "../../service/InsuranceService";
import {
  Wrap, Card, CardTitle, CardNote, KV, KVRow, K, V, SmallBtn, Toast,
  StatusText, ListRow, ListMain, ListSub, ListRight, Empty, PcCols, PcStack, PcSide,
} from "./insuranceStyles";
import usePcWide from "../../hooks/usePcWide";
import { C, Box, H, Row, Txt, Btn } from "./InsuranceBlocks";
import { EmblemSheet, CertSheet } from "./InsuranceCertificate";
import { ACCIDENT_STEPS } from "./insuranceGroups";
import { PcTable, PcTHead, PcTRow, PcEmpty } from "../../pc/pcKit";

const PAY_STATUS_LABEL = { ready: "결제 전", done: "결제 완료", fail: "실패", refund: "환불" };

const InsuranceMyPage = () => {
  const navigate = useNavigate();
  const pcWide = usePcWide();
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
    // 서버 해지는 status 를 active 로 두고 autoRenew:false 만 남긴다 (D16)
    if (p.status === "active" && p.type === "monthly" && p.autoRenew === false) return { text: "해지됨 (만료일까지 보장)", tone: "on" };
    if (p.status === "active") return { text: "보장 중", tone: "on" };
    return { text: POLICY_STATUS_LABEL[p.status] || p.status, tone: p.status === "pending" ? "off" : "none" };
  };

  // 이미 자동결제를 끊은(autoRenew:false) 보험엔 [자동결제 해지]를 다시 보이지 않는다 (D16)
  const canCancel = (p) => p.type === "monthly" && p.status === "active" && !!p.billing?.billingKey && p.autoRenew !== false;

  const doCancel = async (p) => {
    if (busyId) return;
    const ok = window.confirm(`자동결제를 해지할까요?\n해지해도 ${formatDate(p.endAt)}까지는 보장이 유지되고, 그 뒤로는 갱신되지 않습니다.`);
    if (!ok) return;
    setBusyId(p.id);
    try {
      const r = await cancelBilling({ policyId: p.id });
      setPolicies((prev) => prev.map((x) => (x.id === p.id ? { ...x, status: "canceled", autoRenew: false, endAt: r?.endAt || x.endAt, canceledAt: new Date() } : x)));
      showToast(r?.already ? "이미 해지된 자동결제입니다" : "자동결제를 해지했습니다");
    } catch (e) {
      showToast(e?.message || "해지에 실패했습니다");
    }
    setBusyId("");
  };

  const sortedPolicies = useMemo(() => policies, [policies]);

  /* ───────── 맨 위 — 보장 상태 · 사고 대처 (시안 insurance-manage 1번 기획안 그대로, 10/27) ───────── */
  const [params, setParams] = useSearchParams();
  const sheet = params.get("show") || "";   // emblem · cert — 가입 완료 화면에서 바로 열기
  const closeSheet = () => { params.delete("show"); setParams(params, { replace: true }); };
  const openSheet = (v) => { params.set("show", v); setParams(params, { replace: true }); };
  const myName = userData?.name || userData?.nickname || "";
  const cur = useMemo(() => pickActivePolicy(policies), [policies]);
  const [kakaoUrl, setKakaoUrl] = useState("");
  useEffect(() => {
    (async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("../../api/config");
        const snap = await getDoc(doc(db, "settings", "companyInfo"));
        const d = snap.exists() ? snap.data() : {};
        setKakaoUrl(String(d.kakaoChannelUrl || d.kakaoUrl || "").trim());
      } catch (_) {}
    })();
  }, []);
  const card = cur?.billing && (cur.billing.cardCompany || cur.billing.cardNumberMasked) ? `${cur.billing.cardCompany || ""} ${cur.billing.cardNumberMasked || ""}`.trim() : "";
  const nextCharge = cur && cur.type === "monthly" && cur.autoRenew !== false && cur.billing?.nextChargeAt;
  const manageSub = () => {
    if (!cur) { navigate("/insurance"); return; }
    if (canCancel(cur)) doCancel(cur);
    else showToast(cur.autoRenew === false ? `자동결제가 해지되어 ${formatDate(cur.endAt)}까지 보장됩니다` : "해지할 자동결제가 없습니다");
  };
  const tileBtn = { fontSize: 14, flexDirection: "column", height: 64, gap: 2 };
  const topEl = (
    <>
      <Box>
        {loading ? <Txt>확인 중...</Txt> : cur ? (
          <>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 18, fontWeight: 700, color: C.P }}>
              <IoShieldCheckmarkOutline size={24} />{cur.autoRenew === false ? "보장 중 (해지 예정)" : "보장 중 (정상 유효)"}
            </div>
            <Txt style={{ marginTop: 6 }}>{myName ? `${myName} 파트너님은` : "파트너님은"} 현재 1억 배상책임보험 보장 중입니다.</Txt>
            <div style={{ marginTop: 6 }}>
              <Row k="가입 그룹" v={cur.group ? `${cur.group}그룹 (월 ${won(cur.price)} 결제 중)` : `${planLabel(cur.type)}${cur.price ? ` (${won(cur.price)})` : ""}`} />
              {card && <Row k="등록 카드" v={card} />}
              <Row k={nextCharge ? "다음 결제일" : "보장 만료일"} v={nextCharge ? `${formatDate(cur.billing.nextChargeAt)} (${won(cur.price)})` : formatDate(cur.endAt)} last />
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6, marginTop: 10 }}>
              <Btn ghost small style={tileBtn} onClick={() => openSheet("cert")}><IoDocumentTextOutline size={20} />가입 증명서</Btn>
              <Btn ghost small style={tileBtn} onClick={() => openSheet("emblem")}><IoRibbonOutline size={20} />홍보 엠블럼</Btn>
              <Btn ghost small style={tileBtn} onClick={manageSub} disabled={!!busyId}><IoSettingsOutline size={20} />{busyId ? "해지 중..." : "구독 해지"}</Btn>
            </div>
          </>
        ) : (
          <>
            <H>가입한 배상책임보험이 없습니다</H>
            <Txt>월 5,900원부터 카드 한 번 등록으로 매월 자동 보장됩니다.</Txt>
            <Btn style={{ marginTop: 12 }} onClick={() => navigate("/insurance")}>보험 알아보기</Btn>
          </>
        )}
      </Box>
      <Box>
        <H icon={IoAlertCircleOutline}>현장 사고가 발생했나요?</H>
        {ACCIDENT_STEPS.map((t, i) => <Row key={t} k={`${i + 1}단계`} v={t} last={i === ACCIDENT_STEPS.length - 1} />)}
        <Btn danger style={{ marginTop: 12 }} onClick={() => navigate("/insurance/claim")}><IoAlertCircleOutline size={20} />사고 즉시 접수하기 (24시간)</Btn>
        <Btn ghost style={{ marginTop: 8 }} onClick={() => (kakaoUrl ? window.open(kakaoUrl, "_blank") : navigate("/insurance/inquiry"))}>
          <IoChatbubbleEllipsesOutline size={20} />{kakaoUrl ? "카카오톡 1:1 전담 보상상담원 연결" : "1:1 보상 상담 문의"}
        </Btn>
      </Box>
      {sheet === "emblem" && <EmblemSheet name={myName} onClose={closeSheet} />}
      {sheet === "cert" && cur && <CertSheet name={myName} policy={cur} onClose={closeSheet} />}
    </>
  );

  const policyCardEl = (
        <Card>
          <CardTitle>가입 내역</CardTitle>
          {loading ? <Empty>확인 중...</Empty> : sortedPolicies.length === 0 ? (
            <Empty>가입한 보험이 없습니다.</Empty>
          ) : (() => { const boxes = sortedPolicies.map((p) => {
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
                        <V>{p.status === "active" && p.autoRenew !== false && p.billing?.nextChargeAt ? formatDate(p.billing.nextChargeAt) : "없음 (자동 연장 안 함)"}</V>
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
          }); return pcWide ? <PolicyGrid>{boxes}</PolicyGrid> : boxes; })()}
        </Card>
  );

  /* ───────── PC: 왼쪽 가입 내역·결제 이력·사고 접수 표, 오른쪽 사고 접수 패널 ───────── */
  if (pcWide) {
    const PAY_COLS = "minmax(160px, 1.4fr) 150px 100px 110px 90px";
    const CLAIM_COLS = "110px minmax(140px, 1.4fr) 150px 110px 90px";
    return (
      <SimpleBackLayout NAME="내 보험 관리" hideFooter onBack={() => navigate("/insurance")}>
        <Wrap className="ins-pc">
          <PcCols $side={340}>
            <PcStack>
              {policyCardEl}
              <div>
                <PcSecTitle>결제 이력</PcSecTitle>
                <PcTable $minH={0}>
                  <PcTHead $cols={PAY_COLS}><span>내용</span><span>결제 일시</span><span>결제 수단</span><span>금액</span><span>상태</span></PcTHead>
                  {(loading || payments.length === 0) && <PcEmpty style={{ padding: "44px 20px" }}><span>{loading ? "확인 중..." : "보험 결제 기록이 없습니다."}</span></PcEmpty>}
                  {!loading && payments.map((pay) => (
                    <PcTRow key={pay.id} $cols={PAY_COLS} $click={false}>
                      <b>{pay.orderName || PAY_PURPOSE_LABEL[pay.purpose] || pay.purpose}</b>
                      <span>{formatDateTime(pay.approvedAt || pay.createdAt)}</span>
                      <span>{pay.tossMethod ? (TOSS_METHOD_LABEL[pay.tossMethod] || pay.tossMethod) : "-"}</span>
                      <b>{won(pay.amount)}</b>
                      <StatusText $tone={pay.status === "done" ? "on" : pay.status === "fail" ? "off" : "none"}>{PAY_STATUS_LABEL[pay.status] || pay.status}</StatusText>
                    </PcTRow>
                  ))}
                </PcTable>
              </div>
              <div>
                <PcSecTitle>사고 접수</PcSecTitle>
                <PcTable $minH={0}>
                  <PcTHead $cols={CLAIM_COLS}><span>피해 정도</span><span>장소</span><span>발생 일시</span><span>접수일</span><span>상태</span></PcTHead>
                  {(loading || claims.length === 0) && <PcEmpty style={{ padding: "44px 20px" }}><span>{loading ? "확인 중..." : "접수한 사고가 없습니다."}</span></PcEmpty>}
                  {!loading && claims.map((c) => (
                    <PcTRow key={c.id} $cols={CLAIM_COLS} $click={false}>
                      <b>{DAMAGE_LEVEL_LABEL[c.damageLevel] || "사고"}</b>
                      <span>{c.place || "-"}</span>
                      <span>{formatDateTime(c.occurredAt)}</span>
                      <span>{formatDate(c.createdAt)}</span>
                      <StatusText $tone={c.status === "done" ? "none" : "on"}>{CLAIM_STATUS_LABEL[c.status] || c.status}</StatusText>
                    </PcTRow>
                  ))}
                </PcTable>
              </div>
            </PcStack>
            <PcSide>{topEl}</PcSide>
          </PcCols>
        </Wrap>
        {toast && <Toast>{toast}</Toast>}
      </SimpleBackLayout>
    );
  }

  return (
    <SimpleBackLayout NAME="내 배상책임보험 관리" hideFooter onBack={() => navigate("/insurance")}>
      <Wrap $bottom={40}>
        {topEl}
        {policyCardEl}

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

// PC — 가입 건을 두 칸으로 나란히
const PolicyGrid = styled.div` display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; align-items: start; & > div { border-radius: 0; border-color: #dfe3e8; padding: 18px 20px; } `;
const PcSecTitle = styled.h2` font-size: 18px; font-weight: 800; margin: 0 0 14px; color: #14181F; `;

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
