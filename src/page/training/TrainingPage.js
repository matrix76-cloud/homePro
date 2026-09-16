/* eslint-disable */
// 기술전수 교육생 모집 — 목록 (공동중개 탭 구성을 따름: 안내 한 줄 · 필터 · 카드 · 등록 버튼)
import React, { useState, useEffect, useContext, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, query, orderBy, onSnapshot } from "firebase/firestore";
import { db } from "../../api/config";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { UserContext } from "../../context/User";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { IoLocationOutline, IoCalendarOutline, IoAddCircle, IoCallOutline, IoChatbubbleEllipsesOutline } from "react-icons/io5";
import {
  TRAINING_COL, CATEGORIES, SIDO_LIST, STATUS_COLOR,
  normalizeTraining, computeStatus, recruitText, eduDateText, priceInfo, timeAgo,
  callTrainer, chatTrainer,
} from "./trainingShared";

const TABS = [
  { key: "all", label: "교육 찾기" },
  { key: "mine", label: "내 공고" },
];
const STATUS_FILTERS = ["전체", "모집중", "마감임박", "마감·완료"];

const TrainingPage = ({ embedded } = {}) => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { user } = useContext(UserContext);
  const uid = userData?.uid || user?.USERS_ID;

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [cat, setCat] = useState("전체");
  const [sido, setSido] = useState("전국");
  const [statusFilter, setStatusFilter] = useState("전체");
  const [sort, setSort] = useState("latest");

  useEffect(() => {
    const q = query(collection(db, TRAINING_COL), orderBy("createdAt", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      const list = snap.docs
        .map((d) => normalizeTraining({ id: d.id, ...d.data() }))
        // 포인트 차감 전(등록 진행 중·실패) 문서는 누구에게도 보이지 않는다
        .filter((n) => n.status !== "pending")
        .map((n) => ({ ...n, liveStatus: computeStatus(n) }));
      setItems(list);
      setLoading(false);
    }, (err) => {
      console.error("교육 목록 로드 실패:", err);
      setLoading(false);
    });
    return () => unsub();
  }, []);

  const filtered = useMemo(() => {
    if (tab === "mine") return items.filter((n) => uid && n.authorUid === uid);
    let list = items.filter((n) => {
      if (cat !== "전체" && n.category !== cat) return false;
      // 시·도를 고르면 그 지역 + 전국 대상 교육을 함께 보여준다
      if (sido !== "전국" && n.sido !== sido && n.sido !== "전국") return false;
      if (statusFilter === "모집중" && n.liveStatus !== "모집중") return false;
      if (statusFilter === "마감임박" && n.liveStatus !== "마감임박") return false;
      if (statusFilter === "마감·완료" && !(n.liveStatus === "모집마감" || n.liveStatus === "교육완료")) return false;
      return true;
    });
    if (sort === "deadline") {
      const rank = { 마감임박: 0, 모집중: 1, 모집마감: 2, 교육완료: 3 };
      list = [...list].sort((a, b) => {
        const r = rank[a.liveStatus] - rank[b.liveStatus];
        if (r !== 0) return r;
        const ae = a.recruitEnd || "9999", be = b.recruitEnd || "9999";
        return ae < be ? -1 : ae > be ? 1 : 0;
      });
    } else if (statusFilter === "전체") {
      // 최신순이어도 끝난 교육은 뒤로 보낸다
      list = [...list].sort((a, b) => {
        const ad = a.liveStatus === "교육완료" || a.liveStatus === "모집마감" ? 1 : 0;
        const bd = b.liveStatus === "교육완료" || b.liveStatus === "모집마감" ? 1 : 0;
        return ad - bd;
      });
    }
    return list;
  }, [items, tab, cat, sido, statusFilter, sort, uid]);

  const Wrapper = embedded ? React.Fragment : MainListLayout;
  const wrapperProps = embedded ? {} : { NAME: "기술전수 교육생 모집", footerType: "training", hideBack: true };

  return (
    <Wrapper {...wrapperProps}>
      <Wrap>
        <NoticeBar>교육 목록·상세 열람과 전화·채팅 문의는 모두 무료입니다. 교육 공고 등록은 20,000 H-포인트가 필요합니다.</NoticeBar>

        <TabBar>
          {TABS.map((t) => (
            <TabBtn key={t.key} $active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</TabBtn>
          ))}
        </TabBar>

        {tab === "all" && (
          <FilterBox>
            <CatRow>
              {["전체", ...CATEGORIES.map((c) => c.key)].map((k) => {
                const c = CATEGORIES.find((x) => x.key === k);
                return (
                  <CatBtn key={k} $active={cat === k} onClick={() => setCat(k)}>{c ? c.label : "전체"}</CatBtn>
                );
              })}
            </CatRow>
            <SelectRow>
              <FilterSelect value={sido} onChange={(e) => setSido(e.target.value)} aria-label="지역">
                <option value="전국">지역 전국</option>
                {SIDO_LIST.map((s) => <option key={s} value={s}>{s}</option>)}
              </FilterSelect>
              <FilterSelect value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} aria-label="상태">
                {STATUS_FILTERS.map((s) => <option key={s} value={s}>{s === "전체" ? "상태 전체" : s}</option>)}
              </FilterSelect>
              <FilterSelect value={sort} onChange={(e) => setSort(e.target.value)} aria-label="정렬">
                <option value="latest">최신순</option>
                <option value="deadline">마감임박순</option>
              </FilterSelect>
            </SelectRow>
          </FilterBox>
        )}

        {loading ? (
          <Empty>불러오는 중...</Empty>
        ) : filtered.length === 0 ? (
          <Empty>{tab === "mine" ? "내가 등록한 교육 공고가 없어요." : "조건에 맞는 교육이 없어요."}</Empty>
        ) : (
          filtered.map((n) => {
            const price = priceInfo(n);
            const mine = uid && n.authorUid === uid;
            return (
              <Card key={n.id} onClick={() => navigate(`/training/${n.id}`)}>
                <CardTop>
                  <StatusText style={{ color: STATUS_COLOR[n.liveStatus] }}>{n.liveStatus}</StatusText>
                  <RecruitText>{n.liveStatus === "교육완료" ? "" : recruitText(n)}</RecruitText>
                  <TimeText>{timeAgo(n.createdAt)}</TimeText>
                </CardTop>

                <CardBody>
                  <Thumb>
                    {n.photo ? <img src={n.photo} alt="" loading="lazy" /> : <ThumbText>{CATEGORIES.find((c) => c.key === n.category)?.short || "교육"}</ThumbText>}
                  </Thumb>
                  <CardInfo>
                    <CardTitle>
                      {n.tag && <TagText>[{n.tag}]</TagText>}
                      {n.title}
                    </CardTitle>
                    <InfoLine><IoLocationOutline size={15} /> {n.regionLabel || "장소 미정"}{n.method ? ` · ${n.method}` : ""}</InfoLine>
                    <InfoLine><IoCalendarOutline size={15} /> {eduDateText(n)}</InfoLine>
                    <PriceLine>
                      <PriceMain>{price.main}</PriceMain>
                      {price.regular && <PriceRegular>{price.regular}</PriceRegular>}
                    </PriceLine>
                  </CardInfo>
                </CardBody>

                <CardFoot>
                  <Author>{n.instructor || "교육 담당자"}{n.capacity ? ` · 정원 ${n.capacity}명` : ""}</Author>
                  {mine ? (
                    <MineText>내 공고</MineText>
                  ) : (
                    <FootBtns>
                      <OutlineBtn onClick={(e) => { e.stopPropagation(); callTrainer(n); }}><IoCallOutline size={16} /> 전화</OutlineBtn>
                      <OutlineBtn onClick={(e) => { e.stopPropagation(); chatTrainer(n, userData, navigate); }}><IoChatbubbleEllipsesOutline size={16} /> 채팅</OutlineBtn>
                    </FootBtns>
                  )}
                </CardFoot>
              </Card>
            );
          })
        )}

        <Disclaimer>
          홈프로는 교육 정보 제공 및 연결 서비스만 제공하며, 교육 품질·계약 조건·비용·교육 결과에 대한 책임은 교육 개설자에게 있습니다.
        </Disclaimer>
      </Wrap>

      <Fab onClick={() => navigate("/training/create")}>
        <IoAddCircle size={20} /> 교육 등록
      </Fab>
    </Wrapper>
  );
};

export default TrainingPage;

/* ===================== styles ===================== */
const Wrap = styled.div` padding: 10px 12px 96px; background: ${THEME.background}; min-height: 60vh; `;
const NoticeBar = styled.div`
  padding: 11px 14px; background: ${THEME.surface}; border: 1px solid #e3e6ec; border-radius: 10px;
  font-size: 14px; color: #2b2f36; margin-bottom: 10px; line-height: 1.5; word-break: keep-all;
`;
// 탭바 기준 스타일 — 하나의 박스 · 사이 세로선 · 열린 탭은 연회색 면 + 굵은 글씨
const TabBar = styled.div` display: flex; border: 1px solid #d5d9e0; background: ${THEME.surface}; margin-bottom: 10px; `;
const TabBtn = styled.button`
  flex: 1; height: 44px; border: none; font-family: inherit; font-size: 15px; cursor: pointer;
  background: ${({ $active }) => ($active ? "#e9ecf1" : THEME.surface)};
  color: ${THEME.text}; font-weight: ${({ $active }) => ($active ? 700 : 400)};
  & + & { border-left: 1px solid #d5d9e0; }
`;
const FilterBox = styled.div` display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; `;
const CatRow = styled.div`
  display: flex; gap: 6px; overflow-x: auto; -webkit-overflow-scrolling: touch; scrollbar-width: none;
  &::-webkit-scrollbar { display: none; }
`;
const CatBtn = styled.button`
  flex: 0 0 auto; height: 38px; padding: 0 13px; border-radius: 8px; font-size: 14px; font-family: inherit; cursor: pointer; white-space: nowrap;
  border: 1px solid ${({ $active }) => ($active ? THEME.primaryDark : "#dfe2e8")};
  background: ${THEME.surface};
  color: ${({ $active }) => ($active ? THEME.primaryDark : THEME.text)};
  font-weight: ${({ $active }) => ($active ? 700 : 400)};
`;
const SelectRow = styled.div` display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; `;
const FilterSelect = styled.select`
  height: 42px; min-width: 0; border: 1px solid #dfe2e8; border-radius: 8px; padding: 0 8px; font-size: 14px;
  font-family: inherit; background: ${THEME.surface}; color: ${THEME.text};
`;
const Card = styled.div`
  background: ${THEME.surface}; border: 1px solid #eceef2; border-radius: 12px; padding: 14px 14px 12px; margin-bottom: 10px; cursor: pointer;
`;
const CardTop = styled.div` display: flex; align-items: center; gap: 8px; margin-bottom: 10px; `;
const StatusText = styled.span` font-size: 14px; font-weight: 700; `;
const RecruitText = styled.span` font-size: 13px; color: #2b2f36; flex: 1; `;
const TimeText = styled.span` font-size: 13px; color: ${THEME.muted}; `;
const CardBody = styled.div` display: flex; gap: 12px; `;
const Thumb = styled.div`
  flex: none; width: 88px; height: 88px; border-radius: 8px; overflow: hidden; background: #eef0f3;
  display: flex; align-items: center; justify-content: center;
  img { width: 100%; height: 100%; object-fit: cover; display: block; }
`;
const ThumbText = styled.span` font-size: 15px; font-weight: 700; color: #2b2f36; `;
const CardInfo = styled.div` flex: 1; min-width: 0; `;
const CardTitle = styled.div`
  font-size: 17px; font-weight: 700; color: ${THEME.text}; line-height: 1.35; word-break: keep-all;
  display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 6px;
`;
const TagText = styled.span` color: ${THEME.primaryDark}; margin-right: 4px; `;
const InfoLine = styled.div`
  display: flex; align-items: center; gap: 4px; font-size: 14px; color: #2b2f36; line-height: 1.5;
  white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  svg { flex: none; color: ${THEME.muted}; }
`;
const PriceLine = styled.div` display: flex; align-items: baseline; gap: 6px; margin-top: 4px; flex-wrap: wrap; `;
const PriceMain = styled.span` font-size: 16px; font-weight: 700; color: ${THEME.text}; `;
const PriceRegular = styled.span` font-size: 13px; color: ${THEME.muted}; text-decoration: line-through; `;
const CardFoot = styled.div`
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  margin-top: 12px; padding-top: 11px; border-top: 1px solid #eceef2;
`;
const Author = styled.div` font-size: 14px; font-weight: 600; color: ${THEME.text}; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; `;
const MineText = styled.span` font-size: 14px; color: ${THEME.muted}; flex: none; `;
const FootBtns = styled.div` display: flex; gap: 6px; flex: none; `;
const OutlineBtn = styled.button`
  display: inline-flex; align-items: center; gap: 4px; height: 36px; padding: 0 12px; border-radius: 8px;
  border: 1px solid #d5d9e0; background: ${THEME.surface}; color: ${THEME.text}; font-size: 14px; font-weight: 600;
  cursor: pointer; font-family: inherit; &:active { background: #f3f4f6; }
`;
const Empty = styled.div` padding: 60px 20px; text-align: center; font-size: 16px; color: #2b2f36; `;
const Disclaimer = styled.div` margin-top: 14px; font-size: 13px; color: ${THEME.muted}; line-height: 1.6; word-break: keep-all; `;
const Fab = styled.button`
  position: fixed; bottom: calc(78px + env(safe-area-inset-bottom, 0px)); left: 50%; transform: translateX(-50%); z-index: 90;
  display: inline-flex; align-items: center; gap: 6px; height: 46px; padding: 0 22px; border-radius: 10px;
  border: none; background: ${THEME.primary}; color: #fff; font-size: 16px; font-weight: 600; cursor: pointer;
  font-family: inherit; box-shadow: 0 6px 20px rgba(0,0,0,0.18); &:active { opacity: 0.85; }
`;
