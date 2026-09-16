/* eslint-disable */
// 양도·매매 매물 등록 — 월 구독 사업자 전용 (대표 리뷰 2026-09)
// 필수: 거래 형태 · 제목 · 시도/시군구 · 권리금 · 상세 설명 · 양도 사유
// 보증금/월세는 사업장/공간 양도에서만 입력
import React, { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { IoCloseCircle } from "react-icons/io5";
import { db, storage } from "../../api/config";
import { useAuth } from "../../context/AuthContext";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME, STORAGE_PATH_PREFIX } from "../../config/homeproConfig";
import { compressDetailImage } from "../../utility/imageUtils";
import { isSubscriber } from "../../utility/tierUtils";
import { KR_AREAS } from "../../utility/constants";
import { MARKET_COLLECTION, CATEGORIES, INCLUDE_OPTIONS, SALES_RANGES, TabBox, TabItem } from "./MarketplaceShared";

const MAX_PHOTOS = 4;

const onlyDigits = (v) => String(v || "").replace(/[^0-9]/g, "");
const withComma = (v) => (v === "" ? "" : Number(v).toLocaleString());

const MarketplaceCreatePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const canWrite = isSubscriber(userData);

  const [category, setCategory] = useState("");
  const [title, setTitle] = useState("");
  const [sido, setSido] = useState("");
  const [gu, setGu] = useState("");
  const [premium, setPremium] = useState(""); // 원, 숫자 문자열
  const [depositMan, setDepositMan] = useState("");
  const [monthlyRentMan, setMonthlyRentMan] = useState("");
  const [monthlySales, setMonthlySales] = useState("");
  const [staffInfo, setStaffInfo] = useState("");
  const [includes, setIncludes] = useState([]);
  const [description, setDescription] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const [photos, setPhotos] = useState([]);
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const isSpace = category === "space";
  const guList = KR_AREAS.find((a) => a.sido === sido)?.guList || [];

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2200); };

  const toggleInclude = (key) =>
    setIncludes((prev) => (prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]));

  const handlePhotoAdd = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const toProcess = files.slice(0, MAX_PHOTOS - photos.length);
    try {
      const compressed = await Promise.all(
        toProcess.map(async (f) => {
          const file = await compressDetailImage(f, 800, 0.7);
          return { preview: URL.createObjectURL(file), file };
        })
      );
      setPhotos((prev) => [...prev, ...compressed]);
    } catch (err) {
      console.error("사진 압축 실패:", err);
      showToast("사진 처리에 실패했습니다");
    }
    e.target.value = "";
  };

  const handlePhotoRemove = (idx) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  const handleSubmit = async () => {
    if (!canWrite) return showToast("월 구독 사업자만 등록할 수 있습니다");
    if (!category) return showToast("거래 형태를 선택해주세요");
    if (!title.trim()) return showToast("제목을 입력해주세요");
    if (!sido || !gu) return showToast("지역(시·도 / 시·군·구)을 선택해주세요");
    if (premium === "") return showToast("권리금을 입력해주세요 (없으면 0)");
    if (!description.trim()) return showToast("상세 설명을 입력해주세요");
    if (!transferReason.trim()) return showToast("양도 사유를 입력해주세요");
    if (submitting) return;
    setSubmitting(true);
    try {
      const uid = userData?.uid || "anon";
      const imageURLs = await Promise.all(
        photos.map(async (p, i) => {
          const path = `${STORAGE_PATH_PREFIX}/marketplace/${uid}/${Date.now()}_${i}.jpg`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, p.file, { contentType: "image/jpeg" });
          return getDownloadURL(storageRef);
        })
      );

      await addDoc(collection(db, MARKET_COLLECTION), {
        category,
        title: title.trim(),
        regionSido: sido,
        regionGu: gu,
        region: `${sido} ${gu}`,
        premium: Number(premium),
        depositMan: isSpace && depositMan !== "" ? Number(depositMan) : null,
        monthlyRentMan: isSpace && monthlyRentMan !== "" ? Number(monthlyRentMan) : null,
        monthlySales: monthlySales || null,
        staffInfo: staffInfo.trim() || null,
        includes,
        description: description.trim(),
        transferReason: transferReason.trim(),
        images: imageURLs,
        status: "open",
        createdBy: userData?.uid || null,
        writer: userData?.companyName || userData?.nickname || userData?.name || "",
        writerPhoto: userData?.profileImage || userData?.photoURL || "",
        authorPhone: userData?.phoneE164 || userData?.phone || "",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      showToast("등록되었습니다");
      setTimeout(() => navigate(-1), 600);
    } catch (e) {
      console.error(e);
      showToast("등록에 실패했습니다");
    } finally {
      setSubmitting(false);
    }
  };

  if (!canWrite) {
    return (
      <SimpleBackLayout NAME="양도·매매 등록" hideFooter>
        <PageWrap>
          <GateBox>
            <GateTitle>월 구독 사업자 전용</GateTitle>
            <GateText>
              양도·매매 매물 등록은 부실 공고와 허위 매물을 막기 위해 월 구독 사업자에게만 열려 있습니다.
              매물 열람과 문의는 구독 없이도 할 수 있습니다.
            </GateText>
            <GateBtn type="button" onClick={() => navigate("/subscription")}>구독 안내 보기</GateBtn>
          </GateBox>
        </PageWrap>
      </SimpleBackLayout>
    );
  }

  return (
    <SimpleBackLayout NAME="양도·매매 등록" hideFooter>
      <PageWrap>
        <Section>
          <SecTitle>기본 정보</SecTitle>
          <Label>거래 형태 <Req>필수</Req></Label>
          <TabBox>
            {CATEGORIES.map((c) => (
              <TabItem key={c.key} type="button" $active={category === c.key} onClick={() => setCategory(c.key)}>
                {c.formLabel}
              </TabItem>
            ))}
          </TabBox>
          {category && <Help>{CATEGORIES.find((c) => c.key === category)?.desc}</Help>}

          <Label>제목 <Req>필수</Req></Label>
          <Input value={title} maxLength={60} onChange={(e) => setTitle(e.target.value)} placeholder="예: 고정 거래처 20곳 포함 수도권 청소 사업권 양도" />

          <Label>지역 <Req>필수</Req></Label>
          <Row2>
            <Select value={sido} onChange={(e) => { setSido(e.target.value); setGu(""); }}>
              <option value="">시·도</option>
              {KR_AREAS.map((a) => <option key={a.sido} value={a.sido}>{a.sido}</option>)}
            </Select>
            <Select value={gu} disabled={!sido} onChange={(e) => setGu(e.target.value)}>
              <option value="">시·군·구</option>
              {guList.map((g) => <option key={g} value={g}>{g}</option>)}
            </Select>
          </Row2>
        </Section>

        <Section>
          <SecTitle>금액 정보</SecTitle>
          <Label>권리금 <Req>필수</Req></Label>
          <UnitInput>
            <Input inputMode="numeric" value={withComma(premium)} onChange={(e) => setPremium(onlyDigits(e.target.value))} placeholder="권리금이 없으면 0" />
            <Unit>원</Unit>
          </UnitInput>

          <Label $muted={!isSpace}>보증금 / 월세</Label>
          <Row2>
            <UnitInput>
              <Input inputMode="numeric" disabled={!isSpace} value={isSpace ? withComma(depositMan) : ""} onChange={(e) => setDepositMan(onlyDigits(e.target.value))} placeholder="보증금" />
              <Unit>만원</Unit>
            </UnitInput>
            <UnitInput>
              <Input inputMode="numeric" disabled={!isSpace} value={isSpace ? withComma(monthlyRentMan) : ""} onChange={(e) => setMonthlyRentMan(onlyDigits(e.target.value))} placeholder="월세" />
              <Unit>만원</Unit>
            </UnitInput>
          </Row2>
          <Help>{isSpace ? "오프라인 사업장 조건을 적어주세요. 없으면 비워두세요." : "사업장/공간 양도를 선택하면 입력할 수 있습니다."}</Help>
        </Section>

        <Section>
          <SecTitle>운영 현황 및 조건</SecTitle>
          <Label>월 평균 매출 수준</Label>
          <Select value={monthlySales} onChange={(e) => setMonthlySales(e.target.value)}>
            <option value="">선택 안 함</option>
            {SALES_RANGES.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>

          <Label>상주 인력 현황</Label>
          <Input value={staffInfo} maxLength={60} onChange={(e) => setStaffInfo(e.target.value)} placeholder="예: 대표 포함 3명 근무" />

          <Label>포함 내역</Label>
          <CheckGrid>
            {INCLUDE_OPTIONS.map((o) => (
              <CheckItem key={o.key}>
                <input type="checkbox" checked={includes.includes(o.key)} onChange={() => toggleInclude(o.key)} />
                <span>{o.label}</span>
              </CheckItem>
            ))}
          </CheckGrid>
        </Section>

        <Section>
          <SecTitle>상세 설명 및 양도 사유</SecTitle>
          <Label>상세 설명 <Req>필수</Req></Label>
          <Textarea rows={6} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="거래처 구성, 시설·장비 상태, 인수 후 지원 내용 등" />
          <Label>양도 사유 <Req>필수</Req></Label>
          <Textarea rows={3} value={transferReason} onChange={(e) => setTransferReason(e.target.value)} placeholder="예: 건강상의 이유, 타 업종 전환, 은퇴 등 솔직하게 적을수록 신뢰도가 올라갑니다" />

          <Label>사진 첨부 <Count>({photos.length}/{MAX_PHOTOS})</Count></Label>
          <PhotoGrid>
            {photos.map((p, i) => (
              <PhotoSlot key={i}>
                <PhotoImg src={p.preview} alt="" />
                <PhotoRemove type="button" onClick={() => handlePhotoRemove(i)} aria-label="사진 삭제">
                  <IoCloseCircle size={22} />
                </PhotoRemove>
              </PhotoSlot>
            ))}
            {photos.length < MAX_PHOTOS && (
              <PhotoAddSlot type="button" onClick={() => fileInputRef.current?.click()}>
                <span>+</span>
                <small>사진 추가</small>
              </PhotoAddSlot>
            )}
          </PhotoGrid>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoAdd} />
        </Section>

        <Guide>
          허위 매물·과장된 매출 기재·선입금 요구는 게시글 삭제 및 이용 제한 사유입니다.
          홈프로는 정보 등록·연결 서비스이며 거래 당사자가 아닙니다. 계약서 작성과 권리 관계 확인은 당사자 간에 진행해주세요.
        </Guide>

        <SubmitBtn type="button" onClick={handleSubmit} disabled={submitting}>
          {submitting ? "등록 중..." : "매물 등록하기"}
        </SubmitBtn>
      </PageWrap>
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default MarketplaceCreatePage;

/* ===================== styles ===================== */
const PageWrap = styled.div`
  background: ${THEME.background};
  min-height: 100%;
  padding: 12px 16px 48px;
`;

const Section = styled.div`
  background: #fff;
  border: 1px solid #e2e5ea;
  padding: 18px 16px 20px;
  margin-bottom: 12px;
`;

const SecTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 4px;
`;

const Label = styled.div`
  margin: 16px 0 8px;
  font-size: 15px;
  font-weight: 600;
  color: ${({ $muted }) => ($muted ? THEME.muted : THEME.text)};
`;

const Req = styled.span`
  margin-left: 4px;
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.danger};
`;

const Count = styled.span`
  margin-left: 4px;
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const Help = styled.div`
  margin-top: 8px;
  font-size: 14px;
  line-height: 1.55;
  color: ${THEME.textSecondary};
  word-break: keep-all;
`;

const fieldCss = `
  width: 100%;
  height: 46px;
  padding: 0 12px;
  font-size: 15px;
  font-family: inherit;
  color: ${THEME.text};
  border: 1px solid #d5d9e0;
  border-radius: 0;
  background: #fff;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${THEME.primaryDark}; }
  &:disabled { background: #f3f4f6; color: ${THEME.muted}; }
`;

const Input = styled.input`${fieldCss}`;
const Select = styled.select`${fieldCss}`;

const Textarea = styled.textarea`
  ${fieldCss}
  height: auto;
  padding: 10px 12px;
  line-height: 1.6;
  resize: vertical;
`;

const Row2 = styled.div`
  display: flex;
  gap: 8px;
  & > * { flex: 1; min-width: 0; }
`;

const UnitInput = styled.div`
  position: relative;
  input { padding-right: 48px; }
`;

const Unit = styled.span`
  position: absolute;
  right: 12px;
  top: 50%;
  transform: translateY(-50%);
  font-size: 14px;
  color: ${THEME.textSecondary};
  pointer-events: none;
`;

const CheckGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  @media (max-width: 360px) { grid-template-columns: 1fr; }
`;

const CheckItem = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 10px;
  border: 1px solid #d5d9e0;
  font-size: 15px;
  color: ${THEME.text};
  cursor: pointer;
  word-break: keep-all;
  input { width: 18px; height: 18px; accent-color: ${THEME.primaryDark}; flex: none; }
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const PhotoSlot = styled.div`
  position: relative;
  aspect-ratio: 1 / 1;
  overflow: hidden;
  background: ${THEME.background};
`;

const PhotoImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

const PhotoRemove = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  width: 24px;
  height: 24px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
`;

const PhotoAddSlot = styled.button`
  aspect-ratio: 1 / 1;
  border: 1px dashed #c5cad3;
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  cursor: pointer;
  font-family: inherit;
  color: ${THEME.textSecondary};
  span { font-size: 24px; line-height: 1; }
  small { font-size: 13px; }
`;

const Guide = styled.div`
  margin: 4px 0 16px;
  font-size: 14px;
  line-height: 1.6;
  color: ${THEME.textSecondary};
  word-break: keep-all;
`;

const SubmitBtn = styled.button`
  width: 100%;
  height: 52px;
  border: none;
  border-radius: 8px;
  background: ${({ disabled }) => (disabled ? THEME.muted : THEME.primary)};
  color: #fff;
  font-size: 17px;
  font-weight: 700;
  font-family: inherit;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
`;

const Toast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 18px;
  background: rgba(0, 0, 0, 0.82);
  color: #fff;
  font-size: 15px;
  border-radius: 8px;
  z-index: 1000;
  white-space: nowrap;
`;

const GateBox = styled.div`
  margin-top: 28px;
  padding: 28px 20px;
  background: #fff;
  border: 1px solid #e2e5ea;
  text-align: center;
`;

const GateTitle = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 12px;
`;

const GateText = styled.div`
  font-size: 15px;
  line-height: 1.65;
  color: ${THEME.textSecondary};
  word-break: keep-all;
`;

const GateBtn = styled.button`
  margin-top: 20px;
  height: 48px;
  padding: 0 24px;
  border: none;
  border-radius: 8px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: pointer;
`;
