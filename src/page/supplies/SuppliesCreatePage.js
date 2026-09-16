/* eslint-disable */
// 자재·장비 거래글 등록 (대표 스펙 9/15)
// 권한: 무료나눔 = 로그인 회원 누구나 / 판매·구매요청 = 월 구독 회원만 (금전 거래)
import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { IoCloseCircle, IoCameraOutline, IoCheckmark } from "react-icons/io5";
import { db, storage } from "../../api/config";
import { useAuth } from "../../context/AuthContext";
import { THEME, STORAGE_PATH_PREFIX } from "../../config/homeproConfig";
import { isSubscriber } from "../../utility/tierUtils";
import { compressDetailImage } from "../../utility/imageUtils";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import RegionSelectModal from "../../modal/RegionSelectModal";
import {
  SUPPLIES_COL, TRADE_TYPES, CATEGORIES, CONDITIONS, DEAL_METHODS, needsSubscription,
  toLocalPhone, LINE, ACTIVE_FACE, INK_BUTTON,
} from "./suppliesConstants";

const MAX_PHOTOS = 5;

const SuppliesCreatePage = () => {
  const navigate = useNavigate();
  const { userData, isLoggedIn, loading: authLoading } = useAuth();
  const subscribed = isSubscriber(userData);

  const [tradeType, setTradeType] = useState("");
  const [category, setCategory] = useState("");
  const [condition, setCondition] = useState("");
  const [title, setTitle] = useState("");
  const [price, setPrice] = useState("");
  const [negotiable, setNegotiable] = useState(null); // true=네고 가능, false=제안 불가
  const [dealMethods, setDealMethods] = useState([]);
  const [directPlace, setDirectPlace] = useState("");
  const [region, setRegion] = useState(null);
  const [showRegionModal, setShowRegionModal] = useState(false);
  const [description, setDescription] = useState("");
  const [contactPhone, setContactPhone] = useState(() => toLocalPhone(userData?.phoneE164 || userData?.phone || ""));
  const [photos, setPhotos] = useState([]); // [{ preview, file }]
  const fileRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 2500);
  };

  // 회원 정보가 늦게 로드되는 경우 연락처 기본값 채우기
  useEffect(() => {
    const p = toLocalPhone(userData?.phoneE164 || userData?.phone || "");
    if (p) setContactPhone((cur) => cur || p);
  }, [userData?.phoneE164, userData?.phone]);

  const blocked = needsSubscription(tradeType) && !subscribed;
  const isFree = tradeType === "free";
  const isBuy = tradeType === "buy";

  const toggleMethod = (k) =>
    setDealMethods((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  const handlePhotoAdd = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    const toProcess = files.slice(0, MAX_PHOTOS - photos.length);
    try {
      const done = await Promise.all(
        toProcess.map(async (f) => {
          const file = await compressDetailImage(f, 1000, 0.75);
          return { preview: URL.createObjectURL(file), file };
        })
      );
      setPhotos((prev) => [...prev, ...done]);
    } catch (err) {
      console.error("사진 처리 실패:", err);
      showToast("사진을 처리하지 못했습니다");
    }
  };

  const removePhoto = (idx) =>
    setPhotos((prev) => {
      try { URL.revokeObjectURL(prev[idx].preview); } catch (e) {}
      return prev.filter((_, i) => i !== idx);
    });

  const handleSubmit = async () => {
    if (saving) return;
    if (!isLoggedIn || !userData?.uid) return showToast("로그인 후 등록할 수 있습니다");
    if (!tradeType) return showToast("거래 종류를 선택해주세요");
    if (blocked) return showToast("판매·구매요청은 월 구독 회원만 등록할 수 있습니다");
    if (!category) return showToast("카테고리를 선택해주세요");
    if (!condition) return showToast(isBuy ? "원하는 물품 상태를 선택해주세요" : "물품 상태를 선택해주세요");
    if (!title.trim()) return showToast("제목을 입력해주세요");
    const priceNum = Number(String(price).replace(/[^0-9]/g, ""));
    if (tradeType === "sale" && !(priceNum > 0)) return showToast("판매 가격을 입력해주세요");
    if (!isFree && negotiable === null) return showToast("네고 가능 여부를 선택해주세요");
    if (!dealMethods.length) return showToast("거래 방법을 선택해주세요");
    if (dealMethods.includes("direct") && !directPlace.trim()) return showToast("직거래 장소를 입력해주세요");
    if (!region) return showToast("지역을 선택해주세요");
    if (!description.trim()) return showToast("상세 설명을 입력해주세요");

    setSaving(true);
    try {
      const uid = userData.uid;
      const images = await Promise.all(
        photos.map(async (p, i) => {
          const path = `${STORAGE_PATH_PREFIX}/supplies/${uid}/${Date.now()}_${i}.jpg`;
          const r = ref(storage, path);
          await uploadBytes(r, p.file, { contentType: "image/jpeg" });
          return getDownloadURL(r);
        })
      );

      const docRef = await addDoc(collection(db, SUPPLIES_COL), {
        tradeType,
        category,
        condition,
        title: title.trim(),
        price: isFree ? 0 : priceNum > 0 ? priceNum : null,
        negotiable: isFree ? false : !!negotiable,
        dealMethods: DEAL_METHODS.map((m) => m.key).filter((k) => dealMethods.includes(k)),
        directPlace: dealMethods.includes("direct") ? directPlace.trim() : "",
        region,
        location: `${region.sido} ${region.gu === "전체" ? "" : region.gu}`.trim(),
        description: description.trim(),
        contactPhone: contactPhone.trim(),
        images,
        status: "active",
        createdBy: uid,
        authorName: userData?.companyName || userData?.nickname || userData?.name || "",
        authorPhoto: userData?.profileImage || userData?.photoURL || "",
        authorSubscribed: subscribed,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      navigate(`/supplies/${docRef.id}`, { replace: true });
    } catch (e) {
      console.error("자재·장비 등록 실패:", e);
      showToast("등록에 실패했습니다. 잠시 후 다시 시도해주세요");
    } finally {
      setSaving(false);
    }
  };

  if (!isLoggedIn && !authLoading) {
    return (
      <SimpleBackLayout NAME="자재·장비 등록" hideFooter>
        <Wrapper>
          <Section>
            <SectionTitle>로그인이 필요합니다</SectionTitle>
            <Guide>자재·장비 거래글은 로그인한 회원만 등록할 수 있습니다.</Guide>
            <OutlineBtn type="button" onClick={() => navigate("/MobileLogin")}>로그인하러 가기</OutlineBtn>
          </Section>
        </Wrapper>
      </SimpleBackLayout>
    );
  }

  return (
    <SimpleBackLayout NAME="자재·장비 등록" hideFooter>
      <Wrapper>
        {/* 거래 종류 + 권한 안내 */}
        <Section>
          <Label>거래 종류<Req>*</Req></Label>
          <Seg>
            {TRADE_TYPES.map((t) => (
              <SegCell key={t.key} type="button" $active={tradeType === t.key} onClick={() => setTradeType(t.key)}>
                {t.label}
              </SegCell>
            ))}
          </Seg>
          <Guide>
            무료나눔은 모든 회원이 등록할 수 있고, 돈이 오가는 판매·구매요청은 월 구독 회원만 등록할 수 있습니다.
          </Guide>
          {blocked && (
            <Notice>
              <NoticeTitle>월 구독 회원 전용입니다</NoticeTitle>
              <NoticeText>
                상업적 도배·사기 매물·분쟁을 막기 위해 판매·구매요청 글은 월 구독 회원에게만 열려 있습니다.
                쓰고 남은 자재나 안 쓰는 수공구라면 무료나눔으로 올릴 수 있습니다.
              </NoticeText>
              <NoticeActions>
                <OutlineBtn type="button" onClick={() => navigate("/subscription")}>월 구독 알아보기</OutlineBtn>
                <OutlineBtn type="button" onClick={() => setTradeType("free")}>무료나눔으로 올리기</OutlineBtn>
              </NoticeActions>
            </Notice>
          )}
        </Section>

        {!blocked && tradeType && (
          <>
            <Section>
              <Field>
                <Label>카테고리<Req>*</Req></Label>
                <Grid2>
                  {CATEGORIES.map((c) => (
                    <Option key={c.key} type="button" $active={category === c.key} onClick={() => setCategory(c.key)}>
                      <OptTitle>{c.label}</OptTitle>
                      <OptDesc>{c.hint}</OptDesc>
                    </Option>
                  ))}
                </Grid2>
              </Field>

              <Field>
                <Label>{isBuy ? "원하는 물품 상태" : "물품 상태"}<Req>*</Req></Label>
                <Grid2>
                  {CONDITIONS.map((c) => (
                    <Option key={c.key} type="button" $active={condition === c.key} onClick={() => setCondition(c.key)}>
                      <OptTitle>{c.label}</OptTitle>
                      {c.desc && <OptDesc>{c.desc}</OptDesc>}
                    </Option>
                  ))}
                </Grid2>
              </Field>

              <Field>
                <Label>제목<Req>*</Req></Label>
                <Input
                  maxLength={60}
                  placeholder={isBuy ? "예: 청음식 누수탐지기 구합니다" : isFree ? "예: 포세린 타일 600각 12장 나눔" : "예: 고압 세척기 2년 사용 판매"}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </Field>
            </Section>

            {!isFree && (
              <Section>
                <Field>
                  <Label>{isBuy ? "희망 가격" : "판매 가격"}{!isBuy && <Req>*</Req>}</Label>
                  <PriceWrap>
                    <Input
                      inputMode="numeric"
                      placeholder={isBuy ? "비워두면 가격 협의" : "숫자만 입력"}
                      value={price ? Number(price).toLocaleString() : ""}
                      onChange={(e) => setPrice(e.target.value.replace(/[^0-9]/g, "").slice(0, 10))}
                    />
                    <Unit>원</Unit>
                  </PriceWrap>
                </Field>
                <Field>
                  <Label>가격 조정<Req>*</Req></Label>
                  <Seg>
                    <SegCell type="button" $active={negotiable === true} onClick={() => setNegotiable(true)}>네고 가능</SegCell>
                    <SegCell type="button" $active={negotiable === false} onClick={() => setNegotiable(false)}>제안 불가</SegCell>
                  </Seg>
                </Field>
              </Section>
            )}

            <Section>
              <Field>
                <Label>거래 방법<Req>*</Req> <LabelSub>여러 개 선택 가능</LabelSub></Label>
                <Grid2>
                  {DEAL_METHODS.map((m) => {
                    const on = dealMethods.includes(m.key);
                    return (
                      <CheckOpt key={m.key} type="button" $active={on} onClick={() => toggleMethod(m.key)}>
                        <CheckBox $active={on}>{on && <IoCheckmark size={15} color="#fff" />}</CheckBox>
                        {m.label}
                      </CheckOpt>
                    );
                  })}
                </Grid2>
              </Field>
              {dealMethods.includes("direct") && (
                <Field>
                  <Label>직거래 장소<Req>*</Req></Label>
                  <Input
                    placeholder="예: 성수역 3번 출구 / 강서구 화곡동 창고"
                    value={directPlace}
                    onChange={(e) => setDirectPlace(e.target.value)}
                  />
                </Field>
              )}
              <Field>
                <Label>지역<Req>*</Req></Label>
                <SelectBtn type="button" $empty={!region} onClick={() => setShowRegionModal(true)}>
                  {region ? `${region.sido} ${region.gu}` : "지역 선택"}
                </SelectBtn>
              </Field>
              <Field>
                <Label>연락처 <LabelSub>비워두면 채팅으로만 연락받습니다</LabelSub></Label>
                <Input
                  inputMode="tel"
                  placeholder="010-0000-0000"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                />
              </Field>
            </Section>

            <Section>
              <Field>
                <Label>사진 <LabelSub>최대 {MAX_PHOTOS}장 · 상태가 보이게 찍어주세요</LabelSub></Label>
                <PhotoRow>
                  {photos.length < MAX_PHOTOS && (
                    <PhotoAdd type="button" onClick={() => fileRef.current?.click()}>
                      <IoCameraOutline size={24} color={THEME.text} />
                      <span>{photos.length}/{MAX_PHOTOS}</span>
                    </PhotoAdd>
                  )}
                  {photos.map((p, i) => (
                    <PhotoItem key={p.preview}>
                      <img src={p.preview} alt="" />
                      <PhotoDel type="button" onClick={() => removePhoto(i)} aria-label="사진 삭제">
                        <IoCloseCircle size={22} color="#14181F" />
                      </PhotoDel>
                    </PhotoItem>
                  ))}
                </PhotoRow>
                <input ref={fileRef} type="file" accept="image/*" multiple hidden onChange={handlePhotoAdd} />
              </Field>
              <Field>
                <Label>상세 설명<Req>*</Req></Label>
                <Textarea
                  placeholder={
                    isBuy
                      ? "원하는 모델·수량·사용 기간 등을 적어주세요"
                      : "수량·규격·구매 시기·사용 기간·하자 여부 등을 적어주세요"
                  }
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </Field>
            </Section>
          </>
        )}
      </Wrapper>

      <BottomBar>
        <SubmitButton type="button" onClick={handleSubmit} disabled={saving || !tradeType || blocked}>
          {saving ? "등록 중..." : blocked ? "월 구독 회원만 등록할 수 있습니다" : "등록하기"}
        </SubmitButton>
      </BottomBar>

      <RegionSelectModal
        open={showRegionModal}
        onClose={() => setShowRegionModal(false)}
        onSelect={(r) => setRegion(r)}
        defaultValue={region}
      />

      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default SuppliesCreatePage;

/* ─── styled ─── */

const Wrapper = styled.div`
  padding: 12px 16px 110px;
  background: ${THEME.background};
  min-height: 100%;
`;

const Section = styled.div`
  background: #fff;
  border: 1px solid ${LINE};
  padding: 18px 16px;
  margin-bottom: 12px;
`;

const SectionTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 8px;
`;

const Field = styled.div`
  margin-bottom: 22px;
  &:last-child { margin-bottom: 0; }
`;

const Label = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 9px;
`;

const LabelSub = styled.span`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-left: 4px;
`;

const Req = styled.span`
  color: ${THEME.danger};
  margin-left: 2px;
`;

const Guide = styled.div`
  font-size: 14px;
  line-height: 1.55;
  color: ${THEME.textSecondary};
  margin-top: 10px;
  word-break: keep-all;
`;

/* 탭바 기준 스타일 — 하나의 박스 + 사이 세로선 */
const Seg = styled.div`
  display: flex;
  border: 1px solid ${LINE};
`;

const SegCell = styled.button`
  flex: 1;
  height: 46px;
  border: none;
  border-left: 1px solid ${LINE};
  &:first-child { border-left: none; }
  background: ${({ $active }) => ($active ? ACTIVE_FACE : "#fff")};
  color: ${THEME.text};
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  font-family: inherit;
  cursor: pointer;
`;

const Grid2 = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
`;

const Option = styled.button`
  text-align: left;
  padding: 11px 12px;
  border: 1px solid ${({ $active }) => ($active ? THEME.text : LINE)};
  background: ${({ $active }) => ($active ? ACTIVE_FACE : "#fff")};
  font-family: inherit;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-height: 52px;
`;

const OptTitle = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
`;

const OptDesc = styled.span`
  font-size: 13px;
  line-height: 1.4;
  color: ${THEME.textSecondary};
  word-break: keep-all;
`;

const CheckOpt = styled.button`
  display: flex;
  align-items: center;
  gap: 8px;
  height: 48px;
  padding: 0 12px;
  border: 1px solid ${({ $active }) => ($active ? THEME.text : LINE)};
  background: ${({ $active }) => ($active ? ACTIVE_FACE : "#fff")};
  font-size: 15px;
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
  color: ${THEME.text};
  font-family: inherit;
  cursor: pointer;
  text-align: left;
`;

const CheckBox = styled.span`
  flex: none;
  width: 20px;
  height: 20px;
  border: 1.5px solid ${({ $active }) => ($active ? THEME.text : "#b8bec7")};
  background: ${({ $active }) => ($active ? THEME.text : "#fff")};
  display: flex;
  align-items: center;
  justify-content: center;
`;

const Input = styled.input`
  width: 100%;
  height: 48px;
  padding: 0 14px;
  font-size: 16px;
  font-family: inherit;
  border: 1px solid ${LINE};
  border-radius: 0;
  background: #fff;
  color: ${THEME.text};
  box-sizing: border-box;
  outline: none;
  &:focus { border-color: ${THEME.text}; }
  &::placeholder { color: ${THEME.muted}; }
`;

const PriceWrap = styled.div`
  position: relative;
  input { padding-right: 40px; }
`;

const Unit = styled.span`
  position: absolute;
  right: 14px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 16px;
  color: ${THEME.text};
`;

const Textarea = styled.textarea`
  width: 100%;
  min-height: 160px;
  padding: 12px 14px;
  font-size: 16px;
  line-height: 1.6;
  font-family: inherit;
  border: 1px solid ${LINE};
  border-radius: 0;
  background: #fff;
  color: ${THEME.text};
  box-sizing: border-box;
  outline: none;
  resize: vertical;
  &:focus { border-color: ${THEME.text}; }
  &::placeholder { color: ${THEME.muted}; }
`;

const SelectBtn = styled.button`
  width: 100%;
  height: 48px;
  padding: 0 14px;
  border: 1px solid ${LINE};
  background: #fff;
  text-align: left;
  font-size: 16px;
  font-family: inherit;
  color: ${({ $empty }) => ($empty ? THEME.muted : THEME.text)};
  cursor: pointer;
`;

const PhotoRow = styled.div`
  display: flex;
  gap: 8px;
  overflow-x: auto;
  padding-top: 4px;
`;

const PhotoAdd = styled.button`
  flex: none;
  width: 80px;
  height: 80px;
  border: 1px solid ${LINE};
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  font-size: 13px;
  color: ${THEME.text};
  font-family: inherit;
  cursor: pointer;
`;

const PhotoItem = styled.div`
  position: relative;
  flex: none;
  width: 80px;
  height: 80px;
  img { width: 100%; height: 100%; object-fit: cover; display: block; border: 1px solid ${LINE}; box-sizing: border-box; }
`;

const PhotoDel = styled.button`
  position: absolute;
  top: -4px;
  right: -4px;
  padding: 0;
  border: none;
  background: #fff;
  border-radius: 50%;
  line-height: 0;
  cursor: pointer;
`;

const Notice = styled.div`
  margin-top: 14px;
  padding: 14px;
  border: 1px solid ${LINE};
  background: #f7f8fa;
`;

const NoticeTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 6px;
`;

const NoticeText = styled.div`
  font-size: 14px;
  line-height: 1.6;
  color: ${THEME.text};
  word-break: keep-all;
`;

const NoticeActions = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-wrap: wrap;
  button { flex: 1 1 140px; }
`;

const OutlineBtn = styled.button`
  height: 44px;
  padding: 0 14px;
  border: 1px solid #c9ced6;
  background: #fff;
  color: ${THEME.text};
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  margin-top: 4px;
  &:active { background: ${ACTIVE_FACE}; }
`;

const BottomBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
  box-sizing: border-box;
  background: #fff;
  border-top: 1px solid ${LINE};
  z-index: 10;
`;

const SubmitButton = styled.button`
  width: 100%;
  height: 52px;
  font-size: 17px;
  font-weight: 700;
  font-family: inherit;
  color: #fff;
  background: ${INK_BUTTON};
  border: none;
  cursor: pointer;
  &:active { opacity: 0.88; }
  &:disabled { background: #aeb4bd; cursor: not-allowed; }
`;

const Toast = styled.div`
  position: fixed;
  bottom: 84px;
  left: 50%;
  transform: translateX(-50%);
  max-width: 360px;
  width: max-content;
  background: ${THEME.text};
  color: #fff;
  padding: 11px 18px;
  font-size: 15px;
  line-height: 1.4;
  text-align: center;
  z-index: 100;
`;
