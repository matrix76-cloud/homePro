/* eslint-disable */
/**
 * 사업자도구 · PG결제 /mypage/pg (대표 리뷰 9/17)
 *  결제 요청 생성 → 링크 발급 → 고객 결제 → PG Webhook → 결제완료 → 정산상태
 *  유료 구독 사업자 전용. 상태머신은 service/PgPaymentService.js 참고.
 */
import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { getAccessTier } from "../../utility/tierUtils";
import usePcWide from "../../hooks/usePcWide";
import { pcOnly, PC, PcTable, PcTHead, PcTRow, PcEmpty } from "../../pc/pcKit";
import { isIosApp } from "../../bridge/webviewBridge";
import {
  PG_STEPS, PG_STATUS_LABEL, PG_SETTLE_LABEL, PG_KIND, stepIndex,
  createPgRequest, issuePgLink, cancelPgRequest, listMyPgRequests, listMyOrdersForPg, pgLinkUrl,
} from "../../service/PgPaymentService";

const toDate = (v) => (v?.toDate ? v.toDate() : null);
const fmt = (d) => (d ? `${d.getMonth() + 1}.${d.getDate()} ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}` : "");
const STATUS_COLOR = { requested: THEME.text, link_issued: THEME.primary, paying: "#b45309", paid: "#15803d", canceled: THEME.danger };

const PgPaymentPage = () => {
  const navigate = useNavigate();
  const { userData, currentUser } = useAuth();
  const uid = userData?.uid || currentUser?.uid;
  const subscribed = getAccessTier(userData) === "tier0";
  const sellerName = userData?.bizName || userData?.companyName || userData?.nickname || userData?.name || "";

  const pcWide = usePcWide();
  const [tab, setTab] = useState("create");
  const [rows, setRows] = useState(null);
  const [orders, setOrders] = useState([]);
  const [toast, setToast] = useState("");
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ kind: "work", orderId: "", customerName: "", customerPhone: "", amount: "", memo: "" });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const reload = () => uid && listMyPgRequests(uid).then(setRows).catch(() => setRows([]));
  useEffect(() => {
    if (!uid || !subscribed) return;
    reload();
    listMyOrdersForPg(uid).then(setOrders).catch(() => setOrders([]));
  }, [uid, subscribed]);

  const flash = (t) => { setToast(t); setTimeout(() => setToast(""), 2200); };

  const amountNum = Number(String(form.amount).replace(/[^0-9]/g, ""));
  const phoneOk = /^01[0-9]{8,9}$/.test(form.customerPhone.replace(/[^0-9]/g, ""));
  const canSubmit = form.customerName.trim() && phoneOk && amountNum >= 1000 && (form.kind !== "referral" || form.orderId);

  const submit = async () => {
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      const o = orders.find((x) => x.id === form.orderId);
      await createPgRequest(uid, { ...form, amount: amountNum, orderTitle: o?.title || null, sellerName });
      setForm({ kind: "work", orderId: "", customerName: "", customerPhone: "", amount: "", memo: "" });
      await reload();
      setTab("list");
      flash("결제 요청을 만들었습니다. 링크를 발급해 고객에게 보내 주세요.");
    } catch (e) {
      flash("저장하지 못했습니다. 다시 시도해 주세요.");
    } finally { setBusy(false); }
  };

  const issue = async (r) => {
    await issuePgLink(r.id);
    await reload();
    flash("결제링크를 발급했습니다.");
  };
  const copy = async (r) => {
    try { await navigator.clipboard.writeText(pgLinkUrl(r.id)); flash("링크를 복사했습니다."); }
    catch { flash(pgLinkUrl(r.id)); }
  };
  const sms = (r) => {
    const body = `[홈프로] ${r.sellerName || "사업자"} 결제 요청 ${Number(r.amount).toLocaleString()}원\n${pgLinkUrl(r.id)}`;
    window.location.href = `sms:${r.customerPhone}?body=${encodeURIComponent(body)}`;
  };
  const cancel = async (r) => {
    await cancelPgRequest(r.id);
    await reload();
    flash("결제 요청을 취소했습니다.");
  };

  return (
    <SimpleBackLayout NAME="PG결제" hideFooter>
      <Wrap>
        <Intro>
          <IntroTitle>사업자용 PG결제</IntroTitle>
          <IntroText>
            홈프로 오더나 외부 일반 고객의 작업대금, 홈프로에서 생긴 소개수수료를 제휴 PG의 결제링크로 고객(당사자)에게 직접 결제받고, PG사로부터 본인 계좌로 직접 정산받는 편의서비스입니다. 복잡한 가맹계약 절차나 카드결제 단말기가 필요 없습니다.
          </IntroText>
          <Flow>
            {PG_STEPS.map((s, i) => (
              <React.Fragment key={s.key}>
                {i > 0 && <FlowArrow>→</FlowArrow>}
                <FlowStep>{s.label}</FlowStep>
              </React.Fragment>
            ))}
          </Flow>
        </Intro>

        {!subscribed ? (
          <Gate>
            <GateTitle>유료 구독 사업자만 이용할 수 있습니다</GateTitle>
            <GateText>{isIosApp() ? "PG결제로 고객에게 결제링크를 보내고 직접 정산받는 기능은 월 구독 사업자에게 열려 있습니다." : "월 구독을 시작하면 PG결제로 고객에게 결제링크를 보내고 직접 정산받을 수 있습니다."}</GateText>
            {!isIosApp() && <PrimaryBtn type="button" onClick={() => navigate("/subscription")}>구독 관리로 가기</PrimaryBtn>}
          </Gate>
        ) : (
          <>
            <Tabs>
              <TabBtn type="button" $on={tab === "create"} onClick={() => setTab("create")}>결제 요청 만들기</TabBtn>
              <TabBtn type="button" $on={tab === "list"} onClick={() => setTab("list")}>요청 내역{rows?.length ? ` ${rows.length}` : ""}</TabBtn>
            </Tabs>

            <Panel>
              {tab === "create" ? (
                <>
                  <FormGrid>
                  <Field>
                    <Label>청구 종류</Label>
                    <Choice>
                      {Object.entries(PG_KIND).map(([k, v]) => (
                        <ChoiceBtn key={k} type="button" $on={form.kind === k} onClick={() => set("kind", k)}>{v.label}</ChoiceBtn>
                      ))}
                    </Choice>
                    <Help>{PG_KIND[form.kind].desc}</Help>
                  </Field>

                  <Field>
                    <Label>연결할 홈프로 오더{form.kind === "referral" ? "" : " (선택)"}</Label>
                    <Select value={form.orderId} onChange={(e) => set("orderId", e.target.value)}>
                      <option value="">{form.kind === "referral" ? "소개수수료를 청구할 오더를 고르세요" : "외부 고객이면 비워 두세요"}</option>
                      {orders.map((o) => <option key={o.id} value={o.id}>{o.title || "오더"}{o.orderStatus ? ` · ${o.orderStatus}` : ""}</option>)}
                    </Select>
                  </Field>

                  <Field>
                    <Label>고객 이름</Label>
                    <Input value={form.customerName} onChange={(e) => set("customerName", e.target.value)} placeholder="결제할 분의 이름" />
                  </Field>
                  <Field>
                    <Label>고객 휴대폰</Label>
                    <Input inputMode="numeric" value={form.customerPhone} onChange={(e) => set("customerPhone", e.target.value)} placeholder="01012345678" />
                    {form.customerPhone && !phoneOk && <Warn>휴대폰 번호를 확인해 주세요.</Warn>}
                  </Field>
                  <Field>
                    <Label>결제 금액 (원)</Label>
                    <Input inputMode="numeric" value={form.amount ? amountNum.toLocaleString() : ""} onChange={(e) => set("amount", e.target.value.replace(/[^0-9]/g, ""))} placeholder="최소 1,000원" />
                  </Field>
                  <Field>
                    <Label>결제 내용 (선택)</Label>
                    <Input value={form.memo} onChange={(e) => set("memo", e.target.value)} placeholder="예: 에어컨 분해청소 2대" />
                  </Field>
                  </FormGrid>

                  <PrimaryBtn type="button" disabled={!canSubmit || busy} onClick={submit}>
                    {busy ? "만드는 중..." : "결제 요청 만들기"}
                  </PrimaryBtn>
                  <Note>※ 실제 결제·정산 방식 및 이용 조건은 PG사 계약 및 가맹점 심사 조건에 따라 적용됩니다.</Note>
                </>
              ) : pcWide ? (
                <PcTable $minH={360}>
                  <PcTHead $cols={PG_COLS}><span>생성</span><span>고객</span><span>금액</span><span>종류 · 내용</span><span>상태</span><span>진행</span></PcTHead>
                  {rows === null && <PcEmpty><b>불러오는 중...</b></PcEmpty>}
                  {rows !== null && rows.length === 0 && <PcEmpty><b>아직 만든 결제 요청이 없습니다.</b><span>결제 요청을 만들면 이곳에서 링크를 발급하고 보낼 수 있습니다.</span></PcEmpty>}
                  {(rows || []).map((r) => {
                    const idx = stepIndex(r);
                    const canceled = r.status === "canceled";
                    const next = PG_STEPS[idx + 1];
                    return (
                      <React.Fragment key={r.id}>
                        <PcTRow $cols={PG_COLS} $click={false}>
                          <span>{fmt(toDate(r.createdAt))}</span>
                          <b>{r.customerName}</b>
                          <b>{Number(r.amount).toLocaleString()}원</b>
                          <span>{PG_KIND[r.kind]?.label}{r.orderTitle ? ` · ${r.orderTitle}` : ""}{r.memo ? ` · ${r.memo}` : ""}</span>
                          <span style={{ color: STATUS_COLOR[r.status] || PC.ink, fontWeight: 700 }}>
                            {PG_STATUS_LABEL[r.status] || r.status}{r.status === "paid" && r.settleStatus ? ` · ${PG_SETTLE_LABEL[r.settleStatus]}` : ""}
                          </span>
                          <span>{canceled ? "-" : `${Math.max(idx + 1, 0)} / ${PG_STEPS.length} 단계${next ? ` · 다음: ${next.label}` : ""}`}</span>
                        </PcTRow>
                        {(r.status === "requested" || r.status === "link_issued") && (
                          <PcActionStrip>
                            {r.status === "link_issued" && <LinkBox>{pgLinkUrl(r.id)}</LinkBox>}
                            <BtnRow>
                              {r.status === "requested" && <PrimaryBtn type="button" onClick={() => issue(r)}>링크 발급</PrimaryBtn>}
                              {r.status === "link_issued" && <PrimaryBtn type="button" onClick={() => sms(r)}>문자로 보내기</PrimaryBtn>}
                              {r.status === "link_issued" && <GhostBtn type="button" onClick={() => copy(r)}>링크 복사</GhostBtn>}
                              <GhostBtn type="button" onClick={() => cancel(r)}>취소</GhostBtn>
                            </BtnRow>
                          </PcActionStrip>
                        )}
                      </React.Fragment>
                    );
                  })}
                </PcTable>
              ) : rows === null ? (
                <Empty>불러오는 중...</Empty>
              ) : rows.length === 0 ? (
                <Empty>아직 만든 결제 요청이 없습니다.</Empty>
              ) : rows.map((r) => {
                const idx = stepIndex(r);
                const canceled = r.status === "canceled";
                return (
                  <Card key={r.id}>
                    <Top>
                      <Title>{r.customerName} · {Number(r.amount).toLocaleString()}원</Title>
                      <StatusText $c={STATUS_COLOR[r.status] || THEME.text}>
                        {PG_STATUS_LABEL[r.status] || r.status}{r.status === "paid" && r.settleStatus ? ` · ${PG_SETTLE_LABEL[r.settleStatus]}` : ""}
                      </StatusText>
                    </Top>
                    <Meta>{PG_KIND[r.kind]?.label}{r.orderTitle ? ` · ${r.orderTitle}` : ""}{r.memo ? ` · ${r.memo}` : ""}</Meta>
                    <Meta>{fmt(toDate(r.createdAt))} 생성</Meta>
                    {!canceled && (
                      <Steps>
                        {PG_STEPS.map((s, i) => (
                          <Step key={s.key} $done={i <= idx} $now={i === idx + 1}>
                            <StepBar $done={i <= idx} />
                            {s.label}
                          </Step>
                        ))}
                      </Steps>
                    )}
                    {r.status === "requested" && (
                      <BtnRow>
                        <PrimaryBtn type="button" onClick={() => issue(r)}>링크 발급</PrimaryBtn>
                        <GhostBtn type="button" onClick={() => cancel(r)}>취소</GhostBtn>
                      </BtnRow>
                    )}
                    {r.status === "link_issued" && (
                      <>
                        <LinkBox>{pgLinkUrl(r.id)}</LinkBox>
                        <BtnRow>
                          <PrimaryBtn type="button" onClick={() => sms(r)}>문자로 보내기</PrimaryBtn>
                          <GhostBtn type="button" onClick={() => copy(r)}>링크 복사</GhostBtn>
                          <GhostBtn type="button" onClick={() => cancel(r)}>취소</GhostBtn>
                        </BtnRow>
                      </>
                    )}
                  </Card>
                );
              })}
            </Panel>
          </>
        )}
      </Wrap>
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default PgPaymentPage;

const PG_COLS = "120px minmax(120px, 0.9fr) 130px minmax(200px, 1.6fr) minmax(130px, 0.9fr) minmax(190px, 1.2fr)";
const Wrap = styled.div` padding: 16px 16px 48px; background: ${THEME.background}; min-height: 100%; box-sizing: border-box;  ${pcOnly`max-width: 1180px; margin: 0 auto; padding: 28px 32px 60px; word-break: keep-all;`} `;
const Intro = styled.div` background: #fff; border: 1px solid #d9dde3; border-radius: 12px; padding: 16px; margin-bottom: 14px;  ${pcOnly`border-radius: 0; border: 1px solid ${PC.line}; padding: 24px 26px; margin-bottom: 18px;`} `;
const IntroTitle = styled.div` font-size: 17px; font-weight: 700; color: ${THEME.text}; margin-bottom: 8px;  ${pcOnly`font-size: 18px; font-weight: 800;`} `;
const IntroText = styled.div` font-size: 15px; line-height: 1.6; color: ${THEME.textSecondary}; word-break: keep-all;  ${pcOnly`color: ${PC.body}; max-width: 900px;`} `;
const Flow = styled.div` display: flex; flex-wrap: wrap; align-items: center; gap: 4px 6px; margin-top: 12px; font-size: 14px; color: ${THEME.text};  ${pcOnly`font-size: 15px; margin-top: 16px;`} `;
const FlowStep = styled.span` font-weight: 600; word-break: keep-all; `;
const FlowArrow = styled.span` color: ${THEME.muted}; `;
const Gate = styled.div` background: #fff; border: 1px solid #d9dde3; border-radius: 12px; padding: 20px 16px;  ${pcOnly`border-radius: 0; border: 1px solid ${PC.line}; padding: 24px 26px;`} `;
const GateTitle = styled.div` font-size: 17px; font-weight: 700; color: ${THEME.text}; margin-bottom: 8px; `;
const GateText = styled.div` font-size: 15px; line-height: 1.6; color: ${THEME.textSecondary}; margin-bottom: 16px; word-break: keep-all;  ${pcOnly`color: ${PC.body};`} `;
const Tabs = styled.div` display: flex; border: 1px solid #d9dde3; background: #fff; margin-bottom: 12px;  ${pcOnly`display: inline-flex; border-color: ${PC.line}; margin-bottom: 16px;`} `;
const TabBtn = styled.button`
  flex: 1; height: 48px; border: none; font-family: inherit; font-size: 15px; cursor: pointer; color: ${THEME.text};
  background: ${({ $on }) => ($on ? "#e9ecf1" : "#fff")}; font-weight: ${({ $on }) => ($on ? 700 : 500)};
  & + & { border-left: 1px solid #d9dde3; }
 ${pcOnly`flex: none; padding: 0 30px;`} `;
const Panel = styled.div` min-height: 520px; `;
const Field = styled.div` margin-bottom: 16px;  ${pcOnly`margin-bottom: 0; min-width: 0;`} `;
const Label = styled.div` font-size: 15px; font-weight: 700; color: ${THEME.text}; margin-bottom: 8px; `;
const Help = styled.div` font-size: 14px; color: ${THEME.textSecondary}; margin-top: 6px; word-break: keep-all;  ${pcOnly`color: ${PC.body};`} `;
const Warn = styled.div` font-size: 14px; color: ${THEME.danger}; margin-top: 6px; `;
const Input = styled.input`
  width: 100%; box-sizing: border-box; height: 52px; padding: 0 14px; font-size: 16px; font-family: inherit;
  border: 1px solid #d9dde3; border-radius: 10px; background: #fff; color: ${THEME.text};
  &:focus { outline: none; border-color: ${THEME.primary}; }
 ${pcOnly`height: 46px; border-color: ${PC.line};`} `;
const Select = styled.select`
  width: 100%; height: 52px; padding: 0 12px; font-size: 16px; font-family: inherit;
  border: 1px solid #d9dde3; border-radius: 10px; background: #fff; color: ${THEME.text};
 ${pcOnly`height: 46px; border-color: ${PC.line};`} `;
const Choice = styled.div` display: flex; gap: 8px; `;
const ChoiceBtn = styled.button`
  flex: 1; min-height: 52px; padding: 8px; font-size: 15px; font-family: inherit; cursor: pointer; word-break: keep-all; border-radius: 10px;
  border: 1px solid ${({ $on }) => ($on ? THEME.button : "#d9dde3")}; background: #fff;
  color: ${({ $on }) => ($on ? THEME.primary : THEME.text)}; font-weight: ${({ $on }) => ($on ? 700 : 500)};
 ${pcOnly`min-height: 46px;`} `;
const PrimaryBtn = styled.button`
  width: 100%; min-height: 52px; border: none; border-radius: 10px; background: ${THEME.button}; color: #fff;
  font-size: 16px; font-weight: 700; font-family: inherit; cursor: pointer;
  &:disabled { background: #c9ced6; cursor: default; }
 ${pcOnly`width: auto; min-height: 46px; padding: 0 28px;`} `;
const GhostBtn = styled.button`
  width: 100%; min-height: 52px; border: 1px solid #d9dde3; border-radius: 10px; background: #fff; color: ${THEME.text};
  font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer;
 ${pcOnly`width: auto; min-height: 46px; padding: 0 22px;`} `;
const BtnRow = styled.div` display: flex; gap: 8px; margin-top: 12px; & > *:first-child { flex: 2; } & > * { flex: 1; }  ${pcOnly`justify-content: flex-start; margin-top: 0; & > *, & > *:first-child { flex: none; }`} `;
const Note = styled.div` font-size: 13px; color: ${THEME.textSecondary}; margin-top: 12px; line-height: 1.5; word-break: keep-all;  ${pcOnly`font-size: 14px; color: ${PC.body}; margin-top: 16px;`} `;
const Empty = styled.div` padding: 60px 20px; text-align: center; font-size: 16px; color: ${THEME.muted}; `;
const Card = styled.div` background: #fff; border: 1px solid #d9dde3; border-radius: 12px; padding: 16px; margin-bottom: 10px; `;
const Top = styled.div` display: flex; justify-content: space-between; align-items: flex-start; gap: 10px; margin-bottom: 6px; `;
const Title = styled.div` font-size: 17px; font-weight: 700; color: ${THEME.text}; word-break: keep-all; `;
const StatusText = styled.div` font-size: 15px; font-weight: 700; color: ${({ $c }) => $c}; text-align: right; word-break: keep-all; `;
const Meta = styled.div` font-size: 14px; color: ${THEME.textSecondary}; margin-top: 2px; word-break: keep-all; `;
const Steps = styled.div` display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px 6px; margin-top: 14px; `;
const Step = styled.div`
  font-size: 13px; line-height: 1.35; word-break: keep-all;
  color: ${({ $done, $now }) => ($done || $now ? THEME.text : THEME.muted)}; font-weight: ${({ $now }) => ($now ? 700 : 500)};
`;
const StepBar = styled.div` height: 4px; border-radius: 2px; margin-bottom: 5px; background: ${({ $done }) => ($done ? THEME.button : "#e3e6eb")}; `;
const LinkBox = styled.div` margin-top: 12px; padding: 12px; background: ${THEME.background}; border: 1px solid #d9dde3; border-radius: 10px; font-size: 14px; color: ${THEME.text}; word-break: break-all;  ${pcOnly`margin-top: 0; flex: 1; min-width: 0; background: #fff; border-color: ${PC.line}; border-radius: 0; font-size: 15px;`} `;
/* 입력 묶음 — 폰에서는 없는 것과 같고(display: contents), PC 에서는 한 줄 3칸 */
const FormGrid = styled.div`
  display: contents;
  ${pcOnly`display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 24px 26px; background: #fff; border: 1px solid ${PC.line}; padding: 28px 30px; margin-bottom: 22px; align-items: start; @media (max-width: 1040px) { grid-template-columns: repeat(2, minmax(0, 1fr)); }`}
`;
const PcActionStrip = styled.div` display: flex; align-items: center; gap: 12px; padding: 12px 24px 16px; background: ${PC.hover}; `;
const Toast = styled.div`
  position: fixed; left: 50%; bottom: calc(24px + env(safe-area-inset-bottom, 0px)); transform: translateX(-50%);
  max-width: 360px; width: calc(100% - 40px); padding: 14px 16px; background: #1b1f27; color: #fff; font-size: 15px; border-radius: 10px; text-align: center; z-index: 50;
`;
