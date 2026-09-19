/* eslint-disable */
// 기술전수 교육생 모집 — 교육 공고 등록 (필수 항목 검증 + 20,000 H-포인트 차감 후 게시)
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, addDoc, doc, getDoc, updateDoc, deleteDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../api/config";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import RegionSelectModal from "../../modal/RegionSelectModal";
import { deductPoints } from "../../service/PointService";
import { compressEvidencePhoto } from "../../service/WorkLogService";
import { formatPhone } from "../../utility/common";
import { IoCloseCircle, IoCameraOutline } from "react-icons/io5";
import { TRAINING_COL, TRAINING_POST_COST, CATEGORIES, METHODS, todayStr } from "./trainingShared";

const MAX_PHOTOS = 5;
const POINT_WAYS = [
  ["친구 초대하기", "초대한 친구가 가입하면 3,000P"],
  ["비즈프로필 작성", "프로필을 완성하면 2,000P"],
  ["오더 등록·수행 완료", "완료될 때마다 300P"],
  ["리뷰 작성", "리뷰 1건당 300P"],
];

const TrainingCreatePage = () => {
  const navigate = useNavigate();
  const { userData, refreshUser } = useAuth();
  const uid = userData?.uid;

  const [form, setForm] = useState({
    title: "",
    category: "",
    subCategory: "",
    method: "",
    recruitType: "상시",
    recruitEnd: "",
    eduDate: "",
    eduEndDate: "",
    eduTime: "",
    address: "",
    capacity: "",
    capacityNote: "",
    priceType: "유료",
    priceRegular: "",
    priceEarly: "",
    earlyUntil: "",
    curriculum: "",
    benefits: "",
    instructor: userData?.companyName || userData?.nickname || userData?.name || "",
    contactPhone: formatPhone(userData?.phoneE164 || userData?.phone || ""),
  });
  const [regionScope, setRegionScope] = useState("지역"); // 지역 | 전국
  const [region, setRegion] = useState(null);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [photos, setPhotos] = useState([]); // { file, url }
  const [balance, setBalance] = useState(userData?.referralPoints ?? null);
  const [showShortage, setShowShortage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState({});
  const fileRef = useRef(null);

  // 사용자 정보가 늦게 들어와도 강사명·연락처 기본값을 채운다
  useEffect(() => {
    if (!userData) return;
    setForm((p) => ({
      ...p,
      instructor: p.instructor || userData.companyName || userData.nickname || userData.name || "",
      contactPhone: p.contactPhone || formatPhone(userData.phoneE164 || userData.phone || ""),
    }));
  }, [userData?.uid]);

  // 잔액은 문서에서 새로 읽는다 (userData 는 오래된 값일 수 있음)
  const loadBalance = async () => {
    if (!uid) return null;
    try {
      const snap = await getDoc(doc(db, "users", uid));
      const b = snap.exists() ? snap.data().referralPoints || 0 : 0;
      setBalance(b);
      return b;
    } catch {
      return null;
    }
  };
  useEffect(() => { loadBalance(); }, [uid]);

  useEffect(() => () => photos.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const set = (key) => (e) => setForm((p) => ({ ...p, [key]: e.target.value }));
  const pick = (key, value) => setForm((p) => ({ ...p, [key]: value }));
  const cat = CATEGORIES.find((c) => c.key === form.category);
  const isOnline = form.method === "온라인 VOD";

  const onPickPhotos = (e) => {
    const files = Array.from(e.target.files || []).filter((f) => f.type.startsWith("image/"));
    e.target.value = "";
    if (!files.length) return;
    const room = MAX_PHOTOS - photos.length;
    if (room <= 0) return window.alert(`사진은 최대 ${MAX_PHOTOS}장까지 올릴 수 있어요.`);
    setPhotos((prev) => [...prev, ...files.slice(0, room).map((file) => ({ file, url: URL.createObjectURL(file) }))]);
  };
  const removePhoto = (i) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[i].url);
      return prev.filter((_, idx) => idx !== i);
    });
  };

  const validate = () => {
    const today = todayStr();
    const e = {};
    if (!form.title.trim()) e.title = "과정명을 입력해주세요";
    if (!form.category) e.category = "분야를 선택해주세요";
    else if (!form.subCategory) e.category = "세부 분야를 선택해주세요";
    if (!form.method) e.method = "교육 방식을 선택해주세요";
    if (form.recruitType === "기간") {
      if (!form.recruitEnd) e.recruit = "모집 마감일을 선택해주세요";
      else if (form.recruitEnd < today) e.recruit = "모집 마감일은 오늘 이후여야 합니다";
    }
    if (!form.eduDate) e.eduDate = "교육 시작일을 선택해주세요";
    else if (form.eduEndDate && form.eduEndDate < form.eduDate) e.eduDate = "종료일이 시작일보다 빠릅니다";
    else if (form.recruitType === "기간" && form.recruitEnd && form.recruitEnd > (form.eduEndDate || form.eduDate)) e.recruit = "모집 마감일이 교육 일정보다 늦습니다";
    if (!isOnline) {
      if (regionScope === "지역" && !region) e.place = "교육 지역을 선택해주세요";
      else if (!form.address.trim()) e.place = "상세 주소 또는 현장 안내를 입력해주세요";
    } else if (regionScope === "지역" && !region) {
      e.place = "지역을 선택하거나 전국을 선택해주세요";
    }
    const cap = Number(form.capacity);
    if (!form.capacity || !Number.isFinite(cap) || cap < 1) e.capacity = "모집 정원을 1명 이상 입력해주세요";
    if (form.priceType === "유료") {
      const reg = Number(form.priceRegular);
      if (!form.priceRegular || !Number.isFinite(reg) || reg <= 0) e.price = "정가를 입력해주세요";
      else if (form.priceEarly !== "") {
        const early = Number(form.priceEarly);
        if (!Number.isFinite(early) || early <= 0 || early >= reg) e.price = "얼리버드 할인가는 정가보다 낮아야 합니다";
      }
    }
    if (!form.curriculum.trim()) e.curriculum = "주요 교육 내용을 입력해주세요";
    else if (form.curriculum.trim().length < 20) e.curriculum = "교육 내용을 20자 이상 구체적으로 적어주세요";
    if (!form.instructor.trim()) e.instructor = "강사명 또는 업체명을 입력해주세요";
    const digits = form.contactPhone.replace(/[^0-9]/g, "");
    if (form.contactPhone.trim() && digits.length < 8) e.contactPhone = "전화번호를 확인해주세요";
    return e;
  };

  const uploadPhotos = async (docId) => {
    const urls = [];
    for (let i = 0; i < photos.length; i++) {
      const blob = await compressEvidencePhoto(photos[i].file, 1280, 0.82);
      const r = ref(storage, `homepro/trainings/${docId}/${Date.now()}_${i}.jpg`);
      await uploadBytes(r, blob, { contentType: "image/jpeg" });
      urls.push(await getDownloadURL(r));
    }
    return urls;
  };

  const handleSubmit = async () => {
    if (saving) return;
    if (!uid) return window.alert("로그인이 필요합니다.");
    const e = validate();
    setErrors(e);
    const firstKey = Object.keys(e)[0];
    if (firstKey) {
      document.getElementById(`field-${firstKey}`)?.scrollIntoView({ behavior: "smooth", block: "center" });
      return;
    }

    const b = await loadBalance();
    if (b == null) return window.alert("포인트 잔액을 확인하지 못했습니다. 잠시 후 다시 시도해주세요.");
    if (b < TRAINING_POST_COST) { setShowShortage(true); return; }
    if (!window.confirm(`교육 공고를 등록하면 ${TRAINING_POST_COST.toLocaleString()} H-포인트가 차감되고 바로 게시됩니다.\n(보유 ${b.toLocaleString()}P → ${(b - TRAINING_POST_COST).toLocaleString()}P)\n\n등록할까요?`)) return;

    setSaving(true);
    const sub = form.subCategory;
    const regionLabel = regionScope === "전국" ? "전국" : `${region.sido}${region.gu && region.gu !== "전체" ? ` ${region.gu}` : ""}`;
    const regular = form.priceType === "유료" ? Number(form.priceRegular) : 0;
    const early = form.priceType === "유료" && form.priceEarly !== "" ? Number(form.priceEarly) : null;
    const authorName = userData?.nickname || userData?.name || "";

    let docId = null;
    let charged = false;
    try {
      // 1) 비공개(pending) 상태로 먼저 만든다 — 목록에는 안 보인다
      const created = await addDoc(collection(db, TRAINING_COL), {
        status: "pending",
        title: form.title.trim(),
        category: form.category,
        subCategory: sub,
        field: sub, // 예전 화면 호환
        method: form.method,
        methods: [form.method], // 예전 화면 호환
        recruitType: form.recruitType,
        recruitEnd: form.recruitType === "기간" ? form.recruitEnd : null,
        eduDate: form.eduDate,
        eduEndDate: form.eduEndDate || null,
        eduTime: form.eduTime.trim() || null,
        startDate: form.eduDate, // 예전 화면 호환
        endDate: form.eduEndDate || null,
        startTime: form.eduTime.trim() || null,
        period: form.eduEndDate && form.eduEndDate !== form.eduDate ? `${form.eduDate} ~ ${form.eduEndDate}` : form.eduDate,
        regionScope,
        region: regionScope === "전국" ? null : region,
        location: regionLabel,
        address: form.address.trim() || null,
        capacity: Number(form.capacity),
        capacityNote: form.capacityNote.trim() || null,
        priceType: form.priceType,
        priceRegular: regular,
        priceEarly: early,
        earlyUntil: early != null && form.earlyUntil ? form.earlyUntil : null,
        price: early != null ? early : regular,
        curriculum: form.curriculum.trim(),
        description: form.curriculum.trim(), // 예전 화면 호환
        benefits: form.benefits.trim() || null,
        instructor: form.instructor.trim(),
        contactPhone: form.contactPhone.trim() || null,
        contact: form.contactPhone.trim() || null,
        photos: [],
        createdBy: uid,
        authorName,
        pointCost: TRAINING_POST_COST,
        createdAt: serverTimestamp(),
      });
      docId = created.id;

      // 2) 사진 업로드 (실패하면 포인트 차감 없이 정리)
      const photoUrls = photos.length ? await uploadPhotos(docId) : [];

      // 3) 포인트 차감
      const tx = await deductPoints(uid, authorName, TRAINING_POST_COST, "기술전수 교육 공고 등록", {
        relatedDocId: docId,
        txType: "training_post",
      });
      charged = true;

      // 4) 게시
      const activate = () => updateDoc(doc(db, TRAINING_COL, docId), {
        status: "모집중",
        photos: photoUrls,
        thumbnail: photoUrls[0] || null,
        pointTxId: tx.id,
        publishedAt: serverTimestamp(),
      });
      try {
        await activate();
      } catch (err) {
        await activate(); // 한 번 더 시도
      }

      refreshUser?.();
      window.alert("교육 공고가 등록되었습니다.");
      navigate(`/training/${docId}`, { replace: true });
    } catch (err) {
      console.error("TrainingCreate error:", err);
      if (!charged && docId) {
        deleteDoc(doc(db, TRAINING_COL, docId)).catch(() => {});
      }
      if (String(err?.message || "").includes("포인트가 부족")) {
        loadBalance();
        setShowShortage(true);
      } else if (charged) {
        window.alert(`포인트는 차감되었으나 게시 처리에 실패했습니다.\n고객센터로 문의해 주세요. (공고번호 ${docId})`);
      } else {
        window.alert("등록에 실패했습니다. 포인트는 차감되지 않았습니다. 다시 시도해주세요.");
      }
    } finally {
      setSaving(false);
    }
  };

  const Err = ({ k }) => (errors[k] ? <ErrText>{errors[k]}</ErrText> : null);

  return (
    <SimpleBackLayout NAME="교육생 모집 공고 등록" hideFooter>
      <PageWrap>
        <PointBox>
          <PointHead>
            <PointTitle>공고 등록 {TRAINING_POST_COST.toLocaleString()} H-포인트</PointTitle>
            <PointBal>보유 {balance == null ? "-" : `${Number(balance).toLocaleString()}P`}</PointBal>
          </PointHead>
          <PointDesc>부실 공고를 막기 위해 등록 시 포인트가 차감되며, 차감과 동시에 공고가 게시됩니다. 수강생의 열람·전화·채팅 문의는 무료입니다.</PointDesc>
        </PointBox>

        <Section>
          <SecTitle>교육 기본 정보</SecTitle>
          <Field id="field-title">
            <Label>과정명<Req>*</Req></Label>
            <Input placeholder="예: 하수구 고압세척 실전 창업반 (2일 완성)" value={form.title} onChange={set("title")} maxLength={60} />
            <Err k="title" />
          </Field>

          <Field id="field-category">
            <Label>분야<Req>*</Req></Label>
            <ChoiceGrid $cols={2}>
              {CATEGORIES.map((c) => (
                <Choice key={c.key} type="button" $active={form.category === c.key}
                  onClick={() => setForm((p) => ({ ...p, category: c.key, subCategory: p.category === c.key ? p.subCategory : "" }))}>
                  {c.label}
                </Choice>
              ))}
            </ChoiceGrid>
            {cat && (
              <>
                <SubLabel>세부 분야</SubLabel>
                <ChoiceWrap>
                  {cat.subs.map((s) => (
                    <Choice key={s} type="button" $active={form.subCategory === s} onClick={() => pick("subCategory", s)}>{s}</Choice>
                  ))}
                </ChoiceWrap>
              </>
            )}
            <Err k="category" />
          </Field>

          <Field id="field-method">
            <Label>교육 방식<Req>*</Req></Label>
            <ChoiceGrid $cols={3}>
              {METHODS.map((m) => (
                <Choice key={m} type="button" $active={form.method === m} onClick={() => pick("method", m)}>{m}</Choice>
              ))}
            </ChoiceGrid>
            <Err k="method" />
          </Field>
        </Section>

        <Section>
          <SecTitle>일정 및 장소</SecTitle>
          <Field id="field-recruit">
            <Label>모집 기간<Req>*</Req></Label>
            <ChoiceGrid $cols={2}>
              <Choice type="button" $active={form.recruitType === "상시"} onClick={() => pick("recruitType", "상시")}>상시 모집</Choice>
              <Choice type="button" $active={form.recruitType === "기간"} onClick={() => pick("recruitType", "기간")}>마감일 지정</Choice>
            </ChoiceGrid>
            {form.recruitType === "기간" && (
              <Input style={{ marginTop: 10 }} type="date" min={todayStr()} value={form.recruitEnd} onChange={set("recruitEnd")} />
            )}
            <Hint>{form.recruitType === "기간" ? "마감 3일 전부터 목록에 '마감임박'으로 표시됩니다." : "교육 시작 전까지 계속 모집합니다."}</Hint>
            <Err k="recruit" />
          </Field>

          <Field id="field-eduDate">
            <Label>교육 일시<Req>*</Req></Label>
            <TwoCol>
              <div>
                <SmallCap>시작일</SmallCap>
                <Input type="date" value={form.eduDate} onChange={set("eduDate")} />
              </div>
              <div>
                <SmallCap>종료일 (선택)</SmallCap>
                <Input type="date" min={form.eduDate || undefined} value={form.eduEndDate} onChange={set("eduEndDate")} />
              </div>
            </TwoCol>
            <Input style={{ marginTop: 10 }} placeholder="시간 안내 (예: 토·일 10:00~17:00)" value={form.eduTime} onChange={set("eduTime")} />
            <Err k="eduDate" />
          </Field>

          <Field id="field-place">
            <Label>교육 장소<Req>*</Req></Label>
            <ChoiceGrid $cols={2}>
              <Choice type="button" $active={regionScope === "지역"} onClick={() => setRegionScope("지역")}>지역 선택</Choice>
              <Choice type="button" $active={regionScope === "전국"} onClick={() => setRegionScope("전국")}>전국 (출장·온라인)</Choice>
            </ChoiceGrid>
            {regionScope === "지역" && (
              <RegionBtn type="button" onClick={() => setShowRegionModal(true)} $empty={!region}>
                {region ? `${region.sido} ${region.gu === "전체" ? "" : region.gu}` : "시·도 / 시·군·구 선택"}
              </RegionBtn>
            )}
            <Input style={{ marginTop: 10 }}
              placeholder={isOnline ? "수강 방법 안내 (선택, 예: 결제 후 VOD 링크 발송)" : "상세 주소 또는 현장 안내 (예: 남양주시 진접읍 ○○로 12 실습장)"}
              value={form.address} onChange={set("address")} />
            <Hint>목록에는 시·군·구까지만 보이고, 상세 주소는 상세 화면에서 보입니다.</Hint>
            <Err k="place" />
          </Field>
        </Section>

        <Section>
          <SecTitle>모집 정원 및 비용</SecTitle>
          <Field id="field-capacity">
            <Label>모집 정원<Req>*</Req></Label>
            <TwoCol>
              <InputUnit>
                <Input type="number" inputMode="numeric" min={1} placeholder="예: 6" value={form.capacity} onChange={set("capacity")} />
                <Unit>명</Unit>
              </InputUnit>
              <Input placeholder="안내 (예: 소수정예)" value={form.capacityNote} onChange={set("capacityNote")} maxLength={20} />
            </TwoCol>
            <Err k="capacity" />
          </Field>

          <Field id="field-price">
            <Label>수강료<Req>*</Req></Label>
            <ChoiceGrid $cols={3}>
              {["유료", "무료", "협의"].map((t) => (
                <Choice key={t} type="button" $active={form.priceType === t} onClick={() => pick("priceType", t)}>{t === "협의" ? "상담 후 결정" : t}</Choice>
              ))}
            </ChoiceGrid>
            {form.priceType === "유료" && (
              <>
                <TwoCol style={{ marginTop: 12 }}>
                  <div>
                    <SmallCap>정가</SmallCap>
                    <InputUnit>
                      <Input type="number" inputMode="numeric" placeholder="예: 1500000" value={form.priceRegular} onChange={set("priceRegular")} />
                      <Unit>원</Unit>
                    </InputUnit>
                  </div>
                  <div>
                    <SmallCap>얼리버드 할인가 (선택)</SmallCap>
                    <InputUnit>
                      <Input type="number" inputMode="numeric" placeholder="예: 1200000" value={form.priceEarly} onChange={set("priceEarly")} />
                      <Unit>원</Unit>
                    </InputUnit>
                  </div>
                </TwoCol>
                {form.priceEarly !== "" && (
                  <div style={{ marginTop: 10 }}>
                    <SmallCap>얼리버드 적용 마감일 (선택)</SmallCap>
                    <Input type="date" value={form.earlyUntil} onChange={set("earlyUntil")} />
                  </div>
                )}
                {Number(form.priceRegular) > 0 && <Hint>입력값: 정가 {Number(form.priceRegular).toLocaleString()}원{Number(form.priceEarly) > 0 ? ` · 할인가 ${Number(form.priceEarly).toLocaleString()}원` : ""}</Hint>}
              </>
            )}
            <Err k="price" />
          </Field>
        </Section>

        <Section>
          <SecTitle>커리큘럼 및 혜택</SecTitle>
          <Field id="field-curriculum">
            <Label>주요 교육 내용<Req>*</Req></Label>
            <Textarea
              placeholder={"예)\n1일차: 장비 구성·안전 교육, 배관 구조 이해\n2일차: 현장 실습 (주방·욕실 하수구), 견적 내는 법"}
              value={form.curriculum} onChange={set("curriculum")} />
            <Err k="curriculum" />
          </Field>
          <Field>
            <Label>기타 지원</Label>
            <Textarea style={{ minHeight: 96 }}
              placeholder="예: 수료 후 1개월 현장 동행, 장비 구매 할인, 수료증 발급"
              value={form.benefits} onChange={set("benefits")} />
          </Field>
        </Section>

        <Section>
          <SecTitle>대표 사진 · 담당자</SecTitle>
          <Field>
            <Label>현장 실습 사진 또는 강사 프로필 (최대 {MAX_PHOTOS}장)</Label>
            <PhotoRow>
              {photos.map((p, i) => (
                <PhotoItem key={p.url}>
                  <img src={p.url} alt="" />
                  {i === 0 && <PhotoMain>대표</PhotoMain>}
                  <PhotoDel type="button" onClick={() => removePhoto(i)} aria-label="사진 삭제"><IoCloseCircle size={22} /></PhotoDel>
                </PhotoItem>
              ))}
              {photos.length < MAX_PHOTOS && (
                <PhotoAdd type="button" onClick={() => fileRef.current?.click()}>
                  <IoCameraOutline size={24} />
                  <span>{photos.length}/{MAX_PHOTOS}</span>
                </PhotoAdd>
              )}
            </PhotoRow>
            <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={onPickPhotos} />
            <Hint>첫 번째 사진이 목록 카드에 보입니다. 사진이 있는 공고가 문의를 더 많이 받습니다.</Hint>
          </Field>
          <Field id="field-instructor">
            <Label>강사명 / 업체명<Req>*</Req></Label>
            <Input placeholder="예: 김OO 마스터 (OO설비)" value={form.instructor} onChange={set("instructor")} />
            <Err k="instructor" />
          </Field>
          <Field id="field-contactPhone">
            <Label>전화 문의 번호</Label>
            <Input type="tel" placeholder="010-0000-0000" value={form.contactPhone} onChange={set("contactPhone")} />
            <Hint>비워두면 수강생은 채팅으로만 문의할 수 있습니다.</Hint>
            <Err k="contactPhone" />
          </Field>
        </Section>

        <Disclaimer>
          홈프로는 교육 정보 제공 및 연결 서비스만 제공하며, 교육 품질·계약 조건·비용·교육 결과에 대한 책임은 교육 개설자에게 있습니다. 허위·과장 공고는 관리자가 내릴 수 있으며, 이 경우 차감된 포인트는 돌려드리지 않습니다.
        </Disclaimer>
      </PageWrap>

      <RegionSelectModal
        open={showRegionModal}
        onClose={() => setShowRegionModal(false)}
        onSelect={(r) => setRegion(r)}
        defaultValue={region}
      />

      {showShortage && (
        <Overlay onClick={() => setShowShortage(false)}>
          <Sheet onClick={(e) => e.stopPropagation()}>
            <SheetTitle>H-포인트가 부족합니다</SheetTitle>
            <SheetText>교육 공고를 등록하려면 2만 H-포인트가 필요합니다. 포인트는 아래 활동을 통해 쉽고 빠르게 모으실 수 있습니다!</SheetText>
            <BalRow>
              <span>보유 포인트</span><b>{Number(balance || 0).toLocaleString()}P</b>
            </BalRow>
            <BalRow>
              <span>부족한 포인트</span><b>{Math.max(0, TRAINING_POST_COST - Number(balance || 0)).toLocaleString()}P</b>
            </BalRow>
            <WayList>
              {POINT_WAYS.map(([t, d]) => (
                <WayItem key={t}><b>{t}</b><span>{d}</span></WayItem>
              ))}
            </WayList>
            <SheetActions>
              <SheetOutline type="button" onClick={() => navigate("/referral/points")}>포인트 내역</SheetOutline>
              <SheetPrimary type="button" onClick={() => navigate("/MobileConfig")}>친구 초대하기</SheetPrimary>
            </SheetActions>
            <SheetClose type="button" onClick={() => setShowShortage(false)}>닫기</SheetClose>
          </Sheet>
        </Overlay>
      )}

      <SubmitBar>
        <SubmitBtn onClick={handleSubmit} disabled={saving}>
          {saving ? "등록 중..." : `${TRAINING_POST_COST.toLocaleString()}P 사용하고 공고 등록`}
        </SubmitBtn>
      </SubmitBar>
    </SimpleBackLayout>
  );
};

export default TrainingCreatePage;

/* ─── styles ─── */
const PageWrap = styled.div` padding: 12px 12px 110px; background: ${THEME.background}; `;
const PointBox = styled.div`
  background: ${THEME.surface}; border: 1px solid #e3e6ec; border-radius: 12px; padding: 16px 18px; margin-bottom: 12px;
`;
const PointHead = styled.div` display: flex; align-items: baseline; justify-content: space-between; gap: 8px; margin-bottom: 6px; `;
const PointTitle = styled.div` font-size: 16px; font-weight: 700; color: ${THEME.text}; `;
const PointBal = styled.div` font-size: 15px; font-weight: 700; color: ${THEME.primaryDark}; flex: none; `;
const PointDesc = styled.div` font-size: 14px; line-height: 1.55; color: #2b2f36; word-break: keep-all; `;
const Section = styled.div`
  background: ${THEME.surface}; border: 1px solid #eceef2; border-radius: 12px; padding: 20px 18px 6px; margin-bottom: 12px;
`;
const SecTitle = styled.div` font-size: 17px; font-weight: 700; color: ${THEME.text}; margin-bottom: 18px; `;
const Field = styled.div` margin-bottom: 22px; `;
const Label = styled.div` font-size: 15px; font-weight: 600; color: ${THEME.text}; margin-bottom: 9px; `;
const SubLabel = styled.div` font-size: 14px; font-weight: 600; color: #2b2f36; margin: 14px 0 8px; `;
const SmallCap = styled.div` font-size: 13px; color: #2b2f36; margin-bottom: 6px; `;
const Req = styled.span` color: ${THEME.danger}; margin-left: 2px; `;
const Hint = styled.div` margin-top: 8px; font-size: 13px; color: ${THEME.muted}; line-height: 1.5; word-break: keep-all; `;
const ErrText = styled.div` margin-top: 8px; font-size: 14px; color: ${THEME.danger}; font-weight: 600; `;
const Input = styled.input`
  width: 100%; box-sizing: border-box; height: 48px; padding: 0 14px; border: 1px solid #d9dde3; border-radius: 10px;
  font-size: 16px; font-family: inherit; color: ${THEME.text}; background: ${THEME.surface}; outline: none;
  &:focus { border-color: ${THEME.primaryDark}; }
  &::placeholder { color: #8a929d; }
`;
const Textarea = styled.textarea`
  width: 100%; box-sizing: border-box; min-height: 150px; padding: 12px 14px; border: 1px solid #d9dde3; border-radius: 10px;
  font-size: 16px; line-height: 1.55; font-family: inherit; color: ${THEME.text}; resize: vertical; outline: none;
  &:focus { border-color: ${THEME.primaryDark}; }
  &::placeholder { color: #8a929d; }
`;
const TwoCol = styled.div` display: grid; grid-template-columns: 1fr 1fr; gap: 10px; `;
const InputUnit = styled.div` position: relative; input { padding-right: 34px; } `;
const Unit = styled.span` position: absolute; right: 12px; top: 50%; transform: translateY(-50%); font-size: 15px; color: #2b2f36; `;
const ChoiceGrid = styled.div` display: grid; grid-template-columns: repeat(${({ $cols }) => $cols}, 1fr); gap: 8px; `;
const ChoiceWrap = styled.div` display: flex; flex-wrap: wrap; gap: 8px; `;
const Choice = styled.button`
  min-height: 46px; padding: 8px 12px; border-radius: 10px; font-size: 15px; font-family: inherit; cursor: pointer;
  line-height: 1.3; word-break: keep-all;
  border: 1px solid ${({ $active }) => ($active ? THEME.primaryDark : "#d9dde3")};
  box-shadow: ${({ $active }) => ($active ? `inset 0 0 0 1px ${THEME.primaryDark}` : "none")};
  background: ${THEME.surface};
  color: ${({ $active }) => ($active ? THEME.primaryDark : THEME.text)};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
`;
const RegionBtn = styled.button`
  width: 100%; height: 48px; margin-top: 10px; padding: 0 14px; text-align: left; border: 1px solid #d9dde3; border-radius: 10px;
  background: ${THEME.surface}; font-size: 16px; font-family: inherit; cursor: pointer;
  color: ${({ $empty }) => ($empty ? "#8a929d" : THEME.text)};
`;
const PhotoRow = styled.div` display: flex; flex-wrap: wrap; gap: 8px; `;
const PhotoItem = styled.div`
  position: relative; width: 76px; height: 76px; border-radius: 8px; overflow: hidden; background: #eef0f3;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;
const PhotoMain = styled.span`
  position: absolute; left: 0; bottom: 0; right: 0; text-align: center; font-size: 13px; color: #fff; background: rgba(20,24,31,0.6); padding: 2px 0;
`;
const PhotoDel = styled.button`
  position: absolute; top: 2px; right: 2px; padding: 0; border: none; background: none; color: #fff; cursor: pointer;
  filter: drop-shadow(0 1px 2px rgba(0,0,0,0.5)); display: flex;
`;
const PhotoAdd = styled.button`
  width: 76px; height: 76px; border-radius: 8px; border: 1px dashed #b9bfc8; background: ${THEME.surface}; cursor: pointer;
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; color: #2b2f36; font-family: inherit;
  span { font-size: 13px; }
`;
const Disclaimer = styled.div` font-size: 13px; line-height: 1.6; color: ${THEME.muted}; padding: 4px 4px 0; word-break: keep-all; `;
const SubmitBar = styled.div`
  position: fixed; bottom: 0; left: 50%; transform: translateX(-50%); width: 100%; max-width: var(--app-max, 400px); box-sizing: border-box;
  padding: 12px 12px calc(12px + env(safe-area-inset-bottom, 0px)); background: ${THEME.surface};
  box-shadow: 0 -1px 4px rgba(0,0,0,0.06); z-index: 100;
`;
const SubmitBtn = styled.button`
  width: 100%; height: 52px; background: ${THEME.button}; color: #fff; border: none; border-radius: 10px;
  font-size: 17px; font-weight: 700; cursor: pointer; font-family: inherit;
  &:disabled { background: #b8c0ca; }
`;
const Overlay = styled.div` position: fixed; inset: 0; background: rgba(0,0,0,0.45); z-index: 1000; display: flex; align-items: flex-end; justify-content: center; `;
const Sheet = styled.div`
  width: 100%; max-width: var(--app-max, 400px); max-height: 88vh; overflow-y: auto; background: #fff; border-radius: 16px 16px 0 0;
  padding: 22px 18px calc(18px + env(safe-area-inset-bottom, 0px)); box-sizing: border-box;
`;
const SheetTitle = styled.div` font-size: 19px; font-weight: 700; color: ${THEME.text}; margin-bottom: 10px; `;
const SheetText = styled.div` font-size: 15px; line-height: 1.6; color: #2b2f36; margin-bottom: 14px; word-break: keep-all; `;
const BalRow = styled.div`
  display: flex; justify-content: space-between; font-size: 15px; padding: 9px 0; border-bottom: 1px solid #eceef2;
  span { color: #2b2f36; } b { color: ${THEME.text}; }
`;
const WayList = styled.div` margin-top: 14px; border: 1px solid #eceef2; border-radius: 10px; `;
const WayItem = styled.div`
  display: flex; justify-content: space-between; gap: 10px; padding: 12px 14px; font-size: 15px;
  & + & { border-top: 1px solid #eceef2; }
  b { font-weight: 600; color: ${THEME.text}; } span { color: #2b2f36; text-align: right; }
`;
const SheetActions = styled.div` display: flex; gap: 8px; margin-top: 16px; `;
const SheetOutline = styled.button`
  flex: 1; height: 48px; border-radius: 10px; border: 1px solid #d5d9e0; background: #fff; color: ${THEME.text};
  font-size: 15px; font-weight: 600; font-family: inherit; cursor: pointer;
`;
const SheetPrimary = styled.button`
  flex: 1; height: 48px; border-radius: 10px; border: none; background: ${THEME.button}; color: #fff;
  font-size: 15px; font-weight: 700; font-family: inherit; cursor: pointer;
`;
const SheetClose = styled.button`
  width: 100%; height: 44px; margin-top: 8px; border: none; background: none; color: #2b2f36; font-size: 15px; font-family: inherit; cursor: pointer;
`;
