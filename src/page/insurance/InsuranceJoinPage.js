/**
 * 배상책임보험 가입 — /insurance/join (대표 기획안 10/26 · 형 시안 선택 10/27)
 *   1단계 그룹 선택   : 시안 1번 기획안 그대로 (단계 표시 · 파트너 정보 · 그룹 네 개 · 고른 요율 · [다음 단계로])
 *   2단계 약관 · 면책 : 시안 2번 세 줄 확인 체크 (펼쳐 읽고 줄마다 체크, 셋 다 체크해야 다음)
 *   3단계 카드 결제   : 시안 2번 토스 카드 등록 창 — 카드 정보는 토스에서 입력, 홈프로에 남지 않는다
 *     requestBillingAuth(planId = 그룹) → /pay/billing-success → 서버 tossBillingIssue 가 그룹 금액으로 첫 달 결제 + 가입
 */
import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { IoPersonOutline, IoCardOutline, IoCheckmark, IoLockClosedOutline } from "react-icons/io5";
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
} from "./insuranceGroups";
import { C, Box, H, Row, Txt, Btn, Fold, CheckMark, CheckLine } from "./InsuranceBlocks";
import { FixedBar, Toast } from "./insuranceStyles";

const STEP_NAMES = ["그룹 선택", "약관 동의", "카드 결제"];

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

const GroupRadio = ({ g, on, rec, onClick }) => (
  <button type="button" onClick={onClick} style={{ width: "100%", textAlign: "left", fontFamily: "inherit", cursor: "pointer", background: "#fff", border: `${on ? 1.5 : 1}px solid ${on ? C.P : C.LINE}`, borderRadius: 8, padding: "14px 14px", display: "flex", gap: 12 }}>
    <span style={{ width: 22, height: 22, borderRadius: "50%", border: `2px solid ${on ? C.P : "#9CA3AF"}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, marginTop: 2 }}>
      {on && <span style={{ width: 11, height: 11, borderRadius: "50%", background: C.P }} />}
    </span>
    <span style={{ flex: 1 }}>
      <span style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: C.TXT }}>{g.id}그룹{rec && <span style={{ fontSize: 13, color: C.P, marginLeft: 6, fontWeight: 600 }}>추천</span>}</span>
        <span style={{ fontSize: 17, fontWeight: 700, color: on ? C.P : C.TXT }}>월 {groupPriceText(g.price)}</span>
      </span>
      <span style={{ display: "block", fontSize: 14, color: C.SUB, marginTop: 6, lineHeight: 1.5, wordBreak: "keep-all" }}>{g.cats}</span>
      <span style={{ display: "block", fontSize: 13, color: C.SUB, marginTop: 4 }}>{g.note}</span>
    </span>
  </button>
);

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
  const [checks, setChecks] = useState({ start: false, notCovered: false, exclude: false });
  const [openFold, setOpenFold] = useState("start");
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
  const catNames = cats.map((p) => CATEGORIES.find((x) => x.id === p.categoryId)?.name).filter(Boolean);
  const allChecked = checks.start && checks.notCovered && checks.exclude;

  const go = (n) => { setStep(n); window.scrollTo(0, 0); };
  const back = () => (step > 1 ? go(step - 1) : navigate("/insurance"));

  const pay = async () => {
    if (!agreePay || busy || !sel) return;
    if (!uid) { showToast("로그인 후 가입할 수 있습니다"); return; }
    setBusy(true);
    try {
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
          <Row k="선택 그룹" v={`${sel.id}그룹`} sub={sel.cats} />
          <Row k="월 정기결제 금액" v={`${groupPriceText(sel.price)} (VAT 포함)`} last />
        </Box>
      )}
    </>
  );

  /* ── 2단계: 약관 · 면책 — 세 줄 확인 체크 (시안 2번) ── */
  const foldTitle = (key, text) => (
    <span style={{ display: "flex", alignItems: "center", gap: 10 }}>
      <span onClick={(e) => { e.stopPropagation(); setChecks((c) => ({ ...c, [key]: !c[key] })); if (!checks[key]) setOpenFold(""); }}><CheckMark on={checks[key]} /></span>
      {text}
    </span>
  );
  const step2 = (
    <>
      <DoneStep label="그룹" value={sel ? `${sel.id}그룹 · 월 ${groupPriceText(sel.price)}` : "-"} onEdit={() => go(1)} />
      <div style={{ fontSize: 19, fontWeight: 700, color: C.TXT, marginTop: 4 }}>보장 조건을 확인해 주세요</div>
      <Txt>이 보험은 파트너에게 붙는 것이 아니라 앱에 등재된 작업에 붙습니다. 줄을 눌러 읽고, 왼쪽 네모를 눌러 확인해 주세요.</Txt>
      <Box style={{ paddingTop: 4, paddingBottom: 4 }}>
        <Fold open={openFold === "start"} onToggle={(o) => setOpenFold(o ? "start" : "")} title={foldTitle("start", "담보 개시 요건 3가지")}>
          {START_REQ.map(([k, v], i) => <Row key={k} k={`${["①", "②", "③"][i]} ${k}`} v="" sub={v} last={i === START_REQ.length - 1} />)}
          <Txt style={{ fontSize: 14, marginTop: 6 }}>{START_END}</Txt>
        </Fold>
        <Fold open={openFold === "notCovered"} onToggle={(o) => setOpenFold(o ? "notCovered" : "")} title={foldTitle("notCovered", "담보되지 않는 경우 4가지")}>
          {NOT_COVERED.map((t) => <Txt key={t} style={{ fontSize: 14, padding: "6px 0" }}>· {t}</Txt>)}
          <Txt style={{ fontSize: 14, marginTop: 4 }}>{NOT_COVERED_NOTE}</Txt>
        </Fold>
        <Fold open={openFold === "exclude"} onToggle={(o) => setOpenFold(o ? "exclude" : "")} title={foldTitle("exclude", "면책사항 9가지 (화재 · 본인 상해 등)")}>
          {EXCLUDE.map(([k, v], i) => <Row key={k} k={k} v="" sub={v} last={i === EXCLUDE.length - 1} />)}
          <Txt style={{ fontSize: 14, marginTop: 6 }}>{EXCLUDE_NOTE}</Txt>
        </Fold>
      </Box>
      <Txt style={{ fontSize: 14 }}>세부적인 보험약관 및 안내 문구는 변경될 수 있습니다.</Txt>
    </>
  );

  /* ── 3단계: 카드 결제 — 토스 카드 등록 창 (시안 2번) ── */
  const step3 = (
    <>
      <DoneStep label="그룹" value={sel ? `${sel.id}그룹 · 월 ${groupPriceText(sel.price)}` : "-"} onEdit={() => go(1)} />
      <DoneStep label="약관" value="보장 조건 · 면책 확인" onEdit={() => go(2)} />
      <Box>
        <H icon={IoCardOutline}>결제 내용</H>
        <Row k="결제 상품" v={`도급배상책임보험 (${sel?.id || "-"}그룹)`} />
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

  const button = step === 1
    ? <Btn disabled={!sel} onClick={() => go(2)}>다음 단계로 (약관 동의)</Btn>
    : step === 2
      ? <Btn disabled={!allChecked} onClick={() => go(3)}>{allChecked ? "약관 동의하고 카드 결제하기" : "세 줄을 모두 확인해 주세요"}</Btn>
      : <Btn disabled={!agreePay || busy} onClick={pay}>{busy ? "카드 등록창 여는 중..." : "카드 등록하고 가입 완료"}</Btn>;

  return (
    <SimpleBackLayout NAME={`가입하기 (${step}/3 단계)`} hideFooter onBack={back}>
      <div style={{ padding: "16px 18px 120px", background: C.SOFT, display: "flex", flexDirection: "column", gap: 14, maxWidth: 760, margin: "0 auto", boxSizing: "border-box" }}>
        {step === 1 ? step1 : step === 2 ? step2 : step3}
      </div>
      <FixedBar>{button}</FixedBar>
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default InsuranceJoinPage;
