/* eslint-disable */
import React, { useContext, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { useAtom } from "jotai";
import { IoPersonCircleOutline, IoCameraOutline, IoClose, IoChevronForward, IoAddOutline, IoDocumentTextOutline, IoSendOutline, IoStarOutline, IoChatbubbleOutline, IoWalletOutline, IoCashOutline } from "react-icons/io5";
import { UserContext } from "../../context/User";
import { signOutUser } from "../../service/AuthService";
import { useAuth } from "../../context/AuthContext";
import { THEME, CATEGORIES } from "../../config/homeproConfig";
import { proCategoriesAtom } from "../../store/store";
import MyPageLayout from "../../screen/Layout/Layout/MyPageLayout";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "../../api/config";
import { compressProfileImage } from "../../utility/imageUtils";
import { GradeBadge, GradeProgressBar, GRADE_ORDER, calcGrade } from "../../utility/gradeUtils";
import { IoHelpCircleOutline, IoCloseOutline } from "react-icons/io5";

/* ─── 프로필 카드 ─── */
const ProfileCard = styled.div`
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 24px 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  cursor: pointer;
  box-shadow: ${THEME.cardShadow};
  &:active { background: #FAFBFC; }
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
  font-size: 18px;
  font-weight: 600;
  color: ${THEME.text};
  letter-spacing: -0.02em;
  white-space: nowrap;
`;

const ProfileSub = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 4px;
`;

const ProfileIntro = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 6px;
  line-height: 1.4;
`;

const ProfileEditLabel = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.primary};
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
  font-size: 18px;
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
  border: 3px solid rgba(124, 92, 252, 0.2);
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
  background: ${THEME.primary};
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
  font-size: 16px;
  font-weight: 400;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  box-sizing: border-box;
  &:focus { border-color: ${THEME.primary}; }
`;

const ModalInputCount = styled.div`
  text-align: right;
  font-size: 12px;
  color: ${THEME.muted};
  margin-top: 6px;
`;

const ModalIntroLabel = styled.div`
  font-size: 14px;
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
  font-size: 14px;
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
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.9; }
  &:disabled { background: ${THEME.border}; color: ${THEME.muted}; }
`;


const LogoutButton = styled.button`
  width: calc(100% - 32px);
  margin: 12px 16px;
  padding: 16px;
  background: ${THEME.surface};
  border: none;
  border-radius: 16px;
  color: ${THEME.danger};
  font-size: 15px;
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
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
  letter-spacing: -0.03em;
`;

const CardDesc = styled.div`
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 28px;
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
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
`;

const SingleCardDesc = styled.div`
  font-size: 13px;
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
  font-size: 14px;
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
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const InfoValue2 = styled.div`
  font-size: 14px;
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
  font-size: 18px;
  font-weight: 600;
  color: ${THEME.primary};
  letter-spacing: 0.05em;
`;

const CopyBtn = styled.button`
  padding: 6px 14px;
  border: none;
  border-radius: 10px;
  background: ${THEME.primary};
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const RegenBtn = styled.button`
  margin-top: 8px;
  background: none;
  border: none;
  font-size: 13px;
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
  font-size: 18px;
  font-weight: 600;
  color: ${THEME.text};
`;

const ReferralLabel = styled.div`
  font-size: 12px;
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
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const BizCatChip = styled.div`
  padding: 8px 14px;
  border-radius: 20px;
  background: ${THEME.background};
  font-size: 13px;
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
  font-size: 12px;
  font-weight: 400;
  white-space: nowrap;
  flex-shrink: 0;
  background: ${({ $active }) => ($active ? THEME.purpleLight : THEME.background)};
  color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
`;

const SubText = styled.div`
  font-size: 12px;
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
  font-size: 18px;
  font-weight: 600;
  color: ${THEME.text};
`;

const CashLabel = styled.div`
  font-size: 12px;
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
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.text};
`;

const ToggleSwitch = styled.div`
  width: 44px;
  height: 24px;
  border-radius: 12px;
  background: ${({ $on }) => ($on ? THEME.primary : THEME.border)};
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
  const handleLogout = async () => {
    await signOutUser();
    dispatch(null);
    setProCats([]);
    navigate("/MobileLogin", { replace: true });
  };

  return (
    <MyPageLayout name="마이페이지">
      {/* 프로필 */}
      <ProfileCard onClick={handleOpenEdit}>
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
        <ProfileEditLabel>편집</ProfileEditLabel>
      </ProfileCard>

      {/* 프로필 편집 모달 */}
      {showEditModal && (
        <ModalOverlay onClick={() => setShowEditModal(false)}>
          <ModalContent onClick={(e) => e.stopPropagation()}>
            <ModalHeader>
              <ModalTitle>프로필 편집</ModalTitle>
              <ModalCloseBtn onClick={() => setShowEditModal(false)}>
                <IoClose size={24} color={THEME.text} />
              </ModalCloseBtn>
            </ModalHeader>
            <ModalImgWrap>
              <input ref={profileFileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleSelectPhoto} />
              <ModalImgBtn onClick={() => profileFileRef.current?.click()}>
                {editImg ? (
                  <ProfileImg src={editImg} alt="profile" style={{ width: 80, height: 80, opacity: uploadingImg ? 0.4 : 1 }} />
                ) : (
                  <ProfilePlaceholder style={{ width: 80, height: 80, opacity: uploadingImg ? 0.4 : 1 }}>
                    <IoPersonCircleOutline size={80} color={THEME.border} />
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
            </ModalImgWrap>
            <ModalInput
              value={editNickname}
              onChange={(e) => setEditNickname(e.target.value.slice(0, 12))}
              placeholder="대화명을 입력하세요"
              maxLength={12}
            />
            <ModalInputCount>{editNickname.length}/12</ModalInputCount>
            <ModalIntroLabel>자기소개</ModalIntroLabel>
            <ModalTextarea
              value={editIntro}
              onChange={(e) => setEditIntro(e.target.value.slice(0, 200))}
              placeholder="전문 분야, 경력, 강점 등을 소개해주세요"
              maxLength={200}
              rows={4}
            />
            <ModalInputCount>{editIntro.length}/200</ModalInputCount>
            <ModalSaveBtn
              onClick={handleSaveProfile}
              disabled={!editNickname.trim()}
            >
              저장
            </ModalSaveBtn>
          </ModalContent>
        </ModalOverlay>
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

      {/* 비즈프로필 */}
      <ContentCard onClick={() => navigate("/biz-profile")} style={{ cursor: "pointer" }}>
        <CardHeader>
          <div><CardTitle>비즈프로필</CardTitle></div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
      </ContentCard>

      {/* 전문가 리스트 */}
      <ContentCard onClick={() => navigate("/pro/list")} style={{ cursor: "pointer" }}>
        <CardHeader>
          <div><CardTitle>전문가 리스트</CardTitle></div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
      </ContentCard>

      {/* 커뮤니티 */}
      <ContentCard onClick={() => navigate("/community")} style={{ cursor: "pointer" }}>
        <CardHeader>
          <div><CardTitle>커뮤니티</CardTitle></div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
      </ContentCard>

      {/* 추천코드 */}
      <ContentCard>
        <CardHeader>
          <div>
            <CardTitle>추천코드</CardTitle>
            <CardDesc>친구를 초대하고 포인트를 받으세요</CardDesc>
          </div>
        </CardHeader>
        <ReferralBox>
          <ReferralCode>{referralCode || "..."}</ReferralCode>
          <CopyBtn onClick={handleCopyCode}>복사</CopyBtn>
        </ReferralBox>
        <ReferralStat>
          <ReferralStatItem onClick={() => navigate("/referral/friends")} style={{ cursor: "pointer" }}><ReferralNum>{referralStats.referralCount}</ReferralNum><ReferralLabel>초대한 친구</ReferralLabel></ReferralStatItem>
          <StatDivider2 />
          <ReferralStatItem onClick={() => navigate("/referral/points")} style={{ cursor: "pointer" }}><ReferralNum>{referralStats.referralPoints.toLocaleString()}P</ReferralNum><ReferralLabel>받은 포인트</ReferralLabel></ReferralStatItem>
        </ReferralStat>
      </ContentCard>

      {/* 구독 관리 */}
      <ContentCard>
        <CardHeader>
          <div><CardTitle>구독 관리</CardTitle></div>
          <ArrowBtn><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
        <SubStatusRow>
          <SubBadge $active={false}>무료 체험중</SubBadge>
          <SubText>구독하면 모든 오더를 받을 수 있어요</SubText>
        </SubStatusRow>
      </ContentCard>

      {/* 포인트 / 정산 */}
      <ContentCard>
        <CardHeader>
          <div>
            <CardTitle>포인트 / 정산</CardTitle>
            <CardDesc>수익 현황을 한눈에 확인하세요</CardDesc>
          </div>
          <ArrowBtn onClick={() => navigate("/referral/points")}><IoChevronForward size={22} color={THEME.muted} /></ArrowBtn>
        </CardHeader>
        <CashGrid>
          <CashItem onClick={() => navigate("/referral/points")} style={{ cursor: "pointer" }}>
            <CashAmount>{referralStats.referralPoints.toLocaleString()}P</CashAmount>
            <CashLabel>보유 포인트</CashLabel>
          </CashItem>
          <CashDivider />
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

      {/* 홈프로 가이드 */}
      <ContentCard>
        <CardTitle>홈프로 가이드</CardTitle>
        <ConfigCardDesc>'이대로만 따라해요!' 홈프로를 위한 안내서</ConfigCardDesc>
        <ConfigScrollRow>
          <ConfigGuideCard $bg="#FEF3C7" onClick={() => navigate("/guide/1")}>
            <ConfigGuideIconWrap><IoDocumentTextOutline size={32} color="#B45309" /><ConfigGuideSubIcon><IoSendOutline size={18} color="#B45309" /></ConfigGuideSubIcon></ConfigGuideIconWrap>
            <ConfigGuideText>첫 견적 보내기,{"\n"}이렇게 하면 쉬워요</ConfigGuideText>
          </ConfigGuideCard>
          <ConfigGuideCard $bg="#EDE9FE" onClick={() => navigate("/guide/2")}>
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
          <ConfigGuideCard $bg="#EDE9FE" onClick={() => navigate("/guide/5")}>
            <ConfigGuideIconWrap><IoStarOutline size={32} color={THEME.primary} /></ConfigGuideIconWrap>
            <ConfigGuideText>등급 시스템{"\n"}포인트로 올리세요</ConfigGuideText>
          </ConfigGuideCard>
        </ConfigScrollRow>
      </ContentCard>

      {/* 고객지원 */}
      <ContentCard>
        <CardTitle>고객지원</CardTitle>
        <SupportList>
          <SupportItem onClick={() => navigate("/notice")}>
            <SupportLabel>공지사항</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
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
          <SupportItem onClick={() => navigate("/legal/location")} style={{ borderBottom: "none" }}>
            <SupportLabel>위치기반서비스 이용약관</SupportLabel>
            <IoChevronForward size={18} color={THEME.muted} />
          </SupportItem>
        </SupportList>
      </ContentCard>

      <LogoutButton onClick={handleLogout}>로그아웃</LogoutButton>

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
  font-size: 17px;
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
  font-size: 14px;
  font-weight: ${({ $active }) => $active ? 700 : 400};
  color: ${THEME.text};
`;

const GradeSheetPts = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
`;

/* ─── 가이드 & 커뮤니티 (홈 스타일) ─── */

const ConfigCardDesc = styled.div`
  font-size: 14px;
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
  font-size: 13px;
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
  font-size: 11px;
  font-weight: 400;
  margin-bottom: 10px;
`;

const ConfigPostTitle = styled.div`
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.text};
  line-height: 1.4;
`;

const ConfigPostDesc = styled.div`
  font-size: 13px;
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
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.muted};
`;
