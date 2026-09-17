/* eslint-disable */
import React, { useState, useEffect, useContext, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled from "styled-components";
import { IoHeartOutline, IoHeart, IoSendOutline, IoChatbubbleOutline, IoPersonCircle } from "react-icons/io5";
import { THEME } from "../../config/homeproConfig";
import { UserContext } from "../../context/User";
import { useAuth } from "../../context/AuthContext";
import { getPostById, toggleLike, checkLiked, getComments, addComment, increaseViewCount } from "../../service/CommunityService";
import SimpleBackLayout from "../../screen/Layout/Layout/SimpleBackLayout";

const CommunityDetailPage = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(UserContext);
  const { userData } = useAuth();
  // 새로고침·직접 진입 시 UserContext 가 비어 좋아요·댓글이 조용히 무시되던
  // 문제 — 글쓰기와 동일하게 AuthContext 폴백 (심화점검 10 발견)
  const uid = userData?.uid || user?.USERS_ID;
  const nickname = userData?.nickname || userData?.name || user?.USERINFO?.nickname || "익명";

  const [post, setPost] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [comments, setComments] = useState([]);
  const [commentText, setCommentText] = useState("");
  const [replyTo, setReplyTo] = useState(null); // { id, authorName }
  const [loading, setLoading] = useState(true);
  const commentInputRef = useRef(null);

  // 조회수 — 글을 열 때 한 번 (많이 본 글 순위용)
  useEffect(() => { if (postId) increaseViewCount(postId); }, [postId]);

  useEffect(() => {
    if (!postId) return;
    Promise.all([
      getPostById(postId),
      checkLiked(postId, uid),
      getComments(postId),
    ]).then(([p, isLiked, cmts]) => {
      if (!p) { navigate(-1); return; }
      setPost(p);
      setLiked(isLiked);
      setLikeCount(p.likeCount || 0);
      setComments(cmts);
    }).catch(console.error)
      .finally(() => setLoading(false));
  }, [postId, uid]);

  const handleLike = async () => {
    if (!uid) return;
    const result = await toggleLike(postId, uid);
    setLiked(result);
    setLikeCount((prev) => (result ? prev + 1 : prev - 1));
  };

  const handleAddComment = async () => {
    if (!commentText.trim() || !uid) return;
    await addComment(postId, {
      text: commentText.trim(),
      authorUid: uid,
      authorName: nickname,
      parentId: replyTo?.id || null,
    });
    setCommentText("");
    setReplyTo(null);
    // 댓글 목록 새로고침
    const cmts = await getComments(postId);
    setComments(cmts);
    setPost((prev) => prev ? { ...prev, commentCount: (prev.commentCount || 0) + 1 } : prev);
  };

  const formatDate = (ts) => {
    if (!ts) return "";
    const d = ts.toDate ? ts.toDate() : new Date(ts);
    return `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, "0")}.${String(d.getDate()).padStart(2, "0")}`;
  };

  // 댓글을 부모-자식 구조로 정리
  const rootComments = comments.filter((c) => !c.parentId);
  const childMap = {};
  comments.filter((c) => c.parentId).forEach((c) => {
    if (!childMap[c.parentId]) childMap[c.parentId] = [];
    childMap[c.parentId].push(c);
  });

  if (loading) {
    return (
      <SimpleBackLayout NAME="커뮤니티" hideFooter>
        <LoadingWrap>불러오는 중...</LoadingWrap>
      </SimpleBackLayout>
    );
  }

  if (!post) return null;

  return (
    <SimpleBackLayout NAME="커뮤니티" hideFooter>
      <PageWrap>
        <ContentArea>
          {/* 작성자 줄 (커뮤니티 시안 2번, 형 9/18) */}
          <AuthorLine>
            <IoPersonCircle size={40} color="#C9CED6" />
            <div>
              <AuthorName>{post.authorName || (post.type === "notice" ? "홈프로" : "익명")}</AuthorName>
              <AuthorSub>
                {post.type === "notice" ? "이벤트/공지 · " : ""}{formatDate(post.createdAt)}{post.viewCount ? ` · 조회 ${post.viewCount}` : ""}
              </AuthorSub>
            </div>
          </AuthorLine>

          {/* 본문 */}
          <Title>{post.title}</Title>
          <Content>{post.content}</Content>

          {/* 이미지 */}
          {post.images && post.images.length > 0 && (
            <ImageList>
              {post.images.map((url, i) => (
                <PostImage key={i} src={url} alt={`이미지 ${i + 1}`} />
              ))}
            </ImageList>
          )}

          {/* 좋아요 · 댓글 버튼 (시안 2번) */}
          <ActionRow>
            <ActionBtn type="button" $on={liked} onClick={handleLike}>
              {liked ? <IoHeart size={20} color={THEME.primary} /> : <IoHeartOutline size={20} color={THEME.text} />}
              좋아요 {likeCount}
            </ActionBtn>
            <ActionBtn type="button" onClick={() => commentInputRef.current?.focus()}>
              <IoChatbubbleOutline size={19} color={THEME.text} />
              댓글 {post.commentCount || 0}
            </ActionBtn>
          </ActionRow>

          {/* 댓글 섹션 */}
          <CommentSection>
            <CommentTitle>댓글 {post.commentCount || 0}</CommentTitle>
            {rootComments.length === 0 ? (
              <CommentEmpty>첫 댓글을 남겨보세요</CommentEmpty>
            ) : (
              rootComments.map((c) => (
                <React.Fragment key={c.id}>
                  <CommentItem>
                    <CommentAuthor>{c.authorName}</CommentAuthor>
                    <CommentText>{c.text}</CommentText>
                    <CommentMeta>
                      <CommentDate>{formatDate(c.createdAt)}</CommentDate>
                      <ReplyBtn onClick={() => setReplyTo({ id: c.id, authorName: c.authorName })}>답글</ReplyBtn>
                    </CommentMeta>
                  </CommentItem>
                  {/* 대댓글 */}
                  {childMap[c.id]?.map((reply) => (
                    <CommentItem key={reply.id} $isReply>
                      <CommentAuthor>{reply.authorName}</CommentAuthor>
                      <CommentText>{reply.text}</CommentText>
                      <CommentMeta>
                        <CommentDate>{formatDate(reply.createdAt)}</CommentDate>
                      </CommentMeta>
                    </CommentItem>
                  ))}
                </React.Fragment>
              ))
            )}
          </CommentSection>
        </ContentArea>

        {/* 댓글 입력창 (고정) */}
        <InputBar>
          {replyTo && (
            <ReplyIndicator>
              <span>{replyTo.authorName}에게 답글</span>
              <CancelReply onClick={() => setReplyTo(null)}>취소</CancelReply>
            </ReplyIndicator>
          )}
          <InputRow>
            <CommentInput
              ref={commentInputRef}
              placeholder="댓글을 입력하세요"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              onKeyDown={(e) => { if (e.nativeEvent.isComposing || e.keyCode === 229) return; if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleAddComment(); } }}
            />
            <SendBtn onClick={handleAddComment} disabled={!commentText.trim()}>
              <IoSendOutline size={20} color={commentText.trim() ? THEME.primary : THEME.muted} />
            </SendBtn>
          </InputRow>
        </InputBar>
      </PageWrap>
    </SimpleBackLayout>
  );
};

export default CommunityDetailPage;

/* ===================== Styles ===================== */

const PageWrap = styled.div`
  display: flex;
  flex-direction: column;
  min-height: 100%;
  background: ${THEME.surface};
`;

const ContentArea = styled.div`
  flex: 1;
  padding: 20px 16px;
  padding-bottom: 80px;
`;

const AuthorLine = styled.div`
  display: flex;
  align-items: center;
  gap: 10px;
`;

const AuthorName = styled.div`
  font-size: 16px;
  font-weight: 700;
  color: ${THEME.text};
`;

const AuthorSub = styled.div`
  font-size: 13px;
  color: #2b2f36;
  margin-top: 1px;
`;

const Title = styled.div`
  font-size: 22px;
  font-weight: 700;
  color: ${THEME.text};
  margin-top: 16px;
  line-height: 1.4;
  letter-spacing: -0.03em;
`;

const Content = styled.div`
  font-size: 17px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 12px;
  line-height: 1.7;
  white-space: pre-line;
`;

const ImageList = styled.div`
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 20px;
`;

const PostImage = styled.img`
  width: 100%;
  border-radius: 10px;
  object-fit: cover;
`;

const ActionRow = styled.div`
  display: flex;
  gap: 8px;
  margin-top: 20px;
  padding-bottom: 20px;
  border-bottom: 8px solid ${THEME.background};
  margin-left: -16px;
  margin-right: -16px;
  padding-left: 16px;
  padding-right: 16px;
`;

const ActionBtn = styled.button`
  flex: 1;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: 10px;
  border: 1px solid ${({ $on }) => ($on ? THEME.primary : "#D9DDE3")};
  background: #fff;
  color: ${({ $on }) => ($on ? THEME.primaryDark : THEME.text)};
  font-size: 16px;
  font-weight: ${({ $on }) => ($on ? 700 : 600)};
  font-family: inherit;
  cursor: pointer;
  &:active { opacity: 0.7; }
`;

const CommentSection = styled.div`
  margin-top: 20px;
`;

const CommentTitle = styled.div`
  font-size: 18px;
  font-weight: 700;
  color: ${THEME.text};
  margin-bottom: 16px;
`;

const CommentEmpty = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.muted};
  text-align: center;
  padding: 20px 0;
`;

const CommentItem = styled.div`
  padding: ${({ $isReply }) => ($isReply ? "12px 0 12px 40px" : "12px 0")};
  border-bottom: 1px solid ${THEME.border};
`;

const CommentAuthor = styled.div`
  font-size: 15px;
  font-weight: 600;
  color: ${THEME.text};
`;

const CommentText = styled.div`
  font-size: 16px;
  font-weight: 400;
  color: ${THEME.textSecondary};
  margin-top: 4px;
  line-height: 1.4;
`;

const CommentMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
`;

const CommentDate = styled.div`
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.muted};
`;

const ReplyBtn = styled.button`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.primary};
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  &:active { opacity: 0.6; }
`;

const InputBar = styled.div`
  position: fixed;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 400px;
  background: ${THEME.surface};
  border-top: 1px solid ${THEME.border};
  z-index: 100;
`;

const ReplyIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: ${THEME.background};
  font-size: 14px;
  font-weight: 400;
  color: ${THEME.primary};
`;

const CancelReply = styled.button`
  font-size: 14px;
  font-weight: 600;
  color: ${THEME.muted};
  background: none;
  border: none;
  cursor: pointer;
`;

const InputRow = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px calc(10px + env(safe-area-inset-bottom, 0px));
`;

const CommentInput = styled.input`
  flex: 1;
  padding: 12px 16px;
  border-radius: 10px;
  border: 1.5px solid ${THEME.border};
  background: ${THEME.background};
  font-size: 16px;
  font-weight: 400;
  font-family: inherit;
  color: ${THEME.text};
  outline: none;
  &::placeholder { color: ${THEME.muted}; }
  &:focus { border-color: ${THEME.primary}; }
`;

const SendBtn = styled.button`
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: none;
  background: ${THEME.background};
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  &:active { opacity: 0.6; }
  &:disabled { opacity: 0.5; cursor: default; }
`;

const LoadingWrap = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  font-size: 17px;
  color: ${THEME.muted};
`;
