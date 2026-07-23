/* eslint-disable */
// 공동중개 = 공인중개 라운지 — 손님찾기/매물등록 카드 피드 + 채팅 매칭
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate } from "react-router-dom";
import MainListLayout from "../../screen/Layout/Layout/MainListLayout";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { UserContext } from "../../context/User";
import { getBrokeragePosts } from "../../service/BrokerageService";
import { createChatRoom } from "../../service/ChatService";
import { IoChatbubbleEllipsesOutline, IoLocationOutline, IoAddCircle } from "react-icons/io5";

const TABS = [
  { key: "all", label: "전체" },
  { key: "demand", label: "손님 찾습니다" },
  { key: "listing", label: "매물 있습니다" },
];

const timeAgo = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "방금";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const BrokeragePage = () => {
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { user } = React.useContext(UserContext);
  const uid = userData?.uid || user?.USERS_ID;

  const [tab, setTab] = useState("all");
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    getBrokeragePosts()
      .then((list) => { if (alive) setPosts(list); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const filtered = tab === "all" ? posts : posts.filter((p) => p.type === tab);

  const startChat = async (post) => {
    if (!uid) { window.alert("로그인이 필요합니다."); return; }
    if (post.authorUid === uid) { window.alert("본인 게시글입니다."); return; }
    try {
      const myName = userData?.companyName || userData?.nickname || userData?.name || "중개사";
      const myPhoto = userData?.profileImage || userData?.photoURL || "";
      const roomId = await createChatRoom(
        uid, myName, myPhoto,
        post.authorUid, post.authorCompany || "중개사", "",
        { type: "brokerage" }
      );
      navigate(`/chat/${roomId}`);
    } catch (e) {
      window.alert("채팅방을 열지 못했습니다.");
    }
  };

  return (
    <MainListLayout NAME="공동중개" footerType="brokerage" hideBack>
      <Wrap>
        <NoticeBar>개업 공인중개사 전용 공동중개 라운지 · 글쓰기/읽기 무료</NoticeBar>

        <TabRow>
          {TABS.map((t) => (
            <TabBtn key={t.key} $active={tab === t.key} onClick={() => setTab(t.key)}>{t.label}</TabBtn>
          ))}
        </TabRow>

        {loading ? (
          <Empty>불러오는 중...</Empty>
        ) : filtered.length === 0 ? (
          <Empty>아직 등록된 글이 없어요. 첫 글을 등록해보세요.</Empty>
        ) : (
          filtered.map((p) => (
            <Card key={p.id}>
              <CardTop>
                <TypeTag $listing={p.type === "listing"}>{p.type === "listing" ? "매물" : "손님"}</TypeTag>
                <RegionText><IoLocationOutline size={13} /> {p.region}</RegionText>
                <TimeText>{timeAgo(p.createdAt)}</TimeText>
              </CardTop>
              <OneLine>{p.oneLine}</OneLine>
              <MetaRow>
                {p.dealType && <MetaChip>{p.dealType}</MetaChip>}
                {p.contractType && <MetaChip>{p.contractType}</MetaChip>}
                {p.price && <PriceText>{p.price}</PriceText>}
              </MetaRow>
              {p.detail && <DetailText>{p.detail}</DetailText>}
              <CardFoot>
                <Company>{p.authorCompany}</Company>
                {p.authorUid !== uid && (
                  <ChatBtn onClick={() => startChat(p)}>
                    <IoChatbubbleEllipsesOutline size={15} /> 채팅하기
                  </ChatBtn>
                )}
              </CardFoot>
            </Card>
          ))
        )}

        <Disclaimer>
          본 서비스는 개업공인중개사 상호 간의 소통·정보 교환을 돕는 부가통신 서비스(IT 플랫폼)이며 공인중개사법상 부동산 거래정보망이 아닙니다.
          홈프로는 중개 행위에 개입하거나 거래를 보증하지 않으며, 계약 진행·중개 사고에 대한 책임은 거래 당사자에게 있습니다.
        </Disclaimer>
      </Wrap>

      <Fab onClick={() => navigate("/brokerage/create")}>
        <IoAddCircle size={20} /> 등록
      </Fab>
    </MainListLayout>
  );
};

export default BrokeragePage;

const Wrap = styled.div` padding: 10px 12px 90px; background: ${THEME.background}; min-height: 100%; `;
const NoticeBar = styled.div`
  padding: 10px 14px; background: ${THEME.surface}; border: 1px solid ${THEME.border}; border-radius: 10px;
  font-size: 12.5px; color: ${THEME.textSecondary}; margin-bottom: 10px;
`;
const TabRow = styled.div` display: flex; gap: 8px; margin-bottom: 10px; `;
const TabBtn = styled.button`
  flex: 1; height: 40px; border-radius: 10px; font-size: 13px; font-weight: ${({ $active }) => ($active ? 600 : 400)};
  cursor: pointer; font-family: inherit;
  border: 1px solid ${({ $active }) => ($active ? THEME.primary : THEME.border)};
  background: ${({ $active }) => ($active ? THEME.primary : THEME.surface)};
  color: ${({ $active }) => ($active ? "#fff" : THEME.text)};
`;
const Card = styled.div`
  background: ${THEME.surface}; border-radius: 14px; padding: 16px; margin-bottom: 10px; box-shadow: ${THEME.cardShadow};
`;
const CardTop = styled.div` display: flex; align-items: center; gap: 8px; `;
const TypeTag = styled.span`
  font-size: 12px; font-weight: 700; color: #fff; padding: 2px 10px; border-radius: 6px;
  background: ${({ $listing }) => ($listing ? "#0EA5A0" : THEME.primary)};
`;
const RegionText = styled.span` display: inline-flex; align-items: center; gap: 3px; font-size: 12.5px; color: ${THEME.muted}; flex: 1; `;
const TimeText = styled.span` font-size: 12px; color: ${THEME.muted}; `;
const OneLine = styled.div` font-size: 15.5px; font-weight: 700; color: ${THEME.text}; margin-top: 10px; line-height: 1.4; `;
const MetaRow = styled.div` display: flex; flex-wrap: wrap; align-items: center; gap: 6px; margin-top: 8px; `;
const MetaChip = styled.span` font-size: 12px; color: ${THEME.textSecondary}; background: ${THEME.background}; padding: 3px 9px; border-radius: 12px; `;
const PriceText = styled.span` font-size: 14px; font-weight: 700; color: ${THEME.primary}; margin-left: auto; `;
const DetailText = styled.div` margin-top: 10px; font-size: 13.5px; color: ${THEME.textSecondary}; line-height: 1.55; white-space: pre-wrap; `;
const CardFoot = styled.div`
  display: flex; align-items: center; justify-content: space-between; margin-top: 12px; padding-top: 12px; border-top: 1px solid ${THEME.border};
`;
const Company = styled.div` font-size: 13px; font-weight: 600; color: ${THEME.text}; `;
const ChatBtn = styled.button`
  display: inline-flex; align-items: center; gap: 5px; height: 34px; padding: 0 14px; border-radius: 8px;
  border: 1px solid ${THEME.primary}; background: ${THEME.primary}; color: #fff; font-size: 13px; font-weight: 600;
  cursor: pointer; font-family: inherit; &:active { opacity: 0.85; }
`;
const Empty = styled.div` padding: 60px 20px; text-align: center; font-size: 14px; color: ${THEME.muted}; `;
const Disclaimer = styled.div` margin-top: 14px; font-size: 11px; color: ${THEME.muted}; line-height: 1.6; `;
const Fab = styled.button`
  position: fixed; bottom: 78px; left: 50%; transform: translateX(-50%); z-index: 50;
  display: inline-flex; align-items: center; gap: 6px; height: 46px; padding: 0 22px; border-radius: 24px;
  border: none; background: ${THEME.primary}; color: #fff; font-size: 15px; font-weight: 600; cursor: pointer;
  font-family: inherit; box-shadow: 0 6px 20px rgba(0,0,0,0.18);
`;
