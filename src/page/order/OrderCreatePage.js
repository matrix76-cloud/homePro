/* eslint-disable */
import React, { useState, useContext, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { ref, uploadBytesResumable, getDownloadURL } from "firebase/storage";
import { storage } from "../../api/config";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { assertHpointBalanceForCreate } from "../../service/PayFlowService";
import { serverTimestamp } from "firebase/firestore";
import {
  CATEGORIES,
  CATEGORY_GROUPS,
  THEME,
  SPACE_TYPES,
  STORAGE_PATH_PREFIX,
} from "../../config/homeproConfig";
import { createOrder, updateOrder } from "../../service/OrderService";
import ORDER_FORM_CONFIG, { COMMON_B2B_FIELDS } from "../../config/orderFormConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { IoCloseCircle } from "react-icons/io5";
import { CATEGORY_ICONS } from "../../utility/CategoryIcons";

const MAX_PHOTOS = 4;
const RESIZE_PX = 350;
const JPEG_QUALITY = 0.7;

// 금액 입력 콤마 표기 헬퍼 (330000 → "330,000")
const onlyDigits = (s) => String(s ?? "").replace(/[^0-9]/g, "");
const withComma = (s) => { const d = onlyDigits(s); return d ? Number(d).toLocaleString() : ""; };

function resizeAndCompress(file) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(RESIZE_PX / img.width, RESIZE_PX / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      canvas.toBlob((blob) => resolve(blob), "image/jpeg", JPEG_QUALITY);
    };
    img.src = URL.createObjectURL(file);
  });
}

const Section = styled.div`
  background: ${THEME.surface};
  margin: 12px 12px 0;
  padding: 20px;
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
`;

const Label = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 12px;
`;

const SubLabel = styled.div`
  font-size: 15px;
  color: ${THEME.muted};
  margin-bottom: 8px;
`;

const ChipGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

const Chip = styled.button`
  padding: 8px 16px;
  border-radius: 20px;
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  border: 1px solid ${({ $selected }) => ($selected ? THEME.primary : THEME.border)};
  background: ${({ $selected }) => ($selected ? THEME.primary : THEME.surface)};
  color: ${({ $selected }) => ($selected ? "#fff" : THEME.text)};
  font-weight: 400;
  &:active {
    opacity: 0.8;
  }
`;

const TextArea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  min-height: 100px;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 16px;
  font-family: inherit;
  resize: vertical;
  outline: none;
  &:focus {
    border-color: ${THEME.primary};
  }
`;

const Input = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 16px;
  font-family: inherit;
  outline: none;
  &:focus {
    border-color: ${THEME.primary};
  }
`;

const RadioGroup = styled.div`
  display: flex;
  gap: 12px;
`;

const RadioButton = styled.button`
  flex: 1;
  padding: 14px;
  border-radius: 10px;
  font-size: 16px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
  border: 2px solid ${({ $selected }) => ($selected ? THEME.primary : THEME.border)};
  background: ${({ $selected }) => ($selected ? `${THEME.primary}10` : THEME.surface)};
  color: ${({ $selected }) => ($selected ? THEME.primary : THEME.text)};
`;

const CheckRow = styled.label`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 0;
  font-size: 16px;
  color: ${THEME.text};
  cursor: pointer;
`;

const SubmitButton = styled.button`
  width: 100%;
  padding: 16px;
  margin-top: 12px;
  background: ${THEME.primary};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 19px;
  font-weight: 400;
  cursor: pointer;
  font-family: inherit;
  &:active {
    background: ${THEME.primaryDark};
  }
  &:disabled {
    background: #ccc;
  }
`;

const PreviewHeader = styled.div`
  margin: 16px 12px 4px;
  padding: 14px 16px;
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  font-size: 19px;
  font-weight: 700;
  color: ${THEME.text};
`;
const PreviewHint = styled.div`
  margin: 0 12px 8px;
  padding: 10px 14px;
  background: ${THEME.purpleLight};
  color: ${THEME.textSecondary};
  font-size: 12.5px;
  border-radius: 12px;
  line-height: 1.5;
`;
const PreviewSection = styled.div`
  background: ${THEME.surface};
  margin: 8px 12px 0;
  padding: 16px 20px;
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
`;
const PreviewNotice = styled.div`
  margin: 12px 12px 0;
  padding: 16px;
  background: ${THEME.background};
  border-radius: 12px;
  font-size: 15px;
  color: ${THEME.textSecondary};
  line-height: 1.6;
`;
const PreviewSectionLabel = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.textSecondary};
  margin-bottom: 10px;
`;
const PreviewPhotoRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;
const PreviewThumbWrap = styled.div`
  position: relative;
  display: inline-block;
`;
const PreviewPhotoThumb = styled.img`
  width: 72px;
  height: 72px;
  border-radius: 10px;
  object-fit: cover;
  border: 1px solid ${THEME.border};
`;
const PreviewRow = styled.div`
  display: flex;
  align-items: flex-start;
  padding: 10px 0;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;
const PreviewKey = styled.div`
  flex: 0 0 96px;
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.textSecondary};
`;
const PreviewVal = styled.div`
  flex: 1;
  font-size: 16px;
  color: ${THEME.text};
  word-break: break-word;
  white-space: pre-wrap;
  line-height: 1.5;
`;
const PreviewActions = styled.div`
  display: flex;
  gap: 8px;
  margin: 16px 12px 32px;
`;
const PreviewSecondaryBtn = styled.button`
  flex: 1;
  padding: 16px;
  margin-top: 12px;
  background: ${THEME.surface};
  color: ${THEME.text};
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 19px;
  font-weight: 400;
  cursor: pointer;
  font-family: inherit;
  &:active { background: ${THEME.background}; }
  &:disabled { color: #555; }
`;

const PhotoGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
`;

const PhotoBox = styled.div`
  aspect-ratio: 1;
  border: 1px dashed ${THEME.border};
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26px;
  color: ${THEME.muted};
  cursor: pointer;
  background: ${THEME.surface};
  overflow: hidden;
  position: relative;
`;

/* 아직 채우지 않은 자리 — 클릭 불가, 자리만 잡아주는 박스 */
const PhotoBoxEmpty = styled.div`
  aspect-ratio: 1;
  border: 1px solid ${THEME.border};
  border-radius: 12px;
  background: ${THEME.background};
`;

const PhotoBoxHint = styled.span`
  font-size: 14px;
  color: ${THEME.textSecondary};
`;

const PhotoPreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;

/* 업로드 진행률 오버레이 */
const PhotoUploadOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
`;

const PhotoUploadPct = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: #fff;
`;

const PhotoUploadTrack = styled.div`
  width: 100%;
  height: 4px;
  border-radius: 2px;
  background: rgba(255, 255, 255, 0.35);
  overflow: hidden;
`;

const PhotoUploadFill = styled.div`
  height: 100%;
  background: #fff;
  transition: width 0.2s ease;
`;

const PhotoHint = styled.div`
  margin-top: 10px;
  font-size: 14px;
  color: ${THEME.textSecondary};
`;

const RemoveBtn = styled.button`
  position: absolute;
  top: 4px;
  right: 4px;
  background: rgba(0,0,0,0.5);
  border: none;
  border-radius: 50%;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  cursor: pointer;
`;

const AddressRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  cursor: pointer;
  background: ${THEME.surface};
  &:active { background: ${THEME.background}; }
`;

const AddressText = styled.div`
  flex: 1;
  font-size: 16px;
  color: ${({ $hasValue }) => ($hasValue ? THEME.text : THEME.muted)};
`;

const AddressBtn = styled.button`
  flex-shrink: 0;
  padding: 6px 14px;
  border: 1px solid ${THEME.primary};
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.primary};
  font-size: 15px;
  font-weight: 400;
  font-family: inherit;
  cursor: pointer;
`;

const CatAccordion = styled.div`
  margin-bottom: 4px;
`;

const CatAccordionHeader = styled.div`
  display: flex;
  align-items: center;
  padding: 12px 14px;
  background: ${({ $active }) => $active ? `${THEME.primary}10` : THEME.background};
  border-radius: 8px;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const CatAccordionLabel = styled.div`
  flex: 1;
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

const CatAccordionSelected = styled.span`
  font-size: 14px;
  color: ${THEME.primary};
  margin-right: 8px;
`;

const CatAccordionArrow = styled.span`
  font-size: 13px;
  color: ${THEME.muted};
`;

const CatChipIcon = styled.span`
  width: 54px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 54px; height: 54px; }
`;

const CatChipBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px;
  white-space: nowrap;
  justify-content: flex-start;
  border-radius: 6px;
  border: 1px solid ${({ $selected }) => $selected ? THEME.primary : THEME.border};
  background: ${({ $selected }) => $selected ? `${THEME.primary}15` : THEME.surface};
  color: ${({ $selected }) => $selected ? THEME.primary : THEME.text};
  font-size: 13px;
  font-weight: ${({ $selected }) => $selected ? 600 : 400};
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const CatGroupLabel = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.textSecondary};
  background: ${THEME.background};
  padding: 8px 10px;
  border-radius: 8px;
  margin: 14px 0 8px;
`;

const CatGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 10px 0;
`;

const CatGridItem = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 4px 10px;
  border-radius: 12px;
  cursor: pointer;
  border: 1.5px solid ${({ $selected }) => ($selected ? THEME.primary : "transparent")};
  background: ${({ $selected }) => ($selected ? `${THEME.primary}0D` : "transparent")};
  &:active { background: ${THEME.background}; }
`;

const CatGridIcon = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 12px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 6px;
  svg { width: 54px; height: 54px; }
`;

const CatGridName = styled.div`
  font-size: 14px;
  font-weight: ${({ $selected }) => ($selected ? 600 : 400)};
  color: ${({ $selected }) => ($selected ? THEME.primary : THEME.text)};
  text-align: center;
  line-height: 1.3;
  word-break: keep-all;
`;

/* 탭 내장용 콘텐츠 컴포넌트 */
export const OrderCreateContent = () => {
  const navigate = useNavigate();
  const { categoryId } = useParams();
  const { state: navState } = useLocation();
  const editOrder = navState?.order || null; // 수정 모드: 기존 오더
  const isEdit = !!editOrder;
  const { user } = useContext(UserContext);
  const { userData } = useAuth();

  const [selectedCategory, setSelectedCategory] = useState(categoryId || "");
  const [expandedGroup, setExpandedGroup] = useState(null);
  const [selectedSub, setSelectedSub] = useState([]);
  const [selectedService, setSelectedService] = useState(""); // 서비스(subGroup 라벨) 드릴다운
  const [selectedServices, setSelectedServices] = useState([]); // multiService 카테고리 — 동시에 고른 서비스들 (대표 지시 9/10)
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [attrValues, setAttrValues] = useState({}); // 카테고리별 추가 속성 선택값 {key: [값]}
  const [inputValues, setInputValues] = useState({}); // 직접 입력값 {섹션키: {필드키: 값}}
  const [itemQty, setItemQty] = useState({});         // 선택 종목별 수량 {종목키: 수량}
  const [buildingType, setBuildingType] = useState("");
  const [areaValue, setAreaValue] = useState("");
  const [areaUnit, setAreaUnit] = useState("평");
  const [spaceFields, setSpaceFields] = useState({});
  const [detail, setDetail] = useState("");
  const [callFirst, setCallFirst] = useState(false);
  const [schedule, setSchedule] = useState("");
  const [address, setAddress] = useState("");
  const [priceType, setPriceType] = useState("");
  const [directPrice, setDirectPrice] = useState("");
  const [spaceType, setSpaceType] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState("");
  const showToast = useCallback((msg) => { setToast(msg); setTimeout(() => setToast(""), 2000); }, []);
  const [photos, setPhotos] = useState([]);
  const [compressing, setCompressing] = useState(false);      // 선택 직후 압축 중
  const [uploadProgress, setUploadProgress] = useState([]);   // 장별 업로드 진행률(%)
  const totalPhotoSizeText = (() => {
    const total = photos.reduce((sum, p) => sum + (p.size || 0), 0);
    if (!total) return "";
    return total >= 1024 * 1024 ? `${(total / 1024 / 1024).toFixed(1)}MB` : `${Math.round(total / 1024)}KB`;
  })();
  const fileInputRef = useRef(null);
  const [addressDetail, setAddressDetail] = useState("");
  const [customInput, setCustomInput] = useState("");
  const [optionEtc, setOptionEtc] = useState(""); // 옵션 "기타(입력)" 텍스트
  const [showAddressSearch, setShowAddressSearch] = useState(false);
  const addressEmbedRef = useRef(null);

  // B2B 공통 필드
  const [workDate, setWorkDate] = useState("");
  const [workDatePicker, setWorkDatePicker] = useState("");
  const [workTimeMode, setWorkTimeMode] = useState("");
  const [workTimeStart, setWorkTimeStart] = useState("");
  const [workTimeEnd, setWorkTimeEnd] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");   // 구 오더 표시용
  // 결제방식 — 선결제(prepay) / 후불(later). 형·대표님 확정 9/11. 금액 없는 유형은 선결제 불가.
  const [payMode, setPayMode] = useState("");
  // 정보공유 유형 보상 두 칸 (대표 지시 8/20)
  const [infoReward, setInfoReward] = useState("");
  const [contractBonus, setContractBonus] = useState("");
  const [b2bPriceType, setB2bPriceType] = useState("");
  const [b2bPriceAmount, setB2bPriceAmount] = useState("");
  const [referralFeeType, setReferralFeeType] = useState("none");
  const [referralFeeFixed, setReferralFeeFixed] = useState("");
  const [referralFeeFixedCustom, setReferralFeeFixedCustom] = useState("");
  const [referralFeeRate, setReferralFeeRate] = useState("");
  // H-포인트 지급액 (대표 지시 8/6: 지급방법 블록을 없애고 유형에 H-포인트를 넣음)
  const [referralFeeHpoint, setReferralFeeHpoint] = useState("");
  const [referralFeeHpointCustom, setReferralFeeHpointCustom] = useState("");
  const [matchType, setMatchType] = useState("");
  // 셀프 등록 오더 — 앱 밖에서 수주한 일을 본인이 등록해 보험·현장기록만 쓰는 오더 (대표 8/20). 캐시백·매칭 없음
  const [selfOrder, setSelfOrder] = useState(false);
  // 셀프 등록은 보험 적용용 항목만(대표 9/12): 단가유형은 시공(공사)단가 하나
  useEffect(() => { if (selfOrder && b2bPriceType !== "fixed") setB2bPriceType("fixed"); }, [selfOrder, b2bPriceType]);
  const [directPhone, setDirectPhone] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  // 연락처 기본값 = 접수자(본인) 전화 자동셋팅
  useEffect(() => {
    if (userData?.phoneE164 && !contactPhone) setContactPhone(userData.phoneE164);
  }, [userData?.phoneE164]);

  const [step, setStep] = useState("form"); // "form" | "preview"
  const [helpPopup, setHelpPopup] = useState(null); // { title, items:[{name,desc}] | text }

  // ── 수정 모드: 기존 오더 내용 프리필 (한 번만) ──
  useEffect(() => {
    if (!editOrder) return;
    // 카테고리 개편으로 삭제된 카테고리(자재.장비, 기업보험 등)의 구 오더 —
    // 편집 폼이 빈 껍데기가 되므로 안내 후 돌려보낸다 (검수 7/28)
    if (editOrder.categoryId && !CATEGORIES.some((c) => c.id === editOrder.categoryId)) {
      window.alert("이 오더의 카테고리는 개편으로 삭제되어 수정할 수 없습니다.\n새 카테고리로 다시 접수해 주세요.");
      navigate(-1);
      return;
    }
    setSelectedCategory(editOrder.categoryId || "");
    const cfg = ORDER_FORM_CONFIG[editOrder.categoryId];
    const subs = editOrder.subcategories && editOrder.subcategories.length
      ? editOrder.subcategories
      : (editOrder.subcategory ? String(editOrder.subcategory).split(", ").filter(Boolean) : []);
    if (cfg?.subGroups && cfg.multiService && subs.length) {
      // 중복 서비스 카테고리 — 종목이 속한 서비스를 전부 복원
      const grps = cfg.subGroups.filter((g) => subs.some((s) => s === g.label || s.startsWith(g.label + " ")));
      setSelectedServices(grps.map((g) => g.label));
      setSelectedSub(subs.map((s) => {
        const g = grps.find((x) => s.startsWith(x.label + " "));
        return g ? `${g.label}:${s.slice(g.label.length + 1)}` : s;
      }));
    } else if (cfg?.subGroups && subs.length) {
      const grp = cfg.subGroups.find((g) => subs.some((s) => s === g.label || s.startsWith(g.label + " ")));
      if (grp) {
        setSelectedService(grp.label);
        setSelectedSub(subs.map((s) => s.startsWith(grp.label + " ") ? `${grp.label}:${s.slice(grp.label.length + 1)}` : s));
      } else {
        // 서비스 라벨 개편으로 구 오더의 그룹을 못 찾는 경우 — 옛 종목을 state 에 남기면
        // 새로 고른 종목과 섞여 저장되므로 비운다. 기존 값은 상세 요청내용에 힌트로 보존.
        setSelectedSub([]);
        setDetail((prev) => prev || `(기존 선택: ${subs.join(", ")})\n${editOrder.description || ""}`);
      }
    } else {
      setSelectedSub(subs);
    }
    setSelectedOptions(editOrder.options || []);
    setOptionEtc(editOrder.optionEtc || "");
    setBuildingType(editOrder.buildingType || "");
    if (editOrder.areaValue) {
      const m = /^(\d+(?:\.\d+)?)(.*)$/.exec(String(editOrder.areaValue));
      if (m) { setAreaValue(m[1]); if (m[2]) setAreaUnit(m[2]); }
    }
    setSpaceFields(editOrder.spaceFields || {});
    setSpaceType(editOrder.spaceType || "");
    setCustomInput(editOrder.customInput || "");
    // 검수 7/28: 수정 진입 시 복원 누락 → 저장할 때 null 로 덮어써 기존 값이 소멸하던 버그
    setAttrValues(editOrder.attrs || {});
    setInputValues(editOrder.inputs || {});
    setItemQty(editOrder.itemQty || {});
    setDetail(editOrder.description || "");
    setAddress(editOrder.address || editOrder.location || "");
    setWorkDate(editOrder.workDate || "");
    setWorkDatePicker(editOrder.workDatePicker || "");
    if (typeof editOrder.workTime === "string" && editOrder.workTime) {
      if (editOrder.workTime.includes("시작")) {
        setWorkTimeMode("작업시작 설정");
        setWorkTimeStart(editOrder.workTime.replace("시작", "").trim());
      } else {
        setWorkTimeMode(editOrder.workTime);
      }
    }
    setContactPhone(editOrder.contactPhone || "");
    setCustomerPhone(editOrder.customerPhone || "");
    setB2bPriceType(editOrder.b2bPriceType || "");
    setB2bPriceAmount(editOrder.b2bPriceAmount ? String(editOrder.b2bPriceAmount) : "");
    setPayMode(editOrder.payMode || (editOrder.paymentMethod === "선결제" ? "prepay" : editOrder.paymentMethod ? "later" : ""));
    setInfoReward(editOrder.infoReward ? String(editOrder.infoReward) : "");
    setContractBonus(editOrder.contractBonus ? String(editOrder.contractBonus) : "");
    if (editOrder.referralFee && editOrder.referralFee.type) {
      setReferralFeeType(editOrder.referralFee.type);
      if (editOrder.referralFee.type === "fixed") {
        const amt = Number(editOrder.referralFee.amount) || 0;
        if (COMMON_B2B_FIELDS.referralFee.fixedAmounts.includes(amt)) setReferralFeeFixed(String(amt));
        else { setReferralFeeFixed("custom"); setReferralFeeFixedCustom(String(amt)); }
      } else if (editOrder.referralFee.type === "rate") {
        setReferralFeeRate(String(editOrder.referralFee.rate));
      } else if (editOrder.referralFee.type === "hpoint") {
        const amt = Number(editOrder.referralFee.point) || 0;
        if (COMMON_B2B_FIELDS.referralFee.hpointAmounts.includes(amt)) setReferralFeeHpoint(String(amt));
        else { setReferralFeeHpoint("custom"); setReferralFeeHpointCustom(String(amt)); }
      }
    }
    setMatchType(editOrder.matchType || "");
    setSelfOrder(!!editOrder.selfOrder);
    setDirectPhone(editOrder.directPhone || "");
  }, [editOrder]);

  const category = CATEGORIES.find((c) => c.id === selectedCategory);
  const formConfig = ORDER_FORM_CONFIG[selectedCategory];
  // (검수 7/28 제거) 구 SERVICE_FORM_MAP — 서비스 라벨로 옛 config(move_cleaning 등)에
  // 우회하던 매핑. 라벨 개편으로 매핑이 어긋나 새 사양(attrSections)이 가려지거나
  // 무관한 섹션이 노출되던 원인. 이제 카테고리 자신의 config 하나만 쓴다.
  const detailConfig = formConfig;
  // 중복 서비스 카테고리(가전분해청소)는 여러 서비스를 동시에 고른다 — activeServices 가 지금 고른 서비스 전부
  const multiService = !!formConfig?.multiService;
  const activeServices = multiService ? selectedServices : (selectedService ? [selectedService] : []);
  // subGroups(서비스 선택) 카테고리는 서비스 고른 뒤에 상세필드 노출
  const showDetail = !formConfig?.subGroups || activeServices.length > 0;
  // attrSections 에 services 배열이 있으면 해당 서비스 선택 시에만 표시
  const visibleAttrSections = (detailConfig?.attrSections || []).filter(
    (sec) => !sec.services || sec.services.some((sv) => activeServices.includes(sv))
  );
  // inputSections 조건부 표시 (대표 지시 8/5)
  //  whenItems: 특정 종목(부분청소 등)을 골랐을 때만  ·  whenAttr: 특정 속성값(옵션 '기타')을 골랐을 때만
  const visibleInputSections = (Array.isArray(detailConfig?.inputSections) ? detailConfig.inputSections : []).filter((sec) => {
    if (sec.services && !sec.services.some((sv) => activeServices.includes(sv))) return false;
    if (sec.whenItems) {
      const picked = selectedSub.some((k) => sec.whenItems.includes(k.includes(":") ? k.split(":")[1] : k));
      if (!picked) return false;
    }
    if (sec.whenAttr) {
      const vals = attrValues[sec.whenAttr.key] || [];
      if (!vals.includes(sec.whenAttr.value)) return false;
    }
    return true;
  });
  // 건물유형 섹션을 아예 쓰지 않는 카테고리 — 대체 노출되는 공간유형까지 함께 끈다 (대표 지시 8/6)
  const hideBuildingType = !!detailConfig?.noBuildingType;
  // 지금 화면에 실제로 떠 있는 입력 필드 (숨은 필드의 잔여값이 저장·미리보기에 새지 않게)
  const visibleFieldsOf = (sec) => sec.fields.filter((f) => {
    if (f.whenAttr && !(attrValues[f.whenAttr.key] || []).includes(f.whenAttr.value)) return false;
    if (f.hideWhenChecked && inputValues[sec.key]?.[f.hideWhenChecked] === "예") return false;
    return true;
  });

  // 면적 기본값 — config 의 areaDefault (전문청소 20평, 대표 지시 8/5)
  // 수정 모드에서는 기존 입력값을 덮지 않는다.
  useEffect(() => {
    if (isEdit) return;
    const def = ORDER_FORM_CONFIG[selectedCategory]?.areaDefault;
    setAreaValue(def ? String(def) : "");
  }, [selectedCategory, isEdit]);

  // Daum 주소 API 스크립트 로드
  useEffect(() => {
    if (document.getElementById("daum-postcode-script")) return;
    const script = document.createElement("script");
    script.id = "daum-postcode-script";
    script.src = "//t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js";
    script.async = true;
    document.head.appendChild(script);
  }, []);

  const openDaumPostcode = () => {
    if (!window.daum?.Postcode) {
      alert("주소 검색 서비스를 불러오는 중입니다. 잠시 후 다시 시도해주세요.");
      return;
    }
    setShowAddressSearch(true);
  };

  useEffect(() => {
    if (!showAddressSearch || !addressEmbedRef.current) return;
    if (!window.daum?.Postcode) return;
    new window.daum.Postcode({
      oncomplete: (data) => {
        const addr = data.userSelectedType === "R" ? data.roadAddress : data.jibunAddress;
        setAddress(addr);
        setAddressDetail("");
        setShowAddressSearch(false);
      },
      width: "100%",
      height: "100%",
    }).embed(addressEmbedRef.current);
  }, [showAddressSearch]);

  const handlePhotoAdd = async (e) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    const remaining = MAX_PHOTOS - photos.length;
    const toProcess = files.slice(0, remaining);
    e.target.value = "";
    setCompressing(true);
    try {
      const newPhotos = await Promise.all(
        toProcess.map(async (f) => {
          const blob = await resizeAndCompress(f);
          return { preview: URL.createObjectURL(blob), blob, originalSize: f.size, size: blob.size };
        })
      );
      setPhotos((prev) => [...prev, ...newPhotos]);
    } finally {
      setCompressing(false);
    }
  };

  const handlePhotoRemove = (idx) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
    setUploadProgress([]);
  };

  const handleSubToggle = (sub) => {
    setSelectedSub((prev) =>
      prev.includes(sub) ? prev.filter((s) => s !== sub) : [...prev, sub]
    );
  };

  const handleOptionToggle = (opt) => {
    setSelectedOptions((prev) =>
      prev.includes(opt) ? prev.filter((o) => o !== opt) : [...prev, opt]
    );
  };

  // 카테고리 변경 시 폼 상태 초기화
  const resetForm = () => {
    setSelectedSub([]);
    setSelectedOptions([]);
    setBuildingType("");
    setAreaValue("");
    setSpaceFields({});
    setDetail("");
    setCallFirst(false);
    setSchedule("");
    setSpaceType("");
    setCustomInput("");
    setOptionEtc("");
    setAttrValues({});
    setInputValues({});
    setItemQty({});
    setSelectedService("");
    setSelectedServices([]);
  };

  // 금액이 정해진 유형(시공금액·잔금)만 선결제 가능 — H-포인트 유형은 대금이 H-포인트라 결제방식 칸 자체가 없다 (형 확정 9/12)
  const isPricedType = COMMON_B2B_FIELDS.priceType.pricedTypes.includes(b2bPriceType);
  const isInfoType = b2bPriceType === "info";
  // 잔금 유형은 캐시백 없음 — 접수자가 선수금으로 몫을 이미 챙긴 셈 (대표 확정 9/13)
  const isBalanceType = b2bPriceType === "balance";
  // 캐시백 정률 상한 — 선결제 30% · 후불 15% (결제방식 안 골랐으면 후불 기준)
  // 캐시백 상한 없음 — 대표 9/12 회신 "소개비 상한 수치 해당 없습니다". rateCap 은 구 오더 호환용으로만 남김
  const referralRateCap = Infinity;
  const referralRates = COMMON_B2B_FIELDS.referralFee.rates.filter((r) => r <= referralRateCap);
  // 유형이 바뀌어 선결제가 불가능해지면 결제방식 초기화, 상한 넘는 정률은 지운다
  useEffect(() => { if (payMode === "prepay" && !isPricedType) setPayMode(""); }, [isPricedType, payMode]);
  // 단가유형 H-포인트 = 대금을 H-포인트로 받는 오더: 캐시백도 H-포인트로 고정, 결제방식(선결제/후불)은 없음. 다른 유형으로 바꾸면 H-포인트 캐시백은 해제 (형 확정 9/12)
  useEffect(() => {
    if (b2bPriceType === "hpoint") { if (referralFeeType !== "hpoint") setReferralFeeType("hpoint"); if (payMode) setPayMode(""); }
    else if (referralFeeType === "hpoint") setReferralFeeType("none");
  }, [b2bPriceType, referralFeeType, payMode]);
  useEffect(() => { if (referralFeeRate && Number(referralFeeRate) > referralRateCap) setReferralFeeRate(""); }, [referralRateCap, referralFeeRate]);
  useEffect(() => { if ((isInfoType || isBalanceType) && referralFeeType !== "none") setReferralFeeType("none"); }, [isInfoType, isBalanceType, referralFeeType]);

  const validateForm = () => {
    if (!selectedCategory) { showToast("카테고리를 선택해주세요"); return false; }
    if (selectedSub.length === 0 && formConfig?.subGroups) { showToast("세부 항목을 선택해주세요"); return false; }
    if (!workDate) { showToast("작업날짜를 선택해주세요"); return false; }
    if (workDate === "예약날짜" && !workDatePicker) { showToast("예약날짜(달력)를 선택해주세요"); return false; }
    if (!address.trim()) { showToast("주소를 입력해주세요"); return false; }
    if (!detail.trim()) { showToast("요청 내용을 입력해주세요"); return false; }
    if (priceType === "direct" && !directPrice) { showToast("금액을 입력해주세요"); return false; }
    if (b2bPriceType === "info" && !infoReward) { showToast("정보제공 리워드를 입력해주세요"); return false; }
    if (payMode === "prepay" && !(isPricedType && Number(b2bPriceAmount) > 0)) { showToast("선결제는 금액이 정해진 단가유형에서만 고를 수 있어요"); return false; }
    return true;
  };

  const handleGoPreview = () => {
    if (!validateForm()) return;
    setStep("preview");
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (asWaiting = false) => {
    if (submitting) return;
    // 블랙리스트 확정 사용자 — 관리자가 차단한 계정은 오더 작성 불가 (형 지시 7/31)
    if (userData?.orderBlocked) {
      alert("블랙리스트 신고 확인 결과, 관리자에 의해 오더 작성 권한이 차단된 계정입니다.\n문의는 고객센터를 이용해주세요.");
      return;
    }
    if (!validateForm()) return;
    // H-포인트 오더: 접수자 잔액이 대금보다 적으면 접수 불가 (대표 확정 9/13)
    if (b2bPriceType === "hpoint" && !isEdit) {
      try { await assertHpointBalanceForCreate(user?.uid || userData?.uid, Number(b2bPriceAmount) || 0); }
      catch (e) { showToast(e.message || "H-포인트가 부족합니다"); return; }
    }
    const confirmMsg = isEdit
      ? "수정한 내용을 저장하시겠습니까?"
      : (asWaiting ? "대기 상태로 저장하시겠습니까?\n(메인에 노출되지 않고, 나중에 재접수 가능)" : "해당 오더를 접수 하시겠습니까?");
    if (!window.confirm(confirmMsg)) return;
    setSubmitting(true);
    try {
      // 사진 업로드 — 장별 진행률 표시 (형 지시 7/28). 업로드 전 이미 압축된 blob 사용.
      if (photos.length) setUploadProgress(photos.map(() => 0));
      const uploaded = await Promise.all(
        photos.map((p, i) => new Promise((resolve, reject) => {
          const path = `${STORAGE_PATH_PREFIX}/orders/${user?.uid || "anon"}/${Date.now()}_${i}.jpg`;
          const task = uploadBytesResumable(ref(storage, path), p.blob, { contentType: "image/jpeg" });
          task.on(
            "state_changed",
            (snap) => {
              const pct = snap.totalBytes ? Math.round((snap.bytesTransferred / snap.totalBytes) * 100) : 0;
              setUploadProgress((prev) => { const next = [...prev]; next[i] = pct; return next; });
            },
            reject,
            async () => {
              setUploadProgress((prev) => { const next = [...prev]; next[i] = 100; return next; });
              resolve(await getDownloadURL(task.snapshot.ref));
            },
          );
        }))
      );
      const photoURLs = uploaded.length ? uploaded : (isEdit ? (editOrder.photos || []) : []);

      const nickname = userData?.nickname || userData?.name || user?.USERINFO?.nickname || "익명";
      const writerPhoto = userData?.profileImage || userData?.photoURL || user?.USERINFO?.userimg || "";
      // 캐시백 값 계산
      let referralFeeValue = null;
      if (referralFeeType === "fixed") {
        referralFeeValue = { type: "fixed", amount: referralFeeFixed === "custom" ? Number(referralFeeFixedCustom) : Number(referralFeeFixed) };
      } else if (referralFeeType === "rate") {
        referralFeeValue = { type: "rate", rate: Number(referralFeeRate) };
      } else if (referralFeeType === "hpoint") {
        referralFeeValue = { type: "hpoint", point: referralFeeHpoint === "custom" ? Number(referralFeeHpointCustom) : Number(referralFeeHpoint) };
      }

      const orderPayload = {
        categoryId: selectedCategory,
        categoryName: category?.shortName || "",
        subcategories: selectedSub.map((s) => s.includes(":") ? `${s.split(":")[0]} ${s.split(":")[1]}` : s),
        subcategory: selectedSub.map((s) => s.includes(":") ? `${s.split(":")[0]} ${s.split(":")[1]}` : s).join(", "),
        title: `${category?.shortName || ""} ${(() => { const first = selectedSub[0] || "요청"; return first.includes(":") ? first.split(":")[1] : first; })()}`,
        description: detail,
        spaceType,
        buildingType,
        options: selectedOptions,
        optionEtc: (optionEtc && selectedOptions.some((o) => o.includes("기타"))) ? optionEtc : null,
        areaValue: areaValue ? `${areaValue}${areaUnit}` : "",
        spaceFields: Object.keys(spaceFields).length > 0 ? spaceFields : null,
        // 카테고리별 추가 속성 (오염유형·발생시점·설치유형 등) — 빈 값은 제외하고 저장
        attrs: (() => {
          const picked = Object.entries(attrValues).filter(([, v]) => Array.isArray(v) && v.length > 0);
          return picked.length ? Object.fromEntries(picked) : null;
        })(),
        // 직접 입력값 (주소·수량·치수·차량정보 등)
        // 화면에 안 뜨는 필드는 저장하지 않는다 — 숙련도를 골랐다 해제하거나 서비스를 바꾸면
        // 이전에 친 값이 state 에 남아 유령 데이터로 저장되던 문제 (조건부 필드 도입 8/7)
        inputs: (() => {
          const out = {};
          visibleInputSections.forEach((sec) => {
            const filled = visibleFieldsOf(sec)
              .map((f) => [f.key, inputValues[sec.key]?.[f.key]])
              .filter(([, v]) => String(v ?? "").trim() !== "");
            if (filled.length) out[sec.key] = Object.fromEntries(filled);
          });
          return Object.keys(out).length ? out : null;
        })(),
        // 종목별 수량
        itemQty: (() => {
          const filled = Object.entries(itemQty).filter(([, v]) => Number(v) > 0);
          return filled.length ? Object.fromEntries(filled) : null;
        })(),
        customInput: customInput || null,
        schedule: workDate === "예약날짜" ? (workDatePicker || "예약날짜") : workDate, // 예약날짜는 날짜만 표기
        address,
        priceType,
        directPrice: priceType === "direct" ? directPrice : "",
        // 금액 표기 = 단가유형 기준 (예: "시공금액 330,000원" / "현장견적" / "견적요청")
        price: (() => {
          const map = { fixed: "시공금액", balance: "잔금", hpoint: "H-포인트", onsite: "현장견적", estimate: "견적요청", info: "정보공유" };
          const label = map[b2bPriceType] || "견적요청";
          if ((b2bPriceType === "fixed" || b2bPriceType === "balance" || b2bPriceType === "hpoint") && b2bPriceAmount) {
            return `${label} ${Number(b2bPriceAmount).toLocaleString()}${b2bPriceType === "hpoint" ? "P" : "원"}`;
          }
          return label;
        })(),
        createdBy: user?.uid || userData?.uid || "",
        writer: nickname,
        writerPhoto,
        location: addressDetail ? `${address} ${addressDetail}` : address,
        photos: photoURLs,
        // B2B 공통 필드
        workDate: workDate || null,
        workDatePicker: workDate === "예약날짜" ? workDatePicker : null,
        workTime: workTimeMode === "작업시작 설정" ? (workTimeStart ? `${workTimeStart} 시작` : "작업시작 설정") : (workTimeMode || null),
        contactPhone: contactPhone || null,
        customerPhone: customerPhone || null,
        // 결제방식 — payMode 가 진실, paymentMethod 는 화면 표기용 문자열 (구 오더 호환)
        payMode: payMode || null,
        paymentMethod: payMode === "prepay" ? "선결제" : payMode === "later" ? "후불 (당사자 정산)" : (paymentMethod || null),
        // 정보공유 보상 (정보공유 유형일 때만)
        infoReward: isInfoType ? Number(infoReward) || null : null,
        contractBonus: isInfoType ? Number(contractBonus) || null : null,
        b2bPriceType: b2bPriceType || null,
        b2bPriceAmount: (b2bPriceType === "fixed" || b2bPriceType === "balance" || b2bPriceType === "hpoint") ? Number(b2bPriceAmount) || null : null,
        referralFee: referralFeeType === "none" || isInfoType ? null : referralFeeValue,
        // 지급방법 선택칸은 없앴다 — H-포인트 유형이면 포인트, 그 외는 현금 지급 (대표 지시 8/6)
        referralPayMethod: referralFeeType === "none" ? null : (referralFeeType === "hpoint" ? "H-포인트" : "현금(계좌이체)"),
        matchType: selfOrder ? null : (matchType || null),
        directPhone: !selfOrder && matchType === "direct" ? directPhone : null,
        orderStatus: asWaiting ? "대기" : "접수",
      };
      // 셀프 등록 오더: 등록자 본인이 홈프로. 바로 배정 상태로 두고 메인 목록(접수)에는 안 나온다. 캐시백 없음.
      if (selfOrder) {
        const me = user?.uid || userData?.uid || "";
        Object.assign(orderPayload, { selfOrder: true, matchedProUid: me, orderStatus: "배정", assignedAt: serverTimestamp(), referralFee: null, referralPayMethod: null, matchType: null, directPhone: null });
      }
      if (isEdit) {
        await updateOrder(editOrder.id, orderPayload); // 상태값은 유지, 내용만 갱신
      } else {
        await createOrder(orderPayload);
      }
      showToast(isEdit ? "수정되었습니다" : (asWaiting ? "대기 상태로 저장되었습니다" : "오더가 등록되었습니다!"));
      // 접수 → 자동으로 나의오더현황으로 이동
      try { sessionStorage.setItem("homepro.main.activeTab", "my_orders"); } catch (e) {}
      setTimeout(() => navigate("/MobileMain"), 1000);
    } catch (err) {
      console.error(isEdit ? "오더 수정 실패:" : "오더 등록 실패:", err);
      alert((isEdit ? "수정" : "등록") + "에 실패했습니다. 다시 시도해주세요.");
    } finally {
      setSubmitting(false);
    }
  };

  // 미리보기 라벨 매핑 헬퍼
  const labelOf = (options, value) => {
    if (!value) return "";
    const found = options.find((o) => (typeof o === "string" ? o === value : o.value === value));
    return found ? (typeof found === "string" ? found : found.label) : value;
  };
  const previewItems = (() => {
    const items = [];
    items.push({ k: "카테고리", v: category?.shortName || "" });
    if (selectedSub.length) items.push({ k: "서비스명", v: selectedSub.map((s) => s.includes(":") ? s.split(":")[1] : s).join(", ") });
    if (buildingType) items.push({ k: "건물 유형", v: buildingType });
    if (spaceType) items.push({ k: "공간 유형", v: spaceType });
    if (areaValue) items.push({ k: "면적", v: `${areaValue}${areaUnit}` });
    if (selectedOptions.length) items.push({ k: "옵션", v: selectedOptions.join(", ") });
    if (optionEtc && selectedOptions.some((o) => o.includes("기타"))) items.push({ k: "옵션 기타", v: optionEtc });
    if (Object.keys(spaceFields).length) {
      const fmt = Object.entries(spaceFields).filter(([_, v]) => v).map(([k, v]) => `${k} ${v}`).join(" / ");
      if (fmt) items.push({ k: "공간 상세", v: fmt });
    }
    if (customInput) items.push({ k: "기타 입력", v: customInput });
    // 카테고리별 속성·입력값·수량 (검수 7/28: 미리보기 누락 → 입력한 값을 확인 못 하던 문제)
    Object.entries(attrValues).forEach(([key, vals]) => {
      if (!Array.isArray(vals) || !vals.length) return;
      const sec = (detailConfig?.attrSections || []).find((s) => s.key === key);
      items.push({ k: sec?.label || key, v: vals.join(", ") });
    });
    // 저장되는 것과 같은 기준(화면에 떠 있는 필드)으로만 미리보기에 싣는다
    visibleInputSections.forEach((sec) => {
      visibleFieldsOf(sec).forEach((f) => {
        const fv = inputValues[sec.key]?.[f.key];
        if (String(fv ?? "").trim() === "") return;
        items.push({ k: `${sec.label} ${f.label}`, v: `${fv}${f.unit || ""}` });
      });
    });
    Object.entries(itemQty).forEach(([key, qty]) => {
      if (!(Number(qty) > 0)) return;
      const name = key.includes(":") ? key.split(":")[1] : key;
      items.push({ k: `${name} 수량`, v: `${qty}${detailConfig?.qtyPerSelected?.unit || "개"}` });
    });
    items.push({ k: "주소", v: addressDetail ? `${address} ${addressDetail}` : address });
    items.push({ k: "요청 내용", v: detail });
    if (callFirst) items.push({ k: "선통화 요청", v: "예" });
    // 연락처는 확인화면에서 표기하지 않는다 (대표 지시 8/6) — 저장·전달은 그대로
    if (priceType === "direct") items.push({ k: "단가(직접)", v: `${Number(directPrice).toLocaleString()}원` });
    if (workDate) items.push({ k: "작업 날짜", v: workDate === "예약날짜" ? (workDatePicker || "예약날짜") : workDate });
    if (workTimeMode) items.push({ k: "작업 시간", v: workTimeMode === "작업시작 설정" ? (workTimeStart ? `${workTimeStart} 시작` : "작업시작 설정") : workTimeMode });
    if (b2bPriceType) {
      const ptLabel = labelOf(COMMON_B2B_FIELDS.priceType.options, b2bPriceType);
      const opt = COMMON_B2B_FIELDS.priceType.options.find((o) => o.value === b2bPriceType);
      const amt = b2bPriceAmount ? ` ${Number(b2bPriceAmount).toLocaleString()}${opt?.unit || ""}` : "";
      items.push({ k: "단가유형", v: `${ptLabel}${amt}` });
    }
    if (isInfoType) {
      items.push({ k: "정보제공 리워드", v: `${Number(infoReward || 0).toLocaleString()}P` });
      if (contractBonus) items.push({ k: "계약성사 인센티브", v: `${Number(contractBonus).toLocaleString()}P` });
    }
    if (payMode) items.push({ k: "결제방식", v: labelOf(COMMON_B2B_FIELDS.payMode.options, payMode) });
    if (referralFeeType && referralFeeType !== "none") {
      let v = "";
      if (referralFeeType === "fixed") {
        const amt = referralFeeFixed === "custom" ? referralFeeFixedCustom : referralFeeFixed;
        v = `정액 ${Number(amt || 0).toLocaleString()}원`;
      } else if (referralFeeType === "rate") {
        v = `정률 ${referralFeeRate}%`;
      } else if (referralFeeType === "hpoint") {
        const pt = referralFeeHpoint === "custom" ? referralFeeHpointCustom : referralFeeHpoint;
        v = `H-포인트 ${Number(pt || 0).toLocaleString()}P`;
      }
      items.push({ k: "캐시백", v });
    }
    if (selfOrder) items.push({ k: "등록 방식", v: "셀프 등록 (내가 직접 수주한 일)" });
    if (matchType && !selfOrder) {
      const mt = labelOf(COMMON_B2B_FIELDS.matchType.options, matchType);
      items.push({ k: "홈프로 선택", v: matchType === "direct" && directPhone ? `${mt} → ${directPhone}` : mt });
    }
    return items;
  })();

  if (step === "preview") {
    return (
      <>
        <PreviewHeader>{isEdit ? "수정 내용 확인" : "등록 전 입력 내용 확인"}</PreviewHeader>
        <PreviewHint>{isEdit ? "아래 내용으로 수정됩니다. 잘못된 항목은 [뒤로]로 돌아가서 변경하세요." : "아래 내용으로 등록됩니다. 잘못된 항목은 [수정하기]로 돌아가서 변경하세요."}</PreviewHint>
        {photos.length > 0 && (
          <PreviewSection>
            <PreviewSectionLabel>사진 ({photos.length}/{MAX_PHOTOS})</PreviewSectionLabel>
            <PreviewPhotoRow>
              {photos.map((p, i) => {
                const pct = uploadProgress[i];
                return (
                  <PreviewThumbWrap key={i}>
                    <PreviewPhotoThumb src={p.preview} alt={`photo-${i}`} />
                    {/* 업로드 진행률 — 실제 업로드는 이 미리보기 화면에서 일어난다 (검수 7/28) */}
                    {submitting && typeof pct === "number" && pct < 100 && (
                      <PhotoUploadOverlay>
                        <PhotoUploadPct>{pct}%</PhotoUploadPct>
                        <PhotoUploadTrack><PhotoUploadFill style={{ width: `${pct}%` }} /></PhotoUploadTrack>
                      </PhotoUploadOverlay>
                    )}
                  </PreviewThumbWrap>
                );
              })}
            </PreviewPhotoRow>
          </PreviewSection>
        )}
        <PreviewSection>
          {previewItems.map((it, i) => (
            <PreviewRow key={i}>
              <PreviewKey>{it.k}</PreviewKey>
              <PreviewVal>{it.v || "—"}</PreviewVal>
            </PreviewRow>
          ))}
        </PreviewSection>
        {/* 카테고리별 고정문구 (대표 지시 8/6) — 확인화면에서 중개 플랫폼 고지를 반드시 노출.
            카테고리마다 문구를 따로 두지 않고 카테고리명만 끼워넣는 공통 템플릿으로 만든다.
            개별 문구가 필요한 카테고리는 config 에 confirmNotice 를 넣으면 그게 우선. */}
        <PreviewNotice>
          {formConfig?.confirmNotice
            || `홈프로는 ${category?.shortName || "서비스"} 연결을 제공하는 중개 플랫폼이며, 실제 서비스 계약 및 책임은 서비스 제공자와 이용자 간에 이루어집니다.`}
        </PreviewNotice>
        <PreviewActions>
          <PreviewSecondaryBtn disabled={submitting} onClick={() => setStep("form")}>{isEdit ? "뒤로" : "수정하기"}</PreviewSecondaryBtn>
          {!isEdit && <PreviewSecondaryBtn disabled={submitting} onClick={() => handleSubmit(true)}>대기</PreviewSecondaryBtn>}
          <SubmitButton style={{ flex: 1, marginTop: 12 }} disabled={submitting} onClick={() => handleSubmit(false)}>
            {submitting ? (isEdit ? "저장 중..." : "등록 중...") : (isEdit ? "수정 저장" : "등록하기")}
          </SubmitButton>
        </PreviewActions>
        {toast && <OrderToast>{toast}</OrderToast>}
      </>
    );
  }

  return (
    <>
      {/* 1. 카테고리 선택 — 직관적 평면 나열, 선택 시 바로 아래 접수폼 */}
      {!categoryId && (
        <Section>
          <Label>카테고리 선택</Label>
          {!selectedCategory ? (
            CATEGORIES.filter((cat) => !cat.proOnly).map((cat) => (
              <CatAccordion key={cat.id}>
                <CatAccordionHeader onClick={() => {
                  // (기존: worker_call 은 작업자요청 탭으로 리다이렉트했으나,
                  //  대표 사양서 7/28 로 팀원.기술자 구인 접수폼이 생기면서 폼 진입으로 변경.
                  //  리다이렉트가 남아 있으면 그 접수폼에 도달 자체가 불가 — 검수에서 발견)
                  setSelectedCategory(cat.id);
                  resetForm();
                }}>
                  <CatAccordionLabel>{cat.name}</CatAccordionLabel>
                  <CatAccordionArrow>▼</CatAccordionArrow>
                </CatAccordionHeader>
              </CatAccordion>
            ))
          ) : (
            <CatAccordion>
              <CatAccordionHeader $active onClick={() => { setSelectedCategory(""); resetForm(); }}>
                <CatAccordionLabel>{category?.name}</CatAccordionLabel>
                <CatAccordionArrow>▲</CatAccordionArrow>
              </CatAccordionHeader>
            </CatAccordion>
          )}
        </Section>
      )}

      {/* 카테고리 선택 후 동적 폼 */}
      {category && (
        <>
          {/* 안내문구 */}
          {formConfig?.notice && (
            <NoticeBox>{formConfig.notice}</NoticeBox>
          )}

          {/* 중복 서비스 카테고리(가전분해청소) — 서비스를 여러 개 고르고 각 서비스의 종목을 함께 고른다 (대표 지시 9/10) */}
          {formConfig?.subGroups && multiService && (
            <Section>
              <Label>서비스 선택 <span style={{ fontWeight: 400, color: THEME.muted, fontSize: 14 }}>· 여러 개 함께 선택 가능</span></Label>
              <ChipGrid>
                {formConfig.subGroups.filter((g) => g.label !== "기타").map((group) => (
                  <Chip
                    key={group.label}
                    $selected={selectedServices.includes(group.label)}
                    onClick={() => {
                      const on = selectedServices.includes(group.label);
                      setSelectedServices(on ? selectedServices.filter((l) => l !== group.label) : [...selectedServices, group.label]);
                      if (on) setSelectedSub(selectedSub.filter((k) => !k.startsWith(`${group.label}:`)));
                    }}
                  >
                    {group.label}
                  </Chip>
                ))}
              </ChipGrid>
              {selectedServices.map((label) => {
                const group = formConfig.subGroups.find((g) => g.label === label);
                if (!group) return null;
                const etcKey = `${label}:기타`;
                const etcOn = selectedSub.includes(etcKey);
                return (
                  <div key={label} style={{ marginTop: 14 }}>
                    <GroupLabel>{label} 종목 선택</GroupLabel>
                    <ChipGrid>
                      {group.items.filter((it) => !/^(기타|입력|직접입력|기타\[ ?입력 ?\])$/.test(it)).map((item) => {
                        const uniqueKey = `${label}:${item}`;
                        return (
                          <Chip key={uniqueKey} $selected={selectedSub.includes(uniqueKey)} onClick={() => handleSubToggle(uniqueKey)}>
                            {item}
                          </Chip>
                        );
                      })}
                      <Chip $selected={etcOn} onClick={() => handleSubToggle(etcKey)}>기타</Chip>
                    </ChipGrid>
                    {etcOn && (
                      <Input style={{ marginTop: 8 }} placeholder="기타 내용을 입력하세요" value={customInput} onChange={(e) => setCustomInput(e.target.value)} />
                    )}
                  </div>
                );
              })}
            </Section>
          )}

          {/* 세부 항목 — 서비스 선택 → 종목 선택 드릴다운 */}
          {formConfig?.subGroups && !multiService && (
            <Section>
              <Label>서비스 선택</Label>
              <ChipGrid>
                {(selectedService
                  ? formConfig.subGroups.filter((g) => g.label === selectedService)
                  : formConfig.subGroups.filter((g) => g.label !== "기타")
                ).map((group) => (
                  <Chip
                    key={group.label}
                    $selected={selectedService === group.label}
                    onClick={() => {
                      const off = selectedService === group.label;
                      setSelectedService(off ? "" : group.label);
                      if (off) { setSelectedSub([]); setCustomInput(""); }
                    }}
                  >
                    {group.label}
                  </Chip>
                ))}
                {selectedService && (
                  <ServiceChangeLink onClick={() => { setSelectedService(""); setSelectedSub([]); setCustomInput(""); }}>
                    다시 선택
                  </ServiceChangeLink>
                )}
              </ChipGrid>

              {/* 선택한 서비스의 종목 + 기타(내용입력) */}
              {selectedService && (() => {
                const group = formConfig.subGroups.find((g) => g.label === selectedService);
                if (!group) return null;
                const etcKey = `${selectedService}:기타`;
                const etcOn = selectedSub.includes(etcKey);
                const selForService = selectedSub.filter((k) => k.startsWith(`${selectedService}:`));
                const collapsed = selForService.length > 0;
                return (
                  <div style={{ marginTop: 14 }}>
                    <GroupLabel>{selectedService} 종목 선택</GroupLabel>
                    {collapsed ? (
                      <ChipGrid>
                        {selForService.map((k) => (
                          <Chip key={k} $selected onClick={() => handleSubToggle(k)}>
                            {k.split(":")[1] || k}
                          </Chip>
                        ))}
                        <ServiceChangeLink onClick={() => { setSelectedSub(selectedSub.filter((k) => !k.startsWith(`${selectedService}:`))); setCustomInput(""); }}>
                          다시 선택
                        </ServiceChangeLink>
                      </ChipGrid>
                    ) : (
                    <ChipGrid>
                      {group.items.filter((it) => !/^(기타|입력|직접입력|기타\[ ?입력 ?\])$/.test(it)).map((item) => {
                        const uniqueKey = `${selectedService}:${item}`;
                        return (
                          <Chip key={uniqueKey} $selected={selectedSub.includes(uniqueKey)} onClick={() => handleSubToggle(uniqueKey)}>
                            {item}
                          </Chip>
                        );
                      })}
                      <Chip $selected={etcOn} onClick={() => handleSubToggle(etcKey)}>기타</Chip>
                    </ChipGrid>
                    )}
                    {etcOn && (
                      <Input
                        style={{ marginTop: 8 }}
                        placeholder="기타 내용을 입력하세요"
                        value={customInput}
                        onChange={(e) => setCustomInput(e.target.value)}
                      />
                    )}
                  </div>
                );
              })()}
            </Section>
          )}

          {/* fallback: config 없을 때 기존 subcategories 사용 */}
          {!formConfig?.subGroups && category.subcategories && (
            <Section>
              <Label>서비스명 선택</Label>
              <ChipGrid>
                {category.subcategories.map((sub) => (
                  <Chip key={sub} $selected={selectedSub.includes(sub)} onClick={() => handleSubToggle(sub)}>{sub}</Chip>
                ))}
              </ChipGrid>
            </Section>
          )}

          {/* 공간구조 (방/욕실/베란다 개소 입력) */}
          {showDetail && detailConfig?.spaceStructure && (
            <Section>
              <Label>{detailConfig.spaceStructure.label || "공간구조"}</Label>
              {detailConfig.spaceStructure.fields.map((field) => {
                const isYesNo = field.includes("여/부");
                const isEtc = field === "기타" || field.includes("기타");
                const cur = spaceFields[field];
                const setVal = (v) => setSpaceFields((prev) => ({ ...prev, [field]: prev[field] === v ? "" : v }));
                return (
                  <div key={field} style={{ marginBottom: 14 }}>
                    <FieldLabel style={{ marginBottom: 6 }}>{field}</FieldLabel>
                    {isEtc ? (
                      <Input
                        placeholder="기타 내용을 입력하세요"
                        value={cur || ""}
                        onChange={(e) => setSpaceFields((prev) => ({ ...prev, [field]: e.target.value }))}
                      />
                    ) : (
                      <ChipGrid>
                        {(isYesNo ? ["여", "부"] : ["1", "2", "3", "4", "5"]).map((v) => (
                          <Chip key={v} $selected={String(cur) === v} onClick={() => setVal(v)}>{v}</Chip>
                        ))}
                      </ChipGrid>
                    )}
                  </div>
                );
              })}
            </Section>
          )}

          {/* 옵션 선택 */}
          {showDetail && detailConfig?.options && detailConfig.options.length > 0 && (
            <Section>
              <Label>옵션 선택</Label>
              <ChipGrid>
                {detailConfig.options.map((opt) => {
                  const label = typeof opt === "string" ? opt : opt.label;
                  return (
                    <Chip key={label} $selected={selectedOptions.includes(label)} onClick={() => handleOptionToggle(label)}>{label}</Chip>
                  );
                })}
              </ChipGrid>
              {selectedOptions.some((o) => o.includes("기타")) && (
                <Input
                  style={{ marginTop: 10 }}
                  placeholder="기타 옵션 내용을 입력하세요"
                  value={optionEtc}
                  onChange={(e) => setOptionEtc(e.target.value)}
                />
              )}
            </Section>
          )}

          {/* 카테고리별 추가 속성 (대표 사양서 7/28) — 오염유형·발생시점·설치유형 등
              config 의 attrSections 를 그대로 칩 목록으로 렌더. multi=true 면 중복선택.
              건물유형보다 위에 둔다 — 순서는 종목 > 설치유형 > 건물유형 (대표 지시 8/7) */}
          {showDetail && visibleAttrSections.map((sec) => {
            const picked = attrValues[sec.key] || [];
            return (
              <Section key={sec.key}>
                {sec.descs ? (
                  <LabelRow>
                    <Label style={{ marginBottom: 0 }}>{sec.label}{sec.multi ? " (중복선택 가능)" : ""}</Label>
                    <HelpBtn
                      type="button"
                      onClick={() => setHelpPopup({ title: `${sec.label} 안내`, items: sec.options.filter((o) => sec.descs[o]).map((o) => ({ name: o, desc: sec.descs[o] })) })}
                    >?</HelpBtn>
                  </LabelRow>
                ) : (
                  <Label>{sec.label}{sec.multi ? " (중복선택 가능)" : ""}</Label>
                )}
                <ChipGrid style={sec.descs ? { marginTop: 12 } : undefined}>
                  {sec.options.map((opt) => {
                    const on = picked.includes(opt);
                    return (
                      <Chip
                        key={opt}
                        $selected={on}
                        onClick={() => setAttrValues((prev) => {
                          const cur = prev[sec.key] || [];
                          if (sec.multi) {
                            return { ...prev, [sec.key]: cur.includes(opt) ? cur.filter((v) => v !== opt) : [...cur, opt] };
                          }
                          return { ...prev, [sec.key]: cur.includes(opt) ? [] : [opt] };
                        })}
                      >
                        {opt}
                      </Chip>
                    );
                  })}
                </ChipGrid>
              </Section>
            );
          })}

          {/* 건물유형 */}
          {showDetail && !hideBuildingType && detailConfig?.buildingTypes && (
            <Section>
              <Label>건물유형</Label>
              <ChipGrid>
                {detailConfig.buildingTypes.map((type) => (
                  <Chip key={type} $selected={buildingType === type} onClick={() => setBuildingType(type)}>{type}</Chip>
                ))}
              </ChipGrid>
            </Section>
          )}

          {/* 선택한 종목별 수량 (가전분해청소·침대소파카펫 등) — 사양서의 '수량' 칸 */}
          {showDetail && detailConfig?.qtyPerSelected && selectedSub.length > 0 && (
            <Section>
              <Label>{detailConfig.qtyPerSelected.label || "수량"}</Label>
              {selectedSub.map((key) => {
                const name = key.includes(":") ? key.split(":")[1] : key;
                return (
                  <FieldRow key={key}>
                    <InputFieldLabel>{name}</InputFieldLabel>
                    <Input
                      type="number"
                      min="0"
                      inputMode="numeric"
                      placeholder="0"
                      value={itemQty[key] ?? ""}
                      onChange={(e) => setItemQty((prev) => ({ ...prev, [key]: e.target.value }))}
                      style={{ flex: 1 }}
                    />
                    <FieldUnit>{detailConfig.qtyPerSelected.unit || "개"}</FieldUnit>
                  </FieldRow>
                );
              })}
            </Section>
          )}

          {/* 직접 입력이 필요한 항목 (주소·수량·치수·차량정보·생년월일 등)
              config 의 inputSections 를 타입별 입력칸으로 렌더 (대표 사양서 7/28) */}
          {showDetail && visibleInputSections.map((sec) => {
            // 필드 단위 조건 (대표 지시 8/7)
            //  whenAttr       : 위 속성에서 그 값을 골랐을 때만 (숙련도별 인원)
            //  hideWhenChecked: 같은 섹션의 체크 필드가 켜져 있으면 숨김 (현장 직행 시 픽업장소)
            const fields = sec.fields.filter((f) => {
              if (f.whenAttr && !(attrValues[f.whenAttr.key] || []).includes(f.whenAttr.value)) return false;
              if (f.hideWhenChecked && inputValues[sec.key]?.[f.hideWhenChecked] === "예") return false;
              return true;
            });
            if (!fields.length) return null;
            return (
            <Section key={sec.key}>
              <Label>{sec.label}</Label>
              {fields.map((f) => {
                const val = inputValues[sec.key]?.[f.key] ?? "";
                const setVal = (v) => setInputValues((prev) => ({
                  ...prev,
                  [sec.key]: { ...(prev[sec.key] || {}), [f.key]: v },
                }));
                if (f.type === "check") {
                  return (
                    <CheckRow key={f.key} style={{ marginBottom: 12 }}>
                      <input type="checkbox" checked={val === "예"} onChange={(e) => setVal(e.target.checked ? "예" : "")} />
                      {f.label}
                    </CheckRow>
                  );
                }
                return (
                  <FieldRow key={f.key}>
                    <InputFieldLabel>{f.label}</InputFieldLabel>
                    {f.type === "select" ? (
                      <ChipGrid style={{ flex: 1 }}>
                        {f.options.map((opt) => (
                          <Chip key={opt} $selected={val === opt} onClick={() => setVal(val === opt ? "" : opt)}>{opt}</Chip>
                        ))}
                      </ChipGrid>
                    ) : (
                      <Input
                        type={f.type === "number" ? "number" : f.type === "date" ? "date" : f.type === "time" ? "time" : "text"}
                        min={f.type === "number" ? "0" : undefined}
                        inputMode={f.type === "number" ? "numeric" : undefined}
                        placeholder={f.placeholder || ""}
                        value={val}
                        onChange={(e) => setVal(e.target.value)}
                        style={{ flex: 1 }}
                      />
                    )}
                    {f.unit && f.type !== "select" ? <FieldUnit>{f.unit}</FieldUnit> : null}
                  </FieldRow>
                );
              })}
            </Section>
            );
          })}

          {/* 면적 입력 */}
          {showDetail && detailConfig?.areaInput && (
            <Section>
              <Label>면적</Label>
              <AreaRow>
                <Input style={{ flex: 1 }} type="number" placeholder="면적 입력" value={areaValue} onChange={(e) => setAreaValue(e.target.value)} />
                <ChipGrid style={{ flexShrink: 0 }}>
                  {(Array.isArray(detailConfig.areaInput) ? detailConfig.areaInput : ["평", "m2"]).map((unit) => (
                    <Chip key={unit} $selected={areaUnit === unit} onClick={() => setAreaUnit(unit)}>{unit}</Chip>
                  ))}
                </ChipGrid>
              </AreaRow>
            </Section>
          )}

          {/* 건물유형 (config에 buildingTypes 없을 때 기본 목록) — 라벨 '공간유형' → '건물유형' (대표 지시 8/7) */}
          {showDetail && !hideBuildingType && !detailConfig?.buildingTypes && (
            <Section>
              <Label>건물유형</Label>
              <ChipGrid>
                {SPACE_TYPES.map((type) => (
                  <Chip key={type} $selected={spaceType === type} onClick={() => setSpaceType(type)}>{type}</Chip>
                ))}
              </ChipGrid>
            </Section>
          )}

          {/* 상세 요청내용 */}
          <Section>
            <Label>상세 요청내용</Label>
            <TextArea
              placeholder={detailConfig?.detailPlaceholder || "구체적인 작업내용, 면적, 기타 요청사항을 입력하세요..."}
              value={detail}
              onChange={(e) => setDetail(e.target.value)}
            />
            <CheckRow>
              <input type="checkbox" checked={callFirst} onChange={(e) => { setCallFirst(e.target.checked); if (e.target.checked) setDetail((prev) => prev + "\n전화먼저 주세요!"); }} />
              전화먼저 주세요!
            </CheckRow>
          </Section>

          {/* 현장사진등록 */}
          <Section>
            <Label>현장사진등록 (선택, 최대 {MAX_PHOTOS}장)</Label>
            <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: "none" }} onChange={handlePhotoAdd} />
            {/* 4칸을 항상 박스로 채워 보여준다 (형 지시 7/28) — 채워진 칸 / + 추가 칸 / 빈 칸 */}
            <PhotoGrid>
              {Array.from({ length: MAX_PHOTOS }).map((_, i) => {
                const p = photos[i];
                if (p) {
                  const pct = uploadProgress[i];
                  return (
                    <PhotoBox key={i} $filled style={{ padding: 0 }}>
                      <PhotoPreview src={p.preview} alt={`사진${i + 1}`} />
                      {typeof pct === "number" && pct < 100 && (
                        <PhotoUploadOverlay>
                          <PhotoUploadPct>{pct}%</PhotoUploadPct>
                          <PhotoUploadTrack><PhotoUploadFill style={{ width: `${pct}%` }} /></PhotoUploadTrack>
                        </PhotoUploadOverlay>
                      )}
                      {!submitting && (
                        <RemoveBtn onClick={() => handlePhotoRemove(i)}><IoCloseCircle size={22} color="#fff" /></RemoveBtn>
                      )}
                    </PhotoBox>
                  );
                }
                if (i === photos.length) {
                  return (
                    <PhotoBox key={i} onClick={() => !compressing && fileInputRef.current?.click()}>
                      {compressing ? <PhotoBoxHint>압축 중</PhotoBoxHint> : "+"}
                    </PhotoBox>
                  );
                }
                return <PhotoBoxEmpty key={i} />;
              })}
            </PhotoGrid>
            <PhotoHint>
              {photos.length > 0
                ? `${photos.length}/${MAX_PHOTOS}장 · 업로드 시 자동 압축(최대 ${RESIZE_PX}px)${totalPhotoSizeText ? ` · 합계 ${totalPhotoSizeText}` : ""}`
                : `사진은 업로드할 때 자동으로 압축돼요 (최대 ${RESIZE_PX}px, JPEG)`}
            </PhotoHint>
          </Section>

          {/* 주소 */}
          <Section>
            <Label>주소</Label>
            <AddressRow onClick={openDaumPostcode}>
              <AddressText $hasValue={!!address}>{address || "주소를 검색하세요"}</AddressText>
              <AddressBtn type="button">검색</AddressBtn>
            </AddressRow>
            {address && (
              <Input style={{ marginTop: 8 }} placeholder="상세주소 입력 (동/호수 등)" value={addressDetail} onChange={(e) => setAddressDetail(e.target.value)} />
            )}
          </Section>

          {/* ─── B2B 거래 조건 필드들 ─── */}

          {/* 작업날짜 */}
          <Section>
            <Label>{COMMON_B2B_FIELDS.workDate.label}</Label>
            <ChipGrid>
              {COMMON_B2B_FIELDS.workDate.options.map((opt) => (
                <Chip key={opt} $selected={workDate === opt} onClick={() => setWorkDate(opt)}>{opt}</Chip>
              ))}
            </ChipGrid>
            {workDate === "예약날짜" && (
              <Input style={{ marginTop: 10 }} type="date" value={workDatePicker} onChange={(e) => setWorkDatePicker(e.target.value)} />
            )}
          </Section>

          {/* 작업시간 */}
          <Section>
            <Label>{COMMON_B2B_FIELDS.workTime.label}</Label>
            <ChipGrid>
              {COMMON_B2B_FIELDS.workTime.options.map((opt) => (
                <Chip key={opt} $selected={workTimeMode === opt} onClick={() => setWorkTimeMode(opt)}>{opt}</Chip>
              ))}
            </ChipGrid>
            {workTimeMode === "작업시작 설정" && (() => {
              const wsH = workTimeStart.split(":")[0] || "";
              const wsM = workTimeStart.split(":")[1] || "";
              return (
                <div style={{ marginTop: 10 }}>
                  <div style={{ fontSize: 15, color: THEME.muted, marginBottom: 6 }}>작업 시작 시각 (10분 단위, 24시간)</div>
                  <TimeSelectRow>
                    <TimeSelect value={wsH} onChange={(e) => setWorkTimeStart(`${e.target.value}:${wsM || "00"}`)}>
                      <option value="" disabled>시</option>
                      {Array.from({ length: 24 }, (_, h) => String(h).padStart(2, "0")).map((h) => (
                        <option key={h} value={h}>{h}시</option>
                      ))}
                    </TimeSelect>
                    <TimeColon>:</TimeColon>
                    <TimeSelect value={wsM} onChange={(e) => setWorkTimeStart(`${wsH || "00"}:${e.target.value}`)}>
                      <option value="" disabled>분</option>
                      {["00", "10", "20", "30", "40", "50"].map((m) => (
                        <option key={m} value={m}>{m}분</option>
                      ))}
                    </TimeSelect>
                  </TimeSelectRow>
                </div>
              );
            })()}
          </Section>

          {/* 연락처 — 접수자(인증된 본인, 자동) + 고객(실무자) */}
          {!selfOrder && (
          <Section>
            <Label>연락처</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: THEME.background, borderRadius: 10, fontSize: 16, color: THEME.text }}>
              <span style={{ color: THEME.success }}>✓</span>
              <span style={{ color: THEME.muted }}>접수자(본인)</span>
              <span style={{ fontWeight: 600 }}>{contactPhone || "인증된 번호"}</span>
            </div>
            <div style={{ fontSize: 15, color: THEME.muted, margin: "12px 0 6px" }}>고객(실무자) — 통화연결용</div>
            <Input type="tel" placeholder="고객 전화번호 (선택)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </Section>
          )}

          {/* 단가유형 */}
          <Section>
            <LabelRow>
              <Label style={{ marginBottom: 0 }}>{COMMON_B2B_FIELDS.priceType.label}</Label>
              <HelpBtn type="button" onClick={() => setHelpPopup({ title: "단가유형 안내", items: COMMON_B2B_FIELDS.priceType.options.map((o) => ({ name: o.label, desc: o.desc })) })}>?</HelpBtn>
            </LabelRow>
            <ChipGrid style={{ marginTop: 12 }}>
              {COMMON_B2B_FIELDS.priceType.options.filter((opt) => !selfOrder || opt.value === "fixed").map((opt) => (
                <Chip key={opt.value} $selected={b2bPriceType === opt.value} onClick={() => setB2bPriceType(opt.value)}>{opt.label}</Chip>
              ))}
            </ChipGrid>
            {COMMON_B2B_FIELDS.priceType.options.find((o) => o.value === b2bPriceType)?.hasInput && (() => {
              const opt = COMMON_B2B_FIELDS.priceType.options.find((o) => o.value === b2bPriceType);
              const unit = opt?.unit || "원";
              return (
                <Input style={{ marginTop: 10 }} inputMode="numeric" placeholder={`금액 입력 (${unit})`} value={withComma(b2bPriceAmount)} onChange={(e) => setB2bPriceAmount(onlyDigits(e.target.value))} />
              );
            })()}
            {/* 정보공유 유형 — 보상 두 칸 (대표 지시 8/20) */}
            {isInfoType && (
              <div style={{ marginTop: 12 }}>
                {COMMON_B2B_FIELDS.infoReward.fields.map((f) => (
                  <div key={f.key} style={{ marginTop: 10 }}>
                    <div style={{ fontSize: 15, color: THEME.muted, marginBottom: 6 }}>{f.label} <span style={{ color: THEME.textSecondary }}>· {f.hint}</span></div>
                    <Input inputMode="numeric" placeholder={`${f.label} (P)`}
                      value={withComma(f.key === "infoReward" ? infoReward : contractBonus)}
                      onChange={(e) => (f.key === "infoReward" ? setInfoReward : setContractBonus)(onlyDigits(e.target.value))} />
                  </div>
                ))}
              </div>
            )}
          </Section>

          {/* 결제방식 — 선결제 / 후불 (형·대표님 확정 9/11). 금액 없는 유형은 선결제 불가. H-포인트 유형은 대금이 H-포인트라 결제방식 없음 (9/12) */}
          {/* 9/13 대표 확정: 홈프로에는 선결제가 없다 — 결제방식 칸을 화면에서 뺀다 (payMode 는 구 오더 호환용으로만 남김) */}
          {false && !isInfoType && b2bPriceType !== "hpoint" && (
            <Section>
              <LabelRow>
                <Label style={{ marginBottom: 0 }}>{COMMON_B2B_FIELDS.payMode.label}</Label>
                <HelpBtn type="button" onClick={() => setHelpPopup({ title: "결제방식 안내", items: COMMON_B2B_FIELDS.payMode.options.map((o) => ({ name: o.label, desc: o.desc })) })}>?</HelpBtn>
              </LabelRow>
              <ChipGrid style={{ marginTop: 12 }}>
                {COMMON_B2B_FIELDS.payMode.options.map((opt) => {
                  const disabled = opt.value === "prepay" && !isPricedType;
                  return (
                    <Chip key={opt.value} $selected={payMode === opt.value} style={disabled ? { opacity: 0.45 } : undefined}
                      onClick={() => { if (disabled) { showToast("선결제는 시공금액·잔금 유형에서만 고를 수 있어요"); return; } setPayMode(opt.value); }}>
                      {opt.label}
                    </Chip>
                  );
                })}
              </ChipGrid>
              {payMode === "prepay" && (
                <div style={{ marginTop: 10, fontSize: 15, color: THEME.muted, lineHeight: 1.5 }}>
                  홈프로가 수락하면 결제 요청이 옵니다. 결제한 금액은 작업 완료 후 수행 홈프로에게 지급되고, 캐시백은 접수자에게 돌아옵니다.
                </div>
              )}
            </Section>
          )}

          {/* 캐시백 — 정보공유 유형은 자체 보상이 있어 숨긴다 */}
          {/* 셀프 등록 — 앱 밖 수주 건을 본인이 등록 (대표 8/20 보험 기획). 켜면 캐시백·홈프로 선택은 숨긴다 */}
          {!isInfoType && !isEdit && (
          <Section>
            <LabelRow>
              <Label style={{ marginBottom: 0 }}>등록 방식</Label>
              <HelpBtn type="button" onClick={() => setHelpPopup({ title: "등록 방식 안내", items: [{ name: "매칭 오더", desc: "홈프로에게 일을 넘기는 오더입니다. 캐시백과 홈프로 선택 방식을 정합니다." }, { name: "셀프 등록", desc: "앱 밖에서 직접 수주한 일을 본인이 등록합니다. 나의오더현황에서 현장 체크인·체크아웃을 남기고 보험 적용을 받을 수 있습니다. 캐시백·홈프로 선택은 없습니다." }] })}>?</HelpBtn>
            </LabelRow>
            <ChipGrid style={{ marginTop: 12 }}>
              <Chip $selected={!selfOrder} onClick={() => setSelfOrder(false)}>매칭 오더</Chip>
              <Chip $selected={selfOrder} onClick={() => setSelfOrder(true)}>셀프 등록 (내가 직접 수주한 일)</Chip>
            </ChipGrid>
            {selfOrder && (
              <div style={{ fontSize: 14, color: THEME.muted, marginTop: 10, lineHeight: 1.5 }}>등록하면 바로 나의오더현황에 배정 상태로 들어갑니다. 현장 체크인 전에 보험 적용 여부를 정하게 됩니다.</div>
            )}
          </Section>
          )}

          {!isInfoType && !isBalanceType && !selfOrder && (
          <Section>
            <LabelRow>
              <Label style={{ marginBottom: 0 }}>{COMMON_B2B_FIELDS.referralFee.label}</Label>
              <HelpBtn type="button" onClick={() => setHelpPopup({ title: "캐시백 안내", text: COMMON_B2B_FIELDS.referralFee.desc })}>?</HelpBtn>
            </LabelRow>
            {b2bPriceType === "hpoint" ? (
              <div style={{ fontSize: 14, color: THEME.muted, margin: "10px 0 12px" }}>대금을 H-포인트로 주는 오더라 캐시백도 H-포인트로 줍니다. 완료 후 접수자가 직접 대금을 H-포인트로 보내고, 홈프로가 직접 캐시백을 H-포인트로 돌려줍니다(자동 차감 아님).</div>
            ) : (
            <ChipGrid style={{ marginTop: 12, marginBottom: 12 }}>
              {COMMON_B2B_FIELDS.referralFee.types.map((t) => (
                <Chip key={t.value} $selected={referralFeeType === t.value} onClick={() => setReferralFeeType(t.value)}>{t.label}</Chip>
              ))}
            </ChipGrid>
            )}
            {referralFeeType === "fixed" && (
              <>
                <ChipGrid>
                  {COMMON_B2B_FIELDS.referralFee.fixedAmounts.map((amt) => (
                    <Chip key={amt} $selected={referralFeeFixed === String(amt)} onClick={() => { setReferralFeeFixed(String(amt)); setReferralFeeFixedCustom(""); }}>
                      {amt.toLocaleString()}원
                    </Chip>
                  ))}
                  <Chip $selected={referralFeeFixed === "custom"} onClick={() => setReferralFeeFixed("custom")}>직접입력</Chip>
                </ChipGrid>
                {referralFeeFixed === "custom" && (
                  <Input style={{ marginTop: 10 }} inputMode="numeric" placeholder="수수료 금액 (원)" value={withComma(referralFeeFixedCustom)} onChange={(e) => setReferralFeeFixedCustom(onlyDigits(e.target.value))} />
                )}
              </>
            )}
            {referralFeeType === "rate" && (
              <ChipGrid>
                {referralRates.map((r) => (
                  <Chip key={r} $selected={referralFeeRate === String(r)} onClick={() => setReferralFeeRate(String(r))}>{r}%</Chip>
                ))}
                <div style={{ width: "100%", fontSize: 14, color: THEME.muted, marginTop: 4 }}>
                  캐시백 비율은 당사자끼리 정합니다 (상한 없음)
                </div>
              </ChipGrid>
            )}
            {referralFeeType === "hpoint" && (
              <>
                <ChipGrid>
                  {COMMON_B2B_FIELDS.referralFee.hpointAmounts.map((pt) => (
                    <Chip key={pt} $selected={referralFeeHpoint === String(pt)} onClick={() => { setReferralFeeHpoint(String(pt)); setReferralFeeHpointCustom(""); }}>
                      {pt.toLocaleString()}P
                    </Chip>
                  ))}
                  <Chip $selected={referralFeeHpoint === "custom"} onClick={() => setReferralFeeHpoint("custom")}>직접입력</Chip>
                </ChipGrid>
                {referralFeeHpoint === "custom" && (
                  <Input style={{ marginTop: 10 }} inputMode="numeric" placeholder="지급 포인트 (P)" value={withComma(referralFeeHpointCustom)} onChange={(e) => setReferralFeeHpointCustom(onlyDigits(e.target.value))} />
                )}
              </>
            )}
          </Section>
          )}

          {/* 홈프로 선택 — 셀프 등록이면 없음 */}
          {!selfOrder && (
          <Section>
            <LabelRow>
              <Label style={{ marginBottom: 0 }}>{COMMON_B2B_FIELDS.matchType.label}</Label>
              <HelpBtn type="button" onClick={() => setHelpPopup({ title: "홈프로 선택(매칭방식) 안내", items: COMMON_B2B_FIELDS.matchType.options.map((o) => ({ name: o.label, desc: o.desc })) })}>?</HelpBtn>
            </LabelRow>
            <ChipGrid style={{ marginTop: 12 }}>
              {COMMON_B2B_FIELDS.matchType.options.map((opt) => (
                <Chip key={opt.value} $selected={matchType === opt.value} onClick={() => setMatchType(opt.value)}>{opt.label}</Chip>
              ))}
            </ChipGrid>
            {matchType === "direct" && (
              <DirectAssignWrap>
                <FieldLabel>지정할 홈프로 전화번호</FieldLabel>
                <PhoneInput
                  placeholder="010-0000-0000"
                  value={directPhone}
                  onChange={e => setDirectPhone(e.target.value)}
                />
                <DirectDesc>사전에 약속된 홈프로의 전화번호를 입력해주세요.</DirectDesc>
              </DirectAssignWrap>
            )}
          </Section>
          )}

          {/* 등록 버튼 — 미리보기 화면으로 진입 */}
          <Section>
            <SubmitButton disabled={!selectedCategory} onClick={handleGoPreview}>
              다음 (입력 확인)
            </SubmitButton>
          </Section>
        </>
      )}
      {toast && <OrderToast>{toast}</OrderToast>}
      {helpPopup && (
        <HelpOverlay onClick={() => setHelpPopup(null)}>
          <HelpBox onClick={(e) => e.stopPropagation()}>
            <HelpTitle>{helpPopup.title}</HelpTitle>
            {helpPopup.text ? (
              <HelpText>{helpPopup.text}</HelpText>
            ) : (
              (helpPopup.items || []).map((it) => (
                <HelpItem key={it.name}>
                  <HelpItemName>{it.name}</HelpItemName>
                  <HelpItemDesc>{it.desc}</HelpItemDesc>
                </HelpItem>
              ))
            )}
            <HelpCloseBtn type="button" onClick={() => setHelpPopup(null)}>확인</HelpCloseBtn>
          </HelpBox>
        </HelpOverlay>
      )}
      {showAddressSearch && (
        <AddressModalOverlay onClick={() => setShowAddressSearch(false)}>
          <AddressModalBox onClick={(e) => e.stopPropagation()}>
            <AddressModalHeader>
              <AddressModalTitle>주소 검색</AddressModalTitle>
              <AddressCloseBtn onClick={() => setShowAddressSearch(false)}>✕</AddressCloseBtn>
            </AddressModalHeader>
            <AddressEmbedWrap ref={addressEmbedRef} />
          </AddressModalBox>
        </AddressModalOverlay>
      )}
    </>
  );
};

/* ── 동적 폼 추가 스타일 ── */
const NoticeBox = styled.div`
  margin: 12px 12px 0;
  padding: 16px;
  background: ${THEME.purpleLight};
  border-radius: 12px;
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  line-height: 1.6;
  white-space: pre-line;
`;

const GroupLabel = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.textSecondary};
  background: ${THEME.background};
  padding: 6px 10px;
  border-radius: 6px;
  margin: 14px 0 8px;
  &:first-child { margin-top: 4px; }
`;

const FieldGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  overflow: hidden;
`;

const FieldItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 4px;
`;

const FieldLabel = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const FieldInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 16px;
  font-family: inherit;
  outline: none;
  &:focus { border-color: ${THEME.primary}; }
`;

const AreaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

/* 직접 입력 항목 한 줄 (라벨 + 입력칸 + 단위) */
const FieldRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  & + & { margin-top: 10px; }
`;

const InputFieldLabel = styled.div`
  flex: 0 0 96px;
  font-size: 15px;
  color: ${THEME.textSecondary};
`;

const FieldUnit = styled.div`
  flex: 0 0 auto;
  font-size: 15px;
  color: ${THEME.textSecondary};
`;

const TimeRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 10px;
`;

const ChipRow4 = styled.div`
  display: flex;
  gap: 8px;
`;

const LabelRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const HelpBtn = styled.button`
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  border-radius: 50%;
  border: 1px solid ${THEME.primary};
  background: ${THEME.surface};
  color: ${THEME.primary};
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  padding: 0;
  cursor: pointer;
  font-family: inherit;
  &:active { background: ${THEME.primary}12; }
`;

const ServiceChangeLink = styled.button`
  padding: 8px 12px;
  border: none;
  background: none;
  color: ${THEME.primary};
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
  text-decoration: underline;
  &:active { opacity: 0.7; }
`;

const TimeSelectRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TimeSelect = styled.select`
  flex: 1;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 16px;
  font-family: inherit;
  background: ${THEME.surface};
  color: ${THEME.text};
  outline: none;
  &:focus { border-color: ${THEME.primary}; }
`;

const TimeColon = styled.span`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.muted};
`;

const HelpOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.45);
  z-index: 1100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
`;

const HelpBox = styled.div`
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 360px;
  max-height: 70vh;
  overflow-y: auto;
  padding: 20px;
`;

const HelpTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 14px;
`;

const HelpText = styled.div`
  font-size: 13.5px;
  color: ${THEME.textSecondary};
  line-height: 1.6;
`;

const HelpItem = styled.div`
  padding: 10px 0;
  border-bottom: 1px solid ${THEME.border};
  &:last-of-type { border-bottom: none; }
`;

const HelpItemName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.primary};
  margin-bottom: 4px;
`;

const HelpItemDesc = styled.div`
  font-size: 15px;
  color: ${THEME.textSecondary};
  line-height: 1.55;
`;

const HelpCloseBtn = styled.button`
  width: 100%;
  margin-top: 16px;
  padding: 12px;
  background: ${THEME.primary};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 17px;
  font-weight: 600;
  cursor: pointer;
  font-family: inherit;
`;

const AddressModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const AddressModalBox = styled.div`
  background: #fff;
  border-radius: 16px;
  width: 100%;
  max-width: 420px;
  height: 70vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
`;

const AddressModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${THEME.border};
`;

const AddressModalTitle = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${THEME.text};
`;

const AddressCloseBtn = styled.button`
  border: none;
  background: none;
  font-size: 22px;
  color: ${THEME.muted};
  cursor: pointer;
  padding: 4px;
`;

const AddressEmbedWrap = styled.div`
  flex: 1;
  width: 100%;
`;

const OrderCreatePage = () => (
  <SimpleBackLayout NAME="예약접수">
    <OrderCreateContent />
  </SimpleBackLayout>
);

export default OrderCreatePage;

const toastFadeIn = keyframes`
  from { transform: translate(-50%, 10px); opacity: 0; }
  to { transform: translate(-50%, 0); opacity: 1; }
`;

const DirectAssignWrap = styled.div`
  margin-top: 12px;
`;

const PhoneInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 16px;
  font-family: inherit;
  outline: none;
  &:focus {
    border-color: ${THEME.primary};
  }
`;

const DirectDesc = styled.div`
  font-size: 14px;
  color: #555;
  margin-top: 4px;
`;

const OrderToast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: #333;
  color: #fff;
  font-size: 16px;
  font-weight: 400;
  border-radius: 10px;
  z-index: 9999;
  white-space: nowrap;
  animation: ${toastFadeIn} 0.25s ease-out;
`;
