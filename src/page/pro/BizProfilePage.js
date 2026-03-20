/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import styled from "styled-components";
import {
  IoLocationOutline, IoAddOutline, IoChevronForward,
  IoPersonCircleOutline, IoStar, IoChatbubbleOutline,
  IoChevronDown, IoCloseOutline, IoCheckmarkCircle,
} from "react-icons/io5";
import { CATEGORIES, CATEGORY_GROUPS, THEME } from "../../config/homeproConfig";
import { MOBILEMAINMENU } from "../../utility/constants";
import HomeLayout from "../../screen/Layout/Layout/HomeLayout";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { useAuth } from "../../context/AuthContext";
import { db } from "../../api/config";
import { collection, query, where, getDocs, doc, getDoc } from "firebase/firestore";
import { COLLECTIONS } from "../../config/homeproConfig";
import { getProsByCategory } from "../../service/ProService";
import { createChatRoom } from "../../service/ChatService";
import { CATEGORY_ICONS } from "../../utility/CategoryIcons";
import { GradeBadge, GradeProgressBar } from "../../utility/gradeUtils";

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

  // Firestore에서 프로필 조회 (본인 또는 다른 프로)
  const targetUid = viewUid || myUid;
  useEffect(() => {
    if (!targetUid) return;
    getDoc(doc(db, "users", targetUid)).then((snap) => {
      if (snap.exists()) setMyProfile({ uid: snap.id, ...snap.data() });
    }).catch(() => {});
  }, [targetUid]);

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
      const roomId = await createChatRoom(
        myUid, userData?.companyName || userData?.name || "", userData?.photoURL || "",
        pro.uid, pro.detail?.intro || getCatName(pro.categoryId) + " 전문가", ""
      );
      navigate(`/chat/${roomId}`);
    } catch (err) {
      console.error("채팅방 생성 실패:", err);
    }
  };

  // 다른 프로 프로필 보기 — 승인된 전문분야만
  const viewPros = isViewingOther ? myPros.filter((p) => p.status === "approved") : myPros;

  const ProfileContent = (
    <PageWrap>
      {/* 프로필 */}
      {tab === "profile" && (
          <>
            {/* 프로필 요약 */}
            <ProfileCard>
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
                {(myProfile?.region?.sido) && (
                  <ProfileRegion>
                    <IoLocationOutline size={14} />
                    {myProfile.region.sido} {myProfile.region.gu || ""}
                  </ProfileRegion>
                )}
              </ProfileInfo>
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
                    <EmptyTitle>아직 등록한 전문분야가 없어요</EmptyTitle>
                    <EmptyDesc>전문분야를 등록하고 고객의 요청을 받아보세요</EmptyDesc>
                    <RegisterBtn onClick={() => navigate("/pro/register-category")}>
                      <IoAddOutline size={18} /> 전문분야 등록하기
                    </RegisterBtn>
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
                {!isViewingOther && (
                  <AddProBtn onClick={() => navigate("/pro/register-category")}>
                    <IoAddOutline size={20} color={THEME.primary} />
                    <span>전문분야 등록하기</span>
                  </AddProBtn>
                )}
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
                  <SheetList>
                    {CATEGORY_GROUPS.map((group) => (
                      <React.Fragment key={group.id}>
                        <SheetGroupLabel>{group.label}</SheetGroupLabel>
                        {CATEGORIES.filter((c) => c.group === group.id).map((cat) => {
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
                                <SheetItemName>{cat.shortName}</SheetItemName>
                              </SheetItemLeft>
                              {checked && <IoCheckmarkCircle size={22} color={THEME.primary} />}
                            </SheetItem>
                          );
                        })}
                      </React.Fragment>
                    ))}
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
    <SimpleBackLayout NAME="비즈프로필">
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
  font-size: 15px;
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
  display: flex;
  gap: 16px;
  padding: 24px 20px;
  margin: 12px 12px 0;
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
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
  font-size: 24px;
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
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ProfileBio = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  line-height: 1.4;
`;

const ProfileRegion = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
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
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const StatusBadge = styled.span`
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
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
  font-size: 12px;
  background: ${THEME.background};
  color: ${THEME.textSecondary};
`;

const ProCardCerts = styled.div`
  font-size: 12px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 6px;
`;

const ProCardRegion = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 13px;
  color: ${THEME.muted};
  margin-bottom: 10px;
`;

const ProCardArrow = styled.div`
  position: absolute;
  top: 20px;
  right: 20px;
`;

const AddProBtn = styled.div`
  margin: 12px 12px 0;
  padding: 20px;
  border: 1.5px dashed ${THEME.border};
  border-radius: 16px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  color: ${THEME.primary};
  &:active { background: ${THEME.purpleLight}; }
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
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 8px;
`;

const EmptyDesc = styled.div`
  font-size: 14px;
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
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ActivityLabel = styled.div`
  font-size: 11px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 2px;
`;

const ActivityDivider = styled.div`
  width: 1px;
  height: 28px;
  background: ${THEME.border};
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
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ReviewAvgScore = styled.div`
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 15px;
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
  font-size: 13px;
  font-weight: 600;
  color: ${THEME.text};
`;

const ReviewStars = styled.span`
  display: flex;
  gap: 1px;
`;

const ReviewDate = styled.span`
  font-size: 11px;
  color: ${THEME.muted};
  margin-left: auto;
`;

const ReviewText = styled.p`
  font-size: 13px;
  color: ${THEME.textSecondary};
  line-height: 1.5;
`;

const RegisterBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 20px;
  padding: 12px 24px;
  border-radius: 10px;
  border: none;
  background: ${THEME.primary};
  color: white;
  font-size: 14px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.8; }
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
  font-size: 13px;
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
  font-size: 12px;
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
  font-size: 17px;
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
  font-size: 15px;
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
  font-size: 15px;
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
  font-size: 14px;
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
  font-size: 14px;
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
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
  margin-bottom: 4px;
`;

const FindProMeta = styled.div`
  font-size: 13px;
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
  font-size: 13px;
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
  font-size: 13px;
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
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const BottomSpacer = styled.div`
  height: 80px;
`;
