/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, query, where, getDocs, orderBy, doc, getDoc } from "firebase/firestore";
import { db } from "../../api/config";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { getAllPointRules, POINT_RULE_ORDER } from "../../service/PointService";
import { GRADE_ORDER, calcGrade, GradeProgressBar } from "../../utility/gradeUtils";

/* ── 카테고리별 아이콘 SVG + 배경색 ── */
const InviteIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M14 14c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm0 2.5c-3.34 0-10 1.67-10 5V24h20v-2.5c0-3.33-6.66-5-10-5z" fill="#10B981"/>
    <path d="M22 11h3v2h-3v3h-2v-3h-3v-2h3V8h2v3z" fill="#10B981"/>
  </svg>
);
const GiftIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M22 10h-2.18C20.56 9.22 21 8.16 21 7c0-2.76-2.24-5-5-5-1.4 0-2.65.58-3.56 1.5L14 5.06l1.56-1.56C14.65 2.58 13.4 2 12 2 9.24 2 7 4.24 7 7c0 1.16.44 2.22 1.18 3H6c-1.1 0-2 .9-2 2v3c0 .55.45 1 1 1v7c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-7c.55 0 1-.45 1-1v-3c0-1.1-.9-2-2-2z" fill="#8B5CF6"/>
  </svg>
);
const OrderIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M6 4h16c1.1 0 2 .9 2 2v16c0 1.1-.9 2-2 2H6c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#3B82F6" opacity=".2"/>
    <path d="M9 9h10M9 13h10M9 17h6" stroke="#3B82F6" strokeWidth="2" strokeLinecap="round"/>
  </svg>
);
const CheckIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <circle cx="14" cy="14" r="10" fill="#10B981" opacity=".2"/>
    <path d="M10 14l3 3 5-6" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);
const PenIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M5 19.5V23h3.5L20.63 10.87l-3.5-3.5L5 19.5z" fill="#F59E0B" opacity=".3"/>
    <path d="M5 19.5V23h3.5L20.63 10.87l-3.5-3.5L5 19.5zM22.13 7.37a.996.996 0 000-1.41l-2.09-2.09a.996.996 0 00-1.41 0l-1.71 1.71 3.5 3.5 1.71-1.71z" fill="#F59E0B"/>
  </svg>
);
const HeartIcon = ({ level }) => {
  const colors = { 10: "#F472B6", 50: "#EC4899", 100: "#DB2777" };
  const c = colors[level] || "#F472B6";
  return (
    <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
      <path d="M14 24.35l-1.45-1.32C6.4 17.36 2 13.28 2 8.5 2 4.42 5.42 1 9.5 1c2.54 0 4.99 1.17 6.5 3.01C17.51 2.17 19.96 1 22.5 1 26.58 1 30 4.42 30 8.5c0 4.78-4.4 8.86-10.55 14.54L14 24.35z" fill={c} opacity=".25" transform="scale(0.9) translate(1.5,1.5)"/>
      <path d="M14 24.35l-1.45-1.32C6.4 17.36 2 13.28 2 8.5 2 4.42 5.42 1 9.5 1c2.54 0 4.99 1.17 6.5 3.01C17.51 2.17 19.96 1 22.5 1 26.58 1 30 4.42 30 8.5c0 4.78-4.4 8.86-10.55 14.54L14 24.35z" fill={c} transform="scale(0.7) translate(6,6)"/>
    </svg>
  );
};
const StarIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M14 2l3.09 6.26L24 9.27l-5 4.87 1.18 6.88L14 17.77l-6.18 3.25L9 14.14l-5-4.87 6.91-1.01L14 2z" fill="#F59E0B"/>
  </svg>
);
const ReviewIcon = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
    <path d="M4 4h20c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2h-6l-4 4-4-4H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" fill="#F59E0B" opacity=".25"/>
    <path d="M14 8l1.24 2.51 2.76.4-2 1.95.47 2.76L14 14.38l-2.47 1.24.47-2.76-2-1.95 2.76-.4L14 8z" fill="#F59E0B"/>
  </svg>
);

const RULE_STYLE = {
  referral_invite:    { icon: InviteIcon, bg: "#ECFDF5", accent: "#10B981" },
  referral_signup:    { icon: GiftIcon,   bg: "#EDE9FE", accent: "#8B5CF6" },
  order_create:       { icon: OrderIcon,  bg: "#EFF6FF", accent: "#3B82F6" },
  order_complete:     { icon: CheckIcon,  bg: "#ECFDF5", accent: "#10B981" },
  community_post:     { icon: PenIcon,    bg: "#FFFBEB", accent: "#F59E0B" },
  community_like_10:  { icon: () => <HeartIcon level={10} />,  bg: "#FDF2F8", accent: "#F472B6" },
  community_like_50:  { icon: () => <HeartIcon level={50} />,  bg: "#FDF2F8", accent: "#EC4899" },
  community_like_100: { icon: () => <HeartIcon level={100} />, bg: "#FDF2F8", accent: "#DB2777" },
  review:             { icon: ReviewIcon,  bg: "#FFFBEB", accent: "#F59E0B" },
  // Firestore 호환 (review_like_* → community_like_* 통합 전 데이터)
  review_like_10:     { icon: () => <HeartIcon level={10} />,  bg: "#FDF2F8", accent: "#F472B6" },
  review_like_50:     { icon: () => <HeartIcon level={50} />,  bg: "#FDF2F8", accent: "#EC4899" },
  review_like_100:    { icon: () => <HeartIcon level={100} />, bg: "#FDF2F8", accent: "#DB2777" },
};

const ReferralPointsPage = () => {
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.USERS_ID || userData?.uid;
  const [history, setHistory] = useState([]);
  const [totalPoints, setTotalPoints] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [rules, setRules] = useState({});
  const [gradeRules, setGradeRules] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        // 포인트 이력 조회
        const q = query(
          collection(db, "homepro_cash"),
          where("uid", "==", uid),
          orderBy("createdAt", "desc")
        );
        const snap = await getDocs(q);
        setHistory(snap.docs.map((d) => ({ id: d.id, ...d.data() })));

        // 총 보유 포인트
        const userSnap = await getDoc(doc(db, "users", uid));
        const uData = userSnap.data() || {};
        setTotalPoints(uData.referralPoints || 0);
        setTotalEarned(uData.totalEarnedPoints || 0);

        // 포인트 규칙
        const r = await getAllPointRules();
        setRules(r);

        // 등급 규칙
        try {
          const grSnap = await getDoc(doc(db, "settings", "grade_rules"));
          if (grSnap.exists()) setGradeRules(grSnap.data());
        } catch {};
      } catch (e) {
        console.error("포인트 내역 조회 실패:", e);
      } finally {
        setLoading(false);
      }
    })();
  }, [uid]);

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  const activeRules = Object.entries(rules)
    .filter(([, v]) => v.active && v.amount > 0)
    .sort((a, b) => {
      const ai = POINT_RULE_ORDER.indexOf(a[0]);
      const bi = POINT_RULE_ORDER.indexOf(b[0]);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

  return (
    <SimpleBackLayout name="포인트 내역" onBack={() => navigate(-1)}>
      <Wrap>
        {/* 총 보유 포인트 */}
        <TotalCard>
          <TotalLabel>총 보유 포인트</TotalLabel>
          <TotalAmount>{totalPoints.toLocaleString()}P</TotalAmount>
        </TotalCard>

        {/* 포인트 안내 — 가로 스크롤 카드 슬라이드 */}
        {activeRules.length > 0 && (
          <SlideSection>
            <SlideTitle>이렇게 포인트를 받을 수 있어요</SlideTitle>
            <SlideRow>
              {activeRules.map(([key, rule]) => {
                const style = RULE_STYLE[key] || { icon: null, bg: THEME.background, accent: THEME.primary };
                const IconComp = style.icon;
                return (
                  <SlideCard key={key} $bg={style.bg}>
                    {IconComp && <IconComp />}
                    <SlideAmount $accent={style.accent}>+{rule.amount}P</SlideAmount>
                    <SlideLabel>{rule.label}</SlideLabel>
                  </SlideCard>
                );
              })}
            </SlideRow>
          </SlideSection>
        )}

        {/* 등급 안내 */}
        <GradeSection>
          <SectionTitle style={{ marginTop: 0 }}>나의 등급</SectionTitle>
          <GradeProgressBar totalEarnedPoints={totalEarned} gradeRules={gradeRules} />
          <GradeGrid>
            {GRADE_ORDER.map((key) => {
              const rule = (gradeRules || {})[key] || {};
              const current = calcGrade(totalEarned, gradeRules);
              const isCurrent = current.key === key;
              return (
                <GradeItem key={key} $active={isCurrent} $color={rule.color}>
                  <GradeDot $color={rule.color} />
                  <GradeName $active={isCurrent}>{rule.label || key}</GradeName>
                  <GradeMin>{(rule.minPoints || 0).toLocaleString()}P</GradeMin>
                </GradeItem>
              );
            })}
          </GradeGrid>
        </GradeSection>

        {/* 포인트 이력 */}
        <SectionTitle>포인트 내역</SectionTitle>
        {loading ? (
          <EmptyWrap><EmptyText>불러오는 중...</EmptyText></EmptyWrap>
        ) : history.length === 0 ? (
          <EmptyWrap>
            <EmptyText>아직 포인트 내역이 없어요</EmptyText>
          </EmptyWrap>
        ) : (
          <HistoryList>
            {history.map((h) => (
              <HistoryItem key={h.id}>
                <HistoryLeft>
                  <HistoryReason>{h.reason}</HistoryReason>
                  <HistoryDate>{formatDate(h.createdAt)}</HistoryDate>
                </HistoryLeft>
                <HistoryAmount $type={h.type}>
                  {h.type === "earn" ? "+" : h.type === "use" ? "-" : ""}{h.amount.toLocaleString()}P
                </HistoryAmount>
              </HistoryItem>
            ))}
          </HistoryList>
        )}
      </Wrap>
    </SimpleBackLayout>
  );
};

export default ReferralPointsPage;

const Wrap = styled.div`
  padding: 0 12px 20px;
  min-height: 100%;
`;

const TotalCard = styled.div`
  background: ${THEME.primary};
  border-radius: 16px;
  padding: 24px 20px;
  margin-top: 12px;
  text-align: center;
`;

const TotalLabel = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: rgba(255,255,255,0.8);
`;

const TotalAmount = styled.div`
  font-size: 28px;
  font-weight: 700;
  color: #fff;
  margin-top: 6px;
`;

const SlideSection = styled.div`
  margin-top: 16px;
`;

const SlideTitle = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  padding-left: 4px;
  margin-bottom: 10px;
`;

const SlideRow = styled.div`
  display: flex;
  gap: 10px;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  padding-bottom: 4px;
  &::-webkit-scrollbar { display: none; }
`;

const SlideCard = styled.div`
  flex-shrink: 0;
  min-width: 130px;
  max-width: 150px;
  background: ${({ $bg }) => $bg || THEME.surface};
  border-radius: 16px;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 8px;
`;


const SlideAmount = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${({ $accent }) => $accent || THEME.primary};
`;

const SlideLabel = styled.div`
  font-size: 12px;
  font-weight: 500;
  color: ${THEME.textSecondary};
  line-height: 1.35;
`;

const SectionTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  margin-top: 20px;
  margin-bottom: 8px;
  padding-left: 4px;
`;

const HistoryList = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  overflow: hidden;
`;

const HistoryItem = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;

const HistoryLeft = styled.div`
  flex: 1;
  min-width: 0;
`;

const HistoryReason = styled.div`
  font-size: 15px;
  font-weight: 500;
  color: ${THEME.text};
`;

const HistoryDate = styled.div`
  font-size: 13px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 2px;
`;

const HistoryAmount = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${({ $type }) => $type === "earn" ? THEME.primary : $type === "use" ? THEME.danger : THEME.text};
  flex-shrink: 0;
  margin-left: 12px;
`;

const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
`;

const EmptyText = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.textSecondary};
`;

const GradeSection = styled.div`
  margin-top: 16px;
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  box-shadow: ${THEME.cardShadow};
`;

const GradeGrid = styled.div`
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
`;

const GradeItem = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 12px;
  border-radius: 10px;
  background: ${({ $active, $color }) => $active ? `${$color}15` : THEME.background};
  border: 1.5px solid ${({ $active, $color }) => $active ? $color : "transparent"};
`;

const GradeDot = styled.div`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;

const GradeName = styled.div`
  font-size: 13px;
  font-weight: ${({ $active }) => $active ? 700 : 400};
  color: ${THEME.text};
`;

const GradeMin = styled.div`
  font-size: 11px;
  font-weight: 400;
  color: ${THEME.muted};
`;
