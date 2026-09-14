/**
 * 사고 접수 /insurance/claim · /insurance/claim/:orderId
 *   오더 선택(내가 수주한 배정·완료 오더 + 셀프 등록 오더) → 발생 일시·장소·경위(4000자)·피해 정도(minor/major/injury)·사진 최대 6장 → 접수 → 완료 안내
 *   insurance_claims 문서 생성은 InsuranceService.createClaim — 사진은 Storage homepro/insurance/claims/{uid}/ 에 압축 업로드
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { IoAddOutline } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { useAuth } from "../../context/AuthContext";
import {
  getClaimableOrders, getOrderForClaim, getActivePolicy, getOrderInsurance, createClaim,
  formatDate, DAMAGE_LEVEL_LABEL, CLAIM_MAX_PHOTOS, CLAIM_DESC_MAX,
} from "../../service/InsuranceService";
import {
  Wrap, Card, CardTitle, CardText, CardNote, PrimaryBtn, GhostBtn, BtnRow, FixedBar, Toast, Notice,
  Label, Input, Textarea, Field, Hint, SelectCard, SelectTitleRow, SelectTitle, SelectDesc, SelectMeta, SmallBtn,
  RadioGroup, RadioCard, PhotoGrid, PhotoCell, PhotoRemove, PhotoAdd, Empty, Centered, PageTitle, PageSub,
} from "./insuranceStyles";

const pad = (n) => String(n).padStart(2, "0");
/** datetime-local 입력 기본값: 지금 (분 단위) */
const nowLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
};

const orderTitle = (o) => o?.title || o?.categoryName || "오더";
const orderWhen = (o) => o?.workDatePicker || o?.workDate || o?.schedule || (o?.createdAt ? formatDate(o.createdAt) : "");
const orderWhere = (o) => (typeof o?.location === "string" ? o.location : o?.address || [o?.location?.sido, o?.location?.gu].filter(Boolean).join(" ")) || "";

const InsuranceClaimPage = () => {
  const navigate = useNavigate();
  const { orderId: paramOrderId } = useParams();
  const { currentUser, userData } = useAuth();
  const uid = userData?.uid || currentUser?.uid;

  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [policy, setPolicy] = useState(null);
  const [orderId, setOrderId] = useState(paramOrderId || "");
  const [picking, setPicking] = useState(!paramOrderId);
  const [occurredAt, setOccurredAt] = useState(nowLocal());
  const [place, setPlace] = useState("");
  const [description, setDescription] = useState("");
  const [damageLevel, setDamageLevel] = useState("");
  const [photos, setPhotos] = useState([]);   // [{ file, url }]
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null);     // { id }
  const [toast, setToast] = useState("");
  const showToast = useCallback((m) => { setToast(m); setTimeout(() => setToast(""), 2400); }, []);
  const photosRef = useRef(photos);
  photosRef.current = photos;

  useEffect(() => {
    let alive = true;
    (async () => {
      if (!uid) { setLoading(false); return; }
      const [list, pol] = await Promise.all([
        getClaimableOrders(uid).catch((e) => { console.warn("오더 조회 실패:", e.message); return []; }),
        getActivePolicy(uid).catch(() => null),
      ]);
      let merged = list;
      // 주소로 들어온 오더가 목록에 없으면(예: 상태가 달라진 오더) 따로 읽어 맨 위에 둔다
      if (paramOrderId && !list.some((o) => o.id === paramOrderId)) {
        const o = await getOrderForClaim(paramOrderId).catch(() => null);
        if (o && (o.matchedProUid === uid || o.createdBy === uid)) merged = [o, ...list];
      }
      if (!alive) return;
      setOrders(merged); setPolicy(pol); setLoading(false);
      if (paramOrderId && !merged.some((o) => o.id === paramOrderId)) { setOrderId(""); setPicking(true); }
    })();
    return () => { alive = false; };
  }, [uid, paramOrderId]);

  // 미리보기 URL 정리
  useEffect(() => () => { photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)); }, []);

  const selected = useMemo(() => orders.find((o) => o.id === orderId) || null, [orders, orderId]);
  const selPlace = orderWhere(selected);
  useEffect(() => { if (selected && !place && selPlace) setPlace(selPlace); }, [selected, place, selPlace]);

  const addPhotos = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    const room = CLAIM_MAX_PHOTOS - photos.length;
    if (room <= 0) { showToast(`사진은 ${CLAIM_MAX_PHOTOS}장까지 첨부할 수 있습니다`); return; }
    const next = files.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }));
    if (files.length > room) showToast(`사진은 ${CLAIM_MAX_PHOTOS}장까지 첨부할 수 있습니다`);
    setPhotos((prev) => [...prev, ...next]);
  };
  const removePhoto = (i) => {
    setPhotos((prev) => { URL.revokeObjectURL(prev[i].url); return prev.filter((_, idx) => idx !== i); });
  };

  const validate = () => {
    if (!orderId) return "사고가 난 오더를 선택해 주세요";
    if (!occurredAt) return "발생 일시를 입력해 주세요";
    if (!place.trim()) return "발생 장소를 입력해 주세요";
    if (!description.trim()) return "사고 경위를 입력해 주세요";
    if (description.length > CLAIM_DESC_MAX) return `사고 경위는 ${CLAIM_DESC_MAX.toLocaleString()}자까지 입력할 수 있습니다`;
    if (!damageLevel) return "피해 정도를 선택해 주세요";
    return "";
  };

  const submit = async () => {
    if (busy) return;
    const v = validate();
    if (v) { showToast(v); return; }
    setBusy(true);
    try {
      const ins = getOrderInsurance(selected);
      const r = await createClaim({
        uid,
        userName: userData?.name || userData?.nickname || "",
        userPhone: userData?.phone || userData?.phoneE164 || "",
        orderId,
        policyId: ins.policyId || policy?.id || null,
        occurredAt: new Date(occurredAt),
        place,
        description,
        damageLevel,
        photos: photos.map((p) => p.file),
      });
      setDone(r);
      window.scrollTo(0, 0);
    } catch (e) {
      showToast(e?.message || "접수에 실패했습니다. 잠시 후 다시 시도해 주세요");
    }
    setBusy(false);
  };

  /* ───────── 완료 ───────── */
  if (done) {
    return (
      <SimpleBackLayout NAME="사고 접수" hideFooter onBack={() => navigate("/insurance/my")}>
        <Wrap $bottom={110}>
          <Centered>
            <PageTitle>사고 접수가 끝났습니다</PageTitle>
            <PageSub>보험대리점 담당자가 접수 내용을 확인한 뒤 등록된 휴대폰으로 연락드립니다. 처리 상태는 내 보험 관리의 사고 접수 목록에서 볼 수 있습니다.</PageSub>
            <CardNote>접수번호 {done.id}</CardNote>
          </Centered>
          <Card>
            <CardTitle>접수 뒤 준비할 것</CardTitle>
            <CardText>피해 물품의 사진, 수리 견적서, 고객 연락처를 준비해 두면 처리가 빨라집니다. 현장기록(체크인·체크아웃)의 사진·시각·위치는 자동으로 증빙에 포함됩니다.</CardText>
          </Card>
        </Wrap>
        <FixedBar>
          <BtnRow>
            <GhostBtn onClick={() => navigate("/insurance", { replace: true })}>보험으로</GhostBtn>
            <PrimaryBtn onClick={() => navigate("/insurance/my", { replace: true })} style={{ flex: 2 }}>내 보험 관리</PrimaryBtn>
          </BtnRow>
        </FixedBar>
      </SimpleBackLayout>
    );
  }

  /* ───────── 입력 ───────── */
  const insOfSelected = selected ? getOrderInsurance(selected) : null;

  return (
    <SimpleBackLayout NAME="사고 접수" hideFooter onBack={() => navigate(-1)}>
      <Wrap $bottom={110}>
        <Card>
          <CardTitle>사고가 난 오더</CardTitle>
          {loading ? <Empty>오더를 불러오는 중...</Empty> : (
            <>
              {selected && !picking && (
                <>
                  <SelectCard type="button" $on style={{ marginTop: 12 }} onClick={() => setPicking(true)}>
                    <SelectTitleRow>
                      <SelectTitle>{orderTitle(selected)}</SelectTitle>
                      <SmallBtn as="span">변경</SmallBtn>
                    </SelectTitleRow>
                    <SelectDesc>{orderWhere(selected) || "-"}</SelectDesc>
                    <SelectMeta>{orderWhen(selected)}{selected.orderStatus ? ` · ${selected.orderStatus}` : ""}</SelectMeta>
                  </SelectCard>
                  {insOfSelected && !insOfSelected.applied && !policy && (
                    <Notice $danger style={{ marginTop: 10 }}>이 오더에는 보험이 적용되지 않았습니다. 접수는 되지만 보장 여부는 보험대리점이 확인합니다.</Notice>
                  )}
                </>
              )}
              {picking && (
                orders.length === 0 ? (
                  <Empty>접수할 수 있는 오더가 없습니다. 배정되거나 완료된 오더만 접수할 수 있습니다.</Empty>
                ) : (
                  <OrderList>
                    {orders.map((o) => (
                      <SelectCard key={o.id} type="button" $on={o.id === orderId} onClick={() => { setOrderId(o.id); setPicking(false); }}>
                        <SelectTitleRow>
                          <SelectTitle>{orderTitle(o)}</SelectTitle>
                          <SelectMeta style={{ marginTop: 0 }}>{o.orderStatus || ""}</SelectMeta>
                        </SelectTitleRow>
                        <SelectDesc>{orderWhere(o) || "-"}</SelectDesc>
                        <SelectMeta>{orderWhen(o)}{getOrderInsurance(o).applied ? " · 보험 적용" : ""}</SelectMeta>
                      </SelectCard>
                    ))}
                  </OrderList>
                )
              )}
            </>
          )}
        </Card>

        <Card>
          <CardTitle>사고 내용</CardTitle>
          <Field style={{ marginTop: 14 }}>
            <Label htmlFor="claim-when">발생 일시</Label>
            <Input id="claim-when" type="datetime-local" value={occurredAt} max={nowLocal()} onChange={(e) => setOccurredAt(e.target.value)} />
          </Field>
          <Field>
            <Label htmlFor="claim-place">발생 장소</Label>
            <Input id="claim-place" value={place} onChange={(e) => setPlace(e.target.value)} placeholder="예: 서울 서초구 OO아파트 101동 1203호 거실" maxLength={200} />
            <Hint>오더 주소가 기본으로 들어갑니다. 실제 사고 위치가 다르면 고쳐 주세요.</Hint>
          </Field>
          <Field>
            <Label htmlFor="claim-desc">사고 경위</Label>
            <Textarea
              id="claim-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value.slice(0, CLAIM_DESC_MAX))}
              placeholder="어떤 작업 중에, 무엇이, 어떻게 파손되거나 다쳤는지 시간 순서대로 적어 주세요. 고객과 나눈 이야기가 있으면 함께 적어 주세요."
            />
            <Hint style={{ textAlign: "right" }}>{description.length.toLocaleString()} / {CLAIM_DESC_MAX.toLocaleString()}자</Hint>
          </Field>
          <Field>
            <Label>피해 정도</Label>
            <RadioGroup>
              {Object.entries(DAMAGE_LEVEL_LABEL).map(([key, label]) => (
                <RadioCard key={key} $on={damageLevel === key}>
                  <input type="radio" name="damageLevel" value={key} checked={damageLevel === key} onChange={() => setDamageLevel(key)} />
                  {label}
                </RadioCard>
              ))}
            </RadioGroup>
          </Field>
        </Card>

        <Card>
          <CardTitle>사진 (최대 {CLAIM_MAX_PHOTOS}장)</CardTitle>
          <CardNote style={{ marginTop: 6 }}>피해 부위가 잘 보이게 가까이·멀리 각각 찍어 주세요. 현장기록 사진은 자동으로 포함되니 따로 올리지 않아도 됩니다.</CardNote>
          <PhotoGrid>
            {photos.map((p, i) => (
              <PhotoCell key={p.url}>
                <img src={p.url} alt={`사고 사진 ${i + 1}`} />
                <PhotoRemove type="button" onClick={() => removePhoto(i)} aria-label="삭제">X</PhotoRemove>
              </PhotoCell>
            ))}
            {photos.length < CLAIM_MAX_PHOTOS && (
              <PhotoAdd>
                <IoAddOutline size={22} color={THEME.textSecondary} />
                {photos.length} / {CLAIM_MAX_PHOTOS}
                <input type="file" accept="image/*" multiple onChange={addPhotos} />
              </PhotoAdd>
            )}
          </PhotoGrid>
        </Card>

        <CardNote style={{ marginTop: 0, padding: "0 6px" }}>
          접수 내용은 보험대리점 담당자에게 전달되며, 허위 접수는 보장에서 제외될 수 있습니다.
        </CardNote>
      </Wrap>

      <FixedBar>
        <PrimaryBtn onClick={submit} disabled={busy || loading}>{busy ? "접수 중..." : "사고 접수"}</PrimaryBtn>
      </FixedBar>
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default InsuranceClaimPage;

const OrderList = styled.div`
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 420px;
  overflow-y: auto;
`;
