/* eslint-disable */
import React, { useState, useContext, useRef, useEffect, useCallback } from "react";
import { useNavigate, useParams, useLocation } from "react-router-dom";
import styled, { keyframes } from "styled-components";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../api/config";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
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
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 12px;
`;

const SubLabel = styled.div`
  font-size: 13px;
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
  font-size: 13px;
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
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 17px;
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
  font-size: 17px;
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
const PreviewSectionLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${THEME.textSecondary};
  margin-bottom: 10px;
`;
const PreviewPhotoRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.textSecondary};
`;
const PreviewVal = styled.div`
  flex: 1;
  font-size: 14px;
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
  font-size: 17px;
  font-weight: 400;
  cursor: pointer;
  font-family: inherit;
  &:active { background: ${THEME.background}; }
  &:disabled { color: #999; }
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
  font-size: 24px;
  color: ${THEME.muted};
  cursor: pointer;
  background: ${THEME.surface};
  overflow: hidden;
  position: relative;
`;

const PhotoPreview = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
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
  font-size: 14px;
  color: ${({ $hasValue }) => ($hasValue ? THEME.text : THEME.muted)};
`;

const AddressBtn = styled.button`
  flex-shrink: 0;
  padding: 6px 14px;
  border: 1px solid ${THEME.primary};
  border-radius: 10px;
  background: ${THEME.surface};
  color: ${THEME.primary};
  font-size: 13px;
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
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.text};
`;

const CatAccordionSelected = styled.span`
  font-size: 12px;
  color: ${THEME.primary};
  margin-right: 8px;
`;

const CatAccordionArrow = styled.span`
  font-size: 10px;
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
  font-size: 11px;
  font-weight: ${({ $selected }) => $selected ? 600 : 400};
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const CatGroupLabel = styled.div`
  font-size: 15px;
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
  font-size: 12px;
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
  const [selectedOptions, setSelectedOptions] = useState([]);
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
  const [paymentMethod, setPaymentMethod] = useState("");
  const [b2bPriceType, setB2bPriceType] = useState("");
  const [b2bPriceAmount, setB2bPriceAmount] = useState("");
  const [referralFeeType, setReferralFeeType] = useState("none");
  const [referralFeeFixed, setReferralFeeFixed] = useState("");
  const [referralFeeFixedCustom, setReferralFeeFixedCustom] = useState("");
  const [referralFeeRate, setReferralFeeRate] = useState("");
  const [referralPayMethod, setReferralPayMethod] = useState("");
  const [matchType, setMatchType] = useState("");
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
    setSelectedCategory(editOrder.categoryId || "");
    const cfg = ORDER_FORM_CONFIG[editOrder.categoryId];
    const subs = editOrder.subcategories && editOrder.subcategories.length
      ? editOrder.subcategories
      : (editOrder.subcategory ? String(editOrder.subcategory).split(", ").filter(Boolean) : []);
    if (cfg?.subGroups && subs.length) {
      const grp = cfg.subGroups.find((g) => subs.some((s) => s === g.label || s.startsWith(g.label + " ")));
      if (grp) {
        setSelectedService(grp.label);
        setSelectedSub(subs.map((s) => s.startsWith(grp.label + " ") ? `${grp.label}:${s.slice(grp.label.length + 1)}` : s));
      } else {
        setSelectedSub(subs);
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
    if (editOrder.referralFee && editOrder.referralFee.type) {
      setReferralFeeType(editOrder.referralFee.type);
      if (editOrder.referralFee.type === "fixed") {
        const amt = Number(editOrder.referralFee.amount) || 0;
        if (COMMON_B2B_FIELDS.referralFee.fixedAmounts.includes(amt)) setReferralFeeFixed(String(amt));
        else { setReferralFeeFixed("custom"); setReferralFeeFixedCustom(String(amt)); }
      } else if (editOrder.referralFee.type === "rate") {
        setReferralFeeRate(String(editOrder.referralFee.rate));
      }
    }
    setReferralPayMethod(editOrder.referralPayMethod || "");
    setMatchType(editOrder.matchType || "");
    setDirectPhone(editOrder.directPhone || "");
  }, [editOrder]);

  const category = CATEGORIES.find((c) => c.id === selectedCategory);
  const formConfig = ORDER_FORM_CONFIG[selectedCategory];
  // 통합 카테고리(전문청소/설비.하수구.누수) — 선택한 서비스별 전용 상세폼 매핑
  const SERVICE_FORM_MAP = {
    "홈클리닝": "move_cleaning", "정기청소": "regular_cleaning", "특수청소": "special_cleaning",
    "준공청소": "business_cleaning", "화재청소": "special_cleaning", "상업.매장청소": "business_cleaning",
    "바닥청소": "business_cleaning", "사업장청소": "business_cleaning", "외벽.고소청소": "business_cleaning",
    "하수구.배관.설비": "drain_pipe", "누수탐지": "leak_detection", "누수공사": "leak_construction", "난방.보일러": "boiler",
  };
  // 상세 필드(옵션/공간구조/주거유형/면적 등)는 선택한 서비스 폼을 따름
  const detailConfig = (selectedService && ORDER_FORM_CONFIG[SERVICE_FORM_MAP[selectedService]]) || formConfig;
  // subGroups(서비스 선택) 카테고리는 서비스 고른 뒤에 상세필드 노출
  const showDetail = !formConfig?.subGroups || !!selectedService;

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
    const newPhotos = await Promise.all(
      toProcess.map(async (f) => {
        const blob = await resizeAndCompress(f);
        return { preview: URL.createObjectURL(blob), blob };
      })
    );
    setPhotos((prev) => [...prev, ...newPhotos]);
    e.target.value = "";
  };

  const handlePhotoRemove = (idx) => {
    setPhotos((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
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
    setSelectedService("");
  };

  const validateForm = () => {
    if (!selectedCategory) { showToast("카테고리를 선택해주세요"); return false; }
    if (selectedSub.length === 0 && formConfig?.subGroups) { showToast("세부 항목을 선택해주세요"); return false; }
    if (!workDate) { showToast("작업날짜를 선택해주세요"); return false; }
    if (workDate === "예약날짜" && !workDatePicker) { showToast("예약날짜(달력)를 선택해주세요"); return false; }
    if (!address.trim()) { showToast("주소를 입력해주세요"); return false; }
    if (!detail.trim()) { showToast("요청 내용을 입력해주세요"); return false; }
    if (priceType === "direct" && !directPrice) { showToast("금액을 입력해주세요"); return false; }
    return true;
  };

  const handleGoPreview = () => {
    if (!validateForm()) return;
    setStep("preview");
    window.scrollTo(0, 0);
  };

  const handleSubmit = async (asWaiting = false) => {
    if (submitting) return;
    if (!validateForm()) return;
    const confirmMsg = isEdit
      ? "수정한 내용을 저장하시겠습니까?"
      : (asWaiting ? "대기 상태로 저장하시겠습니까?\n(메인에 노출되지 않고, 나중에 재접수 가능)" : "해당 오더를 접수 하시겠습니까?");
    if (!window.confirm(confirmMsg)) return;
    setSubmitting(true);
    try {
      // 사진 업로드 (수정 모드에서 새로 추가한 게 없으면 기존 사진 유지)
      const uploaded = await Promise.all(
        photos.map(async (p, i) => {
          const path = `${STORAGE_PATH_PREFIX}/orders/${user?.uid || "anon"}/${Date.now()}_${i}.jpg`;
          const storageRef = ref(storage, path);
          await uploadBytes(storageRef, p.blob, { contentType: "image/jpeg" });
          return getDownloadURL(storageRef);
        })
      );
      const photoURLs = uploaded.length ? uploaded : (isEdit ? (editOrder.photos || []) : []);

      const nickname = userData?.nickname || userData?.name || user?.USERINFO?.nickname || "익명";
      const writerPhoto = userData?.profileImage || userData?.photoURL || user?.USERINFO?.userimg || "";
      // 소개 수수료 값 계산
      let referralFeeValue = null;
      if (referralFeeType === "fixed") {
        referralFeeValue = { type: "fixed", amount: referralFeeFixed === "custom" ? Number(referralFeeFixedCustom) : Number(referralFeeFixed) };
      } else if (referralFeeType === "rate") {
        referralFeeValue = { type: "rate", rate: Number(referralFeeRate) };
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
        customInput: customInput || null,
        schedule: workDate === "예약날짜" ? (workDatePicker || "예약날짜") : workDate, // 예약날짜는 날짜만 표기
        address,
        priceType,
        directPrice: priceType === "direct" ? directPrice : "",
        // 금액 표기 = 단가유형 기준 (예: "시공금액 330,000원" / "현장견적" / "견적요청")
        price: (() => {
          const map = { fixed: "시공금액", balance: "잔금", hpoint: "H-포인트", onsite: "현장견적", estimate: "견적요청" };
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
        paymentMethod: paymentMethod || null,
        b2bPriceType: b2bPriceType || null,
        b2bPriceAmount: (b2bPriceType === "fixed" || b2bPriceType === "balance" || b2bPriceType === "hpoint") ? Number(b2bPriceAmount) || null : null,
        referralFee: referralFeeType === "none" ? null : referralFeeValue,
        referralPayMethod: referralFeeType !== "none" ? (referralPayMethod || null) : null,
        matchType: matchType || null,
        directPhone: matchType === "direct" ? directPhone : null,
        orderStatus: asWaiting ? "대기" : "접수",
      };
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
    items.push({ k: "주소", v: addressDetail ? `${address} ${addressDetail}` : address });
    items.push({ k: "요청 내용", v: detail });
    if (callFirst) items.push({ k: "선통화 요청", v: "예" });
    if (contactPhone) items.push({ k: "연락처", v: contactPhone });
    if (priceType === "direct") items.push({ k: "단가(직접)", v: `${Number(directPrice).toLocaleString()}원` });
    if (workDate) items.push({ k: "작업 날짜", v: workDate === "예약날짜" ? (workDatePicker || "예약날짜") : workDate });
    if (workTimeMode) items.push({ k: "작업 시간", v: workTimeMode === "작업시작 설정" ? (workTimeStart ? `${workTimeStart} 시작` : "작업시작 설정") : workTimeMode });
    if (b2bPriceType) {
      const ptLabel = labelOf(COMMON_B2B_FIELDS.priceType.options, b2bPriceType);
      const opt = COMMON_B2B_FIELDS.priceType.options.find((o) => o.value === b2bPriceType);
      const amt = b2bPriceAmount ? ` ${Number(b2bPriceAmount).toLocaleString()}${opt?.unit || ""}` : "";
      items.push({ k: "단가유형", v: `${ptLabel}${amt}` });
    }
    if (referralFeeType && referralFeeType !== "none") {
      let v = "";
      if (referralFeeType === "fixed") {
        const amt = referralFeeFixed === "custom" ? referralFeeFixedCustom : referralFeeFixed;
        v = `정액 ${Number(amt || 0).toLocaleString()}원`;
      } else if (referralFeeType === "rate") {
        v = `정률 ${referralFeeRate}%`;
      }
      if (referralPayMethod) v += ` (${referralPayMethod})`;
      items.push({ k: "소개 수수료", v });
    }
    if (matchType) {
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
              {photos.map((p, i) => (
                <PreviewPhotoThumb key={i} src={p.preview} alt={`photo-${i}`} />
              ))}
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
            CATEGORIES.map((cat) => (
              <CatAccordion key={cat.id}>
                <CatAccordionHeader onClick={() => {
                  // 작업자요청은 전용 화면으로 (카테고리 편입)
                  if (cat.id === "worker_call") {
                    try { sessionStorage.setItem("homepro.main.activeTab", "worker_request"); } catch (e) {}
                    navigate("/MobileMain");
                    return;
                  }
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

          {/* 세부 항목 — 서비스 선택 → 종목 선택 드릴다운 */}
          {formConfig?.subGroups && (
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
                return (
                  <div style={{ marginTop: 14 }}>
                    <GroupLabel>{selectedService} 종목 선택</GroupLabel>
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

          {/* 건물유형 */}
          {showDetail && detailConfig?.buildingTypes && (
            <Section>
              <Label>건물유형</Label>
              <ChipGrid>
                {detailConfig.buildingTypes.map((type) => (
                  <Chip key={type} $selected={buildingType === type} onClick={() => setBuildingType(type)}>{type}</Chip>
                ))}
              </ChipGrid>
            </Section>
          )}

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

          {/* 공간유형 (config에 buildingTypes 없을 때 기본) */}
          {showDetail && !detailConfig?.buildingTypes && (
            <Section>
              <Label>공간유형</Label>
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
            <PhotoGrid>
              {photos.map((p, i) => (
                <PhotoBox key={i} style={{ position: "relative", padding: 0 }}>
                  <PhotoPreview src={p.preview} alt={`사진${i + 1}`} />
                  <RemoveBtn onClick={() => handlePhotoRemove(i)}><IoCloseCircle size={22} color="#fff" /></RemoveBtn>
                </PhotoBox>
              ))}
              {photos.length < MAX_PHOTOS && (
                <PhotoBox onClick={() => fileInputRef.current?.click()}>+</PhotoBox>
              )}
            </PhotoGrid>
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
                  <div style={{ fontSize: 13, color: THEME.muted, marginBottom: 6 }}>작업 시작 시각 (10분 단위, 24시간)</div>
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
          <Section>
            <Label>연락처</Label>
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: THEME.background, borderRadius: 10, fontSize: 14, color: THEME.text }}>
              <span style={{ color: THEME.success }}>✓</span>
              <span style={{ color: THEME.muted }}>접수자(본인)</span>
              <span style={{ fontWeight: 600 }}>{contactPhone || "인증된 번호"}</span>
            </div>
            <div style={{ fontSize: 13, color: THEME.muted, margin: "12px 0 6px" }}>고객(실무자) — 통화연결용</div>
            <Input type="tel" placeholder="고객 전화번호 (선택)" value={customerPhone} onChange={(e) => setCustomerPhone(e.target.value)} />
          </Section>

          {/* 단가유형 */}
          <Section>
            <LabelRow>
              <Label style={{ marginBottom: 0 }}>{COMMON_B2B_FIELDS.priceType.label}</Label>
              <HelpBtn type="button" onClick={() => setHelpPopup({ title: "단가유형 안내", items: COMMON_B2B_FIELDS.priceType.options.map((o) => ({ name: o.label, desc: o.desc })) })}>?</HelpBtn>
            </LabelRow>
            <ChipGrid style={{ marginTop: 12 }}>
              {COMMON_B2B_FIELDS.priceType.options.map((opt) => (
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
          </Section>

          {/* 소개(캐시백) 수수료 */}
          <Section>
            <LabelRow>
              <Label style={{ marginBottom: 0 }}>{COMMON_B2B_FIELDS.referralFee.label}</Label>
              <HelpBtn type="button" onClick={() => setHelpPopup({ title: "소개(캐시백) 수수료 안내", text: COMMON_B2B_FIELDS.referralFee.desc })}>?</HelpBtn>
            </LabelRow>
            <ChipGrid style={{ marginTop: 12, marginBottom: 12 }}>
              {COMMON_B2B_FIELDS.referralFee.types.map((t) => (
                <Chip key={t.value} $selected={referralFeeType === t.value} onClick={() => setReferralFeeType(t.value)}>{t.label}</Chip>
              ))}
            </ChipGrid>
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
                {COMMON_B2B_FIELDS.referralFee.rates.map((r) => (
                  <Chip key={r} $selected={referralFeeRate === String(r)} onClick={() => setReferralFeeRate(String(r))}>{r}%</Chip>
                ))}
              </ChipGrid>
            )}
          </Section>

          {/* 소개 수수료 지급방법 */}
          {referralFeeType !== "none" && (
            <Section>
              <Label>{COMMON_B2B_FIELDS.referralPayMethod.label}</Label>
              <ChipGrid>
                {COMMON_B2B_FIELDS.referralPayMethod.options.map((opt) => (
                  <Chip key={opt} $selected={referralPayMethod === opt} onClick={() => setReferralPayMethod(opt)}>{opt}</Chip>
                ))}
              </ChipGrid>
            </Section>
          )}

          {/* 홈프로 선택 */}
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
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  line-height: 1.6;
  white-space: pre-line;
`;

const GroupLabel = styled.div`
  font-size: 14px;
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
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const FieldInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  font-size: 14px;
  font-family: inherit;
  outline: none;
  &:focus { border-color: ${THEME.primary}; }
`;

const AreaRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
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
  font-size: 12px;
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
  font-size: 13px;
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
  font-size: 14px;
  font-family: inherit;
  background: ${THEME.surface};
  color: ${THEME.text};
  outline: none;
  &:focus { border-color: ${THEME.primary}; }
`;

const TimeColon = styled.span`
  font-size: 16px;
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
  font-size: 16px;
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
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.primary};
  margin-bottom: 4px;
`;

const HelpItemDesc = styled.div`
  font-size: 13px;
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
  font-size: 15px;
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
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

const AddressCloseBtn = styled.button`
  border: none;
  background: none;
  font-size: 20px;
  color: ${THEME.muted};
  cursor: pointer;
  padding: 4px;
`;

const AddressEmbedWrap = styled.div`
  flex: 1;
  width: 100%;
`;

const OrderCreatePage = () => (
  <SimpleBackLayout NAME="견적서 요청">
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
  font-size: 14px;
  font-family: inherit;
  outline: none;
  &:focus {
    border-color: ${THEME.primary};
  }
`;

const DirectDesc = styled.div`
  font-size: 12px;
  color: #999;
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
  font-size: 14px;
  font-weight: 400;
  border-radius: 10px;
  z-index: 9999;
  white-space: nowrap;
  animation: ${toastFadeIn} 0.25s ease-out;
`;
