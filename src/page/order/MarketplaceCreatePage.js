/* eslint-disable */
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

const MAX_PHOTOS = 4;

/* ─── 시트7 사양 ─── */
const TRADE_TYPES = ["시공도급", "작업도급", "사업권양도", "물품매매", "장비매매", "업체인수양도", "설치도급", "공사도급"];
const MEMBER_TYPES = ["개인", "사업자", "법인"];
const CONTRACT_TYPES = ["도급", "일괄매매", "부분양도", "협의"];

const MUST_NOTICES = [
  "허위 정보 등록금지",
  "계약 조건 명확히 기재",
  "선금 요구 사기 주의",
  "거래 전 계약서 작성 권장",
  "법적 권리 여부 확인",
];

const FORBIDDEN_ITEMS = [
  "불법 하도급",
  "무허가 공사",
  "허위매물",
  "불법 다단계",
  "선입금 사기",
];

const MarketplaceCreatePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const [tradeType, setTradeType] = useState("");
  const [memberType, setMemberType] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [managerName, setManagerName] = useState("");
  const [contact, setContact] = useState("");
  const [region, setRegion] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [contractType, setContractType] = useState("");
  const [description, setDescription] = useState("");
  const [photos, setPhotos] = useState([]); // [{ preview, file }]
  const fileInputRef = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");

  const handlePhotoAdd = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toProcess = files.slice(0, remaining);
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
      showToast("사진 처리 실패");
    }
    e.target.value = "";
  };

  const handlePhotoRemove = (idx) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  // TODO: 유료구독 회원 체크 (사양 R57~63) — 현재 placeholder
  const isSubscriber = userData?.subscription?.active === true || true; // 임시 통과

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  const handleSubmit = async () => {
    if (!isSubscriber) return showToast("유료구독 회원만 등록 가능합니다");
    if (!tradeType) return showToast("거래유형을 선택해주세요");
    if (!memberType) return showToast("회원유형을 선택해주세요");
    if (!title.trim()) return showToast("거래 제목을 입력해주세요");
    if (!description.trim()) return showToast("상세내용을 입력해주세요");
    setSubmitting(true);
    try {
      // 사진 업로드
      const imageURLs = await Promise.all(
        photos.map(async (p, i) => {
          const path = `${STORAGE_PATH_PREFIX}/marketplace/${userData?.uid || "anon"}/${Date.now()}_${i}.jpg`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, p.file, { contentType: "image/jpeg" });
          return getDownloadURL(storageRef);
        })
      );

      await addDoc(collection(db, "homepro_marketplace"), {
        tradeType,
        memberType,
        companyName: companyName.trim() || null,
        managerName: managerName.trim() || null,
        contact: contact.trim() || null,
        region: region.trim() || null,
        title: title.trim(),
        amount: amount ? Number(amount) : null,
        contractType: contractType || null,
        description: description.trim(),
        images: imageURLs,
        createdBy: userData?.uid || null,
        writer: userData?.nickname || userData?.name || "",
        writerPhoto: userData?.profileImage || userData?.photoURL || "",
        status: "active",
        createdAt: serverTimestamp(),
      });
      showToast("등록되었습니다");
      setTimeout(() => navigate(-1), 600);
    } catch (e) {
      console.error(e);
      showToast("등록 실패: " + (e.message || ""));
    } finally {
      setSubmitting(false);
    }
  };

  if (!isSubscriber) {
    return (
      <SimpleBackLayout NAME="도급·양도·매매" hideFooter>
        <PageWrap>
          <GateBox>
            <GateTitle>유료구독 회원 전용</GateTitle>
            <GateText>도급·양도·매매 게시판은 사업자 간 거래 정보 보호 및 서비스 품질 유지를 위해 유료구독 회원에게만 게시글 작성 및 열람이 제공됩니다.</GateText>
            <GateText>구독회원 가입 후 거래 정보 열람 및 등록이 가능합니다.</GateText>
            <GateBtn onClick={() => navigate("/subscription")}>구독신청</GateBtn>
          </GateBox>
        </PageWrap>
      </SimpleBackLayout>
    );
  }

  return (
    <SimpleBackLayout NAME="도급·양도·매매 등록" hideFooter>
      <PageWrap>
        {/* 면책 + 필수 안내 + 금지 항목 */}
        <DisclaimerBox>
          <strong>플랫폼 안내</strong>
          본 서비스는 거래 정보를 등록하고 거래 상대방을 연결하는 중개 정보 서비스입니다.
          홈프로는 거래 당사자가 아니며, 계약체결 및 거래 책임은 당사자 간에 있습니다.
        </DisclaimerBox>

        <NoticeBox $type="warn">
          <NoticeTitle>등록 전 필수 안내</NoticeTitle>
          {MUST_NOTICES.map((n) => <NoticeItem key={n}>· {n}</NoticeItem>)}
        </NoticeBox>

        <NoticeBox $type="danger">
          <NoticeTitle>금지 등록 항목 (위반 시 게시글 삭제·계정 정지·법적 조치)</NoticeTitle>
          {FORBIDDEN_ITEMS.map((n) => <NoticeItem key={n}>· {n}</NoticeItem>)}
        </NoticeBox>

        {/* 거래유형 */}
        <Section>
          <Label>거래유형</Label>
          <ChipRow>
            {TRADE_TYPES.map((t) => (
              <Chip key={t} $active={tradeType === t} type="button" onClick={() => setTradeType(t)}>{t}</Chip>
            ))}
          </ChipRow>
        </Section>

        {/* 회원유형 + 필수정보 */}
        <Section>
          <Label>회원유형</Label>
          <ChipRow>
            {MEMBER_TYPES.map((t) => (
              <Chip key={t} $active={memberType === t} type="button" onClick={() => setMemberType(t)}>{t}</Chip>
            ))}
          </ChipRow>
          <SubLabel style={{ marginTop: 12 }}>업체명</SubLabel>
          <Input value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="업체명" />
          <SubLabel style={{ marginTop: 8 }}>담당자명</SubLabel>
          <Input value={managerName} onChange={(e) => setManagerName(e.target.value)} placeholder="담당자명" />
          <SubLabel style={{ marginTop: 8 }}>연락처</SubLabel>
          <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="전화번호 또는 이메일" />
          <SubLabel style={{ marginTop: 8 }}>지역 (시·군·구)</SubLabel>
          <Input value={region} onChange={(e) => setRegion(e.target.value)} placeholder="예: 서울 강남구" />
        </Section>

        {/* 거래 정보 */}
        <Section>
          <Label>거래 제목</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="간략한 제목" />
          <SubLabel style={{ marginTop: 12 }}>거래금액 (원)</SubLabel>
          <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="협의 가능 시 비워두세요" />
          <SubLabel style={{ marginTop: 12 }}>계약방식</SubLabel>
          <ChipRow>
            {CONTRACT_TYPES.map((t) => (
              <Chip key={t} $active={contractType === t} type="button" onClick={() => setContractType(t)}>{t}</Chip>
            ))}
          </ChipRow>
        </Section>

        {/* 상세내용 */}
        <Section>
          <Label>상세내용</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="작업·거래내용, 규모, 계약조건, 대금지급방식, 진행 일정 등"
            rows={6}
          />
        </Section>

        {/* 사진 첨부 (최대 4장) */}
        <Section>
          <Label>사진 첨부 <PhotoCount>({photos.length}/{MAX_PHOTOS})</PhotoCount></Label>
          <PhotoGrid>
            {photos.map((p, i) => (
              <PhotoSlot key={i}>
                <PhotoImg src={p.preview} alt={`photo-${i}`} />
                <PhotoRemove type="button" onClick={() => handlePhotoRemove(i)}>
                  <IoCloseCircle size={22} />
                </PhotoRemove>
              </PhotoSlot>
            ))}
            {photos.length < MAX_PHOTOS && (
              <PhotoAddSlot type="button" onClick={() => fileInputRef.current?.click()}>
                <PhotoAddIcon>+</PhotoAddIcon>
                <PhotoAddLabel>사진 추가</PhotoAddLabel>
              </PhotoAddSlot>
            )}
          </PhotoGrid>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            style={{ display: "none" }}
            onChange={handlePhotoAdd}
          />
        </Section>

        <SubmitBtn onClick={handleSubmit} disabled={submitting}>
          {submitting ? "등록 중..." : "등록하기"}
        </SubmitBtn>
        <BottomSpacer />
      </PageWrap>
      {toast && <Toast>{toast}</Toast>}
    </SimpleBackLayout>
  );
};

export default MarketplaceCreatePage;

/* ===================== styles ===================== */
const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  background: ${THEME.background};
  min-height: 100%;
`;

const DisclaimerBox = styled.div`
  margin: 8px 12px;
  padding: 12px 14px;
  background: #FEF3C7;
  border-radius: 10px;
  font-size: 12px;
  color: #92400E;
  line-height: 1.5;
  strong {
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
    color: #78350F;
  }
`;

const NoticeBox = styled.div`
  margin: 6px 12px;
  padding: 12px 14px;
  border-radius: 10px;
  font-size: 12px;
  line-height: 1.6;
  background: ${({ $type }) => ($type === "danger" ? "#FEE2E2" : "#DBEAFE")};
  color: ${({ $type }) => ($type === "danger" ? "#991B1B" : "#1E3A8A")};
`;

const NoticeTitle = styled.div`
  font-weight: 700;
  font-size: 13px;
  margin-bottom: 6px;
`;

const NoticeItem = styled.div``;

const Section = styled.div`
  background: #fff;
  margin: 8px 12px;
  padding: 16px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
`;

const Label = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 10px;
`;

const SubLabel = styled.div`
  font-size: 12px;
  color: ${THEME.muted};
  margin-bottom: 6px;
`;

const ChipRow = styled.div`
  display: flex;
  gap: 6px;
  flex-wrap: wrap;
`;

const Chip = styled.button`
  padding: 6px 12px;
  font-size: 12px;
  font-weight: 600;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  border-radius: 16px;
  background: ${({ $active }) => ($active ? THEME.primary : "#fff")};
  color: ${({ $active }) => ($active ? "#fff" : THEME.muted)};
  cursor: pointer;
`;

const Input = styled.input`
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: #fff;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${THEME.primary}; }
`;

const Textarea = styled.textarea`
  width: 100%;
  padding: 10px 12px;
  font-size: 13px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  background: #fff;
  resize: none;
  font-family: inherit;
  box-sizing: border-box;
  &:focus { outline: none; border-color: ${THEME.primary}; }
`;

const SubmitBtn = styled.button`
  margin: 16px 12px 8px;
  padding: 14px;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  background: ${({ disabled }) => (disabled ? THEME.muted : THEME.primary)};
  border: none;
  border-radius: 10px;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
`;

const BottomSpacer = styled.div`
  height: 40px;
`;

const PhotoCount = styled.span`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-left: 6px;
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const PhotoSlot = styled.div`
  position: relative;
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
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
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  border: none;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 0;
`;

const PhotoAddSlot = styled.button`
  width: 100%;
  aspect-ratio: 1 / 1;
  border-radius: 10px;
  border: 1.5px dashed ${THEME.border};
  background: #fff;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  gap: 2px;
  &:active { background: ${THEME.background}; }
`;

const PhotoAddIcon = styled.div`
  font-size: 22px;
  font-weight: 300;
  color: ${THEME.muted};
  line-height: 1;
`;

const PhotoAddLabel = styled.div`
  font-size: 10px;
  color: ${THEME.muted};
`;

const Toast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 10px 16px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 13px;
  border-radius: 20px;
  z-index: 1000;
`;

const GateBox = styled.div`
  margin: 40px 16px;
  padding: 32px 20px;
  background: #fff;
  border-radius: 16px;
  text-align: center;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
`;

const GateTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 12px;
`;

const GateText = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  line-height: 1.6;
  margin-bottom: 8px;
`;

const GateBtn = styled.button`
  margin-top: 20px;
  padding: 12px 24px;
  font-size: 15px;
  font-weight: 700;
  color: #fff;
  background: ${THEME.primary};
  border: none;
  border-radius: 10px;
  cursor: pointer;
`;
