/* eslint-disable */
/**
 * 도급·양도·매매 게시글 상세 (시트7)
 * URL: /marketplace/:marketplaceId
 *
 * - 사진 슬라이드 (최대 4장)
 * - 거래정보 / 회원정보 / 계약방식 / 금액 / 상세내용
 * - 작성자 본인: [삭제] / 타인: [채팅 문의]
 */
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import styled from "styled-components";
import { doc, onSnapshot, deleteDoc } from "firebase/firestore";
import { db } from "../../api/config";
import { useAuth } from "../../context/AuthContext";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";
import { THEME } from "../../config/homeproConfig";
import { createChatRoom } from "../../service/ChatService";

const MarketplaceDetailPage = () => {
  const navigate = useNavigate();
  const { marketplaceId } = useParams();
  const { userData } = useAuth();
  const myUid = userData?.uid || "";

  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [photoIdx, setPhotoIdx] = useState(0);
  const [chatStarting, setChatStarting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [toast, setToast] = useState("");

  const showToast = (m) => { setToast(m); setTimeout(() => setToast(""), 2000); };

  useEffect(() => {
    if (!marketplaceId) return;
    const unsub = onSnapshot(doc(db, "homepro_marketplace", marketplaceId), (snap) => {
      if (!snap.exists()) setPost(null);
      else setPost({ id: snap.id, ...snap.data() });
      setLoading(false);
    });
    return () => unsub();
  }, [marketplaceId]);

  if (loading) {
    return (
      <SimpleBackLayout NAME="게시글" hideFooter>
        <CenterMsg>불러오는 중...</CenterMsg>
      </SimpleBackLayout>
    );
  }
  if (!post) {
    return (
      <SimpleBackLayout NAME="게시글" hideFooter>
        <CenterMsg>게시글을 찾을 수 없습니다.</CenterMsg>
      </SimpleBackLayout>
    );
  }

  const isOwner = myUid && post.createdBy === myUid;
  const images = Array.isArray(post.images) ? post.images : [];

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  const handleChat = async () => {
    if (!myUid) { showToast("로그인이 필요합니다"); return; }
    if (!post.createdBy || post.createdBy === myUid) return;
    if (chatStarting) return;
    setChatStarting(true);
    try {
      const myName = userData?.nickname || userData?.name || "";
      const myPhoto = userData?.profileImage || userData?.photoURL || "";
      const roomId = await createChatRoom(
        myUid, myName, myPhoto,
        post.createdBy, post.writer || "작성자", post.writerPhoto || "",
        { type: "marketplace" }
      );
      navigate(`/chat/${roomId}`);
    } catch (e) {
      console.error(e);
      showToast("채팅 시작 실패");
    } finally {
      setChatStarting(false);
    }
  };

  const handleDelete = async () => {
    if (!isOwner) return;
    if (!window.confirm("게시글을 삭제하시겠습니까?")) return;
    if (deleting) return;
    setDeleting(true);
    try {
      await deleteDoc(doc(db, "homepro_marketplace", marketplaceId));
      showToast("삭제되었습니다");
      setTimeout(() => navigate(-1), 500);
    } catch (e) {
      console.error(e);
      showToast("삭제 실패");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <SimpleBackLayout NAME="게시글 상세" hideFooter>
      <Wrap>
        {/* 사진 슬라이드 */}
        {images.length > 0 && (
          <PhotoBox>
            <MainImg src={images[photoIdx]} alt="" />
            {images.length > 1 && (
              <ThumbRow>
                {images.map((url, i) => (
                  <Thumb key={i} $active={i === photoIdx} onClick={() => setPhotoIdx(i)}>
                    <ThumbImg src={url} alt={`thumb-${i}`} />
                  </Thumb>
                ))}
              </ThumbRow>
            )}
            <PhotoCounter>{photoIdx + 1} / {images.length}</PhotoCounter>
          </PhotoBox>
        )}

        {/* 헤더 */}
        <HeaderCard>
          <TopRow>
            <TypeBadge>{post.tradeType}</TypeBadge>
            <DateText>{formatDate(post.createdAt)}</DateText>
          </TopRow>
          <Title>{post.title}</Title>
          {post.amount > 0 && (
            <Amount>{Number(post.amount).toLocaleString()}원</Amount>
          )}
        </HeaderCard>

        {/* 거래 정보 */}
        <Card>
          <SectionLabel>거래 정보</SectionLabel>
          <Row>
            <Key>회원유형</Key>
            <Val>{post.memberType || "—"}</Val>
          </Row>
          {post.contractType && (
            <Row>
              <Key>계약방식</Key>
              <Val>{post.contractType}</Val>
            </Row>
          )}
          {post.region && (
            <Row>
              <Key>지역</Key>
              <Val>{post.region}</Val>
            </Row>
          )}
          {post.companyName && (
            <Row>
              <Key>업체명</Key>
              <Val>{post.companyName}</Val>
            </Row>
          )}
          {post.managerName && (
            <Row>
              <Key>담당자</Key>
              <Val>{post.managerName}</Val>
            </Row>
          )}
          {post.contact && (
            <Row>
              <Key>연락처</Key>
              <Val>{post.contact}</Val>
            </Row>
          )}
        </Card>

        {/* 상세내용 */}
        <Card>
          <SectionLabel>상세내용</SectionLabel>
          <DescText>{post.description || "—"}</DescText>
        </Card>

        {/* 면책 안내 */}
        <DisclaimerBox>
          <strong>거래 시 주의사항</strong>
          홈프로는 거래 중개 정보만 제공하며 거래 당사자가 아닙니다.
          선금 요구·과도한 할인 등 의심 정황 발견 시 거래를 중단하고 신고해주세요.
        </DisclaimerBox>

        {/* 액션 버튼 */}
        <ActionBar>
          {isOwner ? (
            <DangerBtn disabled={deleting} onClick={handleDelete}>
              {deleting ? "삭제 중..." : "게시글 삭제"}
            </DangerBtn>
          ) : (
            <PrimaryBtn disabled={chatStarting || !post.createdBy} onClick={handleChat}>
              {chatStarting ? "채팅방 생성 중..." : "채팅 문의"}
            </PrimaryBtn>
          )}
        </ActionBar>

        {toast && <Toast>{toast}</Toast>}
      </Wrap>
    </SimpleBackLayout>
  );
};

export default MarketplaceDetailPage;

const Wrap = styled.div`
  background: ${THEME.background};
  min-height: 100%;
  padding-bottom: 80px;
`;
const CenterMsg = styled.div`
  padding: 60px 20px;
  text-align: center;
  color: ${THEME.muted};
  font-size: 14px;
`;
const PhotoBox = styled.div`
  position: relative;
  background: #000;
`;
const MainImg = styled.img`
  width: 100%;
  max-height: 360px;
  object-fit: contain;
  display: block;
  background: #000;
`;
const ThumbRow = styled.div`
  display: flex;
  gap: 6px;
  padding: 8px 12px;
  background: #fff;
  overflow-x: auto;
  &::-webkit-scrollbar { display: none; }
`;
const Thumb = styled.button`
  flex-shrink: 0;
  width: 56px;
  height: 56px;
  padding: 0;
  border: 2px solid ${({ $active }) => ($active ? THEME.primary : "transparent")};
  border-radius: 8px;
  overflow: hidden;
  background: ${THEME.background};
  cursor: pointer;
`;
const ThumbImg = styled.img`
  width: 100%;
  height: 100%;
  object-fit: cover;
`;
const PhotoCounter = styled.div`
  position: absolute;
  bottom: 70px;
  right: 12px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.55);
  color: #fff;
  font-size: 11px;
  border-radius: 12px;
`;
const HeaderCard = styled.div`
  background: #fff;
  margin: 12px 12px 0;
  padding: 16px 18px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
`;
const TopRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
`;
const TypeBadge = styled.span`
  font-size: 11px;
  font-weight: 700;
  color: #fff;
  background: ${THEME.primary};
  padding: 3px 10px;
  border-radius: 12px;
`;
const DateText = styled.span`
  font-size: 11px;
  color: ${THEME.muted};
`;
const Title = styled.div`
  font-size: 17px;
  font-weight: 700;
  color: ${THEME.text};
  line-height: 1.4;
  margin-bottom: 6px;
  word-break: break-word;
`;
const Amount = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.primary};
`;
const Card = styled.div`
  background: #fff;
  margin: 8px 12px 0;
  padding: 16px 18px;
  border-radius: 16px;
  box-shadow: 0 1px 3px rgba(0,0,0,0.04);
`;
const SectionLabel = styled.div`
  font-size: 13px;
  font-weight: 700;
  color: ${THEME.textSecondary || THEME.muted};
  margin-bottom: 10px;
`;
const Row = styled.div`
  display: flex;
  padding: 8px 0;
  border-bottom: 1px solid ${THEME.border};
  &:last-child { border-bottom: none; }
`;
const Key = styled.div`
  flex: 0 0 80px;
  font-size: 13px;
  color: ${THEME.muted};
`;
const Val = styled.div`
  flex: 1;
  font-size: 14px;
  color: ${THEME.text};
  word-break: break-word;
`;
const DescText = styled.div`
  font-size: 14px;
  color: ${THEME.text};
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
`;
const DisclaimerBox = styled.div`
  margin: 8px 12px 0;
  padding: 12px 14px;
  background: #FEF3C7;
  color: #92400E;
  font-size: 12px;
  line-height: 1.5;
  border-radius: 10px;
  strong {
    display: block;
    margin-bottom: 4px;
    font-size: 13px;
    color: #78350F;
  }
`;
const ActionBar = styled.div`
  margin: 16px 12px 32px;
`;
const PrimaryBtn = styled.button`
  width: 100%;
  padding: 14px;
  background: ${THEME.primary};
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 700;
  cursor: pointer;
  &:active { background: ${THEME.primaryDark}; }
  &:disabled { background: #ccc; }
`;
const DangerBtn = styled.button`
  width: 100%;
  padding: 14px;
  background: #fff;
  color: #DC2626;
  border: 1px solid #FCA5A5;
  border-radius: 10px;
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  &:active { background: #FEE2E2; }
  &:disabled { opacity: 0.5; }
`;
const Toast = styled.div`
  position: fixed;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  font-size: 14px;
  border-radius: 10px;
  z-index: 9999;
`;
