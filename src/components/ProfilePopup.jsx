/* eslint-disable */
// 공용 프로필 팝업 — 접수자/배정 홈프로 이름·아바타 클릭 시 비즈프로필 전체 정보 표시
// (대표 지시 9/15: 평점·인증·보험 가입 여부·거부등록/블랙리스트 신고·포트폴리오·SNS·정산계좌까지 모두 노출)
// 데이터 스키마는 BizProfilePage 를 따른다:
//  users: nickname/name/companyName, photoURL/profileImage, grade, intro, region, career,
//         businessLicense{url}, certificates[{id,title,url,uploadedAt}], insurance{status,type},
//         snsLinks{blog,instagram,youtube,portfolio,website}, account{bank,number,holder}
//  homepro_pros(uid): categoryId, status, region, photoUrls[], detail{intro,experience,subcategories,certifications,portfolio}
//  homepro_reviews(proUid): rating, text, writerName, createdAt
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import {
  IoPersonCircleOutline, IoCloseOutline, IoStar, IoCheckmarkCircle, IoEllipseOutline,
  IoShieldCheckmark, IoShieldOutline, IoDocumentTextOutline, IoChevronForward,
  IoLogoInstagram, IoLogoYoutube, IoLinkOutline, IoGlobeOutline, IoCopyOutline,
} from "react-icons/io5";
import { SiNaver } from "react-icons/si";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../api/config";
import { THEME, CATEGORIES } from "../config/homeproConfig";
import { getUserProfileByUid } from "../service/UserProfileService";
import { hasBusinessLicense, getCompletedOrderCount, formatUploadedAt } from "../service/CertificateService";
import { getMyProDocs } from "../service/ProService";
import { findActivePolicy, INSURANCE_TYPE_LABEL } from "../service/OrderInsuranceService";
import { formatDate } from "../service/InsuranceService";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { blockUser, isBlocked } from "../service/BlockService";

const GRADE_LABEL = { rookie: "루키", bronze: "브론즈", silver: "실버", gold: "골드", diamond: "다이아", master: "마스터" };
const OK_COLOR = "#15803d";
const LINE = "#e5e7eb";

/* SNS 채널 — BizProfilePage SNS_META 와 동일한 키·라벨·색 */
const SNS_META = [
  { key: "blog", label: "네이버 블로그", color: "#03C75A", Icon: SiNaver },
  { key: "instagram", label: "인스타그램", color: "#D6216B", Icon: IoLogoInstagram },
  { key: "youtube", label: "유튜브", color: "#E62117", Icon: IoLogoYoutube },
  { key: "portfolio", label: "포트폴리오", color: "#2F3A47", Icon: IoLinkOutline },
  { key: "website", label: "개인 웹사이트", color: "#2F3A47", Icon: IoGlobeOutline },
];

// region 은 문자열 / {sido,gu} 객체 / 배열이 혼재 — 객체를 그대로 렌더하면 크래시하므로 문자열로 정규화
const toRegionText = (v) => {
  if (!v) return "";
  if (typeof v === "string") return v;
  if (Array.isArray(v)) return [...new Set(v.map(toRegionText).filter(Boolean))].join(", ");
  if (typeof v === "object") return `${v.sido || ""} ${v.gu || v.gugun || ""}`.trim();
  return String(v);
};
const toText = (v) => {
  if (v === null || v === undefined || v === "") return "";
  if (typeof v === "string" || typeof v === "number") return String(v);
  if (Array.isArray(v)) return v.map((x) => (typeof x === "string" ? x : x?.certName || x?.title || "")).filter(Boolean).join(", ");
  return "";
};
const tsMs = (v) => (v?.toDate ? v.toDate().getTime() : v?.seconds ? v.seconds * 1000 : v ? new Date(v).getTime() || 0 : 0);
const catName = (id) => CATEGORIES.find((c) => c.id === id)?.shortName || "";

// 미리 아는 정보(fallback)로 즉시 표시 + uid 있으면 상세 조회로 보강
const ProfilePopup = ({ uid, fallbackName, fallbackPhoto, onClose }) => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const myUid = userData?.uid;
  const isMe = !uid || !myUid || myUid === uid;

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(!!uid);
  const [completedCount, setCompletedCount] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [proDocs, setProDocs] = useState([]);
  const [policy, setPolicy] = useState(null);
  const [imageView, setImageView] = useState(null); // { url, title }

  // 거부 등록 · 블랙리스트 신고 — 프로필 팝업에서 바로 (대표 지시 8/21)
  const [blocked, setBlocked] = useState(false);
  const [blockBusy, setBlockBusy] = useState(false);
  useEffect(() => {
    if (isMe) return;
    isBlocked(myUid, uid).then((b) => setBlocked(!!b)).catch(() => {});
  }, [isMe, myUid, uid]);
  const handleBlock = async () => {
    if (blockBusy || blocked) return;
    if (!window.confirm("이 사용자를 거부 등록할까요?\n거부 등록하면 서로 오더 공유·수락이 되지 않습니다. 나의 거부 목록에서 언제든 해제할 수 있어요.")) return;
    setBlockBusy(true);
    try { await blockUser(myUid, uid, "프로필에서 직접 등록"); setBlocked(true); }
    catch (e) { alert(e.message || "거부 등록 실패"); }
    finally { setBlockBusy(false); }
  };
  const handleReport = () => { onClose?.(); navigate("/biz-profile", { state: { viewUid: uid, openReport: true } }); };

  useEffect(() => {
    let alive = true;
    if (!uid) { setLoading(false); return; }
    (async () => {
      let p = null;
      try { p = await getUserProfileByUid(uid); } catch (e) { }
      if (!alive) return;
      setProfile(p);
      const target = p?.uid || uid;
      await Promise.all([
        getCompletedOrderCount(target).then((n) => { if (alive) setCompletedCount(n); }).catch(() => { if (alive) setCompletedCount(0); }),
        getDocs(query(collection(db, "homepro_reviews"), where("proUid", "==", target)))
          .then((snap) => {
            if (!alive) return;
            setReviews(snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => tsMs(b.createdAt) - tsMs(a.createdAt)));
          }).catch(() => {}),
        getMyProDocs(target).then((list) => { if (alive) setProDocs(list || []); }).catch(() => {}),
        findActivePolicy(target).then((pol) => { if (alive) setPolicy(pol); }).catch(() => {}),
      ]);
      if (alive) setLoading(false);
    })();
    return () => { alive = false; };
  }, [uid]);

  /* ── 파생값 ── */
  const p = profile || {};
  const name = p.nickname || p.name || fallbackName || "사용자";
  const photo = p.profileImage || p.photoURL || fallbackPhoto || "";
  const company = p.companyName || p.bizName || "";
  const grade = p.grade;

  const approvedPros = proDocs.filter((d) => d.status === "approved");
  const brokerCertified = approvedPros.some((d) => d.categoryId === "brokerage");

  const ratedReviews = reviews.filter((r) => Number(r.rating) > 0);
  const rating = ratedReviews.length
    ? ratedReviews.reduce((s, r) => s + Number(r.rating), 0) / ratedReviews.length
    : Number(p.rating || p.avgRating || 0);
  const reviewCount = reviews.length || Number(p.reviewCount || p.reviewsCount || 0);

  const region = toRegionText(p.region) || toRegionText(approvedPros.map((d) => d.region)) || toRegionText(p.regions) || toRegionText(p.address);
  const categoryText = [...new Set(approvedPros.map((d) => catName(d.categoryId)).filter(Boolean))].join(" · ");
  const subcatText = [...new Set(approvedPros.flatMap((d) => (Array.isArray(d.detail?.subcategories) ? d.detail.subcategories : [])))].join(", ");
  const careerText = (() => {
    const explicit = p.career || p.experience;
    if (explicit) return typeof explicit === "number" ? `${explicit}년` : String(explicit);
    const years = approvedPros.map((d) => Number(d.detail?.experience)).filter((n) => n > 0);
    return years.length ? `${Math.max(...years)}년` : "";
  })();
  const intro = p.intro || p.introduction || p.bio || p.description || approvedPros.map((d) => d.detail?.intro).find(Boolean) || "";

  const licenseVerified = hasBusinessLicense(p);
  const certificates = Array.isArray(p.certificates) ? p.certificates.filter((c) => c && c.url) : [];
  const fieldCertText = [...new Set(approvedPros.map((d) => toText(d.detail?.certifications || d.detail?.certs)).filter(Boolean))].join(", ");

  // 보험 — users.insurance(비즈프로필 표기 기준) 우선, 없으면 insurance_policies 활성 증권(월·1년형)
  const userIns = p.insurance?.status === "active" && (p.insurance.type === "yearly" || p.insurance.type === "monthly") ? p.insurance : null;
  const insType = userIns?.type || policy?.type || "";
  const insured = !!insType;
  const insEnd = formatDate(policy?.endAt || userIns?.endAt);

  const portfolioPhotos = [...new Set(approvedPros.flatMap((d) => (Array.isArray(d.photoUrls) ? d.photoUrls : [])).filter(Boolean))];
  const portfolioText = approvedPros.map((d) => (typeof d.detail?.portfolio === "string" ? d.detail.portfolio : "")).find(Boolean) || "";
  const snsLinks = p.snsLinks || {};
  const activeSns = SNS_META.filter((m) => snsLinks[m.key]);
  const account = p.account && (p.account.number || p.account.bank) ? p.account : null;

  const openLink = (url) => { if (url) window.open(url, "_blank"); };
  const copyAccount = async () => {
    const text = `${account.bank || ""} ${account.number || ""}`.trim();
    try { await navigator.clipboard.writeText(text); alert("계좌번호가 복사되었습니다"); }
    catch (e) { window.prompt("계좌번호를 복사하세요", text); }
  };

  return (
    <Overlay onClick={onClose}>
      <Box onClick={(e) => e.stopPropagation()}>
        <CloseBtn onClick={onClose} aria-label="닫기"><IoCloseOutline size={24} /></CloseBtn>
        <Head>
          {photo ? <Avatar src={photo} alt={name} /> : <AvatarPh><IoPersonCircleOutline size={54} color={THEME.muted} /></AvatarPh>}
          <HeadInfo>
            <Name>{name}</Name>
            {company && company !== name && <Company>{company}</Company>}
            <MetaRow>
              {grade && <GradeChip>{GRADE_LABEL[grade] || grade}</GradeChip>}
              <RatingWrap>
                <IoStar size={15} color="#F5A623" />
                {rating > 0 ? rating.toFixed(1) : "-"}
                <Rev>리뷰 {reviewCount}건</Rev>
              </RatingWrap>
            </MetaRow>
          </HeadInfo>
        </Head>

        <Scroll>
          {loading ? (
            <Empty>불러오는 중...</Empty>
          ) : (
            <>
              {/* 기본 정보 */}
              <Section>
                <SectionTitle>기본 정보</SectionTitle>
                <Row><K>평점</K><V>{rating > 0 ? `${rating.toFixed(1)}점 · 리뷰 ${reviewCount}건` : `평점 없음 · 리뷰 ${reviewCount}건`}</V></Row>
                <Row><K>완료 실적</K><V><Strong>홈프로 누적 오더 완료 {completedCount ?? 0}건</Strong></V></Row>
                <Row><K>활동 지역</K><V $muted={!region}>{region || "미등록"}</V></Row>
                <Row><K>주요 분야</K><V $muted={!categoryText}>{categoryText || "미등록"}</V></Row>
                {subcatText && <Row><K>세부 분야</K><V>{subcatText}</V></Row>}
                {careerText && <Row><K>경력</K><V>{careerText}</V></Row>}
              </Section>

              {/* 인증 · 보험 — 뱃지 대신 아이콘 + 글씨색 */}
              <Section>
                <SectionTitle>인증 · 보험</SectionTitle>
                <StatusRow>
                  {licenseVerified ? <IoCheckmarkCircle size={20} color={OK_COLOR} /> : <IoEllipseOutline size={20} color={THEME.muted} />}
                  <StatusText $ok={licenseVerified}>{licenseVerified ? "사업자등록증 인증" : "사업자등록증 미등록"}</StatusText>
                </StatusRow>
                <StatusRow>
                  {insured ? <IoShieldCheckmark size={20} color={OK_COLOR} /> : <IoShieldOutline size={20} color={THEME.muted} />}
                  <StatusText $ok={insured}>
                    {insured
                      ? `도급배상책임보험 가입 · ${INSURANCE_TYPE_LABEL[insType] || (insType === "monthly" ? "월 구독형" : "1년형")}${insEnd ? ` (${insEnd}까지)` : ""}`
                      : "도급배상책임보험 미가입"}
                  </StatusText>
                </StatusRow>
                {brokerCertified && (
                  <StatusRow>
                    <IoCheckmarkCircle size={20} color={OK_COLOR} />
                    <StatusText $ok>인증 공인중개사</StatusText>
                  </StatusRow>
                )}
                {fieldCertText && <Row><K>자격증</K><V>{fieldCertText}</V></Row>}
                <SubTitle>등록 증명서 {certificates.length}건</SubTitle>
                {certificates.length > 0 ? (
                  <div>
                    {certificates.map((c) => (
                      <ListBtn key={c.id || c.url} type="button" onClick={() => setImageView({ url: c.url, title: c.title || "증명서" })}>
                        <IoDocumentTextOutline size={18} color={THEME.textSecondary} />
                        <ListText>
                          <ListLabel>{c.title || "증명서"}</ListLabel>
                          {formatUploadedAt(c.uploadedAt) && <ListSub>{formatUploadedAt(c.uploadedAt)} 등록</ListSub>}
                        </ListText>
                        <IoChevronForward size={17} color={THEME.muted} />
                      </ListBtn>
                    ))}
                  </div>
                ) : (
                  <MutedLine>등록된 추가 증명서가 없습니다</MutedLine>
                )}
                <MetaNote>사업자등록증 원본은 개인정보 보호를 위해 인증 여부만 표시됩니다</MetaNote>
              </Section>

              {/* 소개 */}
              <Section>
                <SectionTitle>소개</SectionTitle>
                {intro ? <Para>{intro}</Para> : <MutedLine>등록된 소개가 없습니다</MutedLine>}
              </Section>

              {/* 포트폴리오 — 전문분야 등록 활동사진(photoUrls) + 시공 사례 소개 */}
              <Section>
                <SectionTitle>포트폴리오</SectionTitle>
                {portfolioText && <Para style={{ marginBottom: 10 }}>{portfolioText}</Para>}
                {portfolioPhotos.length > 0 ? (
                  <PhotoGrid>
                    {portfolioPhotos.map((url, i) => (
                      <Thumb key={url} type="button" onClick={() => setImageView({ url, title: `포트폴리오 ${i + 1}` })}>
                        <img src={url} alt={`포트폴리오 ${i + 1}`} loading="lazy" />
                      </Thumb>
                    ))}
                  </PhotoGrid>
                ) : (
                  !portfolioText && <MutedLine>등록된 포트폴리오 사진이 없습니다</MutedLine>
                )}
              </Section>

              {/* SNS */}
              <Section>
                <SectionTitle>SNS · 링크</SectionTitle>
                {activeSns.length > 0 ? (
                  <div>
                    {activeSns.map(({ key, label, color, Icon }) => (
                      <ListBtn key={key} type="button" onClick={() => openLink(snsLinks[key])}>
                        <Icon size={20} color={color} />
                        <ListText>
                          <ListLabel>{label}</ListLabel>
                          <ListSub $ellipsis>{String(snsLinks[key]).replace(/^https?:\/\//i, "")}</ListSub>
                        </ListText>
                        <IoChevronForward size={17} color={THEME.muted} />
                      </ListBtn>
                    ))}
                  </div>
                ) : (
                  <MutedLine>등록된 SNS 링크가 없습니다</MutedLine>
                )}
              </Section>

              {/* 정산계좌 — 상대방에게 노출 (대표 지시 9/15) */}
              <Section>
                <SectionTitle>정산계좌</SectionTitle>
                {account ? (
                  <>
                    <Row><K>은행</K><V>{account.bank || "-"}</V></Row>
                    <Row><K>계좌번호</K><V><Strong>{account.number || "-"}</Strong></V></Row>
                    <Row><K>예금주</K><V>{account.holder || "-"}</V></Row>
                    {account.number && (
                      <CopyBtn type="button" onClick={copyAccount}><IoCopyOutline size={16} /> 계좌번호 복사</CopyBtn>
                    )}
                  </>
                ) : (
                  <MutedLine>등록된 정산계좌가 없습니다</MutedLine>
                )}
              </Section>

              {/* 최근 리뷰 */}
              {reviews.length > 0 && (
                <Section>
                  <SectionTitle>최근 리뷰</SectionTitle>
                  {reviews.slice(0, 3).map((r) => (
                    <ReviewItem key={r.id}>
                      <ReviewTop>
                        <ReviewWriter>{r.writerName || "익명"}</ReviewWriter>
                        <span style={{ display: "inline-flex", gap: 1 }}>
                          {[1, 2, 3, 4, 5].map((s) => (
                            <IoStar key={s} size={14} color={s <= (Number(r.rating) || 0) ? "#F59E0B" : "#E5E7EB"} />
                          ))}
                        </span>
                        {tsMs(r.createdAt) > 0 && <ReviewDate>{new Date(tsMs(r.createdAt)).toLocaleDateString("ko-KR")}</ReviewDate>}
                      </ReviewTop>
                      {r.text && <Para>{r.text}</Para>}
                    </ReviewItem>
                  ))}
                </Section>
              )}
            </>
          )}
        </Scroll>

        {!isMe && (
          <ActionRow>
            <ActionBtn type="button" onClick={handleBlock} disabled={blocked || blockBusy}>
              {blocked ? "거부 등록됨" : "거부 등록"}
            </ActionBtn>
            <ActionBtn type="button" onClick={handleReport}>블랙리스트 신고</ActionBtn>
          </ActionRow>
        )}
      </Box>

      {/* 증명서·포트폴리오 크게 보기 */}
      {imageView && (
        <ImgOverlay onClick={(e) => { e.stopPropagation(); setImageView(null); }}>
          <ImgBar onClick={(e) => e.stopPropagation()}>
            <ImgTitle>{imageView.title}</ImgTitle>
            <ImgClose type="button" onClick={() => setImageView(null)} aria-label="닫기"><IoCloseOutline size={26} color="#fff" /></ImgClose>
          </ImgBar>
          <BigImg src={imageView.url} alt={imageView.title} onClick={(e) => e.stopPropagation()} />
        </ImgOverlay>
      )}
    </Overlay>
  );
};

export default ProfilePopup;

/* ── styles ── */
const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 1200;
  background: rgba(0,0,0,0.45);
  display: flex; align-items: center; justify-content: center;
  padding: 20px 16px;
`;
// 고정 높이 + 내부 스크롤 — 로딩 전후·정보 양에 따라 크기가 흔들리지 않게
const Box = styled.div`
  position: relative;
  background: #fff; border-radius: 16px;
  width: 100%; max-width: 420px;
  height: min(82vh, 760px);
  display: flex; flex-direction: column; overflow: hidden;
`;
const CloseBtn = styled.button`
  position: absolute; top: 12px; right: 12px; z-index: 1;
  background: none; border: none; cursor: pointer; color: ${THEME.muted}; padding: 4px;
`;
const Head = styled.div`
  flex-shrink: 0;
  display: flex; align-items: center; gap: 14px;
  padding: 22px 48px 16px 20px; border-bottom: 1px solid ${LINE};
`;
const Avatar = styled.img`
  width: 64px; height: 64px; border-radius: 50%; object-fit: cover; flex-shrink: 0;
`;
const AvatarPh = styled.div`
  width: 64px; height: 64px; border-radius: 50%; background: ${THEME.background};
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
`;
const HeadInfo = styled.div` flex: 1; min-width: 0; `;
const Name = styled.div` font-size: 20px; font-weight: 700; color: ${THEME.text}; word-break: keep-all; `;
const Company = styled.div` font-size: 15px; color: ${THEME.textSecondary}; margin-top: 2px; `;
const MetaRow = styled.div` display: flex; align-items: center; flex-wrap: wrap; gap: 8px; margin-top: 6px; `;
const GradeChip = styled.span`
  font-size: 14px; font-weight: 600; color: #fff; background: ${THEME.primary};
  padding: 2px 8px; border-radius: 6px;
`;
const RatingWrap = styled.span`
  display: inline-flex; align-items: center; gap: 4px;
  font-size: 15px; font-weight: 700; color: ${THEME.text};
`;
const Rev = styled.span` color: ${THEME.textSecondary}; font-weight: 400; margin-left: 2px; `;

const Scroll = styled.div`
  flex: 1; min-height: 0; overflow-y: auto; -webkit-overflow-scrolling: touch;
  padding: 0 20px 8px;
`;
const Section = styled.div`
  padding: 16px 0;
  border-bottom: 1px solid ${LINE};
  &:last-child { border-bottom: none; }
`;
const SectionTitle = styled.div` font-size: 17px; font-weight: 700; color: ${THEME.text}; margin-bottom: 8px; `;
const SubTitle = styled.div` font-size: 15px; font-weight: 700; color: ${THEME.text}; margin: 12px 0 4px; `;
const Row = styled.div` display: flex; gap: 12px; padding: 7px 0; `;
const K = styled.div` flex: 0 0 76px; font-size: 14px; font-weight: 600; color: ${THEME.textSecondary}; line-height: 1.6; `;
const V = styled.div`
  flex: 1; min-width: 0; font-size: 15px; line-height: 1.55; word-break: break-word;
  color: ${({ $muted }) => ($muted ? THEME.muted : THEME.text)};
`;
const Strong = styled.span` font-weight: 700; color: ${THEME.text}; `;
const StatusRow = styled.div` display: flex; align-items: center; gap: 8px; padding: 6px 0; `;
const StatusText = styled.div`
  font-size: 15px; line-height: 1.45; word-break: keep-all;
  font-weight: ${({ $ok }) => ($ok ? 700 : 400)};
  color: ${({ $ok }) => ($ok ? OK_COLOR : THEME.muted)};
`;
const ListBtn = styled.button`
  width: 100%; display: flex; align-items: center; gap: 10px; text-align: left;
  padding: 10px 0; background: none; border: none; border-bottom: 1px solid ${THEME.border}; cursor: pointer;
  &:last-child { border-bottom: none; }
`;
const ListText = styled.div` flex: 1; min-width: 0; `;
const ListLabel = styled.div` font-size: 15px; font-weight: 600; color: ${THEME.text}; word-break: break-word; `;
const ListSub = styled.div`
  font-size: 13px; color: ${THEME.textSecondary}; margin-top: 2px;
  ${({ $ellipsis }) => ($ellipsis ? "overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" : "")}
`;
const MutedLine = styled.div` font-size: 15px; color: ${THEME.muted}; padding: 4px 0; `;
const MetaNote = styled.div` font-size: 13px; color: ${THEME.textSecondary}; margin-top: 8px; line-height: 1.5; `;
const Para = styled.div` font-size: 15px; color: ${THEME.text}; line-height: 1.6; white-space: pre-wrap; word-break: break-word; `;
const PhotoGrid = styled.div` display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; `;
const Thumb = styled.button`
  padding: 0; border: 1px solid ${LINE}; background: ${THEME.background}; cursor: pointer;
  aspect-ratio: 1 / 1; overflow: hidden; border-radius: 6px;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;
const CopyBtn = styled.button`
  margin-top: 8px; height: 40px; padding: 0 14px;
  display: inline-flex; align-items: center; gap: 6px;
  border: 1px solid #d1d5db; border-radius: 8px; background: #fff;
  font-size: 14px; font-weight: 600; color: ${THEME.text}; cursor: pointer;
`;
const ReviewItem = styled.div`
  padding: 10px 0; border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;
const ReviewTop = styled.div` display: flex; align-items: center; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; `;
const ReviewWriter = styled.span` font-size: 14px; font-weight: 700; color: ${THEME.text}; `;
const ReviewDate = styled.span` font-size: 13px; color: ${THEME.textSecondary}; margin-left: auto; `;
const Empty = styled.div` padding: 40px 0; text-align: center; font-size: 15px; color: ${THEME.muted}; `;

const ActionRow = styled.div`
  flex-shrink: 0;
  display: flex; gap: 8px; padding: 12px 20px 16px; border-top: 1px solid ${LINE}; background: #fff;
`;
const ActionBtn = styled.button`
  flex: 1; height: 46px; border-radius: 10px; border: 1px solid #d1d5db; background: #fff;
  color: ${THEME.text}; font-size: 15px; font-weight: 600; cursor: pointer;
  &:disabled { color: ${THEME.muted}; cursor: default; }
`;

const ImgOverlay = styled.div`
  position: fixed; inset: 0; z-index: 1300; background: rgba(0,0,0,0.88);
  display: flex; align-items: center; justify-content: center; padding: 16px;
`;
const ImgBar = styled.div`
  position: absolute; top: 0; left: 0; right: 0;
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 12px 12px 20px;
  display: flex; align-items: center; justify-content: space-between;
`;
const ImgTitle = styled.div` font-size: 16px; font-weight: 600; color: #fff; `;
const ImgClose = styled.button` background: none; border: none; cursor: pointer; padding: 4px; `;
const BigImg = styled.img` max-width: 100%; max-height: 80vh; object-fit: contain; `;
