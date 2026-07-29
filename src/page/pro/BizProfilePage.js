/* eslint-disable */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import {
  IoLocationOutline, IoAddOutline, IoChevronForward,
  IoPersonCircleOutline, IoStar, IoChatbubbleOutline,
  IoChevronDown, IoCloseOutline, IoCheckmarkCircle,
  IoLogoInstagram, IoLogoYoutube, IoLinkOutline, IoGlobeOutline,
  IoArrowBack, IoOpenOutline, IoTrashOutline, IoDocumentTextOutline,
} from "react-icons/io5";
import { SiNaver } from "react-icons/si";
import { CATEGORIES, CATEGORY_GROUPS, THEME } from "../../config/homeproConfig";
import { MOBILEMAINMENU } from "../../utility/constants";
import HomeLayout from "../../screen/Layout/Layout/HomeLayout";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../api/config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { COLLECTIONS } from "../../config/homeproConfig";
import { getProsByCategory } from "../../service/ProService";
import { upsertUserProfile } from "../../service/UserProfileService";
import { createChatRoom } from "../../service/ChatService";
import { CATEGORY_ICONS } from "../../utility/CategoryIcons";
import { GradeBadge, GradeProgressBar } from "../../utility/gradeUtils";
import { addToBlacklist } from "../../service/BlacklistService";
import { IoShieldOutline } from "react-icons/io5";
import {
  MAX_CERTIFICATES, saveBusinessLicense, removeBusinessLicense,
  addCertificate, removeCertificate, hasBusinessLicense,
  formatUploadedAt, getCompletedOrderCount,
} from "../../service/CertificateService";

/* SNS·포트폴리오 채널 정의 — 대표 지시 7/30: 각 채널 고유 컬러 + 로고 노출 */
const SNS_META = [
  { key: "blog", label: "네이버 블로그", color: "#03C75A", Icon: SiNaver, placeholder: "blog.naver.com/아이디" },
  { key: "instagram", label: "인스타그램", color: "#D6216B", Icon: IoLogoInstagram, placeholder: "아이디 또는 주소" },
  { key: "youtube", label: "유튜브", color: "#E62117", Icon: IoLogoYoutube, placeholder: "youtube.com/@채널" },
  { key: "portfolio", label: "포트폴리오", color: "#2F3A47", Icon: IoLinkOutline, placeholder: "숨고·오늘의집 등 주소" },
  { key: "website", label: "개인 웹사이트", color: "#2F3A47", Icon: IoGlobeOutline, placeholder: "example.com" },
];

const EMPTY_SNS = { blog: "", instagram: "", youtube: "", portfolio: "", website: "" };

/* 입력값 정규화 — 프로토콜 없으면 https:// 부여, 인스타 아이디만 입력 시 프로필 주소로 */
const normalizeSnsValue = (key, raw) => {
  const v = String(raw || "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (key === "instagram" && !v.includes("/") && !v.includes(".")) {
    return `https://instagram.com/${v.replace(/^@/, "")}`;
  }
  return `https://${v.replace(/^\/+/, "")}`;
};

const BizProfilePage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { userData } = useAuth();
  const myUid = userData?.uid;
  const viewUid = location.state?.viewUid; // 다른 프로 프로필 보기
  const isViewingOther = viewUid && viewUid !== myUid;

  const [tab, setTab] = useState(isViewingOther ? "profile" : "profile");
  const [myPros, setMyPros] = useState([]);
  const [loadingMyPros, setLoadingMyPros] = useState(true);
  const [myProfile, setMyProfile] = useState(null);
  const [activityStats, setActivityStats] = useState({ quoteSent: 0, hireCount: 0 });
  // 정산 계좌 (소개비 입금받을 계좌)
  const [account, setAccount] = useState({ bank: "", number: "", holder: "" });
  const [savingAccount, setSavingAccount] = useState(false);

  // 포트폴리오·SNS 링크
  const [sns, setSns] = useState(EMPTY_SNS);
  const [savingSns, setSavingSns] = useState(false);
  const [webView, setWebView] = useState(null); // { url, label }

  // 증명서
  const [certificates, setCertificates] = useState([]);
  const [bizLicense, setBizLicense] = useState(null);
  const [certTitle, setCertTitle] = useState("");
  const [uploadingBiz, setUploadingBiz] = useState(false);
  const [uploadingCert, setUploadingCert] = useState(false);
  const [imageView, setImageView] = useState(null); // { url, title }
  const bizFileRef = useRef(null);
  const certFileRef = useRef(null);

  // 신뢰지표 — 홈프로 누적 오더 완료 건수
  const [completedCount, setCompletedCount] = useState(null);

  // Firestore에서 프로필 조회 (본인 또는 다른 프로)
  const targetUid = viewUid || myUid;
  useEffect(() => {
    if (!targetUid) return;
    getDoc(doc(db, "users", targetUid)).then((snap) => {
      if (snap.exists()) {
        const data = { uid: snap.id, ...snap.data() };
        setMyProfile(data);
        if (data.account) {
          setAccount({ bank: data.account.bank || "", number: data.account.number || "", holder: data.account.holder || "" });
        }
        setSns({ ...EMPTY_SNS, ...(data.snsLinks || {}) });
        setCertificates(Array.isArray(data.certificates) ? data.certificates : []);
        setBizLicense(data.businessLicense && data.businessLicense.url ? data.businessLicense : null);
      }
    }).catch(() => {});
  }, [targetUid]);

  // 누적 오더 완료 건수
  useEffect(() => {
    if (!targetUid) return;
    let alive = true;
    getCompletedOrderCount(targetUid).then((n) => { if (alive) setCompletedCount(n); }).catch(() => {});
    return () => { alive = false; };
  }, [targetUid]);

  const handleSaveSns = async () => {
    if (!myUid) return;
    setSavingSns(true);
    try {
      const snsLinks = {};
      SNS_META.forEach(({ key }) => { snsLinks[key] = normalizeSnsValue(key, sns[key]); });
      await upsertUserProfile(myUid, { snsLinks });
      setSns({ ...EMPTY_SNS, ...snsLinks });
      setMyProfile((p) => ({ ...(p || {}), snsLinks }));
      alert("포트폴리오·SNS 링크가 저장되었습니다");
    } catch (e) {
      alert("저장 실패: " + (e.message || e));
    } finally {
      setSavingSns(false);
    }
  };

  const handleBizFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !myUid) return;
    setUploadingBiz(true);
    try {
      const saved = await saveBusinessLicense(myUid, file);
      setBizLicense(saved);
      setMyProfile((p) => ({ ...(p || {}), businessLicense: saved }));
      // 비즈프로필 작성 완료 2,000P (1회, 조건 판정은 함수 내부 — 대표 지시 7/29)
      try {
        const { grantProfileCompleteBonus } = await import("../../service/PointService");
        await grantProfileCompleteBonus(myUid, myProfile?.nickname || myProfile?.name || userData?.name || "");
      } catch (err2) { /* 보너스 실패가 업로드를 막지 않게 */ }
      alert("사업자등록증이 등록되었습니다");
    } catch (err) {
      alert("업로드 실패: " + (err.message || err));
    } finally {
      setUploadingBiz(false);
    }
  };

  const handleRemoveBiz = async () => {
    if (!myUid || !window.confirm("사업자등록증을 삭제할까요?")) return;
    try {
      await removeBusinessLicense(myUid);
      setBizLicense(null);
      setMyProfile((p) => ({ ...(p || {}), businessLicense: null }));
    } catch (err) {
      alert("삭제 실패: " + (err.message || err));
    }
  };

  const handleCertPick = () => {
    if (!certTitle.trim()) {
      alert("서류 제목을 먼저 입력해주세요");
      return;
    }
    certFileRef.current?.click();
  };

  const handleCertFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !myUid) return;
    setUploadingCert(true);
    try {
      const next = await addCertificate(myUid, certTitle, file);
      setCertificates(next);
      setMyProfile((p) => ({ ...(p || {}), certificates: next }));
      setCertTitle("");
    } catch (err) {
      alert(err.message || "등록 실패");
    } finally {
      setUploadingCert(false);
    }
  };

  const handleRemoveCert = async (certId) => {
    if (!myUid || !window.confirm("이 증명서를 삭제할까요?")) return;
    try {
      const next = await removeCertificate(myUid, certId);
      setCertificates(next);
      setMyProfile((p) => ({ ...(p || {}), certificates: next }));
    } catch (err) {
      alert("삭제 실패: " + (err.message || err));
    }
  };

  const handleSaveAccount = async () => {
    if (!myUid) return;
    if (!account.bank.trim() || !account.number.trim() || !account.holder.trim()) {
      alert("은행 · 계좌번호 · 예금주를 모두 입력해주세요");
      return;
    }
    setSavingAccount(true);
    try {
      const acc = { bank: account.bank.trim(), number: account.number.trim(), holder: account.holder.trim() };
      await upsertUserProfile(myUid, { account: acc });
      setMyProfile((p) => ({ ...(p || {}), account: acc }));
      alert("정산 계좌가 저장되었습니다");
    } catch (e) {
      alert("저장 실패: " + (e.message || e));
    } finally {
      setSavingAccount(false);
    }
  };

  // 활동 통계 로드
  useEffect(() => {
    if (!targetUid) return;
    (async () => {
      try {
        const ordersSnap = await getDocs(collection(db, COLLECTIONS.ORDERS));
        let quoteSent = 0;
        let hireCount = 0;
        for (const orderDoc of ordersSnap.docs) {
          const orderData = orderDoc.data();
          const quotesSnap = await getDocs(
            query(collection(db, COLLECTIONS.ORDERS, orderDoc.id, "quotes"), where("proUid", "==", targetUid))
          );
          quoteSent += quotesSnap.size;
          // 결제/완료/리뷰 + 레거시(매칭/진행중/작업완료) = 고용된 건
          if (orderData.matchedProUid === targetUid && ["결제", "완료", "리뷰", "매칭", "진행중", "작업완료"].includes(orderData.orderStatus)) {
            hireCount++;
          }
        }
        setActivityStats({ quoteSent, hireCount });
      } catch (e) {}
    })();
  }, [targetUid]);

  // 리뷰 로드
  const [reviews, setReviews] = useState([]);
  const [showReviews, setShowReviews] = useState(false);
  useEffect(() => {
    if (!targetUid) return;
    (async () => {
      try {
        const q = query(collection(db, "homepro_reviews"), where("proUid", "==", targetUid));
        const snap = await getDocs(q);
        setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => {
          const ta = a.createdAt?.toDate?.() || new Date(0);
          const tb = b.createdAt?.toDate?.() || new Date(0);
          return tb - ta;
        }));
      } catch { setReviews([]); }
    })();
  }, [targetUid]);

  // 전문가 찾기 탭
  const [selectedCats, setSelectedCats] = useState([]);
  const [pros, setPros] = useState([]);
  const [loadingPros, setLoadingPros] = useState(false);
  const [showCatSheet, setShowCatSheet] = useState(false);
  const [proProfiles, setProProfiles] = useState({}); // uid → { photoURL, profileImage }

  // 등록 전문분야 조회
  useEffect(() => {
    if (!targetUid) return;
    setLoadingMyPros(true);
    const q = query(collection(db, COLLECTIONS.PROS), where("uid", "==", targetUid));
    getDocs(q)
      .then((snap) => setMyPros(snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
      .catch(() => setMyPros([]))
      .finally(() => setLoadingMyPros(false));
  }, [myUid]);

  // 전문가 찾기 — 카테고리 변경 시 조회 + 프로필 이미지 동시 로드
  useEffect(() => {
    if (tab !== "find") return;
    setLoadingPros(true);
    const fetchPros = async () => {
      try {
        let proList;
        if (selectedCats.length === 0) {
          const q = query(collection(db, COLLECTIONS.PROS), where("status", "==", "approved"));
          const snap = await getDocs(q);
          proList = snap.docs.map((d) => ({ id: d.id, ...d.data() })).filter((p) => p.uid !== myUid);
        } else {
          const results = [];
          for (const catId of selectedCats) {
            const list = await getProsByCategory(catId);
            results.push(...list);
          }
          proList = results.filter((p) => p.uid !== myUid);
        }

        // 프로필 이미지 동시 로드
        const uids = [...new Set(proList.map((p) => p.uid).filter(Boolean))];
        const profileResults = await Promise.all(
          uids.map((u) => getDoc(doc(db, "users", u)).then((s) => s.exists() ? { uid: u, ...s.data() } : null).catch(() => null))
        );
        const map = {};
        profileResults.forEach((r) => { if (r) map[r.uid] = r; });
        setProProfiles(map);
        setPros(proList);
      } catch { setPros([]); }
      finally { setLoadingPros(false); }
    };
    fetchPros();
  }, [tab, selectedCats]);

  const getCatName = (catId) => CATEGORIES.find((c) => c.id === catId)?.shortName || catId;

  const getStatusBadge = (status) => {
    if (status === "approved") return { label: "승인완료", bg: THEME.success, color: "#fff" };
    if (status === "rejected") return { label: "반려", bg: THEME.danger, color: "#fff" };
    return { label: "심사중", bg: "#F59E0B", color: "#fff" };
  };

  const handleStartChat = async (pro) => {
    if (!myUid || myUid === pro.uid) return;
    try {
      // 상대 이름 자리에 소개글(intro) 문장이 들어가던 버그 수정 (전수검사 7/29)
      const roomId = await createChatRoom(
        myUid, userData?.companyName || userData?.name || "", userData?.photoURL || "",
        pro.uid, pro.companyName || pro.nickname || pro.name || getCatName(pro.categoryId) + " 전문가", ""
      );
      navigate(`/chat/${roomId}`);
    } catch (err) {
      console.error("채팅방 생성 실패:", err);
    }
  };

  // 다른 프로 프로필 보기 — 승인된 전문분야만
  const viewPros = isViewingOther ? myPros.filter((p) => p.status === "approved") : myPros;

  /* ── 신뢰요소 파생값 (타인 열람 모드 상단 노출) ── */
  const regionText = (() => {
    const r = myProfile?.region;
    if (!r) return "";
    if (typeof r === "string") return r;
    return `${r.sido || ""} ${r.gu || ""}`.trim();
  })();

  const mainCategoryText = [...new Set(
    (isViewingOther ? viewPros : myPros.filter((p) => p.status === "approved"))
      .map((p) => getCatName(p.categoryId))
      .filter(Boolean)
  )].join(" · ");

  const careerText = (() => {
    const explicit = myProfile?.career || myProfile?.experience;
    if (explicit) return typeof explicit === "number" ? `${explicit}년` : String(explicit);
    const years = viewPros.map((p) => Number(p.detail?.experience)).filter((n) => n > 0);
    return years.length ? `${Math.max(...years)}년` : "";
  })();

  const licenseVerified = hasBusinessLicense(myProfile);
  const activeSns = SNS_META.filter((m) => (myProfile?.snsLinks || {})[m.key]);

  const ProfileContent = (
    <PageWrap>
      {/* 프로필 */}
      {tab === "profile" && (
          <>
            {/* 프로필 요약 + 전문분야 등록하기 (대표 지시 7/30: 한 박스로 통합) */}
            <ProfileCard>
              <ProfileTopRow>
                {(myProfile?.photoURL || myProfile?.profileImage) ? (
                  <ProfileImg src={myProfile.photoURL || myProfile.profileImage} alt="" />
                ) : (
                  <ProfileAvatar>{(myProfile?.name || userData?.name || "?").charAt(0)}</ProfileAvatar>
                )}
                <ProfileInfo>
                  <ProfileNameRow>
                    <ProfileName>{myProfile?.companyName || myProfile?.name || userData?.name || "이름 없음"}</ProfileName>
                    <GradeBadge grade={myProfile?.grade || userData?.grade} size="sm" />
                  </ProfileNameRow>
                  <ProfileBio>
                    {myProfile?.intro || (isViewingOther ? "" : "한줄 소개를 작성해보세요")}
                  </ProfileBio>
                  {regionText && (
                    <ProfileRegion>
                      <IoLocationOutline size={14} />
                      {regionText}
                    </ProfileRegion>
                  )}
                </ProfileInfo>
              </ProfileTopRow>

              {/* 타인 열람 — 신뢰요소 (인증·지역·주요 카테고리·경력·누적 완료) */}
              {isViewingOther && (
                <TrustSection>
                  <TrustCertLine $verified={licenseVerified}>
                    {licenseVerified ? "사업자등록증 인증" : "사업자등록증 미등록"}
                  </TrustCertLine>
                  {regionText && (
                    <TrustRow><TrustKey>활동 지역</TrustKey><TrustVal>{regionText}</TrustVal></TrustRow>
                  )}
                  {mainCategoryText && (
                    <TrustRow><TrustKey>주요 분야</TrustKey><TrustVal>{mainCategoryText}</TrustVal></TrustRow>
                  )}
                  {careerText && (
                    <TrustRow><TrustKey>경력</TrustKey><TrustVal>{careerText}</TrustVal></TrustRow>
                  )}
                  <TrustRow>
                    <TrustKey>완료 실적</TrustKey>
                    <TrustVal>
                      {completedCount === null
                        ? "집계 중..."
                        : <TrustStrong>홈프로 누적 오더 완료 {completedCount}건</TrustStrong>}
                    </TrustVal>
                  </TrustRow>
                </TrustSection>
              )}

              {/* 본인 — 전문분야 등록 진입 (박스 통합) */}
              {!isViewingOther && (
                <ProfileActionRow onClick={() => navigate("/pro/register-category")}>
                  <ProfileActionLabel>
                    <IoAddOutline size={18} color={THEME.primary} />
                    전문분야 등록하기
                  </ProfileActionLabel>
                  <IoChevronForward size={18} color={THEME.muted} />
                </ProfileActionRow>
              )}
            </ProfileCard>

            {/* 등급 + 활동 통계 (4열) */}
            <ActivityCard>
              <GradeProgressBar totalEarnedPoints={myProfile?.totalEarnedPoints || 0} />
              <ActivityStatRow>
                <ActivityStat>
                  <ActivityNum>{(myProfile?.totalEarnedPoints || 0).toLocaleString()}</ActivityNum>
                  <ActivityLabel>누적 포인트</ActivityLabel>
                </ActivityStat>
                <ActivityDivider />
                <ActivityStat>
                  <ActivityNum>{activityStats.quoteSent}</ActivityNum>
                  <ActivityLabel>견적 보낸 수</ActivityLabel>
                </ActivityStat>
                <ActivityDivider />
                <ActivityStat>
                  <ActivityNum>{activityStats.hireCount}</ActivityNum>
                  <ActivityLabel>고용</ActivityLabel>
                </ActivityStat>
                <ActivityDivider />
                <ActivityStat onClick={() => reviews.length > 0 && setShowReviews(!showReviews)} style={{ cursor: reviews.length > 0 ? "pointer" : "default" }}>
                  <ActivityNum>{reviews.length}</ActivityNum>
                  <ActivityLabel>리뷰 {reviews.length > 0 && (showReviews ? "▲" : "▼")}</ActivityLabel>
                </ActivityStat>
              </ActivityStatRow>
            </ActivityCard>

            {/* 정산 계좌 (본인만) */}
            {!isViewingOther && (
              <AccountCard>
                <AccountTitle>정산 계좌</AccountTitle>
                <AccountSub>소개비·정산금을 입금받을 계좌입니다</AccountSub>
                <AccountField>
                  <AccountLabel>은행</AccountLabel>
                  <AccountInput value={account.bank} onChange={(e) => setAccount((a) => ({ ...a, bank: e.target.value }))} placeholder="예: 국민은행" />
                </AccountField>
                <AccountField>
                  <AccountLabel>계좌번호</AccountLabel>
                  <AccountInput value={account.number} inputMode="numeric" onChange={(e) => setAccount((a) => ({ ...a, number: e.target.value.replace(/[^0-9-]/g, "") }))} placeholder="'-' 포함 또는 숫자만" />
                </AccountField>
                <AccountField>
                  <AccountLabel>예금주</AccountLabel>
                  <AccountInput value={account.holder} onChange={(e) => setAccount((a) => ({ ...a, holder: e.target.value }))} placeholder="예금주명" />
                </AccountField>
                <AccountSaveBtn onClick={handleSaveAccount} disabled={savingAccount}>
                  {savingAccount ? "저장 중..." : "계좌 저장"}
                </AccountSaveBtn>
              </AccountCard>
            )}

            {/* 포트폴리오·SNS — 본인: 입력/저장 (대표 지시 7/30) */}
            {!isViewingOther && (
              <AccountCard>
                <AccountTitle>포트폴리오 · SNS</AccountTitle>
                <AccountSub>등록한 채널은 내 프로필을 보는 홈프로에게 노출됩니다</AccountSub>
                {SNS_META.map(({ key, label, placeholder }) => (
                  <SnsField key={key}>
                    <SnsLabel>{label}</SnsLabel>
                    <AccountInput
                      value={sns[key] || ""}
                      onChange={(e) => setSns((s) => ({ ...s, [key]: e.target.value }))}
                      placeholder={placeholder}
                      autoCapitalize="off"
                      autoCorrect="off"
                      spellCheck={false}
                    />
                  </SnsField>
                ))}
                <AccountSaveBtn onClick={handleSaveSns} disabled={savingSns}>
                  {savingSns ? "저장 중..." : "링크 저장"}
                </AccountSaveBtn>
                <SnsHint>주소 형식이 아니어도 저장 시 자동으로 정리됩니다</SnsHint>
              </AccountCard>
            )}

            {/* 포트폴리오·SNS — 타인: 채널 버튼 (각 채널 고유 컬러) */}
            {isViewingOther && activeSns.length > 0 && (
              <AccountCard>
                <AccountTitle>포트폴리오 · SNS</AccountTitle>
                <AccountSub>버튼을 누르면 앱 안에서 바로 열립니다</AccountSub>
                <SnsBtnRow>
                  {activeSns.map(({ key, label, color, Icon }) => (
                    <SnsBtn
                      key={key}
                      $color={color}
                      onClick={() => setWebView({ url: myProfile.snsLinks[key], label })}
                    >
                      <Icon size={20} />
                      <span>{label}</span>
                    </SnsBtn>
                  ))}
                </SnsBtnRow>
              </AccountCard>
            )}

            {/* 증명서 관리 — 본인 (대표 지시 7/30) */}
            {!isViewingOther && (
              <AccountCard>
                <AccountTitle>증명서 관리</AccountTitle>
                <AccountSub>등록한 증명서는 프로필 신뢰도에 반영됩니다</AccountSub>

                <CertBlock>
                  <CertBlockHead>
                    <CertBlockTitle>사업자등록증</CertBlockTitle>
                    <CertRequired>필수</CertRequired>
                  </CertBlockHead>
                  <CertStateLine $verified={!!bizLicense}>
                    {bizLicense
                      ? `등록됨${formatUploadedAt(bizLicense.uploadedAt) ? ` · ${formatUploadedAt(bizLicense.uploadedAt)}` : ""}`
                      : "아직 등록되지 않았습니다"}
                  </CertStateLine>
                  <CertActionRow>
                    <CertActionBtn
                      onClick={() => bizFileRef.current?.click()}
                      disabled={uploadingBiz}
                    >
                      {uploadingBiz ? "업로드 중..." : bizLicense ? "교체" : "업로드"}
                    </CertActionBtn>
                    {bizLicense && (
                      <>
                        <CertActionBtn onClick={() => setImageView({ url: bizLicense.url, title: "사업자등록증" })}>
                          보기
                        </CertActionBtn>
                        <CertActionBtn $danger onClick={handleRemoveBiz}>삭제</CertActionBtn>
                      </>
                    )}
                  </CertActionRow>
                  <HiddenFile ref={bizFileRef} type="file" accept="image/*" onChange={handleBizFile} />
                </CertBlock>

                <CertBlock>
                  <CertBlockHead>
                    <CertBlockTitle>추가 증명서</CertBlockTitle>
                    <CertCountText>{certificates.length} / {MAX_CERTIFICATES}</CertCountText>
                  </CertBlockHead>
                  {certificates.length > 0 && (
                    <CertList>
                      {certificates.map((c) => (
                        <CertItem key={c.id}>
                          <CertItemMain onClick={() => setImageView({ url: c.url, title: c.title })}>
                            <IoDocumentTextOutline size={17} color={THEME.textSecondary} />
                            <CertItemText>
                              <CertItemTitle>{c.title}</CertItemTitle>
                              {formatUploadedAt(c.uploadedAt) && (
                                <CertItemDate>{formatUploadedAt(c.uploadedAt)} 등록</CertItemDate>
                              )}
                            </CertItemText>
                          </CertItemMain>
                          <CertDeleteBtn onClick={() => handleRemoveCert(c.id)} aria-label="삭제">
                            <IoTrashOutline size={17} />
                          </CertDeleteBtn>
                        </CertItem>
                      ))}
                    </CertList>
                  )}
                  {certificates.length >= MAX_CERTIFICATES ? (
                    <CertLimitText>추가 증명서는 최대 {MAX_CERTIFICATES}건까지 등록할 수 있습니다. 기존 서류를 삭제하고 등록해주세요.</CertLimitText>
                  ) : (
                    <>
                      <SnsField>
                        <SnsLabel>서류 제목</SnsLabel>
                        <AccountInput
                          value={certTitle}
                          onChange={(e) => setCertTitle(e.target.value)}
                          placeholder="예: 건설업 면허증, 전기기능사 자격증"
                        />
                      </SnsField>
                      <CertActionRow>
                        <CertActionBtn onClick={handleCertPick} disabled={uploadingCert}>
                          {uploadingCert ? "업로드 중..." : "파일 선택하고 추가"}
                        </CertActionBtn>
                      </CertActionRow>
                    </>
                  )}
                  <HiddenFile ref={certFileRef} type="file" accept="image/*" onChange={handleCertFile} />
                </CertBlock>
              </AccountCard>
            )}

            {/* 증명서 열람 — 타인 (사업자등록증은 인증 표기만, 추가 증명서는 열람 허용) */}
            {isViewingOther && (
              <AccountCard>
                <AccountTitle>증명서 {certificates.length}건</AccountTitle>
                <AccountSub>
                  사업자등록증은 개인정보 보호를 위해 인증 여부만 표시됩니다
                </AccountSub>
                <CertStateLine $verified={licenseVerified}>
                  {licenseVerified ? "사업자등록증 인증" : "사업자등록증 미등록"}
                </CertStateLine>
                {certificates.length > 0 ? (
                  <CertList>
                    {certificates.map((c) => (
                      <CertItem key={c.id}>
                        <CertItemMain onClick={() => setImageView({ url: c.url, title: c.title })}>
                          <IoDocumentTextOutline size={17} color={THEME.textSecondary} />
                          <CertItemText>
                            <CertItemTitle>{c.title}</CertItemTitle>
                            {formatUploadedAt(c.uploadedAt) && (
                              <CertItemDate>{formatUploadedAt(c.uploadedAt)} 등록</CertItemDate>
                            )}
                          </CertItemText>
                        </CertItemMain>
                        <IoChevronForward size={17} color={THEME.muted} />
                      </CertItem>
                    ))}
                  </CertList>
                ) : (
                  <CertLimitText>등록된 추가 증명서가 없습니다</CertLimitText>
                )}
              </AccountCard>
            )}

            {/* 리뷰 목록 */}
            {showReviews && reviews.length > 0 && (
              <ReviewSummaryCard>
                <ReviewCardHeader>
                  <ReviewCardTitle>리뷰 {reviews.length}건</ReviewCardTitle>
                  <ReviewAvgScore>
                    <IoStar size={14} color="#F59E0B" />
                    {(reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)}
                  </ReviewAvgScore>
                </ReviewCardHeader>
                <ReviewListWrap>
                  {reviews.map((r) => (
                    <ReviewItem key={r.id}>
                      <ReviewItemTop>
                        <ReviewWriter>{r.writerName || "익명"}</ReviewWriter>
                        <ReviewStars>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <IoStar key={s} size={14} color={s <= (r.rating || 0) ? "#F59E0B" : "#E5E7EB"} />
                          ))}
                        </ReviewStars>
                        <ReviewDate>
                          {r.createdAt?.toDate ? r.createdAt.toDate().toLocaleDateString("ko-KR") : ""}
                        </ReviewDate>
                      </ReviewItemTop>
                      {r.text && <ReviewText>{r.text}</ReviewText>}
                    </ReviewItem>
                  ))}
                </ReviewListWrap>
              </ReviewSummaryCard>
            )}

            {/* 등록한 전문분야 */}
            {loadingMyPros ? (
              <EmptyWrap><EmptyDesc>로딩 중...</EmptyDesc></EmptyWrap>
            ) : viewPros.length === 0 ? (
              <EmptyWrap>
                {isViewingOther ? (
                  <EmptyDesc>등록된 전문분야가 없습니다</EmptyDesc>
                ) : (
                  <>
                    {/* 진입 버튼은 상단 프로필 박스로 통합 (대표 지시 7/30) — 안내 문구만 유지 */}
                    <EmptyTitle>아직 등록한 전문분야가 없어요</EmptyTitle>
                    <EmptyDesc>위 프로필의 전문분야 등록하기에서<br />분야를 등록하고 고객의 요청을 받아보세요</EmptyDesc>
                  </>
                )}
              </EmptyWrap>
            ) : (
              <>
                {viewPros.map((pro) => {
                  const badge = getStatusBadge(pro.status);
                  const region = pro.region ? `${pro.region.sido} ${pro.region.gu || ""}`.trim() : "";
                  return (
                    <ProCard key={pro.id} onClick={() => navigate(`/pro/category-detail/${pro.categoryId}`, isViewingOther ? { state: { viewUid: viewUid } } : undefined)}>
                      <ProCardHeader>
                        <ProCatName>{getCatName(pro.categoryId)}</ProCatName>
                        <StatusBadge $bg={badge.bg} $color={badge.color}>{badge.label}</StatusBadge>
                      </ProCardHeader>
                      {pro.detail?.subcategories?.length > 0 && (
                        <SubcatRow>
                          {pro.detail.subcategories.map((s) => (
                            <SubcatChip key={s}>{s}</SubcatChip>
                          ))}
                        </SubcatRow>
                      )}
                      {(() => {
                        const raw = pro.detail?.certifications || pro.detail?.certs || pro.certs;
                        const certs = Array.isArray(raw) ? raw : [];
                        const names = certs.map((c) => typeof c === "string" ? c : c?.certName).filter(Boolean);
                        return names.length > 0 ? (
                          <ProCardCerts>{names.join(", ")}</ProCardCerts>
                        ) : null;
                      })()}
                      {region && (
                        <ProCardRegion>
                          <IoLocationOutline size={13} /> {region}
                        </ProCardRegion>
                      )}
                    </ProCard>
                  );
                })}
                {/* 하단 추가 버튼 제거 — 상단 프로필 박스의 전문분야 등록하기로 통합 (대표 지시 7/30) */}
              </>
            )}
          </>
        )}

        {/* 전문가 찾기 탭 제거됨 — 오더를 통해서만 연결 */}
        {false && (
          <>
            <FilterRow>
              {selectedCats.length > 0 && selectedCats.map((catId) => (
                <SelectedChip key={catId} onClick={() => setSelectedCats((prev) => prev.filter((c) => c !== catId))}>
                  {getCatName(catId)} <IoCloseOutline size={14} />
                </SelectedChip>
              ))}
              <FilterBtn $active={selectedCats.length > 0} onClick={() => setShowCatSheet(true)}>
                카테고리{selectedCats.length > 0 ? ` (${selectedCats.length})` : ""}
                <IoChevronDown size={14} />
              </FilterBtn>
            </FilterRow>

            {/* 카테고리 바텀시트 */}
            {showCatSheet && (
              <SheetOverlay onClick={() => setShowCatSheet(false)}>
                <SheetContent onClick={(e) => e.stopPropagation()}>
                  <SheetHandle />
                  <SheetHeader>
                    <SheetTitle>카테고리 선택</SheetTitle>
                    <SheetCloseBtn onClick={() => setShowCatSheet(false)}>
                      <IoCloseOutline size={24} color={THEME.text} />
                    </SheetCloseBtn>
                  </SheetHeader>
                  {/* 예약접수·AI견적과 동일한 평면 목록·순서 (대표 지시 7/28) */}
                  <SheetList>
                    {CATEGORIES.map((cat) => {
                      const checked = selectedCats.includes(cat.id);
                      return (
                        <SheetItem
                          key={cat.id}
                          onClick={() => setSelectedCats((prev) =>
                            checked ? prev.filter((c) => c !== cat.id) : [...prev, cat.id]
                          )}
                        >
                          <SheetItemLeft>
                            <SheetCatIcon>{(() => { const Icon = CATEGORY_ICONS[cat.id]; return Icon ? <Icon /> : null; })()}</SheetCatIcon>
                            <SheetItemName>{cat.name}</SheetItemName>
                          </SheetItemLeft>
                          {checked && <IoCheckmarkCircle size={22} color={THEME.primary} />}
                        </SheetItem>
                      );
                    })}
                  </SheetList>
                  <SheetActions>
                    <SheetResetBtn onClick={() => setSelectedCats([])}>초기화</SheetResetBtn>
                    <SheetConfirmBtn onClick={() => setShowCatSheet(false)}>확인</SheetConfirmBtn>
                  </SheetActions>
                </SheetContent>
              </SheetOverlay>
            )}

            {/* 프로 리스트 */}
            {loadingPros ? (
              <EmptyWrap><EmptyDesc>로딩 중...</EmptyDesc></EmptyWrap>
            ) : pros.length === 0 ? (
              <EmptyWrap>
                <EmptyTitle>등록된 전문가가 없어요</EmptyTitle>
                <EmptyDesc>다른 카테고리를 선택해보세요</EmptyDesc>
              </EmptyWrap>
            ) : (
              pros.map((pro) => {
                const region = pro.region ? `${pro.region.sido} ${pro.region.gu || ""}`.trim() : "";
                const profile = proProfiles[pro.uid];
                const avatarUrl = profile?.photoURL || profile?.profileImage;
                return (
                  <FindProCard key={pro.id} onClick={() => navigate(`/service/${pro.categoryId}/${pro.id}`, { state: { service: { id: pro.id, uid: pro.uid, proName: pro.detail?.intro || getCatName(pro.categoryId) + " 전문가", title: pro.detail?.intro || "", description: `경력 ${pro.detail?.experience || "?"}년`, location: pro.region ? `${pro.region.sido} ${pro.region.gu || ""}`.trim() : "", career: `${pro.detail?.experience || "?"}년`, rating: 0, reviews: 0, price: "", tags: pro.detail?.subcategories?.slice(0, 3) || [], photoCount: 0 }, category: CATEGORIES.find(c => c.id === pro.categoryId) } })}>
                    <FindProTop>
                      <FindProAvatar>
                        {avatarUrl ? (
                          <FindProAvatarImg src={avatarUrl} alt="" />
                        ) : (
                          <IoPersonCircleOutline size={48} color={THEME.muted} />
                        )}
                      </FindProAvatar>
                      <FindProInfo>
                        <FindProName>{pro.detail?.intro || getCatName(pro.categoryId) + " 전문가"}</FindProName>
                        <FindProMeta>
                          {pro.detail?.experience && `경력 ${pro.detail.experience}년`}
                          {region && ` · ${region}`}
                        </FindProMeta>
                        {pro.detail?.subcategories?.length > 0 && (
                          <FindProTags>
                            {pro.detail.subcategories.slice(0, 3).map((s) => (
                              <FindProTag key={s}>{s}</FindProTag>
                            ))}
                          </FindProTags>
                        )}
                      </FindProInfo>
                    </FindProTop>
                  </FindProCard>
                );
              })
            )}
          </>
        )}

        {isViewingOther && (
          <BlacklistBtnWrap>
            <BlacklistBtn onClick={async () => {
              const reason = window.prompt("블랙리스트 사유를 입력해주세요 (선택)");
              if (reason === null) return; // 취소
              try {
                await addToBlacklist(myUid, viewUid, reason);
                alert("블랙리스트에 등록되었습니다");
              } catch (e) {
                alert(e.message || "등록 실패");
              }
            }}>
              <IoShieldOutline size={16} /> 블랙리스트 신고
            </BlacklistBtn>
          </BlacklistBtnWrap>
        )}

        {/* 인앱 브라우저 — SNS·포트폴리오 링크 열기 */}
        {webView && (
          <WebOverlay>
            <WebBar>
              <WebBarBtn onClick={() => setWebView(null)} aria-label="뒤로가기">
                <IoArrowBack size={22} color={THEME.text} />
              </WebBarBtn>
              <WebBarTitle>{webView.label}</WebBarTitle>
              <WebBarOpen onClick={() => window.open(webView.url, "_blank")}>
                <IoOpenOutline size={16} /> 외부로 열기
              </WebBarOpen>
            </WebBar>
            <WebFrame src={webView.url} title={webView.label} />
            <WebNote>화면이 보이지 않으면 외부로 열기를 눌러주세요</WebNote>
          </WebOverlay>
        )}

        {/* 증명서 이미지 열람 */}
        {imageView && (
          <ImageOverlay onClick={() => setImageView(null)}>
            <ImageBar onClick={(e) => e.stopPropagation()}>
              <ImageBarTitle>{imageView.title}</ImageBarTitle>
              <WebBarBtn onClick={() => setImageView(null)} aria-label="닫기">
                <IoCloseOutline size={24} color="#fff" />
              </WebBarBtn>
            </ImageBar>
            <ImageBody onClick={(e) => e.stopPropagation()}>
              <CertImage src={imageView.url} alt={imageView.title} />
            </ImageBody>
          </ImageOverlay>
        )}

        <BottomSpacer />
      </PageWrap>
  );

  if (isViewingOther) {
    return (
      <SimpleBackLayout NAME="전문가 프로필" onBack={() => navigate(-1)}>
        {ProfileContent}
      </SimpleBackLayout>
    );
  }

  return (
    <SimpleBackLayout NAME="비즈프로필" hideFooter>
      {ProfileContent}
    </SimpleBackLayout>
  );
};

export default BizProfilePage;

/* ─── Styled ─── */

const PageWrap = styled.div`
  background: ${THEME.background};
  min-height: 100%;
  padding-bottom: 20px;
`;

const TabRow = styled.div`
  display: flex;
  background: ${THEME.surface};
  border-bottom: 1px solid ${THEME.border};
  position: sticky;
  top: 0;
  z-index: 5;
`;

const TabBtn = styled.button`
  flex: 1;
  padding: 14px 0;
  font-size: 17px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  color: ${({ $active }) => ($active ? THEME.text : THEME.muted)};
  background: transparent;
  border: none;
  border-bottom: 2px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
  cursor: pointer;
  font-family: inherit;
  transition: all 0.15s;
`;

/* ── 내 프로필 ── */

const ProfileCard = styled.div`
  padding: 24px 20px 8px;
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
`;

const ProfileTopRow = styled.div`
  display: flex;
  gap: 16px;
  padding-bottom: 16px;
`;

/* 전문분야 등록 진입 — 프로필과 같은 박스 안 (구분선으로만 분리) */
const ProfileActionRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-top: 1px solid ${THEME.border};
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const ProfileActionLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
  color: ${THEME.text};
`;

/* ── 타인 열람 신뢰요소 ── */

const TrustSection = styled.div`
  border-top: 1px solid ${THEME.border};
  padding: 14px 0 8px;
`;

const TrustCertLine = styled.div`
  font-size: 15px;
  font-weight: ${({ $verified }) => ($verified ? 700 : 400)};
  color: ${({ $verified }) => ($verified ? THEME.primaryDark : THEME.muted)};
  margin-bottom: 10px;
`;

const TrustRow = styled.div`
  display: flex;
  gap: 10px;
  padding: 5px 0;
`;

const TrustKey = styled.div`
  flex: 0 0 74px;
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.textSecondary};
`;

const TrustVal = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 15px;
  color: ${THEME.text};
  line-height: 1.45;
  word-break: break-word;
`;

const TrustStrong = styled.span`
  font-weight: 700;
  color: ${THEME.text};
`;

const ProfileImg = styled.img`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const ProfileAvatar = styled.div`
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: ${THEME.purpleLight};
  color: ${THEME.primary};
  font-size: 26px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
`;

const ProfileInfo = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
`;

const ProfileNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
`;

const ProfileName = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ProfileBio = styled.div`
  font-size: 15px;
  color: ${THEME.muted};
  line-height: 1.4;
`;

const ProfileRegion = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  color: ${THEME.textSecondary};
  margin-top: 2px;
`;

/* ── 전문분야 카드 ── */

const ProCard = styled.div`
  margin: 12px 12px 0;
  padding: 20px;
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  cursor: pointer;
  position: relative;
  &:active { transform: scale(0.99); }
  transition: transform 0.1s;
`;

const ProCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 10px;
`;

const ProCatName = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
`;

const StatusBadge = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 14px;
  font-weight: 500;
  background: ${({ $bg }) => $bg};
  color: ${({ $color }) => $color};
`;

const SubcatRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 10px;
`;

const SubcatChip = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 14px;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const ProCardCerts = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 6px;
`;

const ProCardRegion = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
  color: ${THEME.muted};
  margin-bottom: 10px;
`;

const ProCardArrow = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
`;

/* ── 빈 상태 ── */

const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px 20px;
`;

const EmptyTitle = styled.div`
  font-size: 19px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 8px;
`;

const EmptyDesc = styled.div`
  font-size: 16px;
  color: ${THEME.muted};
  text-align: center;
  line-height: 1.5;
`;

const ActivityCard = styled.div`
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: ${THEME.cardShadow};
`;

const ActivityStatRow = styled.div`
  display: flex;
  align-items: center;
  margin-top: 14px;
`;

const ActivityStat = styled.div`
  flex: 1;
  text-align: center;
`;

const ActivityNum = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ActivityLabel = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 2px;
`;

const ActivityDivider = styled.div`
  width: 1px;
  height: 28px;
  background: ${THEME.border};
`;

/* ── 정산 계좌 카드 ── */

const AccountCard = styled.div`
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: ${THEME.cardShadow};
`;

const AccountTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
`;

const AccountSub = styled.div`
  font-size: 14px;
  color: ${THEME.muted};
  margin-top: 2px;
  margin-bottom: 14px;
`;

const AccountField = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
`;

const AccountLabel = styled.div`
  width: 56px;
  flex-shrink: 0;
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.textSecondary};
`;

const AccountInput = styled.input`
  flex: 1;
  min-width: 0;
  padding: 11px 12px;
  font-size: 16px;
  border: 1px solid ${THEME.border};
  border-radius: 10px;
  background: ${THEME.background};
  color: ${THEME.text};
  font-family: inherit;
  &:focus { outline: none; border-color: ${THEME.primary}; background: ${THEME.surface}; }
`;

const AccountSaveBtn = styled.button`
  width: 100%;
  margin-top: 6px;
  padding: 13px;
  font-size: 17px;
  font-weight: 700;
  color: #fff;
  background: ${({ disabled }) => disabled ? THEME.muted : THEME.primary};
  border: none;
  border-radius: 10px;
  font-family: inherit;
  cursor: ${({ disabled }) => disabled ? "not-allowed" : "pointer"};
  &:active { opacity: 0.85; }
`;

/* ── 고용·리뷰 카드 ── */

const ReviewSummaryCard = styled.div`
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 16px 20px;
  box-shadow: ${THEME.cardShadow};
`;



const ReviewCardHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const ReviewCardTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ReviewAvgScore = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ReviewListWrap = styled.div`
  border-top: 1px solid ${THEME.border};
  padding-top: 12px;
`;

const ReviewItem = styled.div`
  padding: 12px 0;
  & + & { border-top: 1px solid ${THEME.border}; }
`;

const ReviewItemTop = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
`;

const ReviewWriter = styled.span`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
`;

const ReviewStars = styled.span`
  display: flex;
  gap: 1px;
`;

const ReviewDate = styled.span`
  font-size: 13px;
  color: ${THEME.muted};
  margin-left: auto;
`;

const ReviewText = styled.p`
  font-size: 15px;
  color: ${THEME.textSecondary};
  line-height: 1.5;
`;

/* ── 포트폴리오 · SNS ── */

const SnsField = styled.div`
  margin-bottom: 12px;
`;

const SnsLabel = styled.div`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.textSecondary};
  margin-bottom: 6px;
`;

const SnsHint = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  margin-top: 8px;
`;

const SnsBtnRow = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
`;

/* 채널 고유 컬러 허용 구간 (대표 지시) */
const SnsBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 11px 14px;
  border: none;
  border-radius: 10px;
  background: ${({ $color }) => $color};
  color: #fff;
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.85; }
`;

/* ── 증명서 ── */

const CertBlock = styled.div`
  padding-top: 14px;
  margin-top: 14px;
  border-top: 1px solid ${THEME.border};
`;

const CertBlockHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
`;

const CertBlockTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const CertRequired = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.danger};
`;

const CertCountText = styled.div`
  font-size: 14px;
  color: ${THEME.muted};
`;

const CertStateLine = styled.div`
  font-size: 15px;
  font-weight: ${({ $verified }) => ($verified ? 700 : 400)};
  color: ${({ $verified }) => ($verified ? THEME.primaryDark : THEME.muted)};
  margin-bottom: 10px;
`;

const CertActionRow = styled.div`
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
`;

const CertActionBtn = styled.button`
  padding: 10px 16px;
  border-radius: 10px;
  border: 1px solid ${({ $danger }) => ($danger ? THEME.danger : THEME.border)};
  background: ${THEME.surface};
  color: ${({ $danger, disabled }) => (disabled ? THEME.muted : $danger ? THEME.danger : THEME.text)};
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: ${({ disabled }) => (disabled ? "not-allowed" : "pointer")};
  &:active { background: ${THEME.background}; }
`;

const HiddenFile = styled.input`
  display: none;
`;

const CertList = styled.div`
  margin-bottom: 12px;
`;

const CertItem = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 0;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;

const CertItemMain = styled.div`
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const CertItemText = styled.div`
  flex: 1;
  min-width: 0;
`;

const CertItemTitle = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
  word-break: break-word;
`;

const CertItemDate = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  margin-top: 2px;
`;

const CertDeleteBtn = styled.button`
  flex-shrink: 0;
  background: none;
  border: none;
  padding: 6px;
  color: ${THEME.muted};
  cursor: pointer;
  display: flex;
  align-items: center;
  &:active { opacity: 0.6; }
`;

const CertLimitText = styled.div`
  font-size: 14px;
  color: ${THEME.muted};
  line-height: 1.5;
`;

/* ── 인앱 브라우저 ── */

const WebOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: ${THEME.surface};
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
`;

const WebBar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid ${THEME.border};
`;

const WebBarBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  flex-shrink: 0;
`;

const WebBarTitle = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const WebBarOpen = styled.button`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 12px;
  border-radius: 10px;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const WebFrame = styled.iframe`
  flex: 1;
  width: 100%;
  border: none;
  background: ${THEME.surface};
`;

const WebNote = styled.div`
  flex-shrink: 0;
  padding: 11px 14px;
  border-top: 1px solid ${THEME.border};
  background: ${THEME.background};
  font-size: 13px;
  color: ${THEME.textSecondary};
  text-align: center;
`;

/* ── 증명서 이미지 열람 ── */

const ImageOverlay = styled.div`
  position: fixed;
  inset: 0;
  z-index: 1300;
  background: rgba(0,0,0,0.9);
  display: flex;
  flex-direction: column;
  padding-top: env(safe-area-inset-top, 0px);
  padding-bottom: env(safe-area-inset-bottom, 0px);
`;

const ImageBar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
`;

const ImageBarTitle = styled.div`
  flex: 1;
  min-width: 0;
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

const ImageBody = styled.div`
  flex: 1;
  min-height: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 12px;
  overflow: auto;
`;

const CertImage = styled.img`
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
`;

/* ── 전문가 찾기 탭 ── */

const FilterRow = styled.div`
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 8px;
  padding: 12px 16px 8px;
  flex-wrap: wrap;
`;

const FilterBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 8px 14px;
  border-radius: 8px;
  border: 1.5px solid ${({ $active }) => $active ? THEME.primary : THEME.border};
  background: ${({ $active }) => $active ? `${THEME.primary}10` : THEME.surface};
  color: ${({ $active }) => $active ? THEME.primary : THEME.textSecondary};
  font-size: 15px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  &:active { opacity: 0.8; }
`;

const SelectedChip = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 7px 12px;
  border-radius: 8px;
  border: none;
  background: ${THEME.primary};
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  &:active { opacity: 0.8; }
`;

/* ── 바텀시트 ── */

const SheetOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.4);
  z-index: 100;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const SheetContent = styled.div`
  background: #fff;
  border-radius: 20px 20px 0 0;
  width: 100%;
  max-width: 400px;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
  padding-bottom: env(safe-area-inset-bottom, 0px);
`;

const SheetHandle = styled.div`
  width: 40px;
  height: 4px;
  border-radius: 2px;
  background: #D1D5DB;
  margin: 10px auto 0;
`;

const SheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px 12px;
`;

const SheetTitle = styled.div`
  font-size: 19px;
  font-weight: 700;
  color: ${THEME.text};
`;

const SheetCloseBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const SheetList = styled.div`
  flex: 1;
  overflow-y: auto;
  padding: 0 20px 20px;
`;

const SheetItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 0;
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  &:last-child { border-bottom: none; }
  &:active { opacity: 0.7; }
`;

const SheetGroupLabel = styled.div`
  padding: 10px 20px;
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.textSecondary};
  background: ${THEME.background};
  border-bottom: 1px solid ${THEME.border};
  position: sticky;
  top: 0;
  z-index: 1;
`;

const SheetItemLeft = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const SheetCatIcon = styled.div`
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  svg { width: 28px; height: 28px; }
`;

const SheetItemName = styled.span`
  font-size: 17px;
  color: ${THEME.text};
`;

const SheetActions = styled.div`
  display: flex;
  gap: 10px;
  padding: 12px 20px;
  padding-bottom: max(12px, env(safe-area-inset-bottom));
  border-top: 1px solid ${THEME.border};
`;

const SheetResetBtn = styled.button`
  flex: 1;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid ${THEME.border};
  background: transparent;
  color: ${THEME.textSecondary};
  font-size: 16px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const SheetConfirmBtn = styled.button`
  flex: 2;
  padding: 12px;
  border-radius: 10px;
  border: none;
  background: ${THEME.primary};
  color: #fff;
  font-size: 16px;
  font-weight: 600;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const FindProCard = styled.div`
  margin: 10px 12px 0;
  padding: 20px;
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  cursor: pointer;
  &:active { opacity: 0.85; }
`;

const FindProTop = styled.div`
  display: flex;
  gap: 14px;
  margin-bottom: 14px;
`;

const FindProAvatar = styled.div`
  flex-shrink: 0;
  display: flex;
  align-items: flex-start;
`;

const FindProAvatarImg = styled.img`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
  background: ${THEME.background};
  animation: fadeIn 0.3s ease;
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
`;

const FindProInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const FindProName = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 4px;
`;

const FindProMeta = styled.div`
  font-size: 15px;
  color: ${THEME.muted};
`;

const FindProTags = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
`;

const FindProTag = styled.span`
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 15px;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const FindProActions = styled.div`
  display: flex;
  gap: 8px;
  padding-top: 14px;
  border-top: 1px solid ${THEME.border};
`;

const ChatBtn = styled.button`
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border-radius: 10px;
  border: none;
  background: ${THEME.primary};
  color: white;
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
`;

const ViewBtn = styled.button`
  flex: 1;
  padding: 10px;
  border-radius: 10px;
  border: 1px solid ${THEME.border};
  background: transparent;
  color: ${THEME.text};
  font-size: 15px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const BlacklistBtnWrap = styled.div`
  padding: 16px 20px;
`;
const BlacklistBtn = styled.button`
  display: flex; align-items: center; justify-content: center; gap: 6px;
  width: 100%;
  padding: 14px;
  border: 1px solid #EF4444;
  background: #FEF2F2;
  color: #EF4444;
  font-size: 16px;
  font-weight: 600;
  border-radius: 10px;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const BottomSpacer = styled.div`
  height: 80px;
`;
