/* eslint-disable */
import React, { useState, useEffect, useContext } from "react";
import { useNavigate } from "react-router-dom";
import styled from "styled-components";
import { collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../../api/config";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { THEME } from "../../config/homeproConfig";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { getAllPointRules, DEFAULT_RULES } from "../../service/PointService";
import { IoPersonCircleOutline } from "react-icons/io5";
import usePcWide from "../../hooks/usePcWide";

const ReferralFriendsPage = () => {
  const navigate = useNavigate();
  const pcWide = usePcWide();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  const uid = user?.USERS_ID || userData?.uid;
  const [friends, setFriends] = useState([]);
  const [loading, setLoading] = useState(true);
  // 보상 금액은 settings/point_rules 운영값 기준 (하드코딩 금지)
  const [rules, setRules] = useState(DEFAULT_RULES);

  useEffect(() => {
    getAllPointRules().then(setRules).catch(() => {});
  }, []);

  useEffect(() => {
    if (!uid) return;
    (async () => {
      try {
        const q = query(
          collection(db, "users"),
          where("referredBy", "==", uid)
        );
        const snap = await getDocs(q);
        const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        list.sort((a, b) => {
          const aT = a.createdAt?.toMillis?.() || 0;
          const bT = b.createdAt?.toMillis?.() || 0;
          return bT - aT;
        });
        setFriends(list);
      } catch (e) {
        console.error("친구 목록 조회 실패:", e);
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

  return (
    <SimpleBackLayout name="초대한 친구" NAME={pcWide ? "초대한 친구" : undefined} onBack={() => navigate(-1)}>
      <Wrap>
        <SummaryCard>
          <SummaryText>초대한 친구 <SummaryNum>{friends.length}명</SummaryNum></SummaryText>
        </SummaryCard>

        <GuideCard>
          <GuideTitle>초대 보상 안내</GuideTitle>
          {rules.referral_invite?.active && (
            <GuideRow>
              <GuideLabel>친구가 내 코드로 가입하면</GuideLabel>
              <GuideAmount>+{(rules.referral_invite?.amount ?? 0).toLocaleString()}P</GuideAmount>
            </GuideRow>
          )}
          {rules.referral_order_complete?.active && (
            <GuideRow>
              <GuideLabel>친구가 접수한 오더가 완료되면</GuideLabel>
              <GuideAmount>+{(rules.referral_order_complete?.amount ?? 0).toLocaleString()}P</GuideAmount>
            </GuideRow>
          )}
          {rules.referral_perform_complete?.active && (
            <GuideRow>
              <GuideLabel>친구가 수락한 오더가 완료되면</GuideLabel>
              <GuideAmount>+{(rules.referral_perform_complete?.amount ?? 0).toLocaleString()}P</GuideAmount>
            </GuideRow>
          )}
          <GuideNote>오더 완료 보상은 오더 1건당 1회 지급됩니다</GuideNote>
        </GuideCard>

        {loading ? (
          <EmptyWrap><EmptyText>불러오는 중...</EmptyText></EmptyWrap>
        ) : friends.length === 0 ? (
          <EmptyWrap>
            <EmptyText>아직 초대한 친구가 없어요</EmptyText>
            <EmptySub>추천 코드를 공유해보세요!</EmptySub>
          </EmptyWrap>
        ) : (
          <FriendList>
            {pcWide && <PcHead><span /><span>이름</span><span>가입일</span></PcHead>}
            {friends.map((f) => (
              <FriendItem key={f.id}>
                {f.profileImage || f.photoURL ? (
                  <FriendImg src={f.profileImage || f.photoURL} alt="" />
                ) : (
                  <FriendPlaceholder>
                    <IoPersonCircleOutline size={44} color={THEME.border} />
                  </FriendPlaceholder>
                )}
                <FriendInfo>
                  <FriendName>{f.nickname || f.name || "사용자"}</FriendName>
                  <FriendDate><span className="lb">가입일: </span>{formatDate(f.createdAt)}</FriendDate>
                </FriendInfo>
              </FriendItem>
            ))}
          </FriendList>
        )}
      </Wrap>
    </SimpleBackLayout>
  );
};

export default ReferralFriendsPage;

const PC_COLS = "44px minmax(0, 1fr) 160px";

const Wrap = styled.div`
  padding: 0 12px;
  min-height: 100%;
  /* PC — 왼쪽 친구 표 · 오른쪽(340) 초대 인원과 보상 안내 */
  .pc-mode & {
    max-width: 1180px; margin: 0 auto; padding: 30px 32px 80px; box-sizing: border-box; min-height: 0;
    display: grid; grid-template-columns: minmax(0, 1fr) 340px; grid-template-rows: auto auto 1fr; gap: 20px 24px; align-items: start;
    & > * { margin-top: 0; }
    @media (max-width: 1240px) { grid-template-columns: minmax(0, 1fr); }
  }
`;
const PcHead = styled.div`
  display: grid; grid-template-columns: ${PC_COLS}; gap: 14px; padding: 14px 24px; background: #e9ecf1;
  font-size: 15px; font-weight: 700; color: #14181F;
`;

const SummaryCard = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  margin-top: 12px;
  box-shadow: ${THEME.cardShadow};
  .pc-mode & { grid-column: 2; grid-row: 1; border: 1px solid #dfe3e8; border-radius: 0; box-shadow: none; padding: 22px 24px;
    @media (max-width: 1240px) { grid-column: 1; grid-row: auto; } }
`;

const SummaryText = styled.div`
  font-size: 18px;
  font-weight: 600;
  color: ${THEME.text};
`;

const SummaryNum = styled.span`
  color: ${THEME.primary};
`;

const GuideCard = styled.div`
  background: ${THEME.surface};
  border-radius: 16px;
  padding: 20px;
  margin-top: 12px;
  box-shadow: ${THEME.cardShadow};
  .pc-mode & { grid-column: 2; grid-row: 2; border: 1px solid #dfe3e8; border-radius: 0; box-shadow: none; padding: 22px 24px;
    @media (max-width: 1240px) { grid-column: 1; grid-row: auto; } }
`;

const GuideTitle = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 12px;
`;

const GuideRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 6px 0;
`;

const GuideLabel = styled.div`
  font-size: 15px;
  color: ${THEME.textSecondary};
  .pc-mode & { color: #2b2f36; word-break: keep-all; }
`;

const GuideAmount = styled.div`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.primary};
  flex-shrink: 0;
`;

const GuideNote = styled.div`
  font-size: 13px;
  color: ${THEME.muted};
  margin-top: 10px;
  .pc-mode & { color: #2b2f36; font-size: 14px; }
`;

const FriendList = styled.div`
  margin-top: 12px;
  background: ${THEME.surface};
  border-radius: 16px;
  box-shadow: ${THEME.cardShadow};
  overflow: hidden;
  .pc-mode & { grid-column: 1; grid-row: 1 / span 3; border: 1px solid #dfe3e8; border-radius: 0; box-shadow: none; min-height: 420px;
    @media (max-width: 1240px) { grid-row: auto; } }
`;

const FriendItem = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px 20px;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
  .pc-mode & { display: grid; grid-template-columns: ${PC_COLS}; padding: 14px 24px; border-bottom: none; border-top: 1px solid #dfe3e8; }
`;

const FriendImg = styled.img`
  width: 44px;
  height: 44px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
`;

const FriendPlaceholder = styled.div`
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
`;

const FriendInfo = styled.div`
  flex: 1;
  min-width: 0;
  .pc-mode & { display: contents; }
`;

const FriendName = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.text};
`;

const FriendDate = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 2px;
  .pc-mode & { margin-top: 0; font-size: 16px; color: #14181F; .lb { display: none; } }
`;

const EmptyWrap = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  .pc-mode & { grid-column: 1; grid-row: 1 / span 3; background: #fff; border: 1px solid #dfe3e8; min-height: 420px; box-sizing: border-box;
    div { color: #14181F; } @media (max-width: 1240px) { grid-row: auto; } }
`;

const EmptyText = styled.div`
  font-size: 17px;
  font-weight: 600;
  color: ${THEME.textSecondary};
`;

const EmptySub = styled.div`
  font-size: 15px;
  font-weight: 400;
  color: ${THEME.muted};
  margin-top: 6px;
`;
