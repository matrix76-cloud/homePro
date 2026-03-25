/* eslint-disable */
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, query, where, getDocs, doc, getDoc, setDoc, deleteDoc } from "firebase/firestore";
import { db } from "../../api/config";
import { CATEGORIES, CATEGORY_GROUPS, THEME, COLLECTIONS } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { GradeBadge } from "../../utility/gradeUtils";
import { IoLocationOutline, IoChevronDown, IoStarOutline, IoStar, IoHeartOutline, IoHeart, IoChevronForward, IoFunnelOutline, IoCloseOutline, IoCheckmark } from "react-icons/io5";

const ProListPage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const myUid = userData?.uid;

  const [pros, setPros] = useState([]);
  const [proProfiles, setProProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState("all");
  const [selectedCat, setSelectedCat] = useState("all");
  const [favorites, setFavorites] = useState(new Set());
  const [showDistFilter, setShowDistFilter] = useState(false);
  const [selectedDist, setSelectedDist] = useState("all"); // "all" | "10" | "20" | "30" | "50" | "100"

  // 즐겨찾기 로드
  useEffect(() => {
    if (!myUid) return;
    (async () => {
      try {
        const snap = await getDocs(collection(db, "users", myUid, "favorites"));
        setFavorites(new Set(snap.docs.map((d) => d.id)));
      } catch {}
    })();
  }, [myUid]);

  const toggleFavorite = async (e, proUid) => {
    e.stopPropagation();
    if (!myUid) return;
    const ref = doc(db, "users", myUid, "favorites", proUid);
    if (favorites.has(proUid)) {
      await deleteDoc(ref);
      setFavorites((prev) => { const s = new Set(prev); s.delete(proUid); return s; });
    } else {
      await setDoc(ref, { createdAt: new Date() });
      setFavorites((prev) => new Set(prev).add(proUid));
    }
  };

  // 승인된 전문가 전체 조회
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const q = query(
          collection(db, COLLECTIONS.PROS),
          where("status", "==", "approved")
        );
        const snap = await getDocs(q);
        const proList = snap.docs
          .map((d) => ({ id: d.id, ...d.data() }))
          .filter((p) => p.uid !== myUid);

        // 프로필 정보 로드
        const uids = [...new Set(proList.map((p) => p.uid).filter(Boolean))];
        const profiles = await Promise.all(
          uids.map((u) =>
            getDoc(doc(db, "users", u))
              .then((s) => (s.exists() ? { uid: u, ...s.data() } : null))
              .catch(() => null)
          )
        );
        const profileMap = {};
        profiles.forEach((r) => { if (r) profileMap[r.uid] = r; });

        setPros(proList);
        setProProfiles(profileMap);
      } catch (e) {
        console.error("전문가 조회 실패:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [myUid]);

  const myRegion = userData?.region;

  // 거리 계산 (km)
  const getDistanceKm = (lat1, lng1, lat2, lng2) => {
    if (!lat1 || !lng1 || !lat2 || !lng2) return null;
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  };

  // 필터링
  const filteredPros = pros.filter((p) => {
    if (selectedGroup !== "all") {
      const group = CATEGORY_GROUPS.find((g) => g.id === selectedGroup);
      if (group && !group.categoryIds.includes(p.categoryId)) return false;
    }
    if (selectedCat !== "all" && p.categoryId !== selectedCat) return false;
    // 거리 필터
    if (selectedDist !== "all" && myRegion?.lat && myRegion?.lng) {
      const profile = proProfiles[p.uid];
      const pRegion = profile?.region;
      const dist = getDistanceKm(myRegion.lat, myRegion.lng, pRegion?.lat, pRegion?.lng);
      if (dist === null || dist > Number(selectedDist)) return false;
    }
    return true;
  });

  // 선택된 그룹의 카테고리 목록
  const groupCats = selectedGroup === "all"
    ? CATEGORIES
    : CATEGORIES.filter((c) => {
        const group = CATEGORY_GROUPS.find((g) => g.id === selectedGroup);
        return group?.categoryIds.includes(c.id);
      });

  const getCatName = (catId) => CATEGORIES.find((c) => c.id === catId)?.shortName || catId;

  return (
    <MainListLayout NAME="전문가 리스트" hideFooter>
      <PageWrap>
        {/* 그룹 필터 */}
        <FilterRow>
          <FilterChip $active={selectedGroup === "all"} onClick={() => { setSelectedGroup("all"); setSelectedCat("all"); }}>
            전체
          </FilterChip>
          {CATEGORY_GROUPS.map((g) => (
            <FilterChip
              key={g.id}
              $active={selectedGroup === g.id}
              onClick={() => { setSelectedGroup(g.id); setSelectedCat("all"); }}
            >
              {g.label}
            </FilterChip>
          ))}
        </FilterRow>


        {/* 결과 수 + 필터 */}
        <ResultRow>
          <ResultCount>{filteredPros.length}명의 전문가</ResultCount>
          <DistFilterBtn $active={selectedDist !== "all"} onClick={() => setShowDistFilter(true)}>
            <IoFunnelOutline size={14} />
            {selectedDist === "all" ? "거리" : `${selectedDist}km`}
          </DistFilterBtn>
        </ResultRow>

        {/* 거리 필터 바텀시트 */}
        {showDistFilter && (
          <FilterOverlay onClick={() => setShowDistFilter(false)}>
            <FilterSheet onClick={(e) => e.stopPropagation()}>
              <FilterSheetHeader>
                <FilterSheetTitle>거리 선택</FilterSheetTitle>
                <FilterCloseBtn onClick={() => setShowDistFilter(false)}><IoCloseOutline size={22} /></FilterCloseBtn>
              </FilterSheetHeader>
              {[
                { key: "all", label: "전체" },
                { key: "10", label: "10km" },
                { key: "20", label: "20km" },
                { key: "30", label: "30km" },
                { key: "50", label: "50km" },
                { key: "100", label: "100km" },
              ].map((opt) => (
                <FilterOption key={opt.key} $active={selectedDist === opt.key}
                  onClick={() => { setSelectedDist(opt.key); setShowDistFilter(false); }}>
                  <span>{opt.label}</span>
                  {selectedDist === opt.key && <IoCheckmark size={20} color={THEME.primary} />}
                </FilterOption>
              ))}
            </FilterSheet>
          </FilterOverlay>
        )}

        {/* 전문가 리스트 */}
        {loading ? (
          <EmptyText>불러오는 중...</EmptyText>
        ) : filteredPros.length === 0 ? (
          <EmptyText>해당 분야의 전문가가 없습니다</EmptyText>
        ) : (
          filteredPros.map((pro) => {
            const profile = proProfiles[pro.uid] || {};
            const name = profile.companyName || profile.name || "전문가";
            const photo = profile.photoURL || profile.profileImage;
            const intro = profile.intro || pro.detail?.intro || "";
            const region = profile.region;
            const avgRating = pro.avgRating || profile.avgRating;
            const reviewCount = pro.reviewCount || profile.reviewCount || 0;

            return (
              <ProCard key={pro.id} onClick={() => navigate("/biz-profile", { state: { viewUid: pro.uid } })}>
                <ProCardTop>
                  {photo ? (
                    <ProPhoto src={photo} alt="" />
                  ) : (
                    <ProAvatar>{name.charAt(0)}</ProAvatar>
                  )}
                  <ProInfo>
                    <ProNameRow>
                      <ProName>{name}</ProName>
                      <GradeBadge grade={profile.grade} size="sm" />
                    </ProNameRow>
                    <ProCat>{getCatName(pro.categoryId)}</ProCat>
                    {region?.sido && (
                      <ProRegion>
                        <IoLocationOutline size={12} />
                        {region.sido} {region.gu || ""}
                      </ProRegion>
                    )}
                  </ProInfo>
                  <ProActions>
                    <FavBtn onClick={(e) => toggleFavorite(e, pro.uid)}>
                      {favorites.has(pro.uid)
                        ? <IoStar size={18} color="#F59E0B" />
                        : <IoStarOutline size={18} color={THEME.muted} />
                      }
                    </FavBtn>
                  </ProActions>
                </ProCardTop>
                {intro && <ProIntro>{intro}</ProIntro>}
              </ProCard>
            );
          })
        )}
      </PageWrap>
    </MainListLayout>
  );
};

export default ProListPage;

/* ===================== styles ===================== */

const PageWrap = styled.div`
  background: ${THEME.background};
  min-height: 100%;
  padding-bottom: 20px;
`;

const FilterRow = styled.div`
  display: flex;
  gap: 8px;
  padding: 12px 12px 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { display: none; }
`;

const FilterChip = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 6px 14px;
  border-radius: 0;
  border: 1px solid ${({ $active }) => $active ? THEME.primary : THEME.border};
  background: ${({ $active }) => $active ? THEME.primary : THEME.surface};
  color: ${({ $active }) => $active ? "#fff" : THEME.textSecondary};
  font-size: 12px;
  font-weight: 500;
  font-family: inherit;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  &:active { opacity: 0.8; }
`;

const SubFilterRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 8px 12px 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  &::-webkit-scrollbar { display: none; }
`;

const SubChip = styled.button`
  padding: 6px 12px;
  border-radius: 16px;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  font-size: 12px;
  font-weight: ${({ $active }) => ($active ? 600 : 400)};
  color: ${({ $active }) => ($active ? THEME.primary : THEME.muted)};
  background: ${({ $active }) => ($active ? `${THEME.primary}10` : "transparent")};
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  &:active { opacity: 0.7; }
`;

const ResultRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px 4px;
`;

const ResultCount = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
`;

const DistFilterBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 8px;
  border-radius: 4px;
  border: 1px solid ${({ $active }) => $active ? THEME.primary : THEME.border};
  background: ${({ $active }) => $active ? `${THEME.primary}10` : THEME.surface};
  color: ${({ $active }) => $active ? THEME.primary : THEME.textSecondary};
  font-size: 10px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  white-space: nowrap;
  &:active { opacity: 0.8; }
`;

const FilterOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.3);
  z-index: 999;
  display: flex;
  align-items: flex-end;
  justify-content: center;
`;

const FilterSheet = styled.div`
  width: 100%;
  max-width: 400px;
  background: #fff;
  border-radius: 20px 20px 0 0;
  padding: 20px;
  padding-bottom: 32px;
`;

const FilterSheetHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
`;

const FilterSheetTitle = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
`;

const FilterCloseBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
`;

const FilterOption = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 4px;
  font-size: 15px;
  font-weight: ${({ $active }) => $active ? 600 : 400};
  color: ${({ $active }) => $active ? THEME.text : THEME.text};
  border-bottom: 1px solid ${THEME.border};
  cursor: pointer;
  &:last-child { border-bottom: none; }
  &:active { background: ${THEME.background}; }
`;

const EmptyText = styled.div`
  text-align: center;
  font-size: 14px;
  color: ${THEME.muted};
  padding: 60px 0;
`;

const ProCard = styled.div`
  background: ${THEME.surface};
  margin: 6px 12px;
  padding: 12px 14px;
  border-radius: 12px;
  box-shadow: ${THEME.cardShadow};
  cursor: pointer;
  &:active { background: ${THEME.background}; }
`;

const ProCardTop = styled.div`
  display: flex;
  gap: 14px;
`;

const ProPhoto = styled.img`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const ProAvatar = styled.div`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: ${THEME.primary}20;
  color: ${THEME.primary};
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: 700;
  flex-shrink: 0;
`;

const ProInfo = styled.div`
  flex: 1;
  min-width: 0;
`;

const ProNameRow = styled.div`
  display: flex;
  align-items: center;
  gap: 5px;
`;

const ProName = styled.div`
  font-size: 14px;
  font-weight: 700;
  color: ${THEME.text};
`;

const ProCat = styled.div`
  font-size: 11px;
  color: ${THEME.primary};
  font-weight: 500;
  margin-top: 1px;
`;

const ProRegion = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 11px;
  color: ${THEME.muted};
  margin-top: 1px;
`;

const ProIntro = styled.div`
  font-size: 12px;
  color: ${THEME.textSecondary};
  margin-top: 8px;
  line-height: 1.4;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

const ProCardBottom = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
`;

const ProStat = styled.div`
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 13px;
  font-weight: 500;
  color: ${THEME.text};
`;

const ProActions = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
`;

const FavBtn = styled.button`
  background: none;
  border: none;
  padding: 4px;
  cursor: pointer;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  &:active { transform: scale(0.9); }
  transition: transform 0.1s;
`;

const DetailBtn = styled.button`
  display: flex;
  align-items: center;
  gap: 2px;
  margin-left: auto;
  padding: 6px 12px;
  border-radius: 8px;
  border: 1px solid ${THEME.primary};
  background: transparent;
  font-size: 12px;
  font-weight: 500;
  color: ${THEME.primary};
  cursor: pointer;
  &:active { background: ${THEME.primary}10; }
`;
