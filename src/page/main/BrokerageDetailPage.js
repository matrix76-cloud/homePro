/* eslint-disable */
/**
 * 공동중개 매물 상세 — 아래에서 올라오던 시트를 별도 페이지로 (대표 9/17 시안 3번)
 *   책임 안내를 버튼 바로 위에 두어 연결 전에 반드시 보이게 한다.
 *   매물마다 주소가 생겨 링크로 보낼 수 있다.
 */
import React, { useEffect, useState } from "react";
import styled from "styled-components";
import { useNavigate, useParams } from "react-router-dom";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";
import { useAuth } from "../../context/AuthContext";
import { UserContext } from "../../context/User";
import { getBrokeragePost } from "../../service/BrokerageService";
import { getBrokerStatus } from "../../service/BrokerService";
import { createChatRoom } from "../../service/ChatService";
import { IoChatbubbleEllipsesOutline } from "react-icons/io5";

const timeAgo = (ts) => {
  if (!ts) return "";
  const d = ts.toDate ? ts.toDate() : new Date(ts);
  const diff = Date.now() - d.getTime();
  if (diff < 60000) return "방금";
  if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
  return `${d.getMonth() + 1}/${d.getDate()}`;
};

const BrokerageDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { userData } = useAuth();
  const { user } = React.useContext(UserContext);
  const uid = userData?.uid || user?.USERS_ID;

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [brokerStatus, setBrokerStatus] = useState("none");

  useEffect(() => {
    let alive = true;
    getBrokeragePost(id)
      .then((p) => { if (alive) setPost(p); })
      .catch(() => {})
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [id]);

  useEffect(() => {
    let alive = true;
    getBrokerStatus(uid).then((s) => { if (alive) setBrokerStatus(s); });
    return () => { alive = false; };
  }, [uid]);

  const isBroker = brokerStatus === "approved";

  const askRegister = () => {
    const msg = brokerStatus === "pending"
      ? "공인중개사 인증을 관리자가 확인하는 중입니다. 승인되면 이용할 수 있어요."
      : "인증 공인중개사만 이용할 수 있어요.\n중개사무소 개설등록번호로 인증을 신청해 주세요.";
    if (brokerStatus === "pending") { window.alert(msg); return; }
    if (window.confirm(msg + "\n\n지금 인증하러 갈까요?")) navigate("/pro/register-category?category=brokerage");
  };

  const callAuthor = () => {
    if (post.type === "demand" && !isBroker) { askRegister(); return; }
    if (!post.authorPhone) { window.alert("등록자가 연락처를 남기지 않았습니다. 채팅으로 연결해 주세요."); return; }
    window.location.href = `tel:${post.authorPhone}`;
  };

  const startChat = async () => {
    if (!uid) { window.alert("로그인이 필요합니다."); return; }
    if (post.authorUid === uid) { window.alert("본인 게시글입니다."); return; }
    if (post.type === "demand" && !isBroker) { askRegister(); return; }
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

  if (loading) {
    return <SimpleBackLayout NAME="매물 상세"><Empty>불러오는 중...</Empty></SimpleBackLayout>;
  }
  if (!post) {
    return (
      <SimpleBackLayout NAME="매물 상세">
        <Empty>글을 찾을 수 없습니다. 삭제되었거나 주소가 잘못되었습니다.</Empty>
      </SimpleBackLayout>
    );
  }

  const closed = post.status === "closed";
  const mine = post.authorUid === uid;
  const blocked = post.type === "demand" && !isBroker;

  return (
    <SimpleBackLayout NAME="매물 상세">
      <Page>
        <Body>
          <TopRow>
            <TypeTag $listing={post.type === "listing"}>{post.type === "listing" ? "매물공유" : "손님공유"}</TypeTag>
            <StatusText $closed={closed}>{closed ? "거래종료" : "진행중"}</StatusText>
          </TopRow>

          <Title>{post.oneLine}</Title>

          <Row><RowKey>지역</RowKey><RowVal>{post.region || "-"}</RowVal></Row>
          <Row><RowKey>매물 종류</RowKey><RowVal>{post.dealType || "-"}</RowVal></Row>
          <Row><RowKey>거래 형태</RowKey><RowVal>{post.contractType || "-"}</RowVal></Row>
          <Row><RowKey>금액</RowKey><RowVal>{post.price || "-"}</RowVal></Row>
          <Row><RowKey>등록</RowKey><RowVal>{post.authorCompany} · {timeAgo(post.createdAt)}</RowVal></Row>

          {post.detail && <Detail>{post.detail}</Detail>}
        </Body>

        <Bottom>
          {blocked ? (
            <Note>손님공유 상세·연결은 인증 공인중개사만 할 수 있습니다.</Note>
          ) : mine ? (
            <Note>내가 등록한 글입니다. 공동중개 목록의 내 글 탭에서 거래 종료를 관리할 수 있습니다.</Note>
          ) : closed ? (
            <Note>거래가 종료된 글입니다.</Note>
          ) : (
            <>
              <Note>
                전화·채팅으로 연결되는 순간부터는 중개사 간 자율 협의이며, 계약 진행과 중개 사고의 책임은 당사자에게 있습니다. 홈프로는 연결까지만 합니다.
              </Note>
              <BtnRow>
                <GhostBtn type="button" onClick={callAuthor}>전화하기</GhostBtn>
                <PrimaryBtn type="button" onClick={startChat}>
                  <IoChatbubbleEllipsesOutline size={16} /> 채팅하기
                </PrimaryBtn>
              </BtnRow>
            </>
          )}
        </Bottom>
      </Page>
    </SimpleBackLayout>
  );
};

export default BrokerageDetailPage;

const Page = styled.div`
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 160px);
  background: ${THEME.background};
`;

const Body = styled.div`
  flex: 1;
  padding: 16px 16px 24px;
`;

const Empty = styled.div`
  padding: 60px 24px;
  text-align: center;
  font-size: 15px;
  color: ${THEME.muted};
  word-break: keep-all;
  line-height: 1.6;
`;

const TopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
`;

const TypeTag = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  padding: 3px 10px;
  border-radius: 6px;
  background: ${({ $listing }) => ($listing ? THEME.primary : THEME.primaryDark)}; /* 보라 칩 (형 9/17) */
`;

const StatusText = styled.span`
  font-size: 14px;
  font-weight: 700;
  color: ${({ $closed }) => ($closed ? THEME.muted : THEME.primary)};
`;

const Title = styled.div`
  font-size: 20px;
  font-weight: 700;
  color: ${THEME.text};
  line-height: 1.4;
  margin: 10px 0 14px;
  word-break: keep-all;
`;

const Row = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 12px 0;
  border-bottom: 1px solid #F0F2F5;
`;

const RowKey = styled.span`
  font-size: 15px;
  color: ${THEME.muted};
  flex: none;
`;

const RowVal = styled.span`
  font-size: 15px;
  font-weight: 700;
  color: ${THEME.text};
  text-align: right;
  word-break: keep-all;
`;

const Detail = styled.div`
  font-size: 15px;
  line-height: 1.65;
  color: #2b2f36;
  margin-top: 14px;
  white-space: pre-wrap;
  word-break: keep-all;
`;

const Bottom = styled.div`
  position: sticky;
  bottom: 0;
  border-top: 1px solid ${THEME.border};
  background: ${THEME.surface};
  padding: 12px 16px calc(12px + env(safe-area-inset-bottom, 0px));
`;

const Note = styled.div`
  font-size: 13px;
  line-height: 1.55;
  color: ${THEME.muted};
  word-break: keep-all;
`;

const BtnRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 10px;
`;

const GhostBtn = styled.button`
  flex: 1;
  height: 50px;
  border-radius: 8px;
  border: 1px solid ${THEME.border};
  background: ${THEME.surface};
  color: ${THEME.text};
  font-size: 15px;
  font-family: inherit;
  cursor: pointer;
  &:focus { outline: none; }
`;

const PrimaryBtn = styled.button`
  flex: 1.2;
  height: 50px;
  border-radius: 8px;
  border: none;
  background: ${THEME.primary};
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-family: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  &:focus { outline: none; }
`;
