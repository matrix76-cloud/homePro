/* eslint-disable */
import { getAccessTier } from "../../utility/tierUtils";
import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAtom } from "jotai";
import { IoPersonCircleOutline, IoCameraOutline, IoClose, IoChevronForward, IoAddOutline, IoDocumentTextOutline, IoSendOutline, IoStarOutline, IoChatbubbleOutline, IoWalletOutline, IoCashOutline } from "react-icons/io5";
import { UserContext } from "../../context/User";
import { signOutUser, withdrawUser } from "../../service/AuthService";
import { useAuth } from "../../context/AuthContext";
import { THEME, CATEGORIES, APP_VERSION } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import MyPageLayout from "../../screen/Layout/Layout/MyPageLayout";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "../../api/config";
import { compressProfileImage } from "../../utility/imageUtils";
import { GradeBadge, GradeProgressBar, GRADE_ORDER, calcGrade } from "../../utility/gradeUtils";
import { IoHelpCircleOutline, IoCloseOutline, IoChevronBack } from "react-icons/io5";

/* ─── 프로필 카드 ─── (기본 프로필 + 비즈프로필 진입을 한 박스로 — 형 리뷰 7/29) */
const ProfileCard = styled.div`
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 24px 20px 16px;
  box-shadow: ${THEME.cardShadow};
`;

const ProfileTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const ProfileDivider = styled.div`
  height: 1px;
  background: ${THEME.border};
  margin: 18px 0 4px;
`;

const ProfileActionRow = styled.div`
  display: flex;
  gap: 10px;
  padding-top: 14px;
`;

const ProfileActionBtn = styled.button`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
  padding: 14px 14px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.surface};
  font-family: inherit;
  text-align: left;
  cursor: pointer;
  strong { font-size: 16px; font-weight: 700; color: ${THEME.text}; }
  span { font-size: 13px; color: #2b2f36; }
  &:active { background: ${THEME.background}; }
`;

const ProfileBizRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0 4px;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const ProfileImgWrap = styled.div`
  position: relative;
  flex-shrink: 0;
`;

const ProfileImg = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
`;

const ProfilePlaceholder = styled.div`
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const ProfileInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProfileNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  flex-wrap: wrap;
`;

const ProfileName = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  white-space: nowrap;
`;

const ProfileSub = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const ProfileIntro = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 6px;
  line-height: 1.4;
`;

const ProfileEditLabel = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.primary};
`;

/* ─── 프로필 편집 화면 (시안 4번, 형 9/18) ─── */
const EditScreen = styled.div`
  position: fixed;
  inset: 0;
  z-index: 9999;
  background: #fff;
  display: flex;
  flex-direction: column;
  max-width: 400px;
  margin: 0 auto;
`;

const EditHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: calc(env(safe-area-inset-top, 0px) + 8px) 12px 8px 8px;
  min-height: 52px;
  border-bottom: 1px solid #EFF1F4;
`;

const EditBackBtn = styled.button`
  border: none;
  background: none;
  padding: 6px;
  display: flex;
  cursor: pointer;
`;

const EditTitle = styled.div`
  flex: 1;
  font-size: 19px;
  font-weight: 700;
  color: ${THEME.text};
`;

const EditSaveText = styled.button`
  border: none;
  background: none;
  padding: 8px 6px;
  font-size: 17px;
  font-weight: 700;
  font-family: inherit;
  color: ${({ disabled }) => (disabled ? "#9AA1AB" : THEME.primary)};
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};
`;

const EditBody = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 28px 20px 40px;
`;

const EditPhotoWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 28px;
`;

const EditPhotoText = styled.button`
  border: none;
  background: none;
  margin-top: 8px;
  padding: 4px 8px;
  font-size: 15px;
  font-family: inherit;
  color: #2b2f36;
  cursor: pointer;
`;

const EditLabelRow = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 8px;
`;

const EditLabel = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
`;

const EditCount = styled.div`
  font-size: 13px;
  color: #2b2f36;
`;

const EditInput = styled.input`
  width: 100%;
  box-sizing: border-box;
  height: 52px;
  padding: 0 14px;
  font-size: 16px;
  font-family: inherit;
  color: ${THEME.text};
  border: 1px solid #D9DDE3;
  border-radius: 10px;
  background: #fff;
  &:focus { outline: none; border-color: ${THEME.primary}; }
`;

const EditTextarea = styled.textarea`
  width: 100%;
  box-sizing: border-box;
  height: 180px;
  padding: 12px 14px;
  font-size: 16px;
  line-height: 1.55;
  font-family: inherit;
  color: ${THEME.text};
  border: 1px solid #D9DDE3;
  border-radius: 10px;
  background: #fff;
  resize: none;
  &:focus { outline: none; border-color: ${THEME.primary}; }
`;

/* ─── 프로필 편집 모달 ─── */
const ModalOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
`;

const ModalContent = styled.div`
  width: 100%;
  max-width: 360px;
  background: ${THEME.surface};
  border-radius: 20px;
  padding: 28px 24px 24px;
`;

const ModalHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
`;

const ModalTitle = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: ${THEME.text};
`;

const ModalCloseBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const ModalImgWrap = styled.div`
  display: flex;
  justify-content: center;
  margin-bottom: 24px;
`;

const ModalImgBtn = styled.div`
  position: relative;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const ImgSpinnerOverlay = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
`;

const ImgSpinner = styled.div`
  width: 28px;
  height: 28px;
  border: 3px solid rgba(37, 113, 227, 0.2);
  border-top-color: ${THEME.primary};
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  @keyframes spin {
    to { transform: rotate(360deg); }
  }
`;

const CameraBadge = styled.div`
  position: absolute;
  bottom: 0;
  right: 0;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: ${THEME.button};
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
`;

const UploadingOverlay = styled.div`
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  &::after {
    content: "";
    width: 24px;
    height: 24px;
    border: 3px solid rgba(255,255,255,0.3);
    border-top-color: #fff;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

const ModalInput = styled.input`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid ${THEME.border};
  border-radius: 10px;
  font-size: 18px;
  font-weight: 400;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${THEME.primary}; }
`;

const ModalInputCount = styled.div`
  text-align: right;
  font-size: 14px;
  color: ${THEME.muted};
  margin-top: 6px;
`;

const ModalIntroLabel = styled.div`
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
  margin-top: 16px;
  margin-bottom: 8px;
`;

const ModalTextarea = styled.textarea`
  width: 100%;
  padding: 14px 16px;
  border: 2px solid ${THEME.border};
  border-radius: 10px;
  font-size: 16px;
  font-weight: 400;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  box-sizing: border-box;
  resize: none;
  line-height: 1.5;
  &:focus { border-color: ${THEME.primary}; }
  &::placeholder { color: ${THEME.muted}; }
`;

const ModalSaveBtn = styled.button`
  width: 100%;
  margin-top: 20px;
  padding: 16px;
  border: none;
  border-radius: 10px;
  background: ${THEME.button};
  color: #fff;
  font-size: 18px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.9; }
  &:disabled { background: ${THEME.border}; color: ${THEME.muted}; }
`;


const WithdrawLink = styled.button`
  display: block;
  margin: 6px auto 0;
  padding: 10px 12px;
  background: none;
  border: none;
  font-family: inherit;
  font-size: 14px;
  color: ${THEME.muted};
  text-decoration: underline;
  cursor: pointer;
  &:focus { outline: none; }
`;

const WithdrawOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1200;
  background: rgba(0,0,0,0.45);
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const WithdrawSheet = styled.div`
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 16px 16px 0 0;
  padding: 22px 20px calc(24px + env(safe-area-inset-bottom, 0px));
  display: flex;
  flex-direction: column;
  gap: 10px;
`;

const WithdrawTitle = styled.div`
  font-size: 19px;
  font-weight: 700;
  color: ${THEME.text};
`;

const WithdrawDesc = styled.div`
  font-size: 15px;
  line-height: 1.65;
  color: #2b2f36;
  word-break: keep-all;
  b { color: ${THEME.text}; font-weight: 700; }
`;

const WithdrawInput = styled.input`
  margin-top: 4px;
  padding: 14px;
  border: 1px solid ${THEME.border};
  border-radius: 8px;
  font-size: 16px;
  font-family: inherit;
  color: ${THEME.text};
  &:focus { outline: none; border-color: ${THEME.primary}; }
`;

const WithdrawBtnRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 6px;
`;

const WithdrawCancel = styled.button`
  flex: 1;
  height: 52px;
  border-radius: 8px;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 16px;
  font-family: inherit;
  cursor: pointer;
  &:focus { outline: none; }
`;

const WithdrawGo = styled.button`
  flex: 1;
  height: 52px;
  border-radius: 8px;
  border: none;
  background: ${({ disabled }) => (disabled ? "#D9DDE3" : THEME.danger)};
  color: #fff;
  font-size: 16px;
  font-weight: 700;
  font-family: inherit;
  cursor: ${({ disabled }) => (disabled ? "default" : "pointer")};
  &:focus { outline: none; }
`;

/* 카드 없이 배경 위에 바로 (대표 9/17) */
const CompanyFooter = styled.div`
  display: flex;
  flex-direction: column;
  gap: 7px;
  margin: 20px 16px 0;
  padding: 0;
  font-size: 14px;
  line-height: 1.7;
  color: ${THEME.muted};
  word-break: keep-all;
`;

const CompanyTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 4px;
`;

const LogoutButton = styled.button`
  width: calc(100% - 32px);
  margin: 12px 16px;
  padding: 16px;
  background: ${THEME.surface};
  border: none;
  border-radius: 16px;
  color: ${THEME.danger};
  font-size: 17px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
  box-shadow: ${THEME.cardShadow};
  &:active { opacity: 0.8; }
`;

/* ─── 캘린더 ─── */
const CardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CardTitle = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const CardDesc = styled.div`
  font-size: 16px;
  color: ${THEME.muted};
  margin-top: 4px;
  font-weight: 400;
`;

const ArrowBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  &:active { opacity: 0.6; }
`;

const MenuRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-top: 1px solid ${THEME.border};
  &:active { background: ${THEME.background}; }
`;

const MenuLabel = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${THEME.text};
`;

/* ─── 개별 메뉴 카드 ─── */
const SingleCardWrap = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 12px 16px 0;
`;

const SingleCard = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: ${THEME.cardShadow};
  cursor: pointer;
  &:active { background: #FAFBFC; }
`;

const SingleCardIcon = styled.div`
  font-size: 30px;
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const SingleCardText = styled.div`
  flex: 1;
  min-width: 0;
`;

const SingleCardTitle = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.text};
`;

const SingleCardDesc = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 2px;
`;

const SupportList = styled.div`
  margin-top: 8px;
`;

const SupportItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 13px 0;
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const SupportLabel = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${THEME.text};
`;

const BottomSpacer = styled.div`
  height: 20px;
`;

/* ─── 콘텐츠 카드 ─── */
const ContentCard = styled.div`
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const InfoGrid = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 16px;
`;

const InfoItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 0;
`;

const InfoLabel2 = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const InfoValue2 = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${THEME.text};
`;

const ReferralBox = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
  padding: 12px 16px;
  background: ${THEME.background};
  border-radius: 12px;
`;

const ReferralCode = styled.div`
  flex: 1;
  font-size: 20px;
  font-weight: 600;
  color: ${THEME.primary};
  letter-spacing: 0.05em;
`;

const CopyBtn = styled.button`
  padding: 6px 14px;
  border: none;
  border-radius: 10px;
  background: ${THEME.button};
  color: #fff;
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const RegenBtn = styled.button`
  margin-top: 8px;
  background: none;
  border: none;
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  text-decoration: underline;
  cursor: pointer;
  font-family: inherit;
  &:active { opacity: 0.6; }
  &:disabled { opacity: 0.4; cursor: not-allowed; }
`;

const ReferralStat = styled.div`
  display: flex;
  align-items: center;
  margin-top: 14px;
  padding-top: 14px;
  border-top: 1px solid ${THEME.border};
`;

const ReferralStatItem = styled.div`
  flex: 1;
  text-align: center;
`;

const ReferralNum = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: ${THEME.text};
`;

const ReferralLabel = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const StatDivider2 = styled.div`
  width: 1px;
  height: 32px;
  background: ${THEME.border};
`;

const BizCatList = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 16px;
`;

const EmptyBiz = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 18px;
  border: 1.5px dashed ${THEME.border};
  border-radius: 12px;
  cursor: pointer;
  width: 100%;
  &:active { background: ${THEME.background}; }
`;

const EmptyBizText = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const BizCatChip = styled.div`
  padding: 8px 14px;
  border-radius: 20px;
  background: ${THEME.background};
  font-size: 15px;
  font-weight: 500;
  color: ${THEME.text};
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const SubStatusRow = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 16px;
`;

const SubBadge = styled.span`
  padding: 5px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 400;
  white-space: nowrap;
  flex-shrink: 0;
  background: ${({ $active }) => ($active ? THEME.purpleLight : THEME.background)};
  color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
`;

const SubText = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  white-space: nowrap;
`;

const CashGrid = styled.div`
  display: flex;
  align-items: center;
  margin-top: 16px;
`;

const CashItem = styled.div`
  flex: 1;
  text-align: center;
`;

const CashAmount = styled.div`
  font-size: 20px;
  font-weight: 600;
  color: ${THEME.text};
`;

const CashLabel = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const CashDivider = styled.div`
  width: 1px;
  height: 32px;
  background: ${THEME.border};
`;

const ToggleRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 0;
  border-bottom: 1px solid ${THEME.border};
  margin-top: ${({ $first }) => ($first ? "16px" : "0")};
`;

const ToggleLabel = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${THEME.text};
`;

const ToggleSwitch = styled.div`
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $on }) => ($on ? THEME.button : THEME.border)};
  position: relative;
  cursor: pointer;
  transition: background 0.2s;
  &::after {
    content: "";
    position: absolute;
    top: 2px;
    left: ${({ $on }) => ($on ? "22px" : "2px")};
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: #fff;
    transition: left 0.2s;
    box-shadow: 0 1px 3px rgba(0,0,0,0.15);
  }
`;

const MobileConfigpage = () => {
  const navigate = useNavigate();
  const { user, dispatch } = useContext(UserContext);
  const { userData, refreshUser } = useAuth();
  const [proCategories] = useAtom(proCategoriesAtom);
  const [showEditModal, setShowEditModal] = useState(false);
  const uid = userData?.uid || user?.USERS_ID;

  const nickname = user?.USERINFO?.nickname || userData?.nickname || userData?.name || "사용자";
  const userimg = user?.USERINFO?.userimg || userData?.profileImage || userData?.photoURL || "";
  const intro = user?.USERINFO?.intro || userData?.intro || "";
  const [editNickname, setEditNickname] = useState("");
  const [editIntro, setEditIntro] = useState("");
  const [editImg, setEditImg] = useState("");
  const [uploadingImg, setUploadingImg] = useState(false);
  const profileFileRef = React.useRef(null);
  const [referralCode, setReferralCode] = useState("");
  const [referralStats, setReferralStats] = useState({ referralCount: 0, referralPoints: 0 });
  const [refBusy, setRefBusy] = useState(false);
  const [showGradeSheet, setShowGradeSheet] = useState(false);
  // 사업자 정보 (홈에서 옮겨 옴 — 대표 9/17)
  const [companyInfo, setCompanyInfo] = useState(null);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const snap = await getDoc(doc(db, "settings", "companyInfo"));
        if (!cancelled && snap.exists()) setCompanyInfo(snap.data());
      } catch (e) { /* 없으면 표시하지 않는다 */ }
    })();
    return () => { cancelled = true; };
  }, []);
  const [gradeRules, setGradeRules] = useState(null);

  // 추천코드 로드
  useEffect(() => {
    if (!uid) return;
    (async () => {
      const { getReferralCode, getReferralStats } = await import("../../service/ReferralService");
      const code = await getReferralCode(uid);
      setReferralCode(code);
      const s = await getReferralStats(uid);
      setReferralStats(s);
    })();
  }, [uid]);

  // 등급 규칙 로드
  useEffect(() => {
    (async () => {
      try {
        const { doc, getDoc } = await import("firebase/firestore");
        const { db } = await import("../../api/config");
        const snap = await getDoc(doc(db, "settings", "grade_rules"));
        if (snap.exists()) setGradeRules(snap.data());
      } catch {}
    })();
  }, []);

  const handleCopyCode = () => {
    navigator.clipboard?.writeText(referralCode);
    alert("복사되었습니다!");
  };

  const handleRegenerateCode = async () => {
    if (!uid || !referralCode) return;
    if (!window.confirm("기존 코드가 무효화됩니다. 재발행하시겠습니까?")) return;
    setRefBusy(true);
    try {
      const { regenerateReferralCode } = await import("../../service/ReferralService");
      const newCode = await regenerateReferralCode(uid, referralCode);
      setReferralCode(newCode);
      alert("새 추천코드가 발행되었습니다");
    } catch (e) {
      alert("재발행 실패 — 다시 시도해주세요");
    } finally { setRefBusy(false); }
  };

  const handleOpenEdit = () => {
    setEditNickname(nickname);
    setEditIntro(intro);
    setEditImg(userimg);
    setShowEditModal(true);
  };

  const handleSelectPhoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file || uploadingImg) return;
    if (!uid) { alert("로그인 정보를 확인해주세요."); return; }
    e.target.value = "";
    setUploadingImg(true);
    try {
      const compressed = await compressProfileImage(file, 400, 0.3);
      const storageRef = ref(storage, `homepro/profiles/${uid}/profile_${Date.now()}.jpg`);
      await uploadBytes(storageRef, compressed);
      const url = await getDownloadURL(storageRef);
      setEditImg(url);
    } catch (err) {
      console.error("사진 업로드 실패:", err);
      alert("사진 업로드 실패: " + err.message);
    } finally {
      setUploadingImg(false);
    }
  };

  const handleSaveProfile = async () => {
    const trimmed = editNickname.trim();
    if (!trimmed) return;
    const introTrimmed = editIntro.trim();
    dispatch({ USERINFO: { nickname: trimmed, intro: introTrimmed, userimg: editImg } });
    // Firestore 저장
    const uid = user?.USERS_ID;
    if (uid) {
      try {
        const { upsertUserProfile } = await import("../../service/UserProfileService");
        await upsertUserProfile(uid, { nickname: trimmed, name: trimmed, intro: introTrimmed, profileImage: editImg, photoURL: editImg });
        await refreshUser();
      } catch (e) {
        console.error("프로필 저장 실패:", e);
      }
    }
    setShowEditModal(false);
  };

  const [, setProCats] = useAtom(proCategoriesAtom);
  // 회원 탈퇴 — 글자를 직접 쳐야 진행된다 (대표 9/17)
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [withdrawText, setWithdrawText] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const WITHDRAW_WORD = "탈퇴합니다";

  const handleWithdraw = async () => {
    if (withdrawText.trim() !== WITHDRAW_WORD) return;
    setWithdrawing(true);
    try {
      await withdrawUser(userData?.uid || user?.USERS_ID);
      dispatch(null);
      setProCats([]);
      navigate("/MobileLogin", { replace: true });
    } catch (e) {
      console.error("탈퇴 실패:", e);
      window.alert("탈퇴 처리에 실패했습니다. 잠시 후 다시 시도해 주세요.");
      setWithdrawing(false);
    }
  };

  const handleLogout = async () => {
    await signOutUser();
    dispatch(null);
    setProCats([]);
    navigate("/MobileLogin", { replace: true });
  };

  return (
    <MyPageLayout name="마이페이지">
      {/* 프로필 (기본 프로필 + 비즈프로필을 한 박스로 — 형 리뷰 7/29) */}
      <ProfileCard>
        <ProfileTopRow onClick={handleOpenEdit}>
          <ProfileImgWrap>
            {userimg ? (
              <ProfileImg src={userimg} alt="profile" />
            ) : (
              <ProfilePlaceholder>
                <IoPersonCircleOutline size={60} color={THEME.border} />
              </ProfilePlaceholder>
            )}
          </ProfileImgWrap>
          <ProfileInfo>
            <ProfileNameRow>
              <ProfileName>{nickname}</ProfileName>
              <GradeBadge grade={userData?.grade} size="sm" />
              <GradeHelpBtn onClick={(e) => { e.stopPropagation(); setShowGradeSheet(true); }}>
                <IoHelpCircleOutline size={16} color={THEME.muted} />
              </GradeHelpBtn>
            </ProfileNameRow>
            <ProfileSub>
              {proCategories?.length > 0 ? "홈프로 전문가" : "홈프로 일반회원"}
            </ProfileSub>
            {intro && <ProfileIntro>{intro}</ProfileIntro>}
          </ProfileInfo>
        </ProfileTopRow>
        <ProfileDivider />
        {/* 프로필·비즈프로필 정리 (대표 9/15 리뷰) — 두 진입을 같은 모양의 버튼 두 개로 나란히, 무엇이 다른지 한 줄로 */}
        <ProfileActionRow>
          <ProfileActionBtn type="button" onClick={handleOpenEdit}>
            <strong>기본 프로필</strong>
            <span>사진·닉네임·소개</span>
          </ProfileActionBtn>
          <ProfileActionBtn type="button" onClick={() => navigate("/biz-profile")}>
            <strong>비즈프로필</strong>
            <span>인증·포트폴리오·정산계좌</span>
          </ProfileActionBtn>
        </ProfileActionRow>
      </ProfileCard>

      {/* 프로필 편집 — 창 대신 화면 한 장 (시안 4번, 형 9/18) */}
      {showEditModal && (
        <EditScreen>
          <EditHeader>
            <EditBackBtn type="button" onClick={() => setShowEditModal(false)} aria-label="뒤로">
              <IoChevronBack size={24} color={THEME.text} />
            </EditBackBtn>
            <EditTitle>프로필 편집</EditTitle>
            <EditSaveText type="button" onClick={handleSaveProfile} disabled={!editNickname.trim() || uploadingImg}>
              저장
            </EditSaveText>
          </EditHeader>
          <EditBody>
            <EditPhotoWrap>
              <input ref={profileFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSelectPhoto} />
              <ModalImgBtn onClick={() => profileFileRef.current?.click()}>
                {editImg ? (
                  <ProfileImg src={editImg} alt="profile" style={{ width: 96, height: 96, opacity: uploadingImg ? 0.4 : 1 }} />
                ) : (
                  <ProfilePlaceholder style={{ width: 96, height: 96, opacity: uploadingImg ? 0.4 : 1 }}>
                    <IoPersonCircleOutline size={96} color="#D9DDE3" />
                  </ProfilePlaceholder>
                )}
                {uploadingImg && (
                  <ImgSpinnerOverlay>
                    <ImgSpinner />
                  </ImgSpinnerOverlay>
                )}
                <CameraBadge>
                  <IoCameraOutline size={16} color="#fff" />
                </CameraBadge>
              </ModalImgBtn>
              <EditPhotoText type="button" onClick={() => profileFileRef.current?.click()}>사진 바꾸기</EditPhotoText>
            </EditPhotoWrap>

            <EditLabelRow>
              <EditLabel>대화명</EditLabel>
              <EditCount>{editNickname.length}/12</EditCount>
            </EditLabelRow>
            <EditInput
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value.slice(0, 12))}
              placeholder="대화명을 입력하세요"
              maxLength={12}
            />

            <EditLabelRow style={{ marginTop: 22 }}>
              <EditLabel>자기소개</EditLabel>
              <EditCount>{editIntro.length}/200</EditCount>
            </EditLabelRow>
            <EditTextarea
              value={editIntro}
              onChange={(e) => setEditIntro(e.target.value.slice(0, 200))}
              placeholder="전문 분야, 경력, 강점 등을 소개해주세요"
              maxLength={200}
            />
          </EditBody>
        </EditScreen>
      )}

      {/* 등급 안내 바텀시트 */}
      {showGradeSheet && (
        <GradeSheetOverlay onClick={() => setShowGradeSheet(false)}>
          <GradeSheetContent onClick={(e) => e.stopPropagation()}>
            <GradeSheetHandle />
            <GradeSheetHeader>
              <GradeSheetTitle>등급 안내</GradeSheetTitle>
              <GradeSheetClose onClick={() => setShowGradeSheet(false)}>
                <IoCloseOutline size={24} color={THEME.text} />
              </GradeSheetClose>
            </GradeSheetHeader>
            <GradeSheetBody>
              <GradeProgressBar totalEarnedPoints={userData?.totalEarnedPoints || 0} gradeRules={gradeRules} />
              <GradeSheetList>
                {GRADE_ORDER.map((key) => {
                  const rule = (gradeRules || {})[key] || {};
                  const current = calcGrade(userData?.totalEarnedPoints || 0, gradeRules);
                  const isCurrent = current.key === key;
                  return (
                    <GradeSheetItem key={key} $active={isCurrent}>
                      <GradeSheetDot $color={rule.color} />
                      <GradeSheetLabel $active={isCurrent}>{rule.label || key}</GradeSheetLabel>
                      <GradeSheetPts>{(rule.minPoints || 0).toLocaleString()}P ~</GradeSheetPts>
                    </GradeSheetItem>
                  );
                })}
              </GradeSheetList>
            </GradeSheetBody>
          </GradeSheetContent>
        </GradeSheetOverlay>
      )}

      {/* 정산 — 포인트·초대는 홈 보유자산 탭과 겹쳐서 뺐다 (대표 9/17) */}
      <ContentCard>
        <CardHeader>
          <div>
            <CardTitle>정산</CardTitle>
            <CardDesc>수익과 정산 현황을 확인하세요</CardDesc>
          </div>
          <ArrowBtn onClick={() => navigate("/referral/points")}><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
        <CashGrid>
          <CashItem>
            <CashAmount>0원</CashAmount>
            <CashLabel>이번달 수익</CashLabel>
          </CashItem>
          <CashDivider />
          <CashItem>
            <CashAmount>0원</CashAmount>
            <CashLabel>정산 대기</CashLabel>
          </CashItem>
        </CashGrid>
      </ContentCard>

      {/* 홈프로 리스트 */}
      <ContentCard onClick={() => navigate("/pro/list")} style={{ cursor: "pointer" }}>
        <CardHeader>
          <div><CardTitle>홈프로 리스트</CardTitle></div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
      </ContentCard>

      {/* 구독 관리 — 월 16,500원, H-포인트 혼합 결제. 누르면 구독 페이지 (9/14) */}
      {userData?.userType !== "customer" && (
      <ContentCard onClick={() => navigate("/subscription")} style={{ cursor: "pointer" }}>
        <CardHeader>
          <div><CardTitle>구독 관리</CardTitle></div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
        <SubStatusRow>
          <SubText style={{ color: getAccessTier(userData) === "tier0" ? "#15803d" : THEME.text, fontWeight: 700 }}>{getAccessTier(userData) === "tier0" ? "구독 중 · 0차수" : `미구독 · ${getAccessTier(userData) === "tier1" ? "1차수 (2만P 보유)" : "2차수"}`}</SubText>
        </SubStatusRow>
      </ContentCard>
      )}

      {/* 사업자도구 · PG결제 — 유료 구독 사업자 전용 (대표 리뷰 9/17) */}
      {userData?.userType !== "customer" && (
      <ContentCard onClick={() => navigate("/mypage/pg")} style={{ cursor: "pointer" }}>
        <CardHeader>
          <div>
            <CardTitle>사업자도구 · PG결제</CardTitle>
            <CardDesc>결제링크로 고객에게 직접 결제받기</CardDesc>
          </div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
      </ContentCard>
      )}

      {/* 기술전수교육 / 거래장터 — 분리 진입 (형 지시 8/8) */}
      {/* 대표 9/15 리뷰: 메뉴명 '기술전수 수강생모집', 기술전수 항목만 관리 (only=1 → 다른 세그먼트 숨김) */}
      <ContentCard onClick={() => navigate("/education-market?seg=training&only=1")} style={{ cursor: "pointer" }}>
        <CardHeader>
          <div>
            <CardTitle>기술전수 수강생모집</CardTitle>
            <CardDesc>교육 공고를 등록하고 수강생을 모집하세요</CardDesc>
          </div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
      </ContentCard>

      <ContentCard onClick={() => navigate("/education-market?seg=market&only=1")} style={{ cursor: "pointer" }}>
        <CardHeader>
          <div>
            <CardTitle>거래장터</CardTitle>
            <CardDesc>양도·매매와 자재·장비 장터를 확인하세요</CardDesc>
          </div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
      </ContentCard>

      {/* 홈프로 가이드 */}
      <ContentCard>
        <CardTitle>홈프로 가이드</CardTitle>
        <ConfigCardDesc>'이대로만 따라해요!' 홈프로를 위한 안내서</ConfigCardDesc>
        <ConfigScrollRow>
          <ConfigGuideCard $bg="#FEF3C7" onClick={() => navigate("/guide/1")}>
            <ConfigGuideIconWrap><IoDocumentTextOutline size={32} color="#B45309" /><ConfigGuideSubIcon><IoSendOutline size={18} color="#B45309" /></ConfigGuideSubIcon></ConfigGuideIconWrap>
            <ConfigGuideText>첫 견적 보내기,{"\n"}이렇게 하면 쉬워요</ConfigGuideText>
          </ConfigGuideCard>
          <ConfigGuideCard $bg="#F1EAF6" onClick={() => navigate("/guide/2")}>
            <ConfigGuideIconWrap><IoStarOutline size={32} color={THEME.primary} /><ConfigGuideSubIcon><IoChatbubbleOutline size={18} color={THEME.primary} /></ConfigGuideSubIcon></ConfigGuideIconWrap>
            <ConfigGuideText>고객 리뷰를 늘리는{"\n"}가장 효과적인 방법</ConfigGuideText>
          </ConfigGuideCard>
          <ConfigGuideCard $bg={THEME.purpleLight} onClick={() => navigate("/guide/3")}>
            <ConfigGuideIconWrap><IoWalletOutline size={32} color={THEME.primaryDark} /><ConfigGuideSubIcon><IoCashOutline size={18} color={THEME.primaryDark} /></ConfigGuideSubIcon></ConfigGuideIconWrap>
            <ConfigGuideText>홈프로캐시 보상은{"\n"}언제 이루어지나요?</ConfigGuideText>
          </ConfigGuideCard>
          <ConfigGuideCard $bg="#D1FAE5" onClick={() => navigate("/guide/4")}>
            <ConfigGuideIconWrap><IoCameraOutline size={32} color="#059669" /></ConfigGuideIconWrap>
            <ConfigGuideText>프로필 사진,{"\n"}이렇게 찍으세요</ConfigGuideText>
          </ConfigGuideCard>
          <ConfigGuideCard $bg="#F1EAF6" onClick={() => navigate("/guide/5")}>
            <ConfigGuideIconWrap><IoStarOutline size={32} color={THEME.primary} /></ConfigGuideIconWrap>
            <ConfigGuideText>등급 시스템{"\n"}포인트로 올리세요</ConfigGuideText>
          </ConfigGuideCard>
        </ConfigScrollRow>
      </ContentCard>

      {/* 커뮤니티 — 차단 관리 위로 (형 9/18) */}
      <ContentCard onClick={() => navigate("/community")} style={{ cursor: "pointer" }}>
        <CardHeader>
          <div><CardTitle>커뮤니티</CardTitle></div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
      </ContentCard>

      {/* 차단/거부 관리 */}
      <ContentCard>
        <CardTitle>차단 관리</CardTitle>
        <SupportList>
          <SupportItem onClick={() => navigate("/blacklist-board")}>
            <SupportLabel>블랙리스트 게시판</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
          <SupportItem onClick={() => navigate("/mypage/blacklist")}>
            <SupportLabel>나의 블랙리스트 신고</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
          <SupportItem onClick={() => navigate("/mypage/blocks")} style={{ borderBottom: "none" }}>
            <SupportLabel>나의 거부 목록</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
        </SupportList>
      </ContentCard>

      {/* 앱 설정 (형 지시 8/8) */}
      <ContentCard onClick={() => navigate("/mypage/app-settings")} style={{ cursor: "pointer" }}>
        <CardHeader>
          <div>
            <CardTitle>앱 설정</CardTitle>
            <CardDesc>알림·방해 금지 시간·다크모드</CardDesc>
          </div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
      </ContentCard>

      {/* 고객지원 */}
      <ContentCard>
        <CardTitle>고객지원</CardTitle>
        <SupportList>
          {userData?.userType !== "customer" && (
          <SupportItem onClick={() => navigate("/mypage/payments")}>
            <SupportLabel>결제 내역 (구독·보험)</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
          )}
          <SupportItem onClick={() => navigate("/support")}>
            <SupportLabel>고객센터</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
          <SupportItem onClick={() => navigate("/legal/terms")}>
            <SupportLabel>이용약관</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
          <SupportItem onClick={() => navigate("/legal/privacy")}>
            <SupportLabel>개인정보처리방침</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
          <SupportItem onClick={() => navigate("/legal/location")}>
            <SupportLabel>위치기반서비스 이용약관</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>

          <SupportItem as="div" style={{ borderBottom: "none", cursor: "default" }}>
            <SupportLabel>버전 정보</SupportLabel>
            <span style={{ fontSize: 16, fontWeight: 600, color: THEME.muted }}>v{APP_VERSION}</span>
          </SupportItem>
        </SupportList>
      </ContentCard>

      <LogoutButton onClick={handleLogout}>로그아웃</LogoutButton>

      <WithdrawLink type="button" onClick={() => { setShowWithdraw(true); setWithdrawText(""); }}>탈퇴하기</WithdrawLink>

      {showWithdraw && (
        <WithdrawOverlay onClick={() => !withdrawing && setShowWithdraw(false)}>
          <WithdrawSheet onClick={(e) => e.stopPropagation()}>
            <WithdrawTitle>정말 탈퇴하시겠어요</WithdrawTitle>
            <WithdrawDesc>
              탈퇴하면 보유 포인트와 등급이 모두 사라지고 되돌릴 수 없습니다.
              진행 중인 오더가 있으면 마무리한 뒤에 탈퇴해 주세요.
            </WithdrawDesc>
            <WithdrawDesc>
              계속하시려면 아래 칸에 <b>{WITHDRAW_WORD}</b> 라고 그대로 입력해 주세요.
            </WithdrawDesc>
            <WithdrawInput
              value={withdrawText}
              onChange={(e) => setWithdrawText(e.target.value)}
              placeholder={WITHDRAW_WORD}
              disabled={withdrawing}
            />
            <WithdrawBtnRow>
              <WithdrawCancel type="button" onClick={() => setShowWithdraw(false)} disabled={withdrawing}>
                그만두기
              </WithdrawCancel>
              <WithdrawGo
                type="button"
                onClick={handleWithdraw}
                disabled={withdrawing || withdrawText.trim() !== WITHDRAW_WORD}
              >
                {withdrawing ? "처리 중..." : "탈퇴하기"}
              </WithdrawGo>
            </WithdrawBtnRow>
          </WithdrawSheet>
        </WithdrawOverlay>
      )}

      {companyInfo && (
        <CompanyFooter>
          <CompanyTitle>사업자 정보</CompanyTitle>
              {companyInfo.companyName && <span>상호명 : {companyInfo.companyName}</span>}
              {(companyInfo.ceo || companyInfo.privacyOfficer) && (
                <span>
                  {companyInfo.ceo ? `대표이사 : ${companyInfo.ceo}` : ""}
                  {companyInfo.ceo && companyInfo.privacyOfficer ? "\u00a0\u00a0\u00a0" : ""}
                  {companyInfo.privacyOfficer ? `개인정보책임관리자 : ${companyInfo.privacyOfficer}` : ""}
                </span>
              )}
              {companyInfo.address && <span>주소 : {companyInfo.address}</span>}
              {companyInfo.bizNumber && <span>사업자등록번호 : {companyInfo.bizNumber}</span>}
              {companyInfo.mailOrderNo && <span>통신판매번호 : {companyInfo.mailOrderNo}</span>}
              <span>직업정보제공사업 신고번호 : {companyInfo.jobInfoNo || "(신고전)"}</span>
              {(companyInfo.phone || companyInfo.email) && (
                <span>
                  {companyInfo.phone ? `고객센터 : ${companyInfo.phone}` : ""}
                  {companyInfo.phone && companyInfo.email ? "\u00a0\u00a0\u00a0" : ""}
                  {companyInfo.email ? `이메일 : ${companyInfo.email}` : ""}
                </span>
              )}
              <span style={{ marginTop: 6, opacity: 0.75 }}>© {new Date().getFullYear()} {companyInfo.companyName || "홈프로"}. All rights reserved.</span>
        </CompanyFooter>
      )}

      <BottomSpacer />
    </MyPageLayout>
  );
};

export default MobileConfigpage;

/* ── 등급 안내 바텀시트 ── */
const GradeHelpBtn = styled.button`
  background: none;
  border: none;
  padding: 2px;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const GradeSheetOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 9000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const GradeSheetContent = styled.div`
  width: 100%;
  background: #fff;
  border-radius: 16px 16px 0 0;
  animation: gradeUp 0.25s ease-out;
  @keyframes gradeUp {
    from { transform: translateY(100%); }
    to { transform: translateY(0); }
  }
`;

const GradeSheetHandle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: ${THEME.border};
  margin: 10px auto 0;
`;

const GradeSheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px 10px;
`;

const GradeSheetTitle = styled.div`
  font-size: 19px;
  font-weight: 600;
  color: ${THEME.text};
`;

const GradeSheetClose = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const GradeSheetBody = styled.div`
  padding: 0 16px 24px;
`;

const GradeSheetList = styled.div`
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 8px;
`;

const GradeSheetItem = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border-radius: 10px;
  background: ${({ $active }) => $active ? `${THEME.primary}10` : THEME.background};
  border: 1.5px solid ${({ $active }) => $active ? THEME.primary : "transparent"};
`;

const GradeSheetDot = styled.div`
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: ${({ $color }) => $color || THEME.muted};
  flex-shrink: 0;
`;

const GradeSheetLabel = styled.div`
  flex: 1;
  font-size: 16px;
  font-weight: ${({ $active }) => $active ? 700 : 400};
  color: ${THEME.text};
`;

const GradeSheetPts = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
`;

/* ─── 가이드 & 커뮤니티 (홈 스타일) ─── */

const ConfigCardDesc = styled.div`
  font-size: 16px;
  color: ${THEME.muted};
  margin-top: 4px;
  font-weight: 400;
`;

const ConfigScrollRow = styled.div`
  display: flex;
  gap: 10px;
  margin-top: 16px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
  &::-webkit-scrollbar { display: none; }
`;

const ConfigGuideCard = styled.div`
  flex-shrink: 0;
  width: 150px;
  padding: 20px 16px;
  border-radius: 16px;
  background: ${({ $bg }) => $bg || THEME.background};
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const ConfigGuideIconWrap = styled.div`
  position: relative;
  display: inline-flex;
  margin-bottom: 14px;
`;

const ConfigGuideSubIcon = styled.div`
  position: absolute;
  bottom: -4px;
  right: -8px;
`;

const ConfigGuideText = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: ${THEME.text};
  line-height: 1.4;
  white-space: pre-line;
`;

const ConfigComHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const ConfigPostCard = styled.div`
  flex-shrink: 0;
  width: 220px;
  padding: 16px;
  background: ${THEME.background};
  border-radius: 12px;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const ConfigPostBadge = styled.div`
  display: inline-block;
  padding: 3px 8px;
  border-radius: 20px;
  background: ${THEME.purpleLight};
  color: ${THEME.purple};
  font-size: 13px;
  font-weight: 400;
  margin-bottom: 10px;
`;

const ConfigPostTitle = styled.div`
  font-size: 16px;
  font-weight: 500;
  color: ${THEME.text};
  line-height: 1.4;
`;

const ConfigPostDesc = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
  line-height: 1.3;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ConfigPostDate = styled.div`
  margin-top: 10px;
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;
