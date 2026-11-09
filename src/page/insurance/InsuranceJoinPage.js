/**
 * 배상책임보험 가입 — /insurance/join (대표 기획안 10/26 · 형 시안 선택 10/27 · 대표 리뷰 10/29~11/02)
 *   1단계 그룹 선택       : 시안 1번 기획안 그대로 (단계 표시 · 파트너 정보 · 그룹 네 개 · 고른 요율 · [다음 단계로])
 *                            그룹 줄엔 대표 업종 한 줄, 전체 업종은 [업종 전체 보기]로 펼침 (대표 리뷰 11/02)
 *   2단계 고지 및 면책 동의 : 한 화면 연속 스크롤 (대표 리뷰 10/29 · 11/02 두 번 올라온 원문을 합친 것)
 *     A. 사전 알릴 의무 Q1~Q5 (라디오) — Q1 아니오 → 1단계로 되돌리는 창, Q2 3건 이상 · Q5 아니오 → 진행 불가
 *     B. 약관 동의 2줄 (체크, 보기로 펼침) — 면책 · 보장 조건 5줄은 약관 전체 동의 아래에 글로 묶임(대표 리뷰 11/06). 둘 다 체크해야 3단계로
 *     비활성 버튼을 눌러도 onClick 이 돌아 첫 미완료 항목으로 스크롤 + 붉은 테두리
 *   3단계 카드 결제       : 맨 위 안내 카드 2장(1인당 보험료 · 사고 이력 할증) + 결제 내용 + 토스 카드 등록 창
 *     pay() 안에서 카드 등록창 열기 직전 insurance_consents/{uid} 에 고지 답변 · 동의 · 시각 저장
 *     requestBillingAuth(planId = 그룹) → /pay/billing-success → 서버 tossBillingIssue 가 그룹 금액으로 첫 달 결제 + 가입
 */
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoPersonOutline, IoCardOutline, IoCheckmark, IoLockClosedOutline, IoAlertCircleOutline, IoChatbubbleEllipsesOutline, IoChevronDown } from "react-icons/io5";
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../../api/config";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { useAuth } from "../../context/AuthContext";
import { CATEGORIES } from "../../config/homeproConfig";
import { formatPhone } from "../../utility/common";
import { isTossTestKey } from "../../utility/tossConfig";
import { requestBillingAuth } from "../../service/payService";
import { getInsuranceSettings } from "../../service/InsuranceService";
import { getMyProDocs } from "../../service/ProService";
import {
  groupsWithSettings, recommendGroup, groupPriceText, START_REQ, START_END, NOT_COVERED, NOT_COVERED_NOTE, EXCLUDE, EXCLUDE_NOTE,
  PRODUCT_INFO, DISCLOSURE, DISCLOSURE_DEFAULT, DISCLOSURE_TEXT, CONSENTS, PRIVACY_ROWS,
} from "./insuranceGroups";
import { C, Box, H, Row, Txt, Btn, CheckMark, CheckLine, CatsToggle, RadioDot, RadioLine, RepText } from "./InsuranceBlocks";
import { FixedBar, Toast } from "./insuranceStyles";

const STEP_NAMES = ["그룹 선택", "고지 · 동의", "카드 결제"];

const Steps = ({ now }) => (
  <div style={{ display: "flex", border: `1px solid ${C.LINE}`, background: "#fff" }}>
    {STEP_NAMES.map((t, i) => (
      <div key={t} style={{ flex: 1, textAlign: "center", padding: "10px 4px", fontSize: 14, borderLeft: i ? `1px solid ${C.LINE}` : "none", background: i + 1 === now ? "#E9ECF1" : "#fff", fontWeight: i + 1 === now ? 600 : 400, color: C.TXT }}>{i + 1}. {t}</div>
    ))}
  </div>
);

/* 지난 단계 요약 한 줄 + 수정 */
const DoneStep = ({ label, value, onEdit }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", background: "#fff", border: `1px solid ${C.LINE}`, borderRadius: 8 }}>
    <IoCheckmark size={20} color={C.P} />
    <span style={{ fontSize: 15, color: C.SUB }}>{label}</span>
    <span style={{ fontSize: 15, fontWeight: 600, color: C.TXT, flex: 1 }}>{value}</span>
    {onEdit && <button type="button" onClick={onEdit} style={{ fontSize: 14, color: C.P, background: "none", border: "none", fontFamily: "inherit", cursor: "pointer" }}>수정</button>}
  </div>
);

/* 그룹 고르는 줄 — 안에 [업종 전체 보기] 버튼이 들어가 button 안 button 이 되지 않게 div(role=button) (대표 리뷰 11/02) */
const GroupRadio = ({ g, on, rec, onClick }) => {
  const [open, setOpen] = useState(false);
  return (
    <div role="button" tabIndex={0} onClick={onClick} onKeyDown={(e) => { if (e.key === "Enter") onClick(); }}
      style={{ width: "100%", boxSizing: "border-box", textAlign: "left", cursor: "pointer", background: "#fff", border: `${on ? 1.5 : 1}px solid ${on ? C.P : C.LINE}`, borderRadius: 8, padding: "14px 14px 8px", display: "flex", gap: 12 }}>
      <span style={{ marginTop: 2 }}><RadioDot on={on} /></span>
      <span style={{ flex: 1 }}>
        <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
          <span style={{ fontSize: 17, fontWeight: 600, color: C.TXT }}>{g.id}그룹{rec && <span style={{ fontSize: 13, color: C.P, marginLeft: 6, fontWeight: 600 }}>추천</span>}</span>
          <span style={{ fontSize: 17, fontWeight: 700, color: on ? C.P : C.TXT }}>월 {groupPriceText(g.price)}</span>
        </span>
        <span style={{ display: "block", fontSize: 15, color: C.TXT, marginTop: 6, lineHeight: 1.5 }}>대표 업종 <RepText rep={g.rep} /></span>
        <span style={{ display: "block", fontSize: 13, color: C.SUB, marginTop: 2 }}>{g.note}</span>
        <CatsToggle open={open} onToggle={() => setOpen(!open)} />
        {open && <span style={{ display: "block", fontSize: 14, color: C.SUB, lineHeight: 1.55, wordBreak: "keep-all", borderTop: "1px solid #EEF0F3", padding: "8px 0 6px" }}>{g.cats}</span>}
      </span>
    </div>
  );
};

/* 2단계 항목 감싸개 — 비활성 버튼을 누르면 첫 미완료 항목에 붉은 테두리 (대표 리뷰 11/02) */
const Item = ({ id, flash, children, style }) => (
  <div id={`ins-item-${id}`} style={{ background: "#fff", border: flash === id ? `2px solid ${C.RED}` : `1px solid ${C.LINE}`, borderRadius: 8, padding: flash === id ? 15 : 16, transition: "border-color .2s", scrollMarginTop: 80, ...style }}>{children}</div>
);
const SecHead = ({ children, sub }) => (
  <div style={{ marginTop: 8 }}>
    <div style={{ fontSize: 18, fontWeight: 700, color: C.TXT, lineHeight: 1.45, wordBreak: "keep-all" }}>{children}</div>
    {sub && <div style={{ fontSize: 14, color: C.RED, marginTop: 6, lineHeight: 1.5, wordBreak: "keep-all" }}>{sub}</div>}
  </div>
);
const Warn = ({ children }) => (
  <div style={{ display: "flex", gap: 6, alignItems: "flex-start", fontSize: 15, fontWeight: 600, color: C.RED, lineHeight: 1.5, marginTop: 10, wordBreak: "keep-all" }}>
    <IoAlertCircleOutline size={20} style={{ flexShrink: 0, marginTop: 1 }} />{children}
  </div>
);
/* 3단계 맨 위 안내 카드 (대표 리뷰 11/02 원문 그대로, 이모지 대신 아이콘) */
const NoticeCard = ({ icon: I, title, children, note }) => (
  <Box style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
    <I size={24} color={C.P} style={{ flexShrink: 0, marginTop: 1 }} />
    <div style={{ flex: 1 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: C.TXT }}>{title}</div>
      <div style={{ fontSize: 14, color: C.SUB, marginTop: 6, lineHeight: 1.6, wordBreak: "keep-all" }}>{children}</div>
      {note && <div style={{ fontSize: 14, color: C.SUB, marginTop: 4, lineHeight: 1.6, wordBreak: "keep-all" }}>(※ {note})</div>}
    </div>
  </Box>
);

/** 고지 답변 · 동의 저장 — 카드 등록창 열기 직전 (대표 리뷰 11/02). 단독 호출 가능하게 밖으로 뺀다 */
/* 직접 체크하는 줄 — under 가 붙은 면책 · 보장 조건 줄은 c1 에 묶여 따라간다 (대표 리뷰 11/06) */
const CHECKS = CONSENTS.filter((c) => !c.under);

export const saveInsuranceConsent = (uid, { answers, consents, groupId }) => setDoc(doc(db, "insurance_consents", uid), {
  uid, answers, consents, groupId,
  agreedAt: serverTimestamp(),
  ua: typeof navigator !== "undefined" ? navigator.userAgent : "",
}, { merge: true });

const InsuranceJoinPage = () => {
  const navigate = useNavigate();
  const { currentUser, userData } = useAuth();
  const uid = userData?.uid || currentUser?.uid;
  const userName = userData?.name || userData?.nickname || "";
  const userPhone = userData?.phone || userData?.phoneE164 || "";

  const [settings, setSettings] = useState(null);
  const [cats, setCats] = useState([]);
  const [step, setStep] = useState(1);
  const [group, setGroup] = useState("");
  // 2단계 — 고지 답변(대표 원문의 (●) 기본값) · 필수 동의 체크 · 펼친 약관 · 붉은 테두리 · Q1 창
  const [answers, setAnswers] = useState(DISCLOSURE_DEFAULT);
  const [agreed, setAgreed] = useState({});
  const [viewOpen, setViewOpen] = useState("");
  const [flash, setFlash] = useState("");
  const [q1Modal, setQ1Modal] = useState(false);
  const [agreePay, setAgreePay] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2400); };

  useEffect(() => {
    let alive = true;
    (async () => {
      const [s, pros] = await Promise.all([getInsuranceSettings(), uid ? getMyProDocs(uid).catch(() => []) : Promise.resolve([])]);
      if (!alive) return;
      const c = pros.filter((x) => x.status === "approved");
      setSettings(s); setCats(c);
      setGroup((g) => g || recommendGroup(c));
    })();
    return () => { alive = false; };
  }, [uid]);

  const groups = useMemo(() => groupsWithSettings(settings), [settings]);
  const recId = cats.length ? recommendGroup(cats) : "B";
  const sel = groups.find((g) => g.id === group);
  const cGroup = groups.find((g) => g.id === "C");
  const catNames = cats.map((p) => CATEGORIES.find((x) => x.id === p.categoryId)?.name).filter(Boolean);

  // 진행을 막는 고지 답변 — 순서대로 첫 번째로 스크롤한다
  const blockers = [answers.q1 === "no" && "q1", answers.q2 === "many" && "q2", answers.q5 === "no" && "q5"].filter(Boolean);
  const doneCount = CHECKS.filter((c) => agreed[c.id]).length;
  const allAgreed = doneCount === CHECKS.length;
  const step2Ok = allAgreed && blockers.length === 0;

  // 단계를 옮기면 맨 위로 — 화면 틀이 안쪽 칸에서 스크롤하는 경우까지 (window 만 올리면 3단계 안내 카드가 위로 밀려 안 보였다)
  const topRef = useRef(null);
  const go = (n) => {
    setStep(n); window.scrollTo(0, 0);
    requestAnimationFrame(() => {
      for (let el = topRef.current; el; el = el.parentElement) if (el.scrollTop > 0) el.scrollTop = 0;
    });
  };
  const back = () => (step > 1 ? go(step - 1) : navigate("/insurance"));

  const answer = (qid, v) => {
    setAnswers((a) => ({ ...a, [qid]: v }));
    if (qid === "q1" && v === "no") setQ1Modal(true);
  };
  const toggleAgree = (id) => setAgreed((a) => ({ ...a, [id]: !a[id] }));
  const backToGroup = () => { setQ1Modal(false); setAnswers((a) => ({ ...a, q1: DISCLOSURE_DEFAULT.q1 })); go(1); };

  // 비활성 상태에서 눌러도 돈다 — 첫 미완료 항목으로 부드럽게 스크롤 + 붉은 테두리
  const next2 = () => {
    if (step2Ok) { go(3); return; }
    const target = blockers[0] || CHECKS.find((c) => !agreed[c.id])?.id;
    if (!target) return;
    document.getElementById(`ins-item-${target}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    setFlash(target);
    setTimeout(() => setFlash((f) => (f === target ? "" : f)), 2600);
  };

  const pay = async () => {
    if (!agreePay || busy || !sel) return;
    if (!uid) { showToast("로그인 후 가입할 수 있습니다"); return; }
    if (!step2Ok) { go(2); return; }
    setBusy(true);
    try {
      // 고지 답변 · 동의 기록을 먼저 남긴다 — 카드 등록창으로 페이지가 넘어가기 전에 (대표 리뷰 11/02)
      await saveInsuranceConsent(uid, {
        answers,
        consents: Object.fromEntries(CONSENTS.map((c) => [c.id, { agreed: !!agreed[c.under || c.id], title: c.title }])),
        groupId: sel.id,
      });
      await requestBillingAuth({ customerKey: uid, customerName: userName, customerEmail: currentUser?.email || undefined, purpose: "insurance_monthly", planId: sel.id });
      // 토스 카드 등록창으로 넘어간다 (성공 시 /pay/billing-success, 실패 시 /pay/fail)
    } catch (e) {
      if (e?.code !== "USER_CANCEL") showToast(e?.message || "카드 등록창을 열지 못했습니다");
      setBusy(false);
    }
  };

  /* ── 1단계: 그룹 선택 (시안 1번 기획안 그대로) ── */
  const step1 = (
    <>
      <Steps now={1} />
      <Box>
        <H icon={IoPersonOutline} sub="회원 정보에서 자동으로 채웠습니다.">파트너 기본 정보</H>
        <Row k="파트너명" v={`${userName || "-"}${userPhone ? ` (${formatPhone(userPhone)})` : ""}`} />
        <Row k="등록 업종" v={catNames.length ? catNames.join(" / ") : "등록된 업종 없음"} sub={`추천 그룹: ${recId}그룹`} last />
      </Box>
      <H sub="복수 업종 수행 시 가장 위험도가 높은 상위 그룹으로 가입하셔야 합니다.">작업 업종에 맞는 가입 그룹을 선택하세요</H>
      {groups.map((g) => <GroupRadio key={g.id} g={g} on={group === g.id} rec={g.id === recId} onClick={() => setGroup(g.id)} />)}
      {sel && (
        <Box>
          <H icon={IoCardOutline}>선택한 요율 정보</H>
          <Row k="선택 그룹" v={`${sel.id}그룹`} sub={`대표 업종 ${sel.rep}`} />
          <Row k="월 정기결제 금액" v={`${groupPriceText(sel.price)} (VAT 포함)`} last />
        </Box>
      )}
    </>
  );

  /* ── 2단계: 고지 및 면책 동의 — 한 화면 연속 스크롤 (대표 리뷰 10/29 · 11/02) ── */
  const qLabel = (d) => (d.id === "q1" && sel
    ? <>{d.q}<span style={{ display: "block", fontSize: 14, fontWeight: 500, color: C.SUB, marginTop: 4 }}>(선택된 그룹: {sel.id}그룹 (월 {groupPriceText(sel.price)}) - {sel.rep})</span></>
    : d.q);
  const consentRow = (c) => {
    const on = !!agreed[c.id];
    const open = viewOpen === c.id;
    return (
      <Item key={c.id} id={c.id} flash={flash}>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div role="button" tabIndex={0} onClick={() => toggleAgree(c.id)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleAgree(c.id); } }}
            style={{ flex: 1, display: "flex", gap: 10, alignItems: "flex-start", cursor: "pointer", minHeight: 44 }}>
            <span style={{ marginTop: 1 }}><CheckMark on={on} /></span>
            <span style={{ flex: 1 }}>
              <span style={{ display: "block", fontSize: 15, fontWeight: 600, color: C.TXT, lineHeight: 1.5, wordBreak: "keep-all" }}>
                <span style={{ color: c.tag === "필수" ? C.P : C.TXT }}>[{c.tag}]</span> {c.title}
              </span>
              {c.body && <span style={{ display: "block", fontSize: 14, color: C.SUB, marginTop: 4, lineHeight: 1.55, wordBreak: "keep-all" }}>{c.body}</span>}
              {CONSENTS.filter((u) => u.under === c.id).map((u, i) => (
                <span key={u.id} style={{ display: "block", marginTop: i ? 10 : 12, paddingTop: 10, borderTop: "1px solid #EEF0F3" }}>
                  <span style={{ display: "block", fontSize: 15, fontWeight: 500, color: C.TXT, lineHeight: 1.5, wordBreak: "keep-all" }}>{["①", "②", "③", "④", "⑤"][i]} {u.title}</span>
                  <span style={{ display: "block", fontSize: 14, color: C.SUB, marginTop: 4, lineHeight: 1.55, wordBreak: "keep-all" }}>{u.body}</span>
                </span>
              ))}
            </span>
          </div>
          {c.view && (
            <button type="button" onClick={() => setViewOpen(open ? "" : c.id)}
              style={{ flexShrink: 0, display: "inline-flex", alignItems: "center", gap: 2, height: 44, padding: "0 4px", fontSize: 14, color: C.P, background: "none", border: "none", fontFamily: "inherit", cursor: "pointer" }}>
              {open ? "접기" : "보기"}<IoChevronDown size={16} style={{ transform: open ? "rotate(180deg)" : "none" }} />
            </button>
          )}
        </div>
        {open && c.view === "terms" && (
          <div style={{ borderTop: "1px solid #EEF0F3", marginTop: 10, paddingTop: 4 }}>
            <Row k={`${PRODUCT_INFO.name}`} v="" sub={`${PRODUCT_INFO.kind} · ${PRODUCT_INFO.cover}`} />
            <div style={{ fontSize: 15, fontWeight: 600, color: C.TXT, marginTop: 10 }}>담보 개시 요건</div>
            {START_REQ.map(([k, v], i) => <Row key={k} k={`${["①", "②", "③"][i]} ${k}`} v="" sub={v} />)}
            <Txt style={{ fontSize: 14, marginTop: 6 }}>{START_END}</Txt>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.TXT, marginTop: 14 }}>담보되지 않는 경우</div>
            {NOT_COVERED.map((t) => <Txt key={t} style={{ fontSize: 14, padding: "6px 0" }}>· {t}</Txt>)}
            <Txt style={{ fontSize: 14, marginTop: 4 }}>{NOT_COVERED_NOTE}</Txt>
            <div style={{ fontSize: 15, fontWeight: 600, color: C.TXT, marginTop: 14 }}>면책사항 {EXCLUDE.length}가지</div>
            {EXCLUDE.map(([k, v], i) => <Row key={k} k={k} v="" sub={v} last={i === EXCLUDE.length - 1} />)}
            <Txt style={{ fontSize: 14, marginTop: 6 }}>{EXCLUDE_NOTE}</Txt>
            <Txt style={{ fontSize: 14, marginTop: 10 }}>약관 전문은 가입 뒤 1:1 문의로 받아 보실 수 있습니다. 세부적인 보험약관 및 안내 문구는 변경될 수 있습니다.</Txt>
          </div>
        )}
        {open && c.view === "privacy" && (
          <div style={{ borderTop: "1px solid #EEF0F3", marginTop: 10, paddingTop: 4 }}>
            {PRIVACY_ROWS.map(([k, v], i) => <Row key={k} k={k} v="" sub={v} last={i === PRIVACY_ROWS.length - 1} />)}
            <Txt style={{ fontSize: 14, marginTop: 6 }}>동의하지 않으실 수 있으나, 동의하지 않으면 보험 가입이 진행되지 않습니다.</Txt>
          </div>
        )}
      </Item>
    );
  };
  const step2 = (
    <>
      <DoneStep label="그룹" value={sel ? `${sel.id}그룹 · 월 ${groupPriceText(sel.price)}` : "-"} onEdit={() => go(1)} />
      <div style={{ fontSize: 19, fontWeight: 700, color: C.TXT, marginTop: 4 }}>고지 및 면책 동의</div>
      <Txt>필수 항목에 모두 답하고 동의해야 카드 결제로 넘어갑니다.</Txt>

      <SecHead sub="※ 사실과 다르게 고지할 경우 사고 발생 시 보험금 지급이 거절될 수 있습니다.">A. 사전 알릴 의무 (계약 전 필수 고지사항)</SecHead>
      {DISCLOSURE.map((d, qi) => (
        <Item key={d.id} id={d.id} flash={flash}>
          <div style={{ fontSize: 15, fontWeight: 600, color: C.TXT, lineHeight: 1.55, wordBreak: "keep-all", marginBottom: 10 }}>Q{qi + 1}. {qLabel(d)}</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {d.opts.map(([v, label, note]) => <RadioLine key={v} on={answers[d.id] === v} note={note} onClick={() => answer(d.id, v)}>{label}</RadioLine>)}
          </div>
          {d.note && <Txt style={{ fontSize: 14, marginTop: 10 }}>{d.note}</Txt>}
          {d.id === "q1" && answers.q1 === "no" && (
            <>
              <Warn>선택한 그룹이 실제 작업과 다르면 가입을 진행할 수 없습니다.</Warn>
              <Btn ghost small style={{ marginTop: 10 }} onClick={backToGroup}>1단계에서 그룹 다시 고르기</Btn>
            </>
          )}
          {d.id === "q2" && answers.q2 === "few" && (
            <>
              <Txt style={{ fontSize: 14, marginTop: 10, color: C.TXT, fontWeight: 600 }}>{DISCLOSURE_TEXT.q2few}</Txt>
              <Btn ghost small style={{ marginTop: 8 }} onClick={() => navigate("/insurance/inquiry")}><IoChatbubbleEllipsesOutline size={20} />1:1 문의</Btn>
            </>
          )}
          {d.id === "q2" && answers.q2 === "many" && (
            <>
              <Warn>{DISCLOSURE_TEXT.q2many}</Warn>
              <Btn style={{ marginTop: 10 }} onClick={() => navigate("/insurance/inquiry")}><IoChatbubbleEllipsesOutline size={20} />1:1 문의</Btn>
            </>
          )}
          {d.id === "q4" && answers.q4 === "unlicensed" && <Warn>{DISCLOSURE_TEXT.q4unlicensed}</Warn>}
          {d.id === "q5" && answers.q5 === "no" && <Warn>가입을 진행할 수 없습니다. {DISCLOSURE_TEXT.q5no}</Warn>}
        </Item>
      ))}

      <SecHead>B. 약관 동의 (모두 동의 필요)</SecHead>
      <Txt style={{ fontSize: 14 }}>약관 전체 동의에는 면책 및 보장 조건 다섯 가지 확인이 함께 들어 있습니다.</Txt>
      {CHECKS.map(consentRow)}
      <Txt style={{ fontSize: 14 }}>세부적인 보험약관 및 안내 문구는 변경될 수 있습니다.</Txt>
    </>
  );

  /* ── 3단계: 카드 결제 — 안내 카드 2장 + 토스 카드 등록 창 (시안 2번 · 대표 리뷰 11/02) ── */
  const step3 = (
    <>
      <NoticeCard icon={IoPersonOutline} title="1인당 보험료 안내" note="미가입 동료 작업자에 의한 사고는 보상 대상에서 제외됩니다.">
        본 보험료는 작업자 1인 기준 금액입니다. 한 현장에 2인 이상이 함께 작업하는 경우, 투입되는 인원 각자 보험에 가입되어 있어야 보장받을 수 있습니다.
      </NoticeCard>
      <NoticeCard icon={IoAlertCircleOutline} title="개인별 사고 이력에 따른 보험료 할증 안내" note="잦은 사고 발생 시 개인별 가입 승인이 제한되거나 인수 거절될 수 있습니다.">
        본 보험료는 기본 할인가 기준이며, 사고 발생 및 보험금 지급 이력이 있는 경우 손해보험사 요율 정책에 따라 차기 갱신 시 개인별 보험료가 할증될 수 있습니다.
      </NoticeCard>
      <DoneStep label="그룹" value={sel ? `${sel.id}그룹 · 월 ${groupPriceText(sel.price)}` : "-"} onEdit={() => go(1)} />
      <DoneStep label="고지 · 동의" value={`필수 ${CONSENTS.length}개 동의 완료`} onEdit={() => go(2)} />
      <Box>
        <H icon={IoCardOutline}>결제 내용</H>
        <div style={{ padding: "11px 0", borderBottom: "1px solid #EEF0F3" }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <span style={{ fontSize: 15, color: C.SUB, flexShrink: 0 }}>결제 상품</span>
            <span style={{ fontSize: 15, color: C.TXT, textAlign: "right", fontWeight: 500 }}>도급배상책임보험 ({sel?.id || "-"}그룹)</span>
          </div>
          {/* 상품 정보 (대표 리뷰 11/02) */}
          <div style={{ fontSize: 13, color: C.SUB, marginTop: 6, lineHeight: 1.5, wordBreak: "keep-all" }}>{PRODUCT_INFO.kind} · {PRODUCT_INFO.cover}</div>
        </div>
        <Row k="월 결제 금액" v={`${groupPriceText(sel?.price)} (VAT 포함)`} />
        <Row k="결제일" v="매월 오늘 날짜 자동 결제" />
        <Row k="가입자" v={`${userName || "-"}${userPhone ? ` · ${formatPhone(userPhone)}` : ""}`} last />
      </Box>
      <div style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: "12px 14px", background: "#fff", border: `1px solid ${C.LINE}`, borderRadius: 8 }}>
        <IoLockClosedOutline size={22} color={C.P} style={{ flexShrink: 0 }} />
        <Txt style={{ fontSize: 14 }}>
          다음 화면(토스페이먼츠)에서 카드를 한 번 등록하면 첫 달 보험료가 바로 결제되고, 이후 매월 같은 날 자동으로 결제됩니다. 카드 정보는 홈프로에 저장되지 않습니다.
          {isTossTestKey() ? " 지금은 토스 테스트 키로 열려 있어 실제로 돈이 빠지지 않습니다." : ""}
        </Txt>
      </div>
      <CheckLine on={agreePay} onChange={setAgreePay}>매월 {groupPriceText(sel?.price)} 정기 자동결제 이용 약관에 동의하며, 보험 가입과 사고 처리를 위해 이름 · 연락처 · 오더 정보를 보험대리점에 제공하는 것에 동의합니다.</CheckLine>
    </>
  );

  // 2단계 버튼은 disabled 를 주지 않고 흐리게만 — 눌러도 next2 가 돌아 미완료 항목으로 데려간다
  const step2Label = step2Ok ? "약관 동의하고 카드 결제하기"
    : blockers.length ? "가입을 진행할 수 없는 답변이 있습니다"
      : `모든 필수 항목에 동의해 주세요 (${doneCount}/${CHECKS.length} 완료)`;
  const button = step === 1
    ? <Btn disabled={!sel} onClick={() => go(2)}>다음 단계로 (고지 · 동의)</Btn>
    : step === 2
      ? <Btn aria-disabled={!step2Ok} style={{ opacity: step2Ok ? 1 : 0.45 }} onClick={next2}>{step2Label}</Btn>
      : <Btn disabled={!agreePay || busy} onClick={pay}>{busy ? "카드 등록창 여는 중..." : "카드 등록하고 가입 완료"}</Btn>;

  return (
    <SimpleBackLayout NAME={`가입하기 (${step}/3 단계)`} hideFooter onBack={back}>
      <div ref={topRef} style={{ padding: "16px 18px 120px", background: C.SOFT, display: "flex", flexDirection: "column", gap: 14, maxWidth: 760, margin: "0 auto", boxSizing: "border-box" }}>
        {step === 1 ? step1 : step === 2 ? step2 : step3}
      </div>
      <FixedBar>{button}</FixedBar>
      {q1Modal && (
        // Q1 아니오 — 그룹 다시 고르기 창 (대표 리뷰 11/02)
        <div onClick={() => setQ1Modal(false)} style={{ position: "fixed", inset: 0, background: "rgba(20,24,31,0.45)", zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
          <div onClick={(e) => e.stopPropagation()} style={{ width: "100%", maxWidth: 360, background: "#fff", borderRadius: 10, padding: "22px 20px 18px", boxSizing: "border-box" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 17, fontWeight: 700, color: C.TXT }}><IoAlertCircleOutline size={24} color={C.RED} />가입 그룹을 확인해 주세요</div>
            <Txt style={{ marginTop: 12, color: C.TXT }}>수행하시는 작업 중 누수공사가 포함된 경우 C그룹(월 {groupPriceText(cGroup?.price)})을 선택하셔야 설치 하자 사고가 보장됩니다.</Txt>
            <Btn style={{ marginTop: 18 }} onClick={backToGroup}>그룹 다시 고르기</Btn>
            <Btn ghost small style={{ marginTop: 8 }} onClick={() => setQ1Modal(false)}>닫기</Btn>
          </div>
        </div>
      )}
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default InsuranceJoinPage;
